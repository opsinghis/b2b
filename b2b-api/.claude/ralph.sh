#!/bin/bash
# Ralph Loop Execution Script - B2B API
# Usage: ./.claude/ralph.sh [--max-iterations N] [--resume] [--verify-tests]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
EXECUTION_DIR="$SCRIPT_DIR/execution"

MAX_ITERATIONS=${MAX_ITERATIONS:-100}
STATE_FILE="$EXECUTION_DIR/state.json"
BLOCKERS_FILE="$EXECUTION_DIR/blockers.json"
PROMPT_FILE="$EXECUTION_DIR/PROMPT.md"
LOG_DIR="$SCRIPT_DIR/logs"

mkdir -p "$LOG_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_LOG="$LOG_DIR/ralph-$TIMESTAMP.log"
CHECKPOINT_LOG="$LOG_DIR/checkpoints-$TIMESTAMP.log"

echo "=============================================="
echo "  Ralph Loop - B2B API"
echo "=============================================="
echo "Project: $PROJECT_DIR"
echo "Output Log: $OUTPUT_LOG"
echo "Checkpoint Log: $CHECKPOINT_LOG"
echo ""

# Check dependencies
command -v claude >/dev/null 2>&1 || { echo "Error: claude CLI not found"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "Error: jq not found"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "Error: git not found"; exit 1; }

# Parse arguments
VERIFY_TESTS=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --max-iterations) MAX_ITERATIONS="$2"; shift 2 ;;
        --verify-tests) VERIFY_TESTS=true; shift ;;
        --resume)
            jq '.flags.needs_human_intervention = false' "$STATE_FILE" > tmp.json && mv tmp.json "$STATE_FILE"
            echo "Resumed from previous state"
            shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Check for human intervention flag
needs_human=$(jq -r '.flags.needs_human_intervention' "$STATE_FILE")
if [ "$needs_human" = "true" ]; then
    reason=$(jq -r '.flags.intervention_reason' "$STATE_FILE")
    echo "ERROR: Human intervention required"
    echo "Reason: $reason"
    echo ""
    echo "After resolving, run: ./.claude/ralph.sh --resume"
    exit 2
fi

# Initialize git if not already
cd "$PROJECT_DIR"
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
    git add -A
    git commit -m "Initial commit: Project setup

Generated with Claude Code (Ralph Loop)
"
fi

# Function to log checkpoint
log_checkpoint() {
    local message="$1"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] $message" >> "$CHECKPOINT_LOG"
}

# Function to verify all tests pass
verify_all_tests() {
    echo "Verifying all test gates..."

    local unit_status=$(jq -r '.test_gates.unit.status' "$STATE_FILE")
    local integration_status=$(jq -r '.test_gates.integration.status' "$STATE_FILE")
    local e2e_status=$(jq -r '.test_gates.e2e.status' "$STATE_FILE")

    if [ "$unit_status" != "passed" ]; then
        echo "  Unit tests: $unit_status"
        return 1
    fi

    if [ "$integration_status" != "passed" ] && [ "$integration_status" != "skipped" ]; then
        echo "  Integration tests: $integration_status"
        return 1
    fi

    if [ "$e2e_status" != "passed" ] && [ "$e2e_status" != "skipped" ]; then
        echo "  E2E tests: $e2e_status"
        return 1
    fi

    echo "  All required test gates passed"
    return 0
}

# Function to show progress
show_progress() {
    local completed=$(jq -r '.progress.completed' "$STATE_FILE")
    local total=$(jq -r '.progress.total_items' "$STATE_FILE")
    local current_prd=$(jq -r '.current.prd_item // "none"' "$STATE_FILE")
    local subtask_completed=$(jq -r '.subtasks.completed // 0' "$STATE_FILE")
    local subtask_total=$(jq -r '.subtasks.total // 0' "$STATE_FILE")
    local checkpoints=$(jq -r '.checkpoints.checkpoint_count // 0' "$STATE_FILE")

    echo "-------------------------------------------"
    echo "  Progress: $completed/$total PRD items complete"
    echo "  Current: $current_prd"
    if [ "$subtask_total" -gt 0 ]; then
        echo "  Subtasks: $subtask_completed/$subtask_total"
    fi
    echo "  Checkpoints: $checkpoints"
    echo "-------------------------------------------"
}

# Update session start time
jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.session.started_at = $ts' "$STATE_FILE" > tmp.json && mv tmp.json "$STATE_FILE"

