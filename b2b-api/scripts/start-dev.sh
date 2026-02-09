#!/bin/bash
#
# B2B API Development Startup Script
# -----------------------------------
# This script starts all required services, seeds the database, and starts the dev server.
#
# Usage:
#   ./scripts/start-dev.sh           # Full startup (docker + seed + server)
#   ./scripts/start-dev.sh --skip-docker   # Skip Docker (assumes already running)
#   ./scripts/start-dev.sh --skip-seed     # Skip seeding
#   ./scripts/start-dev.sh --seed-only     # Only run seed, don't start server
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Parse arguments
SKIP_DOCKER=false
SKIP_SEED=false
SEED_ONLY=false

for arg in "$@"; do
  case $arg in
    --skip-docker)
      SKIP_DOCKER=true
      shift
      ;;
    --skip-seed)
      SKIP_SEED=true
      shift
      ;;
    --seed-only)
      SEED_ONLY=true
      shift
      ;;
    --help)
      echo "Usage: ./scripts/start-dev.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-docker    Skip starting Docker services"
      echo "  --skip-seed      Skip database seeding"
      echo "  --seed-only      Only run seed, don't start server"
      echo "  --help           Show this help message"
      exit 0
      ;;
  esac
done

cd "$PROJECT_DIR"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  B2B API Development Startup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ============================================
# Step 1: Start Docker Services
# ============================================
if [ "$SKIP_DOCKER" = false ]; then
  echo -e "${YELLOW}[1/5]${NC} Starting Docker services..."

  # Check if Docker is running
  if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
    exit 1
  fi

  # Start docker-compose
  cd docker
  docker-compose up -d
  cd ..

  echo -e "${GREEN}✓${NC} Docker services started"
  echo ""

  # Wait for services to be healthy
  echo -e "${YELLOW}[2/5]${NC} Waiting for services to be healthy..."

  # Wait for PostgreSQL
  echo -n "  PostgreSQL: "
  for i in {1..30}; do
    if docker exec b2b-postgres pg_isready -U postgres > /dev/null 2>&1; then
      echo -e "${GREEN}ready${NC}"
      break
    fi
    if [ $i -eq 30 ]; then
      echo -e "${RED}timeout${NC}"
      exit 1
    fi
    sleep 1
    echo -n "."
  done

  # Wait for Redis
  echo -n "  Redis: "
  for i in {1..30}; do
    if docker exec b2b-redis redis-cli ping > /dev/null 2>&1; then
      echo -e "${GREEN}ready${NC}"
      break
    fi
    if [ $i -eq 30 ]; then
      echo -e "${RED}timeout${NC}"
      exit 1
    fi
    sleep 1
    echo -n "."
  done

  echo ""
else
  echo -e "${YELLOW}[1/5]${NC} Skipping Docker (--skip-docker)"
  echo -e "${YELLOW}[2/5]${NC} Skipping health check"
  echo ""
fi

# ============================================
# Step 2: Run Database Migrations
# ============================================
echo -e "${YELLOW}[3/5]${NC} Running database migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --skip-generate 2>/dev/null || true
npx prisma generate > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Migrations complete"
echo ""

# ============================================
# Step 3: Seed Database (if needed)
# ============================================
if [ "$SKIP_SEED" = false ]; then
  echo -e "${YELLOW}[4/5]${NC} Checking database seed status..."

  # Check if already seeded
  TENANT_COUNT=$(node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.tenant.count().then(c => { console.log(c); p.\$disconnect(); });
  " 2>/dev/null || echo "0")

  if [ "$TENANT_COUNT" = "0" ] || [ -z "$TENANT_COUNT" ]; then
    echo "  Database is empty, running seed..."
    npm run prisma:seed
    echo -e "${GREEN}✓${NC} Database seeded"
  else
    # Always run seed to ensure all reference data exists (uses upsert, safe to re-run)
    echo "  Running seed to ensure all reference data exists..."
    npm run prisma:seed
    echo -e "${GREEN}✓${NC} Database seed complete (${TENANT_COUNT} tenant(s))"
  fi
  echo ""
else
  echo -e "${YELLOW}[4/5]${NC} Skipping seed (--skip-seed)"
  echo ""
fi

# ============================================
# Step 4: Start Development Server
# ============================================
if [ "$SEED_ONLY" = true ]; then
  echo -e "${YELLOW}[5/5]${NC} Skipping server start (--seed-only)"
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  Setup Complete!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
fi

echo -e "${YELLOW}[5/5]${NC} Starting development server..."
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Server starting...${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  API:     ${BLUE}http://localhost:3000${NC}"
echo -e "  Swagger: ${BLUE}http://localhost:3000/docs${NC}"
echo ""
echo -e "  ${YELLOW}Test Credentials:${NC}"
echo -e "    Admin:    admin@b2b.local / Admin123!"
echo -e "    Customer: customer@b2b.local / Admin123!"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Start the server
npm run start:dev
