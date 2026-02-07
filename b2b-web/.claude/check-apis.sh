#!/bin/bash
#
# API Dependency Checker
# Validates which backend APIs are available for frontend development
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="$SCRIPT_DIR/execution/prd.json"
BACKEND_API="${BACKEND_API:-http://localhost:3000}"
BACKEND_DOCS="$BACKEND_API/docs-json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           API Dependency Checker                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if backend is running
echo -n "Checking backend at $BACKEND_API... "
if curl -s --max-time 5 "$BACKEND_API/docs" > /dev/null 2>&1; then
    echo -e "${GREEN}RUNNING${NC}"
else
    echo -e "${RED}NOT RUNNING${NC}"
    echo ""
    echo "Start the backend with:"
    echo "  cd ../b2b-api && npm run dev"
    echo ""
    exit 1
fi

# Fetch OpenAPI spec
echo -n "Fetching OpenAPI spec... "
OPENAPI_SPEC=$(curl -s --max-time 10 "$BACKEND_DOCS" 2>/dev/null)
if [ -z "$OPENAPI_SPEC" ]; then
    echo -e "${RED}FAILED${NC}"
    exit 1
fi
echo -e "${GREEN}OK${NC}"
echo ""

# Get available paths
AVAILABLE_PATHS=$(echo "$OPENAPI_SPEC" | jq -r '.paths | keys[]' 2>/dev/null | sort)

# Statistics
total_deps=0
available=0
needed=0
missing=0

echo "═══════════════════════════════════════════════════════════════"
echo "  Checking PRD API Dependencies"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check each feature
features=$(jq -r '.phases[].items[] | .id' "$PRD_FILE")

for fid in $features; do
    feature_title=$(jq -r ".phases[].items[] | select(.id == \"$fid\") | .title" "$PRD_FILE")
    deps=$(jq -c ".phases[].items[] | select(.id == \"$fid\") | .api_dependencies[]?" "$PRD_FILE" 2>/dev/null)
    
    if [ -n "$deps" ]; then
        echo -e "${BLUE}$fid${NC}: $feature_title"
        
        while IFS= read -r dep; do
            endpoint=$(echo "$dep" | jq -r '.endpoint')
            status=$(echo "$dep" | jq -r '.status')
            
            # Extract method and path
            method=$(echo "$endpoint" | awk '{print $1}')
            path=$(echo "$endpoint" | awk '{print $2}')
            
            # Normalize path (remove param names like :id)
            normalized_path=$(echo "$path" | sed 's/:[a-zA-Z_]*/{[^}]*}/g')
            
            ((total_deps++))
            
            if [ "$status" = "needed" ]; then
                echo -e "  ${YELLOW}○${NC} $endpoint ${YELLOW}[NEEDS BACKEND]${NC}"
                ((needed++))
            elif [ "$status" = "available" ]; then
                # Check if actually available
                found=false
                for avail_path in $AVAILABLE_PATHS; do
                    if [[ "$path" == "$avail_path" ]] || [[ "$path" =~ ^${avail_path/\{*\}/.*}$ ]]; then
                        found=true
                        break
                    fi
                done
                
                # Also check with path params replaced
                check_path="${path//:id/\{id\}}"
                check_path="${check_path//:stepId/\{stepId\}}"
                
                if echo "$AVAILABLE_PATHS" | grep -q "^${check_path}$" 2>/dev/null; then
                    found=true
                fi
                
                if [ "$found" = "true" ]; then
                    echo -e "  ${GREEN}✓${NC} $endpoint"
                    ((available++))
                else
                    echo -e "  ${RED}✗${NC} $endpoint ${RED}[NOT FOUND IN SPEC]${NC}"
                    ((missing++))
                fi
            fi
        done < <(jq -c ".phases[].items[] | select(.id == \"$fid\") | .api_dependencies[]?" "$PRD_FILE" 2>/dev/null)
        echo ""
    fi
done

echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Summary:"
echo -e "  Total API dependencies: ${BLUE}$total_deps${NC}"
echo -e "  Available (verified):   ${GREEN}$available${NC}"
echo -e "  Needs backend work:     ${YELLOW}$needed${NC}"
echo -e "  Missing (marked avail): ${RED}$missing${NC}"
echo ""

if [ $needed -gt 0 ]; then
    echo "═══════════════════════════════════════════════════════════════"
    echo "  Features Blocked by Missing APIs"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    jq -r '.phases[].items[] | select(.api_dependencies[]?.status == "needed") | "\(.id): \(.title)"' "$PRD_FILE" | sort -u | while read line; do
        echo -e "  ${YELLOW}○${NC} $line"
    done
    echo ""
    echo "Review API blockers in: .claude/planning/backlog/api-blockers/"
fi

if [ $missing -gt 0 ]; then
    echo ""
    echo -e "${RED}WARNING:${NC} Some APIs marked as 'available' were not found in the OpenAPI spec."
    echo "This may indicate:"
    echo "  - The backend needs to be rebuilt"
    echo "  - The endpoint paths don't match"
    echo "  - The OpenAPI spec is out of date"
fi
