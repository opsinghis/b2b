#!/bin/bash
# Development Workflow Script - Features, Bugs, Enhancements
# Usage: ./dev.sh [command] [options]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKLOG_DIR="$SCRIPT_DIR/planning/backlog"
EXECUTION_DIR="$SCRIPT_DIR/execution"
DEV_STATE_FILE="$EXECUTION_DIR/dev-state.json"
DEV_PROMPT_FILE="$EXECUTION_DIR/DEV-PROMPT.md"
LOG_DIR="$SCRIPT_DIR/logs"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Ensure directories exist
mkdir -p "$BACKLOG_DIR/features" "$BACKLOG_DIR/bugs" "$BACKLOG_DIR/enhancements" "$LOG_DIR"

# Initialize dev state if not exists
init_dev_state() {
    if [ ! -f "$DEV_STATE_FILE" ]; then
        cat > "$DEV_STATE_FILE" << 'EOF'
{
  "current": {
    "prd_id": null,
    "phase": "idle",
    "started_at": null
  },
  "phases": {
    "lisa": { "status": "pending", "output": null },
    "ralph": { "status": "pending", "iteration": 0 },
    "verification": { "status": "pending", "results": null }
  },
  "history": []
}
EOF
    fi
}

# Show help
show_help() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Development Workflow - Features, Bugs, Enhancements"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Commands:"
    echo ""
    echo "  ${CYAN}add${NC} <type> <title>     Add new PRD to backlog"
    echo "                         Types: feature, bug, enhancement"
    echo ""
    echo "  ${CYAN}list${NC} [type]            List backlog items"
    echo "                         Types: all, features, bugs, enhancements"
    echo ""
    echo "  ${CYAN}work${NC} <prd-id>          Start working on specific PRD"
    echo "  ${CYAN}work${NC} --next            Work on next priority item"
    echo "  ${CYAN}work${NC} --bugs            Work on all bugs (P0 first)"
    echo "  ${CYAN}work${NC} --features        Work on all features"
    echo ""
    echo "  ${CYAN}status${NC}                 Show current work status"
    echo ""
    echo "  ${CYAN}verify${NC}                 Run verification phase only"
    echo ""
    echo "  ${CYAN}complete${NC}               Mark current work as complete"
    echo ""
    echo "  ${CYAN}abort${NC}                  Abort current work"
    echo ""
    echo "Examples:"
    echo "  ./dev.sh add feature \"Product Search with Filters\""
    echo "  ./dev.sh add bug \"Login fails with special characters\""
    echo "  ./dev.sh list bugs"
    echo "  ./dev.sh work PRD-030"
    echo "  ./dev.sh work --next"
    echo ""
}

