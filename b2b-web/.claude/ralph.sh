#!/bin/bash
#
# RALPH LOOP - Frontend Development (Independent)
# 
# LISA Phase: Planning and gap analysis
# RALPH Phase: Implementation with gap handling
#
# When API is missing:
#   1. Creates detailed gap request in backend repo
#   2. Marks feature as "waiting_for_api"
#   3. Continues with other features
#   4. Periodically checks if gaps are resolved
#   5. Resumes blocked features when APIs ready
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_ROOT="$(dirname "$PROJECT_ROOT")/b2b-api"
BACKEND_GAPS="$BACKEND_ROOT/.claude/api-gaps"

PRD_FILE="$SCRIPT_DIR/execution/prd.json"
STATE_FILE="$SCRIPT_DIR/execution/dev-state.json"
CONTEXT_FILE="$SCRIPT_DIR/CONTEXT.md"

BACKEND_API="${BACKEND_API:-http://localhost:3000}"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; MAGENTA='\033[0;35m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}!${NC} $1"; }
log_error()   { echo -e "${RED}✗${NC} $1"; }
log_phase()   { echo -e "\n${MAGENTA}══════════════════════════════════════════════════════════════${NC}\n${MAGENTA}  $1${NC}\n${MAGENTA}══════════════════════════════════════════════════════════════${NC}\n"; }

# ============================================================================
# INITIALIZATION
# ============================================================================

init() {
    mkdir -p "$SCRIPT_DIR/execution/plans"
    mkdir -p "$SCRIPT_DIR/execution/iterations"
    mkdir -p "$BACKEND_GAPS"
    
    if [ ! -f "$STATE_FILE" ]; then
        cat > "$STATE_FILE" << 'EOF'
{
  "mode": "development",
  "current_feature": null,
  "current_phase": "idle",
  "current_iteration": 0,
  "completed": [],
  "waiting_for_api": [],
  "gap_counter": 0
}
EOF
    fi
}

# ============================================================================
# API GAP MANAGEMENT
# ============================================================================

create_gap_request() {
    local feature_id="$1"
    local endpoint="$2"
    local method=$(echo "$endpoint" | awk '{print $1}')
    local path=$(echo "$endpoint" | awk '{print $2}')
    local notes="$3"
    
    # Get gap counter and increment
    local gap_num=$(jq -r '.gap_counter' "$STATE_FILE")
    ((gap_num++))
    jq --argjson n "$gap_num" '.gap_counter = $n' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
    
    local gap_id=$(printf "GAP-%03d" $gap_num)
    local now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Get detailed info from API blockers if available
    local blocker_file="$SCRIPT_DIR/planning/backlog/api-blockers/"
    local request_schema="{}"
    local response_schema="{}"
    
    # Create gap request
    local gap_file="$BACKEND_GAPS/${gap_id}-$(echo "$path" | tr '/' '-' | sed 's/^-//').json"
    
    cat > "$gap_file" << EOF
{
  "id": "$gap_id",
  "requested_by": "$feature_id",
  "requested_at": "$now",
  "status": "open",
  
  "endpoint": {
    "method": "$method",
    "path": "$path",
    "description": "$notes"
  },
  
  "context": {
    "frontend_feature": "$feature_id",
    "frontend_prd": "$PRD_FILE",
    "blocker_details": "See $SCRIPT_DIR/planning/backlog/api-blockers/ for detailed specs"
  },
  
  "priority": "P1",
  "notes": "Auto-generated from frontend gap analysis"
}
EOF

    log_success "Created gap request: $gap_file"
    echo "$gap_id"
}

check_gap_resolved() {
    local gap_id="$1"
    local gap_file=$(find "$BACKEND_GAPS" -name "${gap_id}*.json" 2>/dev/null | head -1)
    
    if [ -f "$gap_file" ]; then
        local status=$(jq -r '.status' "$gap_file")
        if [ "$status" = "resolved" ]; then
            return 0
        fi
    fi
    return 1
}

get_open_gaps() {
    find "$BACKEND_GAPS" -name "GAP-*.json" -exec jq -r 'select(.status == "open") | .id' {} \; 2>/dev/null
}

# ============================================================================
# FEATURE MANAGEMENT  
# ============================================================================

get_feature_status() {
    local fid="$1"
    jq -r ".phases[].items[] | select(.id == \"$fid\") | .status" "$PRD_FILE"
}

update_feature_status() {
    local fid="$1"
    local status="$2"
    jq --arg id "$fid" --arg s "$status" \
        '.phases[].items[] |= if .id == $id then .status = $s else . end' \
        "$PRD_FILE" > "${PRD_FILE}.tmp" && mv "${PRD_FILE}.tmp" "$PRD_FILE"
}

get_missing_apis() {
    local fid="$1"
    jq -r ".phases[].items[] | select(.id == \"$fid\") | .api_dependencies[]? | select(.status == \"needed\") | .endpoint" "$PRD_FILE" 2>/dev/null
}

check_feature_dependencies() {
    local fid="$1"
    local deps=$(jq -r ".phases[].items[] | select(.id == \"$fid\") | .dependencies[]?" "$PRD_FILE")
    
    for dep in $deps; do
        local dep_status=$(get_feature_status "$dep")
        if [ "$dep_status" != "complete" ]; then
            return 1
        fi
    done
    return 0
}

get_next_feature() {
    # Priority: 1) Resume waiting_for_api if resolved, 2) Next pending
    
    # Check waiting features
    local waiting=$(jq -r '.waiting_for_api[]?' "$STATE_FILE" 2>/dev/null)
    for fid in $waiting; do
        local missing=$(get_missing_apis "$fid")
        local all_resolved=true
        
        for api in $missing; do
            # Check if API now exists (simplified check)
            if ! curl -s "$BACKEND_API/docs-json" 2>/dev/null | grep -q "$(echo $api | awk '{print $2}')" 2>/dev/null; then
                all_resolved=false
                break
            fi
        done
        
        if [ "$all_resolved" = "true" ]; then
            # Remove from waiting, return as next
            jq --arg fid "$fid" '.waiting_for_api |= map(select(. != $fid))' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
            update_feature_status "$fid" "pending"
            echo "$fid"
            return 0
        fi
    done
    
    # Get next pending feature with met dependencies
    local features=$(jq -r '.phases[].items[] | select(.status == "pending") | .id' "$PRD_FILE")
    
    for fid in $features; do
        if check_feature_dependencies "$fid"; then
            echo "$fid"
            return 0
        fi
    done
    
    return 1
}

# ============================================================================
# LISA PHASE - PLANNING
# ============================================================================

run_lisa() {
    local fid="$1"
    log_phase "LISA PHASE: Planning $fid"
    
    local feature=$(jq ".phases[].items[] | select(.id == \"$fid\")" "$PRD_FILE")
    local title=$(echo "$feature" | jq -r '.title')
    local module=$(echo "$feature" | jq -r '.module')
    
    log_info "Feature: $title"
    log_info "Module: $module"
    
    # Check API dependencies
    local missing_apis=$(get_missing_apis "$fid")
    
    if [ -n "$missing_apis" ]; then
        log_warning "Missing APIs detected!"
        echo ""
        echo "Options:"
        echo "  1) Create gap requests and mark as waiting (recommended)"
        echo "  2) Skip this feature for now"
        echo "  3) Continue anyway (APIs may fail)"
        echo ""
        read -p "Choice [1/2/3]: " choice
        
        case "$choice" in
            1)
                echo "$missing_apis" | while read -r api; do
                    if [ -n "$api" ]; then
                        local notes=$(jq -r ".phases[].items[] | select(.id == \"$fid\") | .api_dependencies[] | select(.endpoint == \"$api\") | .notes // \"Required for $fid\"" "$PRD_FILE")
                        create_gap_request "$fid" "$api" "$notes"
                    fi
                done
                
                # Mark as waiting
                update_feature_status "$fid" "waiting_for_api"
                jq --arg fid "$fid" '.waiting_for_api += [$fid] | .waiting_for_api |= unique' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
                
                log_warning "$fid marked as waiting_for_api"
                log_info "Gap requests created in: $BACKEND_GAPS"
                log_info "Backend should process: ./.claude/ralph.sh --process-gaps"
                return 1
                ;;
            2)
                log_info "Skipping $fid"
                return 1
                ;;
            3)
                log_warning "Continuing without APIs - expect failures"
                ;;
        esac
    fi
    
    # Create plan file
    local plan_file="$SCRIPT_DIR/execution/plans/${fid}-plan.md"
    
    cat > "$plan_file" << EOF
# Plan: $fid - $title

## Module: $module

## Completion Criteria
$(echo "$feature" | jq -r '.completion_criteria[]' | sed 's/^/- [ ] /')

