#!/bin/bash
#
# B2B Platform - Azure ACI Teardown
# Removes all Azure resources to stop billing
#
# Usage: ./azure-aci-teardown.sh
#

set -e

RESOURCE_GROUP="b2b-demo-rg"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "=============================================="
echo "  B2B Platform - Azure Teardown"
echo "=============================================="
echo ""

# Check if resource group exists
if ! az group show --name $RESOURCE_GROUP &>/dev/null; then
  echo -e "${YELLOW}Resource group '$RESOURCE_GROUP' does not exist. Nothing to delete.${NC}"
  exit 0
fi

# List resources that will be deleted
echo -e "${YELLOW}The following resources will be deleted:${NC}"
az resource list --resource-group $RESOURCE_GROUP --query "[].{Name:name, Type:type}" -o table

echo ""
read -p "Are you sure you want to delete all resources? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo -e "${RED}Deleting resource group and all resources...${NC}"
az group delete --name $RESOURCE_GROUP --yes --no-wait

echo ""
echo -e "${GREEN}Deletion initiated!${NC}"
echo ""
echo "The resource group is being deleted in the background."
echo "This typically takes 2-5 minutes to complete."
echo ""
echo "To check status:"
echo "  az group show --name $RESOURCE_GROUP --query properties.provisioningState -o tsv"
echo ""

# Clean up local config
if [ -f "azure-aci-config.json" ]; then
  rm azure-aci-config.json
  echo "Removed local config file: azure-aci-config.json"
fi

echo -e "${GREEN}Done!${NC}"