# Add new PRD to backlog
add_prd() {
    local type="$1"
    local title="$2"

    # Validate type
    case "$type" in
        feature|features) type="feature"; dir="features"; prefix="PRD" ;;
        bug|bugs) type="bug"; dir="bugs"; prefix="BUG" ;;
        enhancement|enhancements) type="enhancement"; dir="enhancements"; prefix="ENH" ;;
        *) echo -e "${RED}Error: Invalid type '$type'. Use: feature, bug, enhancement${NC}"; exit 1 ;;
    esac

    # Generate ID
    local existing=$(ls "$BACKLOG_DIR/$dir"/*.json 2>/dev/null | wc -l | tr -d ' ')
    local next_num=$((existing + 1))

    if [ "$prefix" = "PRD" ]; then
        # Continue from last PRD number (check prd.json for highest)
        local last_prd=$(jq -r '[.phases[].items[].id] | map(select(startswith("PRD-"))) | map(split("-")[1] | tonumber) | max' "$EXECUTION_DIR/prd.json" 2>/dev/null || echo "28")
        next_num=$((last_prd + existing + 1))
    fi

    local id=$(printf "%s-%03d" "$prefix" "$next_num")
    local slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')
    local filename="$BACKLOG_DIR/$dir/$id-$slug.json"
    local today=$(date +%Y-%m-%d)

    # Create PRD file based on type
    case "$type" in
        feature)
            cat > "$filename" << FEATURE_EOF
{
  "id": "$id",
  "type": "feature",
  "title": "Feature: $title",
  "module": "",
  "priority": "P1",
  "created": "$today",
  "status": "backlog",

  "description": "TODO: Describe what this feature does",

  "requirements": [
    "TODO: Requirement 1",
    "TODO: Requirement 2"
  ],

  "testing": {
    "unit": [
      "TODO: Unit test cases"
    ],
    "integration": [
      "TODO: Integration test cases"
    ],
    "e2e": [
      "TODO: E2E test cases"
    ],
    "performance": [
      "TODO: Performance requirements"
    ],
    "security": [
      "Authentication required",
      "Authorization via CASL",
      "Input validation",
      "Tenant isolation"
    ]
  },

  "acceptance_criteria": [
    "TODO: AC1"
  ],

  "dependencies": [],
  "max_iterations": 10
}
FEATURE_EOF
            ;;
        bug)
            cat > "$filename" << BUG_EOF
{
  "id": "$id",
  "type": "bug",
  "title": "Bug: $title",
  "module": "",
  "priority": "P1",
  "created": "$today",
  "status": "backlog",

  "description": "TODO: What is happening vs what should happen",

  "steps_to_reproduce": [
    "TODO: Step 1",
    "TODO: Step 2"
  ],

  "expected_behavior": "TODO: What should happen",
  "actual_behavior": "TODO: What actually happens",

  "root_cause_hypothesis": null,

  "testing": {
    "regression": [
      "Add test that reproduces the bug",
      "All existing tests must pass"
    ]
  },

  "max_iterations": 5
}
BUG_EOF
            ;;
        enhancement)
            cat > "$filename" << ENH_EOF
{
  "id": "$id",
  "type": "enhancement",
  "title": "Enhancement: $title",
  "module": "",
  "priority": "P2",
  "created": "$today",
  "status": "backlog",

  "description": "TODO: What improvement is being made",

  "current_behavior": "TODO: How it works now",
  "improved_behavior": "TODO: How it should work after",

  "requirements": [
    "TODO: Change 1"
  ],

  "testing": {
    "unit": [
      "Update existing tests if needed"
    ],
    "performance": [
      "TODO: Benchmark before vs after"
    ]
  },

  "backward_compatibility": {
    "breaking_changes": false,
    "migration_needed": false
  },

  "max_iterations": 6
}
ENH_EOF
            ;;
    esac

    echo ""
    echo -e "${GREEN}✓ Created: $filename${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Edit the file to fill in details"
    echo "  2. Run: ./dev.sh work $id"
    echo ""
}

# List backlog items
list_backlog() {
    local filter="${1:-all}"

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  BACKLOG"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Bugs (P0 first)
    if [ "$filter" = "all" ] || [ "$filter" = "bugs" ]; then
        echo ""
        echo -e "${RED}BUGS${NC}"
        local bugs=$(find "$BACKLOG_DIR/bugs" -name "*.json" 2>/dev/null | sort)
        if [ -n "$bugs" ]; then
            for f in $bugs; do
                local id=$(jq -r '.id' "$f")
                local title=$(jq -r '.title' "$f")
                local priority=$(jq -r '.priority' "$f")
                local status=$(jq -r '.status' "$f")
                printf "  %-10s %-4s %-10s %s\n" "$id" "$priority" "[$status]" "$title"
            done
        else
            echo "  (none)"
        fi
    fi

    # Features
    if [ "$filter" = "all" ] || [ "$filter" = "features" ]; then
        echo ""
        echo -e "${CYAN}FEATURES${NC}"
        local features=$(find "$BACKLOG_DIR/features" -name "*.json" 2>/dev/null | sort)
        if [ -n "$features" ]; then
            for f in $features; do
                local id=$(jq -r '.id' "$f")
                local title=$(jq -r '.title' "$f")
                local priority=$(jq -r '.priority' "$f")
                local status=$(jq -r '.status' "$f")
                printf "  %-10s %-4s %-10s %s\n" "$id" "$priority" "[$status]" "$title"
            done
        else
            echo "  (none)"
        fi
    fi

    # Enhancements
    if [ "$filter" = "all" ] || [ "$filter" = "enhancements" ]; then
        echo ""
        echo -e "${YELLOW}ENHANCEMENTS${NC}"
        local enhancements=$(find "$BACKLOG_DIR/enhancements" -name "*.json" 2>/dev/null | sort)
        if [ -n "$enhancements" ]; then
            for f in $enhancements; do
                local id=$(jq -r '.id' "$f")
                local title=$(jq -r '.title' "$f")
                local priority=$(jq -r '.priority' "$f")
                local status=$(jq -r '.status' "$f")
                printf "  %-10s %-4s %-10s %s\n" "$id" "$priority" "[$status]" "$title"
            done
        else
            echo "  (none)"
        fi
    fi

    echo ""
}

# Find PRD file by ID
find_prd_file() {
    local id="$1"
    local file=""

    # Search in all backlog directories
    file=$(find "$BACKLOG_DIR" -name "${id}*.json" 2>/dev/null | head -1)

    if [ -z "$file" ]; then
        echo ""
        return 1
    fi

    echo "$file"
}

# Start working on a PRD
work_on_prd() {
    local prd_id="$1"

    # Find the PRD file
    local prd_file=$(find_prd_file "$prd_id")
    if [ -z "$prd_file" ]; then
        echo -e "${RED}Error: PRD '$prd_id' not found in backlog${NC}"
        exit 1
    fi

    local prd_title=$(jq -r '.title' "$prd_file")
    local prd_type=$(jq -r '.type' "$prd_file")

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Starting: $prd_id"
    echo "  $prd_title"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Update dev state
    local now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    jq --arg id "$prd_id" --arg now "$now" '
        .current.prd_id = $id |
        .current.phase = "lisa" |
        .current.started_at = $now |
        .phases.lisa.status = "in_progress" |
        .phases.ralph.status = "pending" |
        .phases.verification.status = "pending"
    ' "$DEV_STATE_FILE" > tmp.json && mv tmp.json "$DEV_STATE_FILE"

    # Update PRD status
    jq '.status = "in_progress"' "$prd_file" > tmp.json && mv tmp.json "$prd_file"

    # Create timestamp for logs
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local log_file="$LOG_DIR/dev-$prd_id-$timestamp.log"

    echo "Phase 1: LISA (Planning)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Running Lisa analysis..."
    echo ""

    # Run Lisa phase with Claude
    local lisa_output=$(cat "$DEV_PROMPT_FILE" | sed "s|{{PRD_FILE}}|$prd_file|g" | sed "s|{{PHASE}}|lisa|g" | claude --print 2>&1) || true
    echo "$lisa_output" >> "$log_file"

    # Check for Lisa completion
    if echo "$lisa_output" | grep -q "<lisa-complete>"; then
        echo -e "${GREEN}✓ Lisa analysis complete${NC}"
        jq '.phases.lisa.status = "complete"' "$DEV_STATE_FILE" > tmp.json && mv tmp.json "$DEV_STATE_FILE"
    else
        echo -e "${YELLOW}Lisa analysis needs review${NC}"
    fi

    # Update phase to Ralph
    jq '.current.phase = "ralph" | .phases.ralph.status = "in_progress"' "$DEV_STATE_FILE" > tmp.json && mv tmp.json "$DEV_STATE_FILE"

    echo ""
    echo "Phase 2: RALPH (Execution)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    local max_iterations=$(jq -r '.max_iterations // 10' "$prd_file")
    local iteration=0

    while [ "$iteration" -lt "$max_iterations" ]; do
        iteration=$((iteration + 1))
        echo "Iteration $iteration/$max_iterations..."

        # Run Ralph iteration
        local ralph_output=$(cat "$DEV_PROMPT_FILE" | sed "s|{{PRD_FILE}}|$prd_file|g" | sed "s|{{PHASE}}|ralph|g" | claude --print --dangerously-skip-permissions 2>&1) || true
        echo "$ralph_output" >> "$log_file"

        # Update iteration count
        jq --argjson iter "$iteration" '.phases.ralph.iteration = $iter' "$DEV_STATE_FILE" > tmp.json && mv tmp.json "$DEV_STATE_FILE"

        # Check for completion
        if echo "$ralph_output" | grep -q "<implementation-complete>"; then
            echo -e "${GREEN}✓ Implementation complete${NC}"
            jq '.phases.ralph.status = "complete"' "$DEV_STATE_FILE" > tmp.json && mv tmp.json "$DEV_STATE_FILE"
            break
        fi

        # Check for checkpoint
        if echo "$ralph_output" | grep -q "<checkpoint>"; then
            echo -e "${BLUE}💾 Checkpoint saved${NC}"
        fi

        sleep 1
    done

    # Verification phase
    echo ""
    echo "Phase 3: VERIFICATION"
    echo "━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    jq '.current.phase = "verification" | .phases.verification.status = "in_progress"' "$DEV_STATE_FILE" > tmp.json && mv tmp.json "$DEV_STATE_FILE"

    run_verification "$prd_file" "$log_file"

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "  ${GREEN}WORKFLOW COMPLETE: $prd_id${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Log file: $log_file"
    echo ""
}

# Run verification phase
run_verification() {
    local prd_file="$1"
    local log_file="$2"

    local all_passed=true

    echo "Running verification checks..."
    echo ""

    # 1. Unit tests
    echo -n "  Unit tests: "
    if npm run test --silent >> "$log_file" 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        all_passed=false
    fi

    # 2. Integration tests (if available)
    echo -n "  Integration tests: "
    if npm run test:integration --silent >> "$log_file" 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
    else
        echo -e "${YELLOW}SKIPPED${NC} (or failed)"
    fi

    # 3. E2E tests (if available)
    echo -n "  E2E tests: "
    if npm run test:e2e --silent >> "$log_file" 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
    else
        echo -e "${YELLOW}SKIPPED${NC} (or failed)"
    fi

    # 4. Lint
    echo -n "  Lint: "
    if npm run lint --silent >> "$log_file" 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        all_passed=false
    fi

    # 5. Type check
    echo -n "  TypeScript: "
    if npm run typecheck --silent >> "$log_file" 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        all_passed=false
    fi

    # 6. Build
    echo -n "  Build: "
    if npm run build --silent >> "$log_file" 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        all_passed=false
    fi

    echo ""

    if $all_passed; then
        echo -e "${GREEN}✓ All verification checks passed${NC}"
        jq '.phases.verification.status = "passed"' "$DEV_STATE_FILE" > tmp.json && mv tmp.json "$DEV_STATE_FILE"

        # Update PRD status
        jq '.status = "complete"' "$prd_file" > tmp.json && mv tmp.json "$prd_file"

        # Prompt to update CONTEXT.md
        echo ""
        echo -e "${YELLOW}Remember to update CONTEXT.md with this change!${NC}"
    else
        echo -e "${RED}✗ Some verification checks failed${NC}"
        jq '.phases.verification.status = "failed"' "$DEV_STATE_FILE" > tmp.json && mv tmp.json "$DEV_STATE_FILE"
        echo ""
        echo "Check log file for details: $log_file"
    fi
}

# Show status
show_status() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  DEV WORKFLOW STATUS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    local current_prd=$(jq -r '.current.prd_id // "none"' "$DEV_STATE_FILE")
    local current_phase=$(jq -r '.current.phase // "idle"' "$DEV_STATE_FILE")

    if [ "$current_prd" = "none" ] || [ "$current_prd" = "null" ]; then
        echo "  No active work"
        echo ""
        echo "  Start with: ./dev.sh work <prd-id>"
    else
        local prd_file=$(find_prd_file "$current_prd")
        local prd_title=$(jq -r '.title' "$prd_file" 2>/dev/null || echo "Unknown")

        echo "  Current: $current_prd"
        echo "  Title: $prd_title"
        echo "  Phase: $current_phase"
        echo ""

        local lisa_status=$(jq -r '.phases.lisa.status' "$DEV_STATE_FILE")
        local ralph_status=$(jq -r '.phases.ralph.status' "$DEV_STATE_FILE")
        local ralph_iter=$(jq -r '.phases.ralph.iteration' "$DEV_STATE_FILE")
        local verify_status=$(jq -r '.phases.verification.status' "$DEV_STATE_FILE")

        echo "  Phases:"
        echo "    Lisa:         $lisa_status"
        echo "    Ralph:        $ralph_status (iteration: $ralph_iter)"
        echo "    Verification: $verify_status"
    fi

    echo ""

    # Backlog summary
    local bug_count=$(find "$BACKLOG_DIR/bugs" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    local feature_count=$(find "$BACKLOG_DIR/features" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
    local enh_count=$(find "$BACKLOG_DIR/enhancements" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')

    echo "  Backlog: $bug_count bugs, $feature_count features, $enh_count enhancements"
    echo ""
}

# Main command handler
init_dev_state

case "${1:-}" in
    add)
        if [ -z "${2:-}" ] || [ -z "${3:-}" ]; then
            echo -e "${RED}Usage: ./dev.sh add <type> <title>${NC}"
            echo "Types: feature, bug, enhancement"
            exit 1
        fi
        add_prd "$2" "$3"
        ;;
    list)
        list_backlog "${2:-all}"
        ;;
    work)
        if [ -z "${2:-}" ]; then
            echo -e "${RED}Usage: ./dev.sh work <prd-id>${NC}"
            exit 1
        fi
        work_on_prd "$2"
        ;;
    status)
        show_status
        ;;
    verify)
        echo "Running verification only..."
        # TODO: Implement standalone verification
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        ;;
esac