## API Dependencies
$(echo "$feature" | jq -r 'if .api_dependencies then .api_dependencies[] | "- \(.endpoint) [\(.status)]" else "- None" end' 2>/dev/null || echo "- None")

## Implementation Plan
<!-- Claude: Fill this section during Lisa phase -->

### Components to Create
- 

### State Management
- 

### Testing Strategy
- 

## Ready for Ralph: [ ]
EOF

    log_success "Plan created: $plan_file"
    return 0
}

# ============================================================================
# RALPH PHASE - IMPLEMENTATION
# ============================================================================

run_ralph() {
    local fid="$1"
    local max_iter=$(jq -r ".phases[].items[] | select(.id == \"$fid\") | .max_iterations" "$PRD_FILE")

    log_phase "RALPH PHASE: Implementing $fid"

    local iteration=1

    while [ $iteration -le $max_iter ]; do
        log_info "Iteration $iteration of $max_iter"

        # Generate prompt
        generate_prompt "$fid" "$iteration"

        # Run Claude to implement
        log_info "Running Claude..."
        cd "$PROJECT_ROOT"

        local prompt_file="$SCRIPT_DIR/execution/DEV-PROMPT.md"
        local output_file="$SCRIPT_DIR/execution/iterations/${fid}-iter${iteration}.md"

        # Run Claude with the prompt
        if claude --dangerously-skip-permissions -p "$(cat "$prompt_file")" 2>&1 | tee "$output_file"; then
            # Check if Claude indicated completion
            if grep -q "COMPLETE:${fid}" "$output_file" 2>/dev/null; then
                log_success "Claude indicated completion"

                # Verify build
                log_info "Verifying build..."
                if pnpm install 2>/dev/null && pnpm build 2>/dev/null; then
                    update_feature_status "$fid" "complete"
                    jq --arg fid "$fid" '.completed += [$fid]' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
                    log_success "$fid COMPLETE"

                    # Git checkpoint
                    local title=$(jq -r ".phases[].items[] | select(.id == \"$fid\") | .title" "$PRD_FILE")
                    git add -A && git commit -m "checkpoint($fid): $title" --no-verify 2>/dev/null || true

                    return 0
                else
                    log_warning "Build failed, continuing iterations..."
                fi
            fi
        else
            log_error "Claude execution failed"
        fi

        ((iteration++))

        # Small delay between iterations
        sleep 2
    done

    log_warning "Max iterations reached for $fid"
    return 1
}

