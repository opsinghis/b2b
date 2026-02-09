#!/bin/bash
#
# B2B Platform - Azure ACI Deployment
# Modular deployment script with multiple operation modes
#
# Usage:
#   ./azure-aci-deploy.sh [command]
#
# Commands:
#   full       - Full deployment (default)
#   api        - Rebuild and redeploy API only
#   seed       - Reseed database (keeps existing schema)
#   reset-db   - Drop all tables and reseed fresh
#   migrate    - Run database migrations only
#   test       - Run smoke tests only
#   status     - Show deployment status
#   help       - Show this help
#

set -e

# Save the base directory for absolute path references
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$BASE_DIR/azure-aci-config.json"

# ============================================================================
# CONFIGURATION
# ============================================================================

RESOURCE_GROUP="b2b-demo-rg"
LOCATION="uksouth"
DB_PASSWORD="B2BDemo2024"
REDIS_PASSWORD="B2BDemo2024"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

load_config() {
  if [ ! -f "$CONFIG_FILE" ]; then
    error "Config file not found: $CONFIG_FILE"
    echo "Run './azure-aci-deploy.sh full' first to create infrastructure."
    exit 1
  fi

  # Parse JSON config (works with or without jq)
  if command -v jq &> /dev/null; then
    API_URL=$(jq -r '.apiUrl' "$CONFIG_FILE")
    POSTGRES_IP=$(jq -r '.postgres' "$CONFIG_FILE" | cut -d':' -f1)
    REDIS_IP=$(jq -r '.redis' "$CONFIG_FILE" | cut -d':' -f1)
    ACR_SERVER=$(jq -r '.acr' "$CONFIG_FILE")
  else
    # Fallback without jq - read file as single line
    CONFIG_CONTENT=$(tr -d '\n' < "$CONFIG_FILE")
    API_URL=$(echo "$CONFIG_CONTENT" | sed 's/.*"apiUrl":"\([^"]*\)".*/\1/')
    POSTGRES_IP=$(echo "$CONFIG_CONTENT" | sed 's/.*"postgres":"\([^:]*\):.*/\1/')
    REDIS_IP=$(echo "$CONFIG_CONTENT" | sed 's/.*"redis":"\([^:]*\):.*/\1/')
    ACR_SERVER=$(echo "$CONFIG_CONTENT" | sed 's/.*"acr":"\([^"]*\)".*/\1/')
  fi

  ACR_NAME=$(echo "$ACR_SERVER" | cut -d'.' -f1)

  # Get ACR credentials
  ACR_USER=$(az acr credential show --name $ACR_NAME --query username -o tsv 2>/dev/null)
  ACR_PASS=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv 2>/dev/null)

  DATABASE_URL="postgresql://b2b:$DB_PASSWORD@$POSTGRES_IP:5432/b2b_platform"
}

get_api_fqdn() {
  az container show --name b2b-api-group --resource-group $RESOURCE_GROUP --query ipAddress.fqdn -o tsv 2>/dev/null
}

# ============================================================================
# SMOKE TESTS
# ============================================================================

run_smoke_tests() {
  local api_url="$1"

  log "Running smoke tests..."

  # Wait for API to be ready
  echo "  Waiting for API to be ready (up to 60s)..."
  for i in {1..12}; do
    if curl -s -o /dev/null -w "%{http_code}" "$api_url/docs" 2>/dev/null | grep -q "200"; then
      break
    fi
    sleep 5
  done

  # Test 1: Login
  echo -n "  Test 1: Login... "
  LOGIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "x-tenant-id: default" \
    --data-binary @- \
    "$api_url/api/v1/auth/login" << 'EOFLOGIN'
{"email":"admin@b2b.local","password":"Admin123!"}
EOFLOGIN
  )

  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

  if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    echo -e "${GREEN}PASS${NC}"
  else
    echo -e "${RED}FAIL${NC}"
    warn "Login failed. Response: $LOGIN_RESPONSE"
    return 1
  fi

  # Test 2: Catalog Products
  echo -n "  Test 2: Catalog API... "
  CATALOG_RESPONSE=$(curl -s \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "x-tenant-id: default" \
    "$api_url/api/v1/catalog/products?limit=1")

  PRODUCT_COUNT=$(echo "$CATALOG_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)

  if [ -n "$PRODUCT_COUNT" ] && [ "$PRODUCT_COUNT" -gt 0 ] 2>/dev/null; then
    echo -e "${GREEN}PASS${NC} ($PRODUCT_COUNT products)"
  else
    echo -e "${RED}FAIL${NC}"
    warn "Catalog fetch failed."
    return 1
  fi

  # Test 3: Swagger Docs
  echo -n "  Test 3: Swagger Docs... "
  SWAGGER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$api_url/docs")

  if [ "$SWAGGER_STATUS" = "200" ]; then
    echo -e "${GREEN}PASS${NC}"
  else
    echo -e "${RED}FAIL${NC} (HTTP $SWAGGER_STATUS)"
    return 1
  fi

  success "All smoke tests passed!"
  return 0
}

# ============================================================================
# COMMAND: seed
# ============================================================================

cmd_seed() {
  echo ""
  echo "=============================================="
  echo "  B2B Platform - Seed Database"
  echo "=============================================="
  echo ""

  load_config

  log "Seeding database at $POSTGRES_IP..."
  cd "$BASE_DIR/b2b-api"
  DATABASE_URL="$DATABASE_URL" npx ts-node prisma/seed.ts
  success "Database seeded!"
}

# ============================================================================
# COMMAND: reset-db
# ============================================================================

cmd_reset_db() {
  echo ""
  echo "=============================================="
  echo "  B2B Platform - Reset Database"
  echo "=============================================="
  echo ""

  load_config

  warn "This will DELETE all data and reseed!"
  read -p "Are you sure? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
  fi

  cd "$BASE_DIR/b2b-api"

  log "Resetting database schema..."
  DATABASE_URL="$DATABASE_URL" npx prisma migrate reset --force

  log "Seeding database..."
  DATABASE_URL="$DATABASE_URL" npx ts-node prisma/seed.ts

  success "Database reset and seeded!"
}

# ============================================================================
# COMMAND: migrate
# ============================================================================

cmd_migrate() {
  echo ""
  echo "=============================================="
  echo "  B2B Platform - Run Migrations"
  echo "=============================================="
  echo ""

  load_config

  cd "$BASE_DIR/b2b-api"

  log "Running migrations..."
  DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy

  success "Migrations completed!"
}

# ============================================================================
# COMMAND: api (rebuild and redeploy API only)
# ============================================================================

cmd_api() {
  echo ""
  echo "=============================================="
  echo "  B2B Platform - Redeploy API"
  echo "=============================================="
  echo ""

  load_config

  # Build new API image
  log "Building API Docker image..."
  cd "$BASE_DIR/b2b-api"
  az acr build --registry $ACR_NAME --image b2b-api:latest --file Dockerfile . --output none
  success "API image built and pushed"

  # Restart the container group to pull new image
  log "Restarting API container..."
  az container restart --name b2b-api-group --resource-group $RESOURCE_GROUP --output none
  success "API container restarted"

  # Wait and test
  sleep 10
  API_FQDN=$(get_api_fqdn)
  run_smoke_tests "http://$API_FQDN"

  echo ""
  success "API redeployed: http://$API_FQDN"
}

# ============================================================================
# COMMAND: test
# ============================================================================

cmd_test() {
  echo ""
  echo "=============================================="
  echo "  B2B Platform - Smoke Tests"
  echo "=============================================="
  echo ""

  load_config
  run_smoke_tests "$API_URL"
}

# ============================================================================
# COMMAND: status
# ============================================================================

cmd_status() {
  echo ""
  echo "=============================================="
  echo "  B2B Platform - Deployment Status"
  echo "=============================================="
  echo ""

  # Check if resource group exists
  if ! az group show --name $RESOURCE_GROUP &>/dev/null; then
    warn "No deployment found (resource group '$RESOURCE_GROUP' does not exist)"
    exit 0
  fi

  echo -e "${GREEN}Resource Group:${NC} $RESOURCE_GROUP"
  echo ""

  # List containers
  echo -e "${GREEN}Containers:${NC}"
  az container list --resource-group $RESOURCE_GROUP --query "[].{Name:name, State:instanceView.state, IP:ipAddress.ip}" -o table
  echo ""

  # Show config if exists
  if [ -f "$CONFIG_FILE" ]; then
    # Parse API URL
    if command -v jq &> /dev/null; then
      API_URL=$(jq -r '.apiUrl' "$CONFIG_FILE")
    else
      CONFIG_CONTENT=$(tr -d '\n' < "$CONFIG_FILE")
      API_URL=$(echo "$CONFIG_CONTENT" | sed 's/.*"apiUrl":"\([^"]*\)".*/\1/')
    fi

    echo -e "${GREEN}Endpoints:${NC}"
    echo "  API:     $API_URL"
    echo "  Swagger: $API_URL/docs"
    echo ""

    # Quick health check
    echo -n "API Status: "
    if curl -s -o /dev/null -w "%{http_code}" "$API_URL/docs" 2>/dev/null | grep -q "200"; then
      echo -e "${GREEN}HEALTHY${NC}"
    else
      echo -e "${RED}UNHEALTHY${NC}"
    fi
  fi
}

# ============================================================================
# COMMAND: full (complete deployment)
# ============================================================================

cmd_full() {
  # Generate unique names for this deployment
  ACR_NAME="b2bacr$(date +%s | tail -c 6)"
  DNS_LABEL="b2b-api-$(date +%s | tail -c 5)"
  JWT_SECRET="b2b-demo-jwt-secret-$(date +%s)"

  echo ""
  echo "=============================================="
  echo "  B2B Platform - Full Azure ACI Deployment"
  echo "=============================================="
  echo ""

  # Step 1: Create Resource Group
  log "Creating resource group: $RESOURCE_GROUP"
  az group create --name $RESOURCE_GROUP --location $LOCATION --output none
  success "Resource group created"

  # Step 2: Create Azure Container Registry
  log "Creating Azure Container Registry: $ACR_NAME"
  az acr create \
    --resource-group $RESOURCE_GROUP \
    --name $ACR_NAME \
    --sku Basic \
    --admin-enabled true \
    --output none
  success "Container Registry created"

  ACR_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
  ACR_USER=$(az acr credential show --name $ACR_NAME --query username -o tsv)
  ACR_PASS=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

  # Step 3: Deploy PostgreSQL
  log "Deploying PostgreSQL container..."
  az container create \
    --resource-group $RESOURCE_GROUP \
    --name b2b-postgres \
    --image postgres:16-alpine \
    --os-type Linux \
    --cpu 1 --memory 2 \
    --ports 5432 \
    --ip-address Public \
    --environment-variables \
      POSTGRES_USER=b2b \
      POSTGRES_PASSWORD=$DB_PASSWORD \
      POSTGRES_DB=b2b_platform \
    --output none

  POSTGRES_IP=$(az container show --name b2b-postgres --resource-group $RESOURCE_GROUP --query ipAddress.ip -o tsv)
  success "PostgreSQL deployed: $POSTGRES_IP:5432"

  # Step 4: Deploy Redis
  log "Deploying Redis container..."
  az container create \
    --resource-group $RESOURCE_GROUP \
    --name b2b-redis \
    --image redis:7-alpine \
    --os-type Linux \
    --cpu 0.5 --memory 1 \
    --ports 6379 \
    --ip-address Public \
    --command-line "redis-server --requirepass $REDIS_PASSWORD" \
    --output none

  REDIS_IP=$(az container show --name b2b-redis --resource-group $RESOURCE_GROUP --query ipAddress.ip -o tsv)
  success "Redis deployed: $REDIS_IP:6379"

  # Step 5: Build API Image
  log "Building API Docker image (this may take 3-4 minutes)..."
  cd "$BASE_DIR/b2b-api"
  az acr build --registry $ACR_NAME --image b2b-api:latest --file Dockerfile . --output none
  success "API image built and pushed"

  # Step 6: Build Nginx Proxy Image
  log "Building Nginx proxy image..."
  TMPDIR=$(mktemp -d)
  cat > "$TMPDIR/Dockerfile" << 'EOFDF'
FROM nginx:alpine
RUN apk add --no-cache openssl
RUN mkdir -p /etc/nginx/ssl
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/ssl/key.pem -out /etc/nginx/ssl/cert.pem -subj "/C=UK/ST=London/L=London/O=Demo/CN=demo"
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
EOFDF

  cat > "$TMPDIR/nginx.conf" << 'EOFNGINX'
events { worker_connections 1024; }
http {
    upstream api { server localhost:3000; }
    server {
        listen 80;
        listen 443 ssl;
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        location / {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_hide_header Content-Security-Policy;
            proxy_hide_header Strict-Transport-Security;
        }
    }
}
EOFNGINX

  cd "$TMPDIR"
  az acr build --registry $ACR_NAME --image nginx-proxy:latest . --output none
  rm -rf "$TMPDIR"
  success "Nginx proxy image built"

  # Step 7: Run Database Migrations
  log "Running database migrations..."
  cd "$BASE_DIR/b2b-api"
  az container create \
    --resource-group $RESOURCE_GROUP \
    --name b2b-migrate \
    --image $ACR_SERVER/b2b-api:latest \
    --os-type Linux \
    --cpu 0.5 --memory 1 \
    --restart-policy Never \
    --registry-login-server $ACR_SERVER \
    --registry-username $ACR_USER \
    --registry-password "$ACR_PASS" \
    --environment-variables \
      DATABASE_URL="postgresql://b2b:$DB_PASSWORD@$POSTGRES_IP:5432/b2b_platform" \
    --command-line "npx prisma migrate deploy" \
    --output none

  sleep 30
  az container delete --resource-group $RESOURCE_GROUP --name b2b-migrate --yes --output none 2>/dev/null || true
  success "Migrations completed"

  # Step 8: Seed Database
  log "Seeding database..."
  DATABASE_URL="postgresql://b2b:$DB_PASSWORD@$POSTGRES_IP:5432/b2b_platform" npx ts-node prisma/seed.ts 2>/dev/null || warn "Seed skipped (run manually if needed)"
  success "Database seeded"

  # Step 9: Deploy API with Nginx Proxy
  log "Deploying API with Nginx proxy..."

  cat > /tmp/aci-deploy.yaml << EOFYAML
apiVersion: 2021-09-01
location: $LOCATION
name: b2b-api-group
properties:
  osType: Linux
  ipAddress:
    type: Public
    dnsNameLabel: $DNS_LABEL
    ports:
      - protocol: tcp
        port: 80
      - protocol: tcp
        port: 443
  imageRegistryCredentials:
    - server: $ACR_SERVER
      username: $ACR_USER
      password: $ACR_PASS
  containers:
    - name: nginx
      properties:
        image: $ACR_SERVER/nginx-proxy:latest
        ports:
          - protocol: tcp
            port: 80
          - protocol: tcp
            port: 443
        resources:
          requests:
            cpu: 0.5
            memoryInGb: 0.5
    - name: api
      properties:
        image: $ACR_SERVER/b2b-api:latest
        ports:
          - protocol: tcp
            port: 3000
        environmentVariables:
          - name: NODE_ENV
            value: production
          - name: DATABASE_URL
            value: postgresql://b2b:$DB_PASSWORD@$POSTGRES_IP:5432/b2b_platform
          - name: REDIS_URL
            value: redis://:$REDIS_PASSWORD@$REDIS_IP:6379
          - name: REDIS_HOST
            value: '$REDIS_IP'
          - name: REDIS_PORT
            value: '6379'
          - name: REDIS_PASSWORD
            value: $REDIS_PASSWORD
          - name: JWT_SECRET
            value: $JWT_SECRET
          - name: JWT_EXPIRATION
            value: 24h
        resources:
          requests:
            cpu: 1
            memoryInGb: 2
EOFYAML

  az container create --resource-group $RESOURCE_GROUP --file /tmp/aci-deploy.yaml --output none
  rm /tmp/aci-deploy.yaml

  API_FQDN=$(az container show --name b2b-api-group --resource-group $RESOURCE_GROUP --query ipAddress.fqdn -o tsv)
  API_IP=$(az container show --name b2b-api-group --resource-group $RESOURCE_GROUP --query ipAddress.ip -o tsv)
  success "API deployed"

  # Step 10: Smoke Tests
  run_smoke_tests "http://$API_FQDN"

  # Summary
  echo ""
  echo "=============================================="
  echo "  Deployment Complete!"
  echo "=============================================="
  echo ""
  echo -e "${GREEN}API URLs:${NC}"
  echo "  HTTP:    http://$API_FQDN"
  echo "  HTTPS:   https://$API_FQDN (self-signed cert)"
  echo "  Swagger: http://$API_FQDN/docs"
  echo ""
  echo -e "${GREEN}Infrastructure:${NC}"
  echo "  PostgreSQL: $POSTGRES_IP:5432"
  echo "  Redis:      $REDIS_IP:6379"
  echo "  ACR:        $ACR_SERVER"
  echo ""
  echo -e "${GREEN}Test Credentials:${NC}"
  echo "  Email:    admin@b2b.local"
  echo "  Password: Admin123!"
  echo "  Header:   x-tenant-id: default"
  echo ""
  echo -e "${YELLOW}Quick Commands:${NC}"
  echo "  ./azure-aci-deploy.sh api      # Redeploy API code"
  echo "  ./azure-aci-deploy.sh seed     # Reseed database"
  echo "  ./azure-aci-deploy.sh reset-db # Reset & reseed DB"
  echo "  ./azure-aci-deploy.sh test     # Run smoke tests"
  echo "  ./azure-aci-deploy.sh status   # Check status"
  echo "  ./azure-aci-teardown.sh        # Delete everything"
  echo ""

  # Save config
  cat > "$CONFIG_FILE" << EOFJSON
{
  "resourceGroup": "$RESOURCE_GROUP",
  "apiUrl": "http://$API_FQDN",
  "apiUrlHttps": "https://$API_FQDN",
  "swaggerUrl": "http://$API_FQDN/docs",
  "postgres": "$POSTGRES_IP:5432",
  "redis": "$REDIS_IP:6379",
  "acr": "$ACR_SERVER",
  "credentials": {
    "dbPassword": "$DB_PASSWORD",
    "redisPassword": "$REDIS_PASSWORD"
  }
}
EOFJSON
  success "Config saved to $CONFIG_FILE"
}

# ============================================================================
# COMMAND: help
# ============================================================================

cmd_help() {
  echo ""
  echo "B2B Platform - Azure ACI Deployment Script"
  echo ""
  echo "Usage: ./azure-aci-deploy.sh [command]"
  echo ""
  echo "Commands:"
  echo "  full       Full deployment - creates all infrastructure (default)"
  echo "  api        Rebuild and redeploy API container only"
  echo "  seed       Reseed database (keeps schema, replaces data)"
  echo "  reset-db   Drop all tables and reseed fresh"
  echo "  migrate    Run Prisma migrations only"
  echo "  test       Run smoke tests against deployed API"
  echo "  status     Show current deployment status"
  echo "  help       Show this help message"
  echo ""
  echo "Examples:"
  echo "  ./azure-aci-deploy.sh              # Full deployment"
  echo "  ./azure-aci-deploy.sh api          # Quick API redeploy after code changes"
  echo "  ./azure-aci-deploy.sh seed         # Refresh test data"
  echo "  ./azure-aci-deploy.sh reset-db     # Start fresh with clean database"
  echo ""
}

# ============================================================================
# MAIN
# ============================================================================

COMMAND="${1:-full}"

case "$COMMAND" in
  full)
    cmd_full
    ;;
  api)
    cmd_api
    ;;
  seed)
    cmd_seed
    ;;
  reset-db)
    cmd_reset_db
    ;;
  migrate)
    cmd_migrate
    ;;
  test)
    cmd_test
    ;;
  status)
    cmd_status
    ;;
  help|--help|-h)
    cmd_help
    ;;
  *)
    error "Unknown command: $COMMAND"
    cmd_help
    exit 1
    ;;
esac
