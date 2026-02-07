#!/bin/bash
#
# B2B Platform - Azure Deployment Script
# Deploys backend and frontend to Azure Container Apps
#
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - Docker installed
#
# Usage:
#   chmod +x azure-deploy.sh
#   ./azure-deploy.sh
#

set -e

# ============================================================================
# CONFIGURATION - Modify these values
# ============================================================================

RESOURCE_GROUP="b2b-platform-rg"
LOCATION="eastus"                    # Change to your preferred region
ENVIRONMENT_NAME="b2b-env"
ACR_NAME="b2bacr$(date +%s)"        # Unique ACR name

# App names
API_APP_NAME="b2b-api"
ADMIN_APP_NAME="b2b-admin"
PORTAL_APP_NAME="b2b-portal"

# Database
POSTGRES_SERVER_NAME="b2b-postgres-$(date +%s)"
POSTGRES_DB_NAME="b2b_platform"
POSTGRES_ADMIN_USER="b2badmin"
POSTGRES_ADMIN_PASSWORD="B2B@Secret123!"  # Change this!

# Redis
REDIS_NAME="b2b-redis-$(date +%s)"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-$(date +%s)"

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

# ============================================================================
# STEP 1: Create Resource Group
# ============================================================================

echo ""
echo "=============================================="
echo "  B2B Platform - Azure Deployment"
echo "=============================================="
echo ""

log_info "Creating resource group: $RESOURCE_GROUP"
az group create --name $RESOURCE_GROUP --location $LOCATION --output none
log_success "Resource group created"

# ============================================================================
# STEP 2: Create Azure Container Registry
# ============================================================================

log_info "Creating Azure Container Registry: $ACR_NAME"
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true \
  --output none
log_success "Container Registry created"

# Get ACR credentials
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# ============================================================================
# STEP 3: Create PostgreSQL Flexible Server
# ============================================================================

log_info "Creating PostgreSQL Flexible Server (this may take a few minutes)..."
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER_NAME \
  --location $LOCATION \
  --admin-user $POSTGRES_ADMIN_USER \
  --admin-password "$POSTGRES_ADMIN_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access 0.0.0.0 \
  --output none

# Create database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER_NAME \
  --database-name $POSTGRES_DB_NAME \
  --output none
log_success "PostgreSQL created"

POSTGRES_HOST="${POSTGRES_SERVER_NAME}.postgres.database.azure.com"
DATABASE_URL="postgresql://${POSTGRES_ADMIN_USER}:${POSTGRES_ADMIN_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DB_NAME}?sslmode=require"

# ============================================================================
# STEP 4: Create Azure Cache for Redis
# ============================================================================

log_info "Creating Azure Cache for Redis (this may take several minutes)..."
az redis create \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --location $LOCATION \
  --sku Basic \
  --vm-size c0 \
  --output none

REDIS_HOST=$(az redis show --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query hostName -o tsv)
REDIS_KEY=$(az redis list-keys --name $REDIS_NAME --resource-group $RESOURCE_GROUP --query primaryKey -o tsv)
REDIS_URL="rediss://:${REDIS_KEY}@${REDIS_HOST}:6380"
log_success "Redis created"

# ============================================================================
# STEP 5: Create Container Apps Environment
# ============================================================================

log_info "Creating Container Apps Environment..."
az containerapp env create \
  --resource-group $RESOURCE_GROUP \
  --name $ENVIRONMENT_NAME \
  --location $LOCATION \
  --output none
log_success "Container Apps Environment created"

# ============================================================================
# STEP 6: Build and Push Docker Images
# ============================================================================

log_info "Building and pushing Backend API image..."
cd b2b-api
az acr build \
  --registry $ACR_NAME \
  --image b2b-api:latest \
  --file Dockerfile \
  . \
  --output none
log_success "Backend image pushed"

log_info "Building and pushing Frontend Admin image..."
cd ../b2b-web
az acr build \
  --registry $ACR_NAME \
  --image b2b-admin:latest \
  --file Dockerfile \
  --target admin \
  . \
  --output none
log_success "Admin image pushed"

log_info "Building and pushing Frontend Portal image..."
az acr build \
  --registry $ACR_NAME \
  --image b2b-portal:latest \
  --file Dockerfile \
  --target portal \
  . \
  --output none
