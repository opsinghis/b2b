#!/bin/bash
# Ralph Loop Execution Script - B2B API
# Usage: ./.claude/ralph.sh [--reset] [--status] [--resume] [--retry-blockers] [--verify-tests] [--max-iterations N]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
EXECUTION_DIR="$SCRIPT_DIR/execution"

# Default: run until complete (very high number)
MAX_ITERATIONS=${MAX_ITERATIONS:-10000}
STATE_FILE="$EXECUTION_DIR/state.json"
BLOCKERS_FILE="$EXECUTION_DIR/blockers.json"
PROMPT_FILE="$EXECUTION_DIR/PROMPT.md"
PRD_FILE="$EXECUTION_DIR/prd.json"
LOG_DIR="$SCRIPT_DIR/logs"
PROGRESS_FILE="$EXECUTION_DIR/progress.txt"

mkdir -p "$LOG_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_LOG="$LOG_DIR/ralph-$TIMESTAMP.log"
CHECKPOINT_LOG="$LOG_DIR/checkpoints-$TIMESTAMP.log"

# ANSI colors for terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to initialize a new project from scratch
init_project() {
    echo ""
    echo "=============================================="
    echo "  INIT - Initialize New Project"
    echo "=============================================="
    echo ""

    # Verify .claude folder exists with required files
    if [ ! -f "$EXECUTION_DIR/prd.json" ]; then
        echo "Error: prd.json not found. Cannot initialize without PRD definitions."
        exit 1
    fi

    if [ ! -f "$EXECUTION_DIR/PROMPT.md" ]; then
        echo "Error: PROMPT.md not found. Cannot initialize without Claude prompt."
        exit 1
    fi

    echo "This will initialize a new project for building from scratch."
    echo ""
    echo "The Ralph Loop will generate everything from PRD definitions:"
    echo "  - PRD-000: NestJS scaffold, package.json, configs"
    echo "  - PRD-001: Jest testing infrastructure"
    echo "  - PRD-004: Prisma database setup"
    echo "  - PRD-005/006: Docker Compose files"
    echo "  - And all other modules..."
    echo ""
    echo "Required: .claude/ folder with planning and execution artifacts"
    echo ""

    # Check for seed data
    if [ -f "$SCRIPT_DIR/planning/data/cleaned_products.json" ]; then
        echo "✓ Seed data found: cleaned_products.json"
    else
        echo "⚠ No seed data found (optional)"
    fi

    echo ""
    read -p "Continue? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        echo "Aborted."
        exit 0
    fi

    echo ""
    echo "Initializing project..."

    # Initialize git if not already
    cd "$PROJECT_DIR"
    if [ ! -d ".git" ]; then
        git init
        echo "  ✓ Initialized git repository"
    else
        echo "  ✓ Git repository exists"
    fi

    # Create CLAUDE.md if it doesn't exist
    if [ ! -f "$PROJECT_DIR/CLAUDE.md" ]; then
        cat > "$PROJECT_DIR/CLAUDE.md" << 'CLAUDEMD'
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **🚀 Quick Start:** Read `.claude/CONTEXT.md` first for immediate application understanding (modules, patterns, decisions). This reduces context-building time significantly.

## Project Overview

**B2B API** — Backend API service for the B2B Operations Platform. Built with NestJS, providing REST APIs.

## Development Methodology

This project uses the **Hybrid Lisa/Ralph Loop** approach.

**Key Files:**
- **`.claude/CONTEXT.md`** — **READ THIS FIRST** - Application context summary
- `.claude/planning/spec.md` — Feature specifications
- `.claude/planning/plan.md` — Implementation patterns
- `.claude/execution/prd.json` — PRD items with completion criteria

## Building from Scratch

This project is built entirely from PRD definitions using Ralph Loop:

```bash
./.claude/ralph.sh
```

All code, configs, and infrastructure are generated based on PRD completion criteria.

CLAUDEMD
        echo "  ✓ Created CLAUDE.md"
    else
        echo "  ✓ CLAUDE.md exists"
    fi

    # Reset state to start fresh
    reset_state

    # Reset CONTEXT.md
    reset_context_file

    echo ""
    echo "=============================================="
    echo "  INIT COMPLETE"
    echo "=============================================="
    echo ""
    echo "Next step - Start the Ralph Loop:"
    echo "  ./.claude/ralph.sh"
    echo ""
    echo "The loop will build everything from PRD-000 onwards."
    echo ""
}

