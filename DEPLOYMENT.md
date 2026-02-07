# B2B Platform - Azure Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Azure Container Apps                         │
│                                                                 │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐         │
│   │   Admin     │   │   Portal    │   │   Backend   │         │
│   │  (Next.js)  │   │  (Next.js)  │   │  (NestJS)   │         │
│   │  Port 3002  │   │  Port 3003  │   │  Port 3000  │         │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘         │
│          │                 │                  │                 │
│          └────────────────┬┘                  │                 │
│                           │ NEXT_PUBLIC_API_URL                 │
│                           └──────────────────►│                 │
│                                               │                 │
│                                               ▼                 │
│                           ┌──────────────────────────────────┐ │
│                           │  Azure PostgreSQL Flexible       │ │
│                           │  Azure Cache for Redis           │ │
│                           │  Azure Blob Storage (optional)   │ │
│                           └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Azure CLI** installed and logged in:
   ```bash
   az login
   ```

2. **Docker** installed (for local testing)

3. **Azure Subscription** with sufficient credits

## Quick Deploy (One Command)

```bash
cd /Users/omsingh0/code/b2b
./azure-deploy.sh
```

This script will:
1. Create Resource Group
2. Create Azure Container Registry
3. Create PostgreSQL Flexible Server
4. Create Azure Cache for Redis
5. Build and push Docker images
6. Deploy Backend API
7. Deploy Admin Portal
8. Deploy Customer Portal
9. Output all URLs

## Estimated Costs (Pay-as-you-go)

| Resource | SKU | Est. Monthly Cost |
|----------|-----|-------------------|
| Container Apps (3 apps) | Consumption | ~$15-30 |
| PostgreSQL Flexible | B1ms | ~$15 |
| Redis Cache | Basic C0 | ~$16 |
| Container Registry | Basic | ~$5 |
| **Total** | | **~$50-70/month** |

*For demo purposes, can be reduced by stopping when not in use.*

## Manual Deployment Steps

### Step 1: Set Variables

```bash
export RESOURCE_GROUP="b2b-platform-rg"
export LOCATION="eastus"
export ACR_NAME="b2bacr$(date +%s)"
```

### Step 2: Create Resources

```bash
# Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Container Registry
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true

# PostgreSQL
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name b2b-postgres \
  --admin-user b2badmin \
  --admin-password "YourSecurePassword123!" \
  --sku-name Standard_B1ms

# Redis
az redis create \
  --resource-group $RESOURCE_GROUP \
  --name b2b-redis \
  --sku Basic \
  --vm-size c0
```

### Step 3: Build Images

```bash
# Backend
cd b2b-api
az acr build --registry $ACR_NAME --image b2b-api:latest .

# Frontend
cd ../b2b-web
az acr build --registry $ACR_NAME --image b2b-admin:latest --target admin .
az acr build --registry $ACR_NAME --image b2b-portal:latest --target portal .
```

### Step 4: Deploy Apps

```bash
# Create environment
az containerapp env create \
  --resource-group $RESOURCE_GROUP \
  --name b2b-env \
  --location $LOCATION

# Deploy API
az containerapp create \
  --resource-group $RESOURCE_GROUP \
  --name b2b-api \
  --environment b2b-env \
  --image "${ACR_NAME}.azurecr.io/b2b-api:latest" \
  --target-port 3000 \
  --ingress external \
  --env-vars "DATABASE_URL=..." "REDIS_URL=..." "JWT_SECRET=..."
```

## Local Testing with Docker Compose

Before deploying to Azure, test locally:

```bash
cd /Users/omsingh0/code/b2b

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f api

# Access
# API:    http://localhost:3000
# Swagger: http://localhost:3000/docs
# Admin:  http://localhost:3002
# Portal: http://localhost:3003
```

## Post-Deployment Steps

### 1. Run Migrations

```bash
# Connect to API container
az containerapp exec --resource-group $RESOURCE_GROUP --name b2b-api

# Run migrations
npx prisma migrate deploy

# Seed data (optional)
npx prisma db seed
```

### 2. Create Admin User

```bash
curl -X POST https://YOUR-API-URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

### 3. Configure Custom Domain (Optional)

```bash
az containerapp hostname add \
  --resource-group $RESOURCE_GROUP \
  --name b2b-portal \
  --hostname demo.yourdomain.com
```

## Cleanup

To delete all resources:

```bash
az group delete --name b2b-platform-rg --yes --no-wait
```

## Troubleshooting

### View Container Logs

```bash
az containerapp logs show \
  --resource-group $RESOURCE_GROUP \
  --name b2b-api \
  --follow
```

### Restart App

```bash
az containerapp revision restart \
  --resource-group $RESOURCE_GROUP \
  --name b2b-api
```

### Check Environment Variables

```bash
az containerapp show \
  --resource-group $RESOURCE_GROUP \
  --name b2b-api \
  --query properties.template.containers[0].env
```

## Files Created

| File | Purpose |
|------|---------|
| `b2b-api/Dockerfile` | Backend container image |
| `b2b-web/Dockerfile` | Frontend container image (multi-stage) |
| `docker-compose.yml` | Local development stack |
| `azure-deploy.sh` | One-click Azure deployment |
| `DEPLOYMENT.md` | This guide |