log_success "Portal image pushed"

cd ..

# ============================================================================
# STEP 7: Deploy Backend API
# ============================================================================

log_info "Deploying Backend API..."
az containerapp create \
  --resource-group $RESOURCE_GROUP \
  --name $API_APP_NAME \
  --environment $ENVIRONMENT_NAME \
  --image "${ACR_LOGIN_SERVER}/b2b-api:latest" \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars \
    "NODE_ENV=production" \
    "DATABASE_URL=${DATABASE_URL}" \
    "REDIS_URL=${REDIS_URL}" \
    "JWT_SECRET=${JWT_SECRET}" \
    "JWT_EXPIRATION=24h" \
  --output none

API_URL=$(az containerapp show --name $API_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
log_success "Backend API deployed: https://${API_URL}"

# ============================================================================
# STEP 8: Deploy Frontend Admin
# ============================================================================

log_info "Deploying Frontend Admin Portal..."
az containerapp create \
  --resource-group $RESOURCE_GROUP \
  --name $ADMIN_APP_NAME \
  --environment $ENVIRONMENT_NAME \
  --image "${ACR_LOGIN_SERVER}/b2b-admin:latest" \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3002 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars \
    "NEXT_PUBLIC_API_URL=https://${API_URL}" \
  --output none

ADMIN_URL=$(az containerapp show --name $ADMIN_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
log_success "Admin Portal deployed: https://${ADMIN_URL}"

# ============================================================================
# STEP 9: Deploy Frontend Portal
# ============================================================================

log_info "Deploying Frontend Customer Portal..."
az containerapp create \
  --resource-group $RESOURCE_GROUP \
  --name $PORTAL_APP_NAME \
  --environment $ENVIRONMENT_NAME \
  --image "${ACR_LOGIN_SERVER}/b2b-portal:latest" \
  --registry-server $ACR_LOGIN_SERVER \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3003 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars \
    "NEXT_PUBLIC_API_URL=https://${API_URL}" \
  --output none

PORTAL_URL=$(az containerapp show --name $PORTAL_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
log_success "Customer Portal deployed: https://${PORTAL_URL}"

# ============================================================================
# STEP 10: Run Database Migrations
# ============================================================================

log_info "Running database migrations..."
az containerapp exec \
  --resource-group $RESOURCE_GROUP \
  --name $API_APP_NAME \
  --command "npx prisma migrate deploy" \
  --output none 2>/dev/null || log_warning "Run migrations manually if needed"

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "=============================================="
echo "  Deployment Complete!"
echo "=============================================="
echo ""
echo -e "${GREEN}URLs:${NC}"
echo -e "  Backend API:      https://${API_URL}"
echo -e "  Swagger Docs:     https://${API_URL}/docs"
echo -e "  Admin Portal:     https://${ADMIN_URL}"
echo -e "  Customer Portal:  https://${PORTAL_URL}"
echo ""
echo -e "${YELLOW}Resources Created:${NC}"
echo "  Resource Group:   $RESOURCE_GROUP"
echo "  Container Registry: $ACR_NAME"
echo "  PostgreSQL:       $POSTGRES_SERVER_NAME"
echo "  Redis:            $REDIS_NAME"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Run database migrations: npx prisma migrate deploy"
echo "  2. Seed initial data: npx prisma db seed"
echo "  3. Create admin user via API"
echo ""
echo -e "${RED}Important:${NC}"
echo "  Save these credentials securely:"
echo "  - Database URL: $DATABASE_URL"
echo "  - Redis URL: $REDIS_URL"
echo "  - JWT Secret: $JWT_SECRET"
echo ""

# Save config to file
cat > azure-deployment-config.json << EOF
{
  "resourceGroup": "$RESOURCE_GROUP",
  "location": "$LOCATION",
  "urls": {
    "api": "https://${API_URL}",
    "admin": "https://${ADMIN_URL}",
    "portal": "https://${PORTAL_URL}",
    "swagger": "https://${API_URL}/docs"
  },
  "resources": {
    "containerRegistry": "$ACR_NAME",
    "postgresServer": "$POSTGRES_SERVER_NAME",
    "redisCache": "$REDIS_NAME"
  }
}
EOF
log_success "Config saved to azure-deployment-config.json"