iteration=0
while [ "$iteration" -lt "$MAX_ITERATIONS" ]; do
    iteration=$((iteration + 1))
    echo ""
    echo "=== Iteration $iteration of $MAX_ITERATIONS ==="
    show_progress

    # Update iteration count
    jq --argjson iter "$iteration" '.session.iterations_this_session = $iter' "$STATE_FILE" > tmp.json && mv tmp.json "$STATE_FILE"

    # Run Claude with the prompt
    OUTPUT=$(cat "$PROMPT_FILE" | claude --print 2>&1) || true
    echo "$OUTPUT" >> "$OUTPUT_LOG"

    # Check for completion
    if echo "$OUTPUT" | grep -q "<promise>COMPLETE:PRD-"; then
        PRD_ID=$(echo "$OUTPUT" | grep -oP '<promise>COMPLETE:\KPRD-[0-9]+' || echo "")

        if [ -z "$PRD_ID" ]; then
            echo "Warning: Could not parse PRD ID from completion signal"
            continue
        fi

        # Verify tests before accepting completion
        if [ "$VERIFY_TESTS" = true ]; then
            if ! verify_all_tests; then
                echo "Warning: Completion rejected - test gates not satisfied"
                echo "Run tests manually or let Claude retry"
                continue
            fi
        fi

        echo "Completed: $PRD_ID"
        log_checkpoint "COMPLETED: $PRD_ID"

        # Update state
        jq --arg prd "$PRD_ID" '
            .completed_items += [$prd] |
            .progress.completed += 1 |
            .progress.pending -= 1 |
            .progress.in_progress = 0 |
            .current.prd_item = null |
            .current.status = "not_started" |
            .subtasks = {"prd_item": null, "total": 0, "completed": 0, "current_subtask": null, "checklist": []} |
            .test_gates = {
                "unit": {"status": "pending", "passed": 0, "failed": 0, "coverage": 0},
                "integration": {"status": "pending", "passed": 0, "failed": 0},
                "e2e": {"status": "pending", "passed": 0, "failed": 0},
                "performance": {"status": "pending", "p95_ms": null, "threshold_ms": 200},
                "load": {"status": "pending", "rps": null, "error_rate": null}
            }
        ' "$STATE_FILE" > tmp.json && mv tmp.json "$STATE_FILE"

        # Check if all done
        pending=$(jq -r '.progress.pending' "$STATE_FILE")
        if [ "$pending" -eq 0 ]; then
            echo ""
            echo "ALL PRD ITEMS COMPLETE!"
            echo ""
            show_progress
            log_checkpoint "ALL COMPLETE"
            exit 0
        fi
        continue
    fi

    # Check for checkpoint signal (continuing work)
    if echo "$OUTPUT" | grep -q "<checkpoint>"; then
        CHECKPOINT_MSG=$(echo "$OUTPUT" | grep -oP '<checkpoint>\K[^<]+' || echo "Checkpoint")
        echo "Checkpoint: $CHECKPOINT_MSG"
        log_checkpoint "$CHECKPOINT_MSG"

        # Increment session checkpoint count
        jq '.session.checkpoints_this_session += 1' "$STATE_FILE" > tmp.json && mv tmp.json "$STATE_FILE"

        sleep 1
        continue
    fi

    # Check for blockers
    if echo "$OUTPUT" | grep -q "<blocked>"; then
        BLOCKER=$(echo "$OUTPUT" | grep -oP '<blocked>\K[^<]+' || echo "Unknown blocker")
        echo "Blocker: $BLOCKER"
        log_checkpoint "BLOCKED: $BLOCKER"

        # Get current retry count
        current_prd=$(jq -r '.current.prd_item // "unknown"' "$STATE_FILE")
        retry_count=$(jq -r --arg prd "$current_prd" '
            .active_blockers[] | select(.prd_item == $prd) | .retry_count // 0
        ' "$BLOCKERS_FILE" 2>/dev/null || echo "0")
        retry_count=$((retry_count + 1))

        # Update blockers file
        jq --arg prd "$current_prd" --arg blocker "$BLOCKER" --argjson retry "$retry_count" '
            if (.active_blockers | map(select(.prd_item == $prd)) | length) > 0 then
                .active_blockers = [.active_blockers[] | if .prd_item == $prd then .retry_count = $retry | .description = $blocker | .last_attempt = (now | todate) else . end]
            else
                .active_blockers += [{"prd_item": $prd, "description": $blocker, "retry_count": $retry, "first_seen": (now | todate), "last_attempt": (now | todate)}]
            end
        ' "$BLOCKERS_FILE" > tmp.json && mv tmp.json "$BLOCKERS_FILE"

        if [ "$retry_count" -ge 3 ]; then
            echo "Max retries (3) reached - escalating to human"
            log_checkpoint "ESCALATED: $current_prd after 3 retries"
            jq --arg reason "PRD $current_prd blocked after 3 attempts: $BLOCKER" '
                .flags.needs_human_intervention = true |
                .flags.intervention_reason = $reason
            ' "$STATE_FILE" > tmp.json && mv tmp.json "$STATE_FILE"

            # Move to escalated
            jq --arg prd "$current_prd" '
                .escalated_to_human += [.active_blockers[] | select(.prd_item == $prd)] |
                .active_blockers = [.active_blockers[] | select(.prd_item != $prd)]
            ' "$BLOCKERS_FILE" > tmp.json && mv tmp.json "$BLOCKERS_FILE"

            exit 2
        fi

        echo "Retry $retry_count of 3"
    fi

    # Check for clarification needed
    if echo "$OUTPUT" | grep -q "<clarification>"; then
        QUESTION=$(echo "$OUTPUT" | grep -oP '<clarification>\K[^<]+' || echo "Clarification needed")
        echo "Clarification needed: $QUESTION"
        log_checkpoint "CLARIFICATION: $QUESTION"

        jq --arg reason "Clarification needed: $QUESTION" '
            .flags.needs_human_intervention = true |
            .flags.intervention_reason = $reason
        ' "$STATE_FILE" > tmp.json && mv tmp.json "$STATE_FILE"
        exit 2
    fi

    sleep 2
done

echo "Max iterations ($MAX_ITERATIONS) reached"
log_checkpoint "MAX ITERATIONS REACHED"
exit 1
