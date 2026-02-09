#!/bin/bash
#
# B2B Platform - Azure Deployment (All Containers)
# Deploys everything as containers to avoid managed service policy restrictions
#
# This version uses:
#   - PostgreSQL container (instead of managed)
#   - Redis container (instead of managed)
#   - MinIO container
#   - API, Admin, Portal containers
#

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

RESOURCE_GROUP="b2b-platform-rg"
LOCATION="uksouth"
ENVIRONMENT_NAME="b2b-env"
ACR_NAME="b2bacr$(date +%s)"

# App names
API_APP_NAME="b2b-api"
ADMIN_APP_NAME="b2b-admin"
PORTAL_APP_NAME="b2b-portal"

# Secrets (change these!)
POSTGRES_PASSWORD="B2B@Postgres$(date +%s | tail -c 5)"
REDIS_PASSWORD="B2B@Redis$(date +%s | tail -c 5)"
MINIO_ROOT_PASSWORD="B2B@Minio$(date +%s | tail -c 5)"
JWT_SECRET="jwt-secret-$(date +%s)"

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

echo ""
echo "=============================================="
echo "  B2B Platform - Azure Deployment"
echo "  (All Containers - No Managed Services)"
echo "=============================================="
echo ""

# ============================================================================
# STEP 1: Create Resource Group
# ============================================================================

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

ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# ============================================================================
# STEP 3: Create Container Apps Environment
# ============================================================================

log_info "Creating Container Apps Environment..."
az containerapp env create \
  --resource-group $RESOURCE_GROUP \
  --name $ENVIRONMENT_NAME \
  --location $LOCATION \
  --output none
log_success "Container Apps Environment created"

# ============================================================================
# STEP 4: Deploy PostgreSQL Container
# ============================================================================

log_info "Deploying PostgreSQL container..."
az containerapp create \
  --resource-group $RESOURCE_GROUP \
  --name b2b-postgres \
  --environment $ENVIRONMENT_NAME \
  --image postgres:16-alpine \
  --target-port 5432 \
  --ingress internal \
  --min-replicas 1 \
  --max-replicas 1 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars \
    "POSTGRES_USER=b2b" \
    "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" \
    "POSTGRES_DB=b2b_platform" \
  --output none

POSTGRES_FQDN=$(az containerapp show --name b2b-postgres --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
log_success "PostgreSQL deployed (internal): ${POSTGRES_FQDN}"

# ============================================================================
# STEP 5: Deploy Redis Container
# ============================================================================

log_info "Deploying Redis container..."
az containerapp create \
  --resource-group $RESOURCE_GROUP \
  --name b2b-redis \
  --environment $ENVIRONMENT_NAME \
  --image bitnami/redis:latest \
  --target-port 6379 \
  --ingress internal \
  --min-replicas 1 \
  --max-replicas 1 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars "REDIS_PASSWORD=${REDIS_PASSWORD}" "ALLOW_EMPTY_PASSWORD=no" \
  --output none

REDIS_FQDN=$(az containerapp show --name b2b-redis --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
log_success "Redis deployed (internal): ${REDIS_FQDN}"

# ============================================================================
# STEP 6: Deploy MinIO Container
# ============================================================================

log_info "Deploying MinIO container..."
az containerapp create \
  --resource-group $RESOURCE_GROUP \
  --name b2b-minio \
  --environment $ENVIRONMENT_NAME \
  --image minio/minio:latest \
  --target-port 9000 \
  --ingress internal \
  --min-replicas 1 \
  --max-replicas 1 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars \
    "MINIO_ROOT_USER=minioadmin" \
    "MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}" \
  --command "server" "/data" \
  --output none

MINIO_FQDN=$(az containerapp show --name b2b-minio --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
log_success "MinIO deployed (internal): ${MINIO_FQDN}"

# ============================================================================
# STEP 7: Build and Push Docker Images
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
# STEP 8: Deploy Backend API
# ============================================================================

# Build connection strings (internal container networking uses port 80)
DATABASE_URL="postgresql://b2b:${POSTGRES_PASSWORD}@b2b-postgres.internal.${ENVIRONMENT_NAME}.${LOCATION}.azurecontainerapps.io:80/b2b_platform"
REDIS_URL="redis://:${REDIS_PASSWORD}@b2b-redis.internal.${ENVIRONMENT_NAME}.${LOCATION}.azurecontainerapps.io:80"

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
    "REDIS_HOST=b2b-redis.internal.${ENVIRONMENT_NAME}.${LOCATION}.azurecontainerapps.io" \
    "REDIS_PORT=80" \
    "REDIS_PASSWORD=${REDIS_PASSWORD}" \
    "JWT_SECRET=${JWT_SECRET}" \
    "JWT_EXPIRATION=24h" \
    "MINIO_ENDPOINT=b2b-minio.internal.${ENVIRONMENT_NAME}.${LOCATION}.azurecontainerapps.io" \
    "MINIO_PORT=80" \
    "MINIO_USE_SSL=false" \
    "MINIO_ACCESS_KEY=minioadmin" \
    "MINIO_SECRET_KEY=${MINIO_ROOT_PASSWORD}" \
    "MINIO_BUCKET=b2b-files" \
  --output none

API_URL=$(az containerapp show --name $API_APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
log_success "Backend API deployed: https://${API_URL}"

# ============================================================================
# STEP 9: Deploy Frontend Admin
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
# STEP 10: Deploy Frontend Portal
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
echo -e "${YELLOW}Containers Deployed:${NC}"
echo "  - b2b-postgres (PostgreSQL 16)"
echo "  - b2b-redis (Redis 7)"
echo "  - b2b-minio (MinIO)"
echo "  - b2b-api (NestJS Backend)"
echo "  - b2b-admin (Next.js Admin)"
echo "  - b2b-portal (Next.js Portal)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Wait 2-3 minutes for containers to fully start"
echo "  2. Access Swagger docs to verify API: https://${API_URL}/docs"
echo "  3. Run database migrations via API exec or initial startup"
echo ""
echo -e "${RED}Important - Save these credentials:${NC}"
echo "  PostgreSQL Password: ${POSTGRES_PASSWORD}"
echo "  Redis Password: ${REDIS_PASSWORD}"
echo "  MinIO Password: ${MINIO_ROOT_PASSWORD}"
echo "  JWT Secret: ${JWT_SECRET}"
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
  "containers": {
    "postgres": "b2b-postgres",
    "redis": "b2b-redis",
    "minio": "b2b-minio",
    "api": "b2b-api",
    "admin": "b2b-admin",
    "portal": "b2b-portal"
  },
  "credentials": {
    "postgresPassword": "${POSTGRES_PASSWORD}",
    "redisPassword": "${REDIS_PASSWORD}",
    "minioPassword": "${MINIO_ROOT_PASSWORD}",
    "jwtSecret": "${JWT_SECRET}"
  },
  "registry": {
    "name": "${ACR_NAME}",
    "loginServer": "${ACR_LOGIN_SERVER}"
  }
}
EOF
log_success "Config saved to azure-deployment-config.json"
