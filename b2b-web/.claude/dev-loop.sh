#!/bin/bash
#
# DEV LOOP - Continuous Claude Code Development
# Runs Claude Code in a loop until all features are complete
#
# This script:
# 1. Picks the next pending feature
# 2. Generates a dev prompt
# 3. Runs Claude Code
# 4. Checks for completion signal
# 5. Runs tests
# 6. Repeats until done
#
# Usage:
#   ./dev-loop.sh              # Run until all complete
#   ./dev-loop.sh FE-001       # Start with specific feature
#   ./dev-loop.sh --backend    # Also build backend APIs as needed
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_ROOT="$(dirname "$PROJECT_ROOT")/b2b-api"
PRD_FILE="$SCRIPT_DIR/execution/prd.json"
STATE_FILE="$SCRIPT_DIR/execution/dev-state.json"
LOG_FILE="$SCRIPT_DIR/execution/dev-loop.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1" | tee -a "$LOG_FILE"; }
success() { echo -e "${GREEN}[$(date +%H:%M:%S)] ✓${NC} $1" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] !${NC} $1" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[$(date +%H:%M:%S)] ✗${NC} $1" | tee -a "$LOG_FILE"; }

# ============================================================================
# FEATURE SELECTION
# ============================================================================

get_next_feature() {
    # Get first pending feature with met dependencies
    local features=$(jq -r '.phases[].items[] | select(.status == "pending") | .id' "$PRD_FILE")
    
    for fid in $features; do
        # Check dependencies
        local deps=$(jq -r ".phases[].items[] | select(.id == \"$fid\") | .dependencies[]?" "$PRD_FILE")
        local deps_met=true
        
        for dep in $deps; do
            local dep_status=$(jq -r ".phases[].items[] | select(.id == \"$dep\") | .status" "$PRD_FILE")
            if [ "$dep_status" != "complete" ]; then
                deps_met=false
                break
            fi
        done
        
        if [ "$deps_met" = "true" ]; then
            # Check API dependencies
            local has_blockers=$(jq -r ".phases[].items[] | select(.id == \"$fid\") | .api_dependencies[]? | select(.status == \"needed\") | .endpoint" "$PRD_FILE" | head -1)
            
            if [ -z "$has_blockers" ]; then
                echo "$fid"
                return 0
            else
                warn "$fid blocked by missing API: $has_blockers"
            fi
        fi
    done
    
    return 1
}

# ============================================================================
# CLAUDE INTEGRATION
# ============================================================================

run_claude_iteration() {
    local feature_id="$1"
    local iteration="$2"
    
    local prompt_file="$SCRIPT_DIR/execution/DEV-PROMPT.md"
    local output_file="$SCRIPT_DIR/execution/claude-output-${feature_id}-${iteration}.md"
    
    log "Running Claude Code for $feature_id iteration $iteration..."
    
    # Generate the prompt
    "$SCRIPT_DIR/ralph.sh" "$feature_id" --generate-prompt "$iteration" 2>/dev/null || true
    
    # Run Claude Code (adjust command based on your Claude Code installation)
    # Option 1: Using claude CLI
    if command -v claude &> /dev/null; then
        cd "$PROJECT_ROOT"
        
        # Read the prompt and pass to Claude
        local prompt_content=$(cat "$prompt_file")
        
        # Run Claude with the prompt
        echo "$prompt_content" | claude --print > "$output_file" 2>&1 || true
        
        # Check for completion signal
        if grep -q "<promise>COMPLETE:${feature_id}</promise>" "$output_file" 2>/dev/null; then
            success "Feature $feature_id completed!"
            return 0
        fi
    else
        warn "Claude CLI not found. Please run Claude manually with prompt:"
        echo "  Prompt: $prompt_file"
        echo ""
        read -p "Press Enter when iteration complete, or 'done' if feature complete: " response
        if [ "$response" = "done" ]; then
            return 0
        fi
    fi
    
    return 1
}

# ============================================================================
# BACKEND API BUILDER
# ============================================================================