# Function to do a full reset (code + state + docker + logs)
full_reset() {
    echo ""
    echo "=============================================="
    echo "  FULL RESET - Rebuild from Scratch"
    echo "=============================================="
    echo ""

    # Safety check - ensure we're in the right directory
    if [ ! -f "$PROJECT_DIR/CLAUDE.md" ]; then
        echo "Error: Not in b2b-api project directory"
        exit 1
    fi

    # Confirm with user
    echo "This will REMOVE everything except .claude/ folder:"
    echo "  - src/, test/, dist/, node_modules/"
    echo "  - prisma/, docker/, .github/, .husky/"
    echo "  - package.json, tsconfig.json, jest.config.js"
    echo "  - .eslintrc.js, .prettierrc, .gitignore"
    echo "  - .env, nest-cli.json, CLAUDE.md"
    echo "  - Docker containers and volumes"
    echo "  - All logs"
    echo ""
    echo "PRESERVED (in .claude/ folder):"
    echo "  - .claude/planning/ (spec.md, plan.md, prd.json)"
    echo "  - .claude/planning/data/ (seed data)"
    echo "  - .claude/execution/ (state, blockers)"
    echo "  - .claude/ralph.sh"
    echo ""
    echo "Everything will be regenerated from PRD definitions."
    echo ""
    read -p "Are you sure? (type 'yes' to confirm): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Aborted."
        exit 0
    fi

    echo ""
    echo "Step 1/6: Creating git backup tag..."
    cd "$PROJECT_DIR"
    if git diff --quiet && git diff --cached --quiet; then
        git tag -f "pre-reset-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
        echo "  ✓ Tagged current state"
    else
        echo "  ⚠ Uncommitted changes - committing first..."
        git add -A
        git commit -m "Pre-reset backup: $(date)" || true
        git tag -f "pre-reset-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
    fi

    echo ""
    echo "Step 2/6: Stopping Docker containers..."
    if [ -f "$PROJECT_DIR/docker/docker-compose.yml" ]; then
        docker-compose -f "$PROJECT_DIR/docker/docker-compose.yml" down -v 2>/dev/null || true
        echo "  ✓ Containers stopped and volumes removed"
    else
        echo "  ⏭ No docker-compose.yml found"
    fi

    echo ""
    echo "Step 3/6: Removing ALL generated files..."

    # Application code
    rm -rf "$PROJECT_DIR/src" && echo "  ✓ Removed src/"
    rm -rf "$PROJECT_DIR/test" && echo "  ✓ Removed test/"
    rm -rf "$PROJECT_DIR/dist" && echo "  ✓ Removed dist/"
    rm -rf "$PROJECT_DIR/node_modules" && echo "  ✓ Removed node_modules/"

    # Prisma (keep seed.ts is in .claude/planning/data now)
    rm -rf "$PROJECT_DIR/prisma" && echo "  ✓ Removed prisma/"

    # Docker
    rm -rf "$PROJECT_DIR/docker" && echo "  ✓ Removed docker/"

    # GitHub & Husky
    rm -rf "$PROJECT_DIR/.github" && echo "  ✓ Removed .github/"
    rm -rf "$PROJECT_DIR/.husky" && echo "  ✓ Removed .husky/"

    # Config files (all generated by PRD-000)
    rm -f "$PROJECT_DIR/package.json" "$PROJECT_DIR/package-lock.json" && echo "  ✓ Removed package.json"
    rm -f "$PROJECT_DIR/tsconfig.json" "$PROJECT_DIR/tsconfig.build.json" && echo "  ✓ Removed tsconfig files"
    rm -f "$PROJECT_DIR/jest.config.js" && echo "  ✓ Removed jest.config.js"
    rm -f "$PROJECT_DIR/.eslintrc.js" && echo "  ✓ Removed .eslintrc.js"
    rm -f "$PROJECT_DIR/.prettierrc" "$PROJECT_DIR/.prettierignore" && echo "  ✓ Removed prettier configs"
    rm -f "$PROJECT_DIR/.gitignore" && echo "  ✓ Removed .gitignore"
    rm -f "$PROJECT_DIR/.env" "$PROJECT_DIR/.env.example" && echo "  ✓ Removed .env files"
    rm -f "$PROJECT_DIR/nest-cli.json" && echo "  ✓ Removed nest-cli.json"
    rm -f "$PROJECT_DIR/.testcontainers.properties" && echo "  ✓ Removed .testcontainers.properties"
    rm -f "$PROJECT_DIR/CLAUDE.md" && echo "  ✓ Removed CLAUDE.md"

    # Coverage & build artifacts
    rm -rf "$PROJECT_DIR/coverage" 2>/dev/null || true
    rm -rf "$PROJECT_DIR/coverage-"* 2>/dev/null || true
    rm -rf "$PROJECT_DIR/.nyc_output" 2>/dev/null || true
    rm -f "$PROJECT_DIR/openapi.json" "$PROJECT_DIR/openapi.yaml" 2>/dev/null || true

    echo ""
    echo "Step 4/6: Clearing logs..."
    rm -rf "$LOG_DIR"/*.log 2>/dev/null || true
    mkdir -p "$LOG_DIR"
    echo "  ✓ Logs cleared"

    echo ""
    echo "Step 5/6: Resetting state files..."
    reset_state

    echo ""
    echo "Step 6/6: Resetting CONTEXT.md..."
    reset_context_file

    echo ""
    echo "=============================================="
    echo "  FULL RESET COMPLETE"
    echo "=============================================="
    echo ""
    echo "To rebuild the application:"
    echo "  ./.claude/ralph.sh"
    echo ""
    echo "To recover previous state:"
    echo "  git checkout pre-reset-YYYYMMDD-HHMMSS"
    echo ""
}

# Function to reset CONTEXT.md to template
reset_context_file() {
    local context_file="$SCRIPT_DIR/CONTEXT.md"
    cat > "$context_file" << 'CONTEXTEOF'
# Application Context Summary

> **Living document** — Updated after every feature, bug fix, or improvement. Provides Claude with immediate context, reducing codebase exploration and token usage.

**Last Updated:** _Not yet built_
**Build Status:** Starting fresh rebuild
**Test Status:** No tests yet

---

## 🚀 Recent Changes (Last 5)

| Date | Type | Summary | Files Changed |
|------|------|---------|---------------|
| _None yet_ | - | - | - |

---

## 🔄 In Progress

| Task | Started | Assignee | Notes |
|------|---------|----------|-------|
| Full rebuild | Now | Claude | Starting from PRD-000 |

---

## 🐛 Known Issues / Tech Debt

| ID | Type | Description | Priority | Module |
|----|------|-------------|----------|--------|
| _None yet_ | - | - | - | - |

---

## Module Inventory

_Modules will be added as they are built during the Ralph Loop execution._

### Core Modules (`src/core/`)

| Module | Status | Key Files | Purpose |
|--------|--------|-----------|---------|
| _To be built_ | ⏳ Pending | - | - |

### Business Modules (`src/business/`)

| Module | Status | Key Files | Purpose |
|--------|--------|-----------|---------|
| _To be built_ | ⏳ Pending | - | - |

### Platform Modules (`src/platform/`)

| Module | Status | Key Files | Purpose |
|--------|--------|-----------|---------|
| _To be built_ | ⏳ Pending | - | - |

### Agentic Layer (`src/agentic/`)

| Module | Status | Key Files | Purpose |
|--------|--------|-----------|---------|
| _To be built_ | ⏳ Pending | - | - |

---

## Database Schema Summary

_Schema will be documented as Prisma models are created._

---

## Key Architecture Decisions

_Decisions will be documented as they are made during implementation._

---

## Test Infrastructure

_Test infrastructure will be documented after PRD-001 through PRD-003._

---

## Seed Data

### Location
`.claude/planning/data/cleaned_products.json` (9,488 products, 23MB)

_This data will be imported during `npm run prisma:seed` after the Master Catalog module is built._

---

## Common Patterns

_Patterns will be documented as they are established._

---

## 📋 Changelog

### _Rebuild Started_

Starting fresh rebuild using Ralph Loop.
All code will be regenerated from PRD items.
Planning artifacts preserved from previous build.

CONTEXTEOF
    echo "  ✓ CONTEXT.md reset to template"
}

# Function to reset state
reset_state() {
    echo "Resetting state..."

    cat > "$STATE_FILE" << 'STATEEOF'
{
  "project": "b2b-api",
  "version": "2.0.0",
  "current": {
    "phase": "phase-0",
    "phase_name": "Foundation & Testing Infrastructure",
    "prd_item": null,
    "status": "not_started",
    "iteration": 0,
    "max_iterations": 10
  },
  "subtasks": {
    "prd_item": null,
    "total": 0,
    "completed": 0,
    "current_subtask": null,
    "checklist": []
  },
  "test_gates": {
    "unit": {"status": "pending", "passed": 0, "failed": 0, "coverage": 0},
    "integration": {"status": "pending", "passed": 0, "failed": 0},
    "e2e": {"status": "pending", "passed": 0, "failed": 0},
    "performance": {"status": "pending", "p95_ms": null, "threshold_ms": 200},
    "load": {"status": "pending", "rps": null, "error_rate": null}
  },
  "checkpoints": {
    "last_checkpoint": null,
    "last_commit_sha": null,
    "checkpoint_count": 0
  },
  "progress": {
    "total_items": 32,
    "completed": 0,
    "in_progress": 0,
    "blocked": 0,
    "pending": 32
  },
  "completed_items": [],
  "blocked_items": [],
  "session": {
    "started_at": null,
    "iterations_this_session": 0
  },
  "flags": {
    "needs_human_intervention": false,
    "intervention_reason": null,
    "all_tests_required": true
  }
}
STATEEOF

    cat > "$BLOCKERS_FILE" << 'BLOCKERSEOF'
{
  "schema_version": "1.0",
  "max_retries": 3,
  "active_blockers": [],
  "resolved_blockers": [],
  "escalated_to_human": []
}
BLOCKERSEOF

    echo "State reset complete!"
    echo "  - state.json: Reset to 0/29 PRDs"
    echo "  - blockers.json: Cleared all blockers"
}

# Function to show status
show_status() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  RALPH LOOP STATUS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local completed=$(jq -r '.progress.completed' "$STATE_FILE")
    local total=$(jq -r '.progress.total_items' "$STATE_FILE")
    local blocked=$(jq -r '.progress.blocked' "$STATE_FILE")
    local pending=$(jq -r '.progress.pending' "$STATE_FILE")
    local current_prd=$(jq -r '.current.prd_item // "none"' "$STATE_FILE")
    local current_phase=$(jq -r '.current.phase_name // "unknown"' "$STATE_FILE")
    local current_status=$(jq -r '.current.status // "unknown"' "$STATE_FILE")
    local needs_human=$(jq -r '.flags.needs_human_intervention' "$STATE_FILE")
    local checkpoints=$(jq -r '.checkpoints.checkpoint_count // 0' "$STATE_FILE")

    # Subtask info
    local subtask_completed=$(jq -r '.subtasks.completed // 0' "$STATE_FILE")
    local subtask_total=$(jq -r '.subtasks.total // 0' "$STATE_FILE")
    local current_subtask=$(jq -r '.subtasks.current_subtask // "none"' "$STATE_FILE")

    local percent=$((completed * 100 / total))

    echo ""
    echo "  Progress: $completed / $total PRD items ($percent%)"
    echo "  Phase: $current_phase"
    echo ""

    # Current work section
    if [ "$current_prd" != "none" ] && [ "$current_prd" != "null" ]; then
        echo "  ┌─ CURRENTLY WORKING ON ─────────────────────"
        echo "  │ PRD: $current_prd ($current_status)"
        if [ "$subtask_total" -gt 0 ]; then
            echo "  │ Subtasks: $subtask_completed / $subtask_total"
            echo "  │ Current: $current_subtask"
            echo "  │"
            echo "  │ Subtask checklist:"
            jq -r '.subtasks.checklist[] | "  │   " + (if .status == "completed" then "✓" else "○" end) + " " + .task' "$STATE_FILE"
        fi
        echo "  └─────────────────────────────────────────────"
        echo ""
    fi

    echo "  Blocked: $blocked | Pending: $pending | Checkpoints: $checkpoints"
    echo ""

    if [ "$needs_human" = "true" ]; then
        local reason=$(jq -r '.flags.intervention_reason' "$STATE_FILE")
        echo "  ⚠️  NEEDS HUMAN INTERVENTION"
        echo "  Reason: $reason"
        echo ""
        echo "  Run: ./.claude/ralph.sh --resume"
    fi

    if [ "$blocked" -gt 0 ]; then
        echo "  Blocked items:"
        jq -r '.blocked_items[]' "$STATE_FILE" | while read item; do
            echo "    - $item"
        done
        echo ""
        echo "  Run: ./.claude/ralph.sh --retry-blockers"
    fi

    if [ "$completed" -gt 0 ]; then
        echo "  Completed PRDs:"
        jq -r '.completed_items[]' "$STATE_FILE" | while read item; do
            echo "    ✓ $item"
        done
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ============================================================================
# FRONTEND API GAP PROCESSING
# ============================================================================

GAPS_DIR="$SCRIPT_DIR/api-gaps"
mkdir -p "$GAPS_DIR"

list_frontend_gaps() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  FRONTEND API GAP REQUESTS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    local gap_files=$(find "$GAPS_DIR" -name "GAP-*.json" 2>/dev/null)

    if [ -z "$gap_files" ]; then
        echo "  No gap requests found."
        echo ""
        return 0
    fi

    local open=0
    local resolved=0

    for gap_file in $gap_files; do
        local gap_id=$(jq -r '.id' "$gap_file")
        local status=$(jq -r '.status' "$gap_file")
        local endpoint=$(jq -r '.endpoint.method + " " + .endpoint.path' "$gap_file")
        local requested_by=$(jq -r '.requested_by' "$gap_file")

        if [ "$status" = "open" ]; then
            echo -e "  ${YELLOW}○${NC} $gap_id: $endpoint (from $requested_by)"
            ((open++))
        else
            echo -e "  ${GREEN}✓${NC} $gap_id: $endpoint [$status]"
            ((resolved++))
        fi
    done

    echo ""
    echo "  Open: $open | Resolved: $resolved"
    echo ""
}

process_frontend_gaps() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  PROCESSING FRONTEND API GAPS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    local gap_files=$(find "$GAPS_DIR" -name "GAP-*.json" -exec jq -r 'select(.status == "open") | input_filename' {} \; 2>/dev/null)

    if [ -z "$gap_files" ]; then
        echo "  No open gap requests to process."
        return 0
    fi

    # Generate API build prompt
    local api_prompt="$EXECUTION_DIR/GAP-PROMPT.md"

    cat > "$api_prompt" << 'PROMPTHEADER'
# API Gap Resolution Task

The frontend has requested the following APIs. Build each one.

PROMPTHEADER

    for gap_file in $(find "$GAPS_DIR" -name "GAP-*.json" 2>/dev/null); do
        local status=$(jq -r '.status' "$gap_file")
        if [ "$status" != "open" ]; then
            continue
        fi

        local gap_id=$(jq -r '.id' "$gap_file")
        local method=$(jq -r '.endpoint.method' "$gap_file")
        local path=$(jq -r '.endpoint.path' "$gap_file")
        local desc=$(jq -r '.endpoint.description' "$gap_file")
        local requested_by=$(jq -r '.requested_by' "$gap_file")

        cat >> "$api_prompt" << EOF

## $gap_id: $method $path

- **Requested by:** $requested_by
- **Description:** $desc

### Implementation Requirements
1. Create/update the appropriate module
2. Add proper validation (class-validator)
3. Add Swagger documentation
4. Write unit tests
5. Write integration tests

### When Complete
Mark the gap as resolved:
\`\`\`
<gap-resolved>$gap_id</gap-resolved>
\`\`\`

EOF
    done

    cat >> "$api_prompt" << 'PROMPTFOOTER'

---

## General Guidelines

- Follow existing patterns in the codebase
- All endpoints must be tenant-scoped
- Add proper RBAC permissions
- Update OpenAPI spec (auto via Swagger decorators)

## After All Gaps Resolved

Run tests:
```bash
npm run test
npm run test:integration
```

Verify OpenAPI:
```bash
curl http://localhost:3000/docs-json | jq '.paths | keys'
```
PROMPTFOOTER

    echo "Generated: $api_prompt"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  NEXT STEPS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  1. Review the prompt: $api_prompt"
    echo ""
    echo "  2. Build each API (Claude will process this)"
    echo ""
    echo "  3. For each completed API, update the gap file:"
    echo "     jq '.status = \"resolved\"' GAP-XXX.json > tmp && mv tmp GAP-XXX.json"
    echo ""
    echo "  4. Return to frontend to continue:"
    echo "     cd ../b2b-web && ./.claude/ralph.sh"
    echo ""

    # Start processing interactively
    echo "Start processing gaps now? (y/n)"
    read -r response

    if [ "$response" = "y" ]; then
        for gap_file in $(find "$GAPS_DIR" -name "GAP-*.json" 2>/dev/null); do
            local status=$(jq -r '.status' "$gap_file")
            if [ "$status" != "open" ]; then
                continue
            fi

            local gap_id=$(jq -r '.id' "$gap_file")
            local endpoint=$(jq -r '.endpoint.method + " " + .endpoint.path' "$gap_file")

            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "  Processing: $gap_id - $endpoint"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "  Implement this API, then enter:"
            echo "    'done'  - Mark as resolved"
            echo "    'skip'  - Skip for now"
            echo "    'quit'  - Stop processing"
            echo ""
            read -p "  Status: " gap_status

            case "$gap_status" in
                done|resolved)
                    jq '.status = "resolved" | .resolved_at = (now | todate)' "$gap_file" > tmp.json && mv tmp.json "$gap_file"
                    echo -e "  ${GREEN}✓${NC} $gap_id marked as resolved"
                    ;;
                quit)
                    echo "Stopped processing."
                    return 0
                    ;;
                *)
                    echo "  Skipped."
                    ;;
            esac
        done

        echo ""
        echo "Gap processing complete!"
        list_frontend_gaps
    fi
}

# Parse arguments
VERIFY_TESTS=false
RETRY_BLOCKERS=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --max-iterations) MAX_ITERATIONS="$2"; shift 2 ;;
        --verify-tests) VERIFY_TESTS=true; shift ;;
        --retry-blockers) RETRY_BLOCKERS=true; shift ;;
        --reset)
            reset_state
            exit 0 ;;
        --full-reset)
            full_reset
            exit 0 ;;
        --init)
            init_project
            exit 0 ;;
        --status)
            show_status
            exit 0 ;;
        --resume)
            jq '.flags.needs_human_intervention = false' "$STATE_FILE" > tmp.json && mv tmp.json "$STATE_FILE"
            echo "Resumed from previous state"
            shift ;;
        --process-gaps)
            process_frontend_gaps
            exit 0 ;;
        --list-gaps)
            list_frontend_gaps
            exit 0 ;;
        --help)
            echo "Usage: ./.claude/ralph.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --init            Initialize new project (for new engineers with only .claude/ folder)"
            echo "  --reset           Reset state files only (state.json, blockers.json)"
            echo "  --full-reset      FULL RESET: Remove all code, docker, logs, rebuild from scratch"
            echo "  --status          Show current progress status"
            echo "  --resume          Clear intervention flag and continue"
            echo "  --retry-blockers  Retry all blocked PRD items"
            echo "  --verify-tests    Require all tests pass before completion"
            echo "  --max-iterations N  Set max iterations (default: 10000)"
            echo "  --process-gaps    Process API gap requests from frontend"
            echo "  --list-gaps       List pending API gap requests"
            echo "  --help            Show this help message"
            echo ""
            echo "New engineer (only has .claude/ folder):"
            echo "  ./.claude/ralph.sh --init"
            echo "  ./.claude/ralph.sh"
            echo ""
            echo "Rebuild from scratch (existing project):"
            echo "  ./.claude/ralph.sh --full-reset"
            echo "  ./.claude/ralph.sh"
            echo ""
            echo "Process frontend API requests:"
            echo "  ./.claude/ralph.sh --list-gaps"
            echo "  ./.claude/ralph.sh --process-gaps"
            echo ""
            echo "All code, configs, and infrastructure are generated from PRD definitions."
            exit 0 ;;
        *) echo "Unknown option: $1. Use --help for usage."; exit 1 ;;
    esac
done

# Helper: Extract text between tags (macOS compatible)
extract_tag() {
    local tag="$1"
    local text="$2"
    echo "$text" | sed -n "s/.*<${tag}>\([^<]*\)<\/${tag}>.*/\1/p" | head -1
}

# Helper: Check if tag exists
has_tag() {
    local tag="$1"
    local text="$2"
    echo "$text" | grep -q "<${tag}>"
}

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

# Function to update progress file (human readable)
update_progress_file() {
    local completed=$(jq -r '.progress.completed' "$STATE_FILE")
    local total=$(jq -r '.progress.total_items' "$STATE_FILE")
    local blocked=$(jq -r '.progress.blocked' "$STATE_FILE")
    local pending=$(jq -r '.progress.pending' "$STATE_FILE")
    local current_prd=$(jq -r '.current.prd_item // "none"' "$STATE_FILE")
    local current_phase=$(jq -r '.current.phase // "unknown"' "$STATE_FILE")
    local checkpoints=$(jq -r '.checkpoints.checkpoint_count // 0' "$STATE_FILE")
    local completed_items=$(jq -r '.completed_items | join(", ")' "$STATE_FILE")
    local blocked_items=$(jq -r '.blocked_items | join(", ")' "$STATE_FILE")

    cat > "$PROGRESS_FILE" << EOF
# Ralph Loop Progress - B2B API
# Last Updated: $(date +"%Y-%m-%d %H:%M:%S")

## Summary
- Completed: $completed / $total PRD items ($(( completed * 100 / total ))%)
- Blocked: $blocked
- Pending: $pending

## Current
- Phase: $current_phase
- PRD Item: $current_prd
- Checkpoints: $checkpoints

## Completed Items
$completed_items

## Blocked Items
$blocked_items

## Logs
- Output: $OUTPUT_LOG
- Checkpoints: $CHECKPOINT_LOG
EOF
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

# Function to show progress bar
show_progress_bar() {
    local completed=$1
    local total=$2
    local width=30
    local percent=$((completed * 100 / total))
    local filled=$((completed * width / total))
    local empty=$((width - filled))

    printf "["
    printf "%${filled}s" | tr ' ' '='
    printf "%${empty}s" | tr ' ' ' '
    printf "] %d%% (%d/%d)\n" "$percent" "$completed" "$total"
}

# Function to show progress
show_progress() {
    local completed=$(jq -r '.progress.completed' "$STATE_FILE")
    local total=$(jq -r '.progress.total_items' "$STATE_FILE")
    local blocked=$(jq -r '.progress.blocked' "$STATE_FILE")
    local current_prd=$(jq -r '.current.prd_item // "none"' "$STATE_FILE")
    local current_phase=$(jq -r '.current.phase_name // "unknown"' "$STATE_FILE")
    local subtask_completed=$(jq -r '.subtasks.completed // 0' "$STATE_FILE")
    local subtask_total=$(jq -r '.subtasks.total // 0' "$STATE_FILE")
    local checkpoints=$(jq -r '.checkpoints.checkpoint_count // 0' "$STATE_FILE")

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    printf "  Progress: "
    show_progress_bar "$completed" "$total"
    echo "  Phase: $current_phase"
    echo "  Current PRD: $current_prd"
    if [ "$subtask_total" -gt 0 ]; then
        printf "  Subtasks: "
        show_progress_bar "$subtask_completed" "$subtask_total"
    fi
    echo "  Blocked: $blocked | Checkpoints: $checkpoints"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Update progress file
    update_progress_file
}

# Function to skip to next PRD item
skip_to_next_prd() {
    local current_prd="$1"
    local reason="$2"

    echo "Skipping $current_prd - will retry in blocker phase"
    log_checkpoint "SKIPPED: $current_prd - $reason"

    # Add to blocked items
    jq --arg prd "$current_prd" '
        .blocked_items += [$prd] |
        .progress.blocked += 1 |
        .progress.in_progress = 0 |
        .current.prd_item = null |
        .current.status = "not_started" |
        .subtasks = {"prd_item": null, "total": 0, "completed": 0, "current_subtask": null, "checklist": []}
    ' "$STATE_FILE" > tmp.json && mv tmp.json "$STATE_FILE"
}

# Function to retry blocked items
retry_blocked_items() {
    echo ""
    echo "=============================================="
    echo "  BLOCKER RETRY PHASE"
    echo "=============================================="

    local blocked_count=$(jq -r '.blocked_items | length' "$STATE_FILE")

    if [ "$blocked_count" -eq 0 ]; then
        echo "No blocked items to retry"
        return 0
    fi

    echo "Retrying $blocked_count blocked items..."

    # Get blocked items
    local blocked_items=$(jq -r '.blocked_items[]' "$STATE_FILE")

    for prd in $blocked_items; do
        echo ""
        echo "--- Retrying: $prd ---"

        # Set as current
        jq --arg prd "$prd" '
            .current.prd_item = $prd |
            .current.status = "retrying" |
            .blocked_items = [.blocked_items[] | select(. != $prd)] |
            .progress.blocked -= 1
        ' "$STATE_FILE" > tmp.json && mv tmp.json "$STATE_FILE"

        # Run Claude with auto-accept permissions
        OUTPUT=$(cat "$PROMPT_FILE" | claude --print --dangerously-skip-permissions 2>&1) || true
        echo "$OUTPUT" >> "$OUTPUT_LOG"

        # Check result
        if has_tag "promise" "$OUTPUT"; then
            echo "Resolved: $prd"
            log_checkpoint "RESOLVED: $prd"

            jq --arg prd "$prd" '
                .completed_items += [$prd] |
                .progress.completed += 1 |
                .progress.pending -= 1 |
                .current.prd_item = null
            ' "$STATE_FILE" > tmp.json && mv tmp.json "$STATE_FILE"
        else
            echo "Still blocked: $prd - requires human intervention"
            log_checkpoint "STILL BLOCKED: $prd"

            # Add back to blocked
            jq --arg prd "$prd" '
                .blocked_items += [$prd] |
                .progress.blocked += 1 |
                .current.prd_item = null
            ' "$STATE_FILE" > tmp.json && mv tmp.json "$STATE_FILE"
        fi
    done
}

# Update session start time
jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.session.started_at = $ts' "$STATE_FILE" > tmp.json && mv tmp.json "$STATE_FILE"

# If retry-blockers mode, just do that
if [ "$RETRY_BLOCKERS" = true ]; then
    retry_blocked_items
    show_progress
    exit 0
fi

echo "Running until complete (max $MAX_ITERATIONS iterations as safety limit)"
echo ""

iteration=0
while [ "$iteration" -lt "$MAX_ITERATIONS" ]; do
    iteration=$((iteration + 1))

    # Check if already complete BEFORE running Claude
    pending=$(jq -r '.progress.pending' "$STATE_FILE")
    blocked=$(jq -r '.progress.blocked' "$STATE_FILE")

    if [ "$pending" -le 0 ] && [ "$blocked" -le 0 ]; then
        echo ""
        echo -e "${GREEN}════════════════════════════════════════${NC}"
        echo -e "${GREEN}  ALL PRD ITEMS COMPLETE!${NC}"
        echo -e "${GREEN}════════════════════════════════════════${NC}"
        show_progress
        log_checkpoint "ALL COMPLETE"
        exit 0
    fi

    # Show progress (not iteration count)
    show_progress

    # Update iteration count in state
    jq --argjson iter "$iteration" '.session.iterations_this_session = $iter' "$STATE_FILE" > tmp.json && mv tmp.json "$STATE_FILE"

    # Run Claude with auto-accept permissions
    echo "Running Claude..."
    OUTPUT=$(cat "$PROMPT_FILE" | claude --print --dangerously-skip-permissions 2>&1) || true
    echo "$OUTPUT" >> "$OUTPUT_LOG"

    # Check for completion
    if has_tag "promise" "$OUTPUT"; then
        PRD_ID=$(extract_tag "promise" "$OUTPUT" | sed 's/COMPLETE://')

        if [ -z "$PRD_ID" ]; then
            echo "Warning: Could not parse PRD ID from completion signal"
            continue
        fi

        # Skip non-PRD completion signals (like "ALL-PRDS")
        if [[ ! "$PRD_ID" =~ ^PRD-[0-9]+$ ]]; then
            echo "Info: Received completion signal '$PRD_ID' - checking if all done"
            pending=$(jq -r '.progress.pending' "$STATE_FILE")
            if [ "$pending" -le 0 ]; then
                echo ""
                echo -e "${GREEN}════════════════════════════════════════${NC}"
                echo -e "${GREEN}  ALL PRD ITEMS COMPLETE!${NC}"
                echo -e "${GREEN}════════════════════════════════════════${NC}"
                show_progress
                log_checkpoint "ALL COMPLETE"
                exit 0
            fi
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

        echo -e "${GREEN}✓ Completed: $PRD_ID${NC}"
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

        # Check if all done (excluding blocked)
        pending=$(jq -r '.progress.pending' "$STATE_FILE")
        blocked=$(jq -r '.progress.blocked' "$STATE_FILE")

        if [ "$pending" -eq 0 ] && [ "$blocked" -eq 0 ]; then
            echo ""
            echo -e "${GREEN}════════════════════════════════════════${NC}"
            echo -e "${GREEN}  ALL PRD ITEMS COMPLETE!${NC}"
            echo -e "${GREEN}════════════════════════════════════════${NC}"
            show_progress
            log_checkpoint "ALL COMPLETE"
            exit 0
        fi

        if [ "$pending" -eq 0 ] && [ "$blocked" -gt 0 ]; then
            echo ""
            echo "All pending items done. $blocked items blocked."
            log_checkpoint "PENDING COMPLETE - $blocked BLOCKED"
            retry_blocked_items

            # Check again after retry
            blocked=$(jq -r '.progress.blocked' "$STATE_FILE")
            if [ "$blocked" -eq 0 ]; then
                echo ""
                echo -e "${GREEN}════════════════════════════════════════${NC}"
                echo -e "${GREEN}  ALL PRD ITEMS COMPLETE!${NC}"
                echo -e "${GREEN}════════════════════════════════════════${NC}"
                show_progress
                log_checkpoint "ALL COMPLETE"
                exit 0
            fi
        fi
        continue
    fi

    # Check for checkpoint signal (continuing work)
    if has_tag "checkpoint" "$OUTPUT"; then
        CHECKPOINT_MSG=$(extract_tag "checkpoint" "$OUTPUT")
        echo -e "${BLUE}💾 Checkpoint: $CHECKPOINT_MSG${NC}"
        log_checkpoint "$CHECKPOINT_MSG"

        # Increment session checkpoint count
        jq '.session.checkpoints_this_session += 1 | .checkpoints.checkpoint_count += 1' "$STATE_FILE" > tmp.json && mv tmp.json "$STATE_FILE"

        sleep 1
        continue
    fi

    # Check for blockers - LOG AND SKIP, don't halt
    if has_tag "blocked" "$OUTPUT"; then
        BLOCKER=$(extract_tag "blocked" "$OUTPUT")
        [ -z "$BLOCKER" ] && BLOCKER="Unknown blocker"

        current_prd=$(jq -r '.current.prd_item // "unknown"' "$STATE_FILE")
        echo -e "${YELLOW}⚠ Blocker on $current_prd: $BLOCKER${NC}"
        log_checkpoint "BLOCKED: $current_prd - $BLOCKER"

        # Get retry count for this PRD
        retry_count=$(jq -r --arg prd "$current_prd" '
            .active_blockers[] | select(.prd_item == $prd) | .retry_count // 0
        ' "$BLOCKERS_FILE" 2>/dev/null || echo "0")
        retry_count=$((retry_count + 1))

        # Update blockers file
        jq --arg prd "$current_prd" --arg blocker "$BLOCKER" --argjson retry "$retry_count" '
            if (.active_blockers | map(select(.prd_item == $prd)) | length) > 0 then
                .active_blockers = [.active_blockers[] | if .prd_item == $prd then .retry_count = $retry | .description = $blocker else . end]
            else
                .active_blockers += [{"prd_item": $prd, "description": $blocker, "retry_count": $retry}]
            end
        ' "$BLOCKERS_FILE" > tmp.json && mv tmp.json "$BLOCKERS_FILE"

        if [ "$retry_count" -ge 3 ]; then
            echo "Max retries (3) for $current_prd - skipping to next PRD"
            skip_to_next_prd "$current_prd" "$BLOCKER"
        else
            echo "Retry $retry_count of 3 for $current_prd"
        fi

        sleep 1
        continue
    fi

    # Check for clarification needed - also skip, don't halt
    if has_tag "clarification" "$OUTPUT"; then
        QUESTION=$(extract_tag "clarification" "$OUTPUT")
        [ -z "$QUESTION" ] && QUESTION="Clarification needed"

        current_prd=$(jq -r '.current.prd_item // "unknown"' "$STATE_FILE")
        echo -e "${YELLOW}❓ Clarification needed for $current_prd: $QUESTION${NC}"
        log_checkpoint "CLARIFICATION: $current_prd - $QUESTION"

        # Skip this PRD, will need human help later
        skip_to_next_prd "$current_prd" "Needs clarification: $QUESTION"
        continue
    fi

    sleep 2
done

echo ""
echo "Safety limit ($MAX_ITERATIONS iterations) reached"
show_progress

# Auto-trigger blocker retry if there are blocked items
blocked=$(jq -r '.progress.blocked' "$STATE_FILE")
if [ "$blocked" -gt 0 ]; then
    echo ""
    echo "$blocked items blocked. Starting blocker retry phase..."
    retry_blocked_items
fi

log_checkpoint "MAX ITERATIONS REACHED"
exit 0
