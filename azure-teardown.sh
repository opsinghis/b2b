#!/bin/bash
#
# B2B Platform - Azure Teardown Script
# Deletes all Azure resources to minimize costs
#
# Usage:
#   chmod +x azure-teardown.sh
#   ./azure-teardown.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}!${NC} $1"; }
log_error()   { echo -e "${RED}✗${NC} $1"; }

# Configuration - must match deploy script
RESOURCE_GROUP="b2b-platform-rg"

echo ""
echo "=============================================="
echo "  B2B Platform - Azure Teardown"
echo "=============================================="
echo ""

# Check if resource group exists
if ! az group exists --name $RESOURCE_GROUP | grep -q true; then
    log_warning "Resource group '$RESOURCE_GROUP' does not exist. Nothing to tear down."
    exit 0
fi

# Show what will be deleted
log_info "The following resources will be PERMANENTLY DELETED:"
echo ""
az resource list --resource-group $RESOURCE_GROUP --query "[].{Name:name, Type:type}" -o table
echo ""

# Confirmation prompt
echo -e "${RED}WARNING: This action cannot be undone!${NC}"
read -p "Are you sure you want to delete all resources? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    log_info "Teardown cancelled."
    exit 0
fi

# Delete resource group (this deletes everything inside)
log_info "Deleting resource group '$RESOURCE_GROUP' and all resources..."
log_info "This may take several minutes..."

az group delete \
    --name $RESOURCE_GROUP \
    --yes \
    --no-wait

log_success "Teardown initiated!"
echo ""
echo "The resource group is being deleted in the background."
echo "You can monitor progress with:"
echo "  az group show --name $RESOURCE_GROUP --query properties.provisioningState"
echo ""
echo "Or wait for completion with:"
echo "  az group wait --name $RESOURCE_GROUP --deleted"
echo ""

# Remove local config file if it exists
if [ -f "azure-deployment-config.json" ]; then
    rm azure-deployment-config.json
    log_success "Removed local azure-deployment-config.json"
fi

echo -e "${GREEN}Cost savings: Resources will stop billing once deletion completes.${NC}"
echo ""