build_backend_api() {
    local blocker_id="$1"
    
    log "Building backend API for blocker: $blocker_id"
    
    local blocker_file="$SCRIPT_DIR/planning/backlog/api-blockers/${blocker_id}.json"
    
    if [ ! -f "$blocker_file" ]; then
        error "Blocker file not found: $blocker_file"
        return 1
    fi
    
    # Generate backend prompt
    local backend_prompt="$BACKEND_ROOT/.claude/execution/api-build-prompt.md"
    
    cat > "$backend_prompt" << EOF
# Build API for Blocker: $blocker_id

## Blocker Details
$(cat "$blocker_file")

## Instructions
1. Create the necessary module in b2b-api
2. Implement all required endpoints
3. Add proper validation and error handling
4. Create unit tests
5. Update OpenAPI documentation

When complete, output:
\`\`\`
<promise>API-COMPLETE:${blocker_id}</promise>
\`\`\`
EOF

    log "Backend API prompt created: $backend_prompt"
    log "Switch to b2b-api and run: ./.claude/ralph.sh --prompt $backend_prompt"
    
    read -p "Press Enter when backend API is complete: "
    
    # Mark blocker as resolved
    # Update the feature's api_dependencies status
    return 0
}

# ============================================================================
# MAIN LOOP
# ============================================================================

main_loop() {
    local target="${1:-}"
    local build_backend="${2:-false}"
    local max_iterations=1000
    local iteration=0
    
    log "Starting Development Loop"
    log "Project: $PROJECT_ROOT"
    log "Backend: $BACKEND_ROOT"
    echo ""
    
    while [ $iteration -lt $max_iterations ]; do
        ((iteration++))
        
        # Get next feature
        local feature_id
        if [ -n "$target" ]; then
            feature_id="$target"
            target=""
        else
            feature_id=$(get_next_feature || echo "")
        fi
        
        if [ -z "$feature_id" ]; then
            # Check if there are blocked features
            local blocked=$(jq -r '.phases[].items[] | select(.status == "pending") | select(.api_dependencies[]?.status == "needed") | .id' "$PRD_FILE" | head -1)
            
            if [ -n "$blocked" ] && [ "$build_backend" = "true" ]; then
                # Get the blocker ID
                local blocker=$(jq -r ".phases[].items[] | select(.id == \"$blocked\") | .api_dependencies[] | select(.status == \"needed\") | .notes" "$PRD_FILE" | head -1)
                log "Feature $blocked needs backend API"
                
                # Try to build the backend
                build_backend_api "API-001"  # This should be dynamic
                continue
            fi
            
            success "All available features complete!"
            
            # Show summary
            local total=$(jq '[.phases[].items[]] | length' "$PRD_FILE")
            local complete=$(jq '[.phases[].items[] | select(.status == "complete")] | length' "$PRD_FILE")
            local blocked_count=$(jq '[.phases[].items[] | select(.api_dependencies[]?.status == "needed")] | length' "$PRD_FILE")
            
            echo ""
            echo "Summary:"
            echo "  Complete: $complete/$total"
            echo "  Blocked:  $blocked_count (need backend APIs)"
            break
        fi
        
        local title=$(jq -r ".phases[].items[] | select(.id == \"$feature_id\") | .title" "$PRD_FILE")
        local max_iter=$(jq -r ".phases[].items[] | select(.id == \"$feature_id\") | .max_iterations" "$PRD_FILE")
        
        log "Starting $feature_id: $title"
        
        # Mark as in progress
        jq --arg id "$feature_id" '
            .phases[].items[] |= if .id == $id then .status = "in_progress" else . end
        ' "$PRD_FILE" > "${PRD_FILE}.tmp" && mv "${PRD_FILE}.tmp" "$PRD_FILE"
        
        # Run iterations
        local feat_iter=1
        local complete=false
        
        while [ "$complete" = "false" ] && [ $feat_iter -le $max_iter ]; do
            log "Iteration $feat_iter/$max_iter for $feature_id"
            
            if run_claude_iteration "$feature_id" "$feat_iter"; then
                complete=true
            fi
            
            ((feat_iter++))
        done
        
        if [ "$complete" = "true" ]; then
            # Run tests
            log "Running tests..."
            cd "$PROJECT_ROOT"
            
            if pnpm build 2>/dev/null && pnpm test 2>/dev/null; then
                success "Tests passed for $feature_id"
                
                # Mark complete
                jq --arg id "$feature_id" '
                    .phases[].items[] |= if .id == $id then .status = "complete" else . end
                ' "$PRD_FILE" > "${PRD_FILE}.tmp" && mv "${PRD_FILE}.tmp" "$PRD_FILE"
            else
                warn "Tests failed for $feature_id, continuing..."
            fi
        else
            warn "Max iterations reached for $feature_id"
        fi
        
        echo ""
    done
    
    log "Development Loop Complete"
}

# ============================================================================
# ENTRY POINT
# ============================================================================

cd "$PROJECT_ROOT"
mkdir -p "$SCRIPT_DIR/execution"

case "${1:-}" in
    --backend|-b)
        main_loop "" "true"
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS] [FE-XXX]"
        echo ""
        echo "Options:"
        echo "  --backend, -b    Also build backend APIs when blocked"
        echo "  --help, -h       Show this help"
        ;;
    FE-*)
        main_loop "$1"
        ;;
    *)
        main_loop
        ;;
esac
