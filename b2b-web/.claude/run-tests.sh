#!/bin/bash
#
# Test Runner - Comprehensive test execution for frontend
# Runs all test types: unit, component, integration, e2e
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

cd "$PROJECT_ROOT"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              Frontend Test Runner                          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Results tracking
declare -A results
total_tests=0
passed_tests=0
failed_tests=0

run_test() {
    local name="$1"
    local cmd="$2"
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Running: $name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    ((total_tests++))
    
    if eval "$cmd" 2>&1; then
        echo ""
        echo -e "${GREEN}✓ $name: PASSED${NC}"
        results["$name"]="PASSED"
        ((passed_tests++))
    else
        echo ""
        echo -e "${RED}✗ $name: FAILED${NC}"
        results["$name"]="FAILED"
        ((failed_tests++))
    fi
    echo ""
}

# TypeScript Type Check
echo -e "${YELLOW}Phase 1: Type Checking${NC}"
echo ""
run_test "TypeScript" "pnpm tsc --noEmit"

# Linting
echo -e "${YELLOW}Phase 2: Linting${NC}"
echo ""
run_test "ESLint" "pnpm lint"

# Build
echo -e "${YELLOW}Phase 3: Build${NC}"
echo ""
run_test "Build" "pnpm build"

# Unit Tests
echo -e "${YELLOW}Phase 4: Unit Tests${NC}"
echo ""
if [ -f "vitest.config.ts" ] || [ -f "vitest.config.js" ]; then
    run_test "Unit Tests (Vitest)" "pnpm test"
elif [ -f "jest.config.js" ] || [ -f "jest.config.ts" ]; then
    run_test "Unit Tests (Jest)" "pnpm test"
else
    echo -e "${YELLOW}  Skipping: No test config found${NC}"
    echo ""
fi

# Component Tests (Storybook)
echo -e "${YELLOW}Phase 5: Component Tests${NC}"
echo ""
if [ -d ".storybook" ]; then
    if command -v chromatic &> /dev/null; then
        run_test "Storybook Build" "pnpm --filter ui build-storybook"
    else
        echo -e "${YELLOW}  Skipping: Storybook build (chromatic not configured)${NC}"
        echo ""
    fi
else
    echo -e "${YELLOW}  Skipping: No Storybook configured${NC}"
    echo ""
fi

# E2E Tests
echo -e "${YELLOW}Phase 6: E2E Tests${NC}"
echo ""
if [ -f "playwright.config.ts" ] || [ -f "playwright.config.js" ]; then
    run_test "E2E Tests (Playwright)" "pnpm test:e2e"
elif [ -f "cypress.config.ts" ] || [ -f "cypress.config.js" ]; then
    run_test "E2E Tests (Cypress)" "pnpm test:e2e"
else
    echo -e "${YELLOW}  Skipping: No E2E config found${NC}"
    echo ""
fi

# Summary
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Test Summary${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""

for test_name in "${!results[@]}"; do
    if [ "${results[$test_name]}" = "PASSED" ]; then
        echo -e "  ${GREEN}✓${NC} $test_name"
    else
        echo -e "  ${RED}✗${NC} $test_name"
    fi
done

echo ""
echo -e "  Total:  $total_tests"
echo -e "  Passed: ${GREEN}$passed_tests${NC}"
echo -e "  Failed: ${RED}$failed_tests${NC}"
echo ""

if [ $failed_tests -gt 0 ]; then
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi
