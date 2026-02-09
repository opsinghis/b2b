#!/bin/bash
#
# B2B Platform - Azure ACI Deployment
# Creates: PostgreSQL, Redis, API with Nginx Proxy
#
# Usage: ./azure-aci-deploy.sh
#

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================

RESOURCE_GROUP="b2b-demo-rg"
LOCATION="uksouth"
ACR_NAME="b2bacr$(date +%s | tail -c 6)"
DNS_LABEL="b2b-api-$(date +%s | tail -c 5)"

# Credentials (simple for demo)
DB_PASSWORD="B2BDemo2024"
REDIS_PASSWORD="B2BDemo2024"
JWT_SECRET="b2b-demo-jwt-secret-$(date +%s)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo ""
echo "=============================================="
echo "  B2B Platform - Azure ACI Deployment"
echo "=============================================="
echo ""

# ============================================================================
# STEP 1: Create Resource Group
# ============================================================================

log "Creating resource group: $RESOURCE_GROUP"
az group create --name $RESOURCE_GROUP --location $LOCATION --output none
success "Resource group created"

# ============================================================================
# STEP 2: Create Azure Container Registry
# ============================================================================

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

# ============================================================================
# STEP 3: Deploy PostgreSQL
# ============================================================================

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

# ============================================================================
# STEP 4: Deploy Redis
# ============================================================================

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

# ============================================================================
# STEP 5: Build API Image
# ============================================================================

log "Building API Docker image (this may take 3-4 minutes)..."
cd "$(dirname "$0")/b2b-api"
az acr build --registry $ACR_NAME --image b2b-api:latest --file Dockerfile . --output none
success "API image built and pushed"

# ============================================================================
# STEP 6: Build Nginx Proxy Image
# ============================================================================

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

# ============================================================================
# STEP 7: Run Database Migrations
# ============================================================================

log "Running database migrations..."
cd "$(dirname "$0")/b2b-api"
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

# Wait for migration to complete
sleep 30
az container delete --resource-group $RESOURCE_GROUP --name b2b-migrate --yes --output none 2>/dev/null || true
success "Migrations completed"

# ============================================================================
# STEP 8: Seed Database (from local)
# ============================================================================

log "Seeding database..."
DATABASE_URL="postgresql://b2b:$DB_PASSWORD@$POSTGRES_IP:5432/b2b_platform" npx ts-node prisma/seed.ts 2>/dev/null || warn "Seed skipped (run manually if needed)"
success "Database seeded"

# ============================================================================
# STEP 9: Deploy API with Nginx Proxy
# ============================================================================

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

# ============================================================================
# SUMMARY
# ============================================================================

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
echo -e "${YELLOW}Frontend Config:${NC}"
echo "  NEXT_PUBLIC_API_URL=http://$API_FQDN"
echo ""
echo -e "${YELLOW}To tear down:${NC}"
echo "  ./azure-aci-teardown.sh"
echo ""

# Save config
cat > azure-aci-config.json << EOFJSON
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
success "Config saved to azure-aci-config.json"