generate_prompt() {
    local fid="$1"
    local iter="$2"

    local feature=$(jq ".phases[].items[] | select(.id == \"$fid\")" "$PRD_FILE")
    local title=$(echo "$feature" | jq -r '.title')
    local module=$(echo "$feature" | jq -r '.module')

    # Get previous iteration notes if any
    local prev_notes=""
    if [ $iter -gt 1 ]; then
        local prev_file="$SCRIPT_DIR/execution/iterations/${fid}-iter$((iter-1)).md"
        if [ -f "$prev_file" ]; then
            prev_notes=$(tail -100 "$prev_file" 2>/dev/null || echo "")
        fi
    fi

    cat > "$SCRIPT_DIR/execution/DEV-PROMPT.md" << EOF
# Implement: $fid - $title (Iteration $iter)

You are building a B2B e-commerce frontend application.

## Project Structure
- apps/admin - Next.js 14 Admin Portal (port 3002)
- apps/portal - Next.js 14 Customer Portal (port 3003)
- packages/ui - Shared React components (@b2b/ui)
- packages/api-client - Generated API client (@b2b/api-client)
- packages/config - Shared configs

## Tech Stack
- Next.js 14+ with App Router
- TypeScript (strict mode)
- Tailwind CSS
- Radix UI primitives
- React Query (TanStack Query)
- pnpm workspaces + Turborepo

## Current Feature
**ID:** $fid
**Title:** $title
**Module:** $module

## Completion Criteria (ALL must be met)
$(echo "$feature" | jq -r '.completion_criteria[]' | sed 's/^/- /')

## API Dependencies
$(echo "$feature" | jq -r 'if .api_dependencies then .api_dependencies[] | "- \(.endpoint) - \(.notes // "available")" else "- None" end' 2>/dev/null || echo "- None")

Backend API: http://localhost:3000
Swagger Docs: http://localhost:3000/docs

## Plan
$(cat "$SCRIPT_DIR/execution/plans/${fid}-plan.md" 2>/dev/null || echo "No plan yet")

## Previous Iteration Output
$prev_notes

## Instructions
1. Implement ALL completion criteria for this feature
2. Create necessary files, components, pages
3. Follow Next.js 14 App Router patterns
4. Use TypeScript strict mode
5. Write basic tests if time permits
6. Ensure pnpm build passes

## IMPORTANT
When you have implemented ALL completion criteria, output:
\`\`\`
<promise>COMPLETE:${fid}</promise>
\`\`\`

If you cannot complete (blocked/error), explain why.

BEGIN IMPLEMENTATION:
EOF
}

# ============================================================================
# MAIN LOOP
# ============================================================================

run_loop() {
    local target="$1"
    
    while true; do
        local fid
        if [ -n "$target" ]; then
            fid="$target"
            target=""
        else
            fid=$(get_next_feature || echo "")
        fi
        
        if [ -z "$fid" ]; then
            log_phase "No more features available"
            
            local waiting=$(jq -r '.waiting_for_api | length' "$STATE_FILE")
            if [ "$waiting" -gt 0 ]; then
                log_warning "$waiting features waiting for APIs"
                log_info "Process gaps in backend: cd ../b2b-api && ./.claude/ralph.sh --process-gaps"
            fi
            
            show_status
            break
        fi
        
        local title=$(jq -r ".phases[].items[] | select(.id == \"$fid\") | .title" "$PRD_FILE")
        log_phase "Feature: $fid - $title"
        
        update_feature_status "$fid" "in_progress"
        
        # Lisa phase
        if ! run_lisa "$fid"; then
            continue  # Feature waiting or skipped
        fi
        
        # Ralph phase
        run_ralph "$fid"
        
        echo ""
        read -p "Continue to next feature? [Y/n]: " cont
        if [ "$cont" = "n" ]; then
            break
        fi
    done
}

# ============================================================================
# STATUS
# ============================================================================

show_status() {
    local total=$(jq '[.phases[].items[]] | length' "$PRD_FILE")
    local complete=$(jq '[.phases[].items[] | select(.status == "complete")] | length' "$PRD_FILE")
    local waiting=$(jq '[.phases[].items[] | select(.status == "waiting_for_api")] | length' "$PRD_FILE")
    local pending=$(jq '[.phases[].items[] | select(.status == "pending")] | length' "$PRD_FILE")
    
    echo ""
    echo "══════════════════════════════════════════════════════════════"
    echo "  STATUS: $complete/$total complete"
    echo "══════════════════════════════════════════════════════════════"
    echo ""
    echo -e "  ${GREEN}Complete:${NC}        $complete"
    echo -e "  ${YELLOW}Waiting for API:${NC} $waiting"
    echo -e "  ${NC}Pending:${NC}         $pending"
    echo ""
    
    if [ "$waiting" -gt 0 ]; then
        echo "Waiting for APIs:"
        jq -r '.phases[].items[] | select(.status == "waiting_for_api") | "  - \(.id): \(.title)"' "$PRD_FILE"
        echo ""
        echo "Open gap requests:"
        ls -1 "$BACKEND_GAPS"/GAP-*.json 2>/dev/null | while read f; do
            echo "  - $(basename $f)"
        done
    fi
}

# ============================================================================
# MAIN
# ============================================================================

show_banner() {
    echo -e "${CYAN}"
    cat << 'EOF'
╔════════════════════════════════════════════════════════════════════════╗
║  RALPH LOOP - Frontend (Independent)                                   ║
║                                                                        ║
║  LISA  → Plan feature, identify API gaps                               ║
║  RALPH → Implement (or wait if APIs missing)                           ║
║                                                                        ║
║  Missing APIs → Gap request → Backend builds → Resume                  ║
╚════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

main() {
    cd "$PROJECT_ROOT"
    init
    show_banner
    
    case "${1:-}" in
        --status|-s)
            show_status
            ;;
        --gaps|-g)
            echo "Open gaps:"
            ls -la "$BACKEND_GAPS"/GAP-*.json 2>/dev/null || echo "  None"
            ;;
        --help|-h)
            echo "Usage: $0 [command] [FE-XXX]"
            echo ""
            echo "Commands:"
            echo "  (none)        Start development loop"
            echo "  FE-XXX        Start with specific feature"
            echo "  --status      Show progress"
            echo "  --gaps        Show open gap requests"
            echo "  --help        This help"
            ;;
        FE-*)
            run_loop "$1"
            ;;
        *)
            run_loop
            ;;
    esac
}

main "$@"
