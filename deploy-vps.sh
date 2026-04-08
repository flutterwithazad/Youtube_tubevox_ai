#!/bin/bash
# ============================================================================
# VPS Deployment Script for YTScraper
# Run this once on your VPS to set up everything automatically
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       YTScraper VPS Deployment & Configuration Script         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# CONFIGURATION SECTION - UPDATE THESE WITH YOUR VALUES
# ============================================================================

echo -e "${YELLOW}[STEP 1] Configuring Environment Variables...${NC}"
echo ""

# Supabase Configuration (REQUIRED - Get from Supabase dashboard)
SUPABASE_URL="https://jxceenqmcyclbxaxvxto.supabase.co"
SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-placeholder-anon-key}"  # Get from Supabase Settings → API
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-placeholder-service-role-key}"  # Get from Supabase Settings → API

# Admin JWT Secret (Generate a random string)
ADMIN_JWT_SECRET="${ADMIN_JWT_SECRET:-your-long-random-secret-$(openssl rand -hex 32)}"

# Paths
PROJECT_ROOT="/var/www/Youtube_tubevox_ai"
ENV_FILE="$PROJECT_ROOT/.env"

# ============================================================================
# VALIDATION
# ============================================================================

if [ "$SUPABASE_ANON_KEY" == "placeholder-anon-key" ] || [ "$SUPABASE_SERVICE_ROLE_KEY" == "placeholder-service-role-key" ]; then
    echo -e "${RED}❌ ERROR: Supabase credentials not set!${NC}"
    echo ""
    echo "Please update these values in the deploy-vps.sh script:"
    echo "  - SUPABASE_ANON_KEY"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "Get them from: Supabase Dashboard → Settings → API"
    exit 1
fi

# ============================================================================
# CREATE .env FILE
# ============================================================================

echo -e "${GREEN}✓${NC} Creating .env file at $ENV_FILE"
cat > "$ENV_FILE" << EOF
# ===============================================================================
# YTScraper Environment Configuration
# Generated: $(date)
# ===============================================================================

# ─── Supabase Configuration ────────────────────────────────────────────────────
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# ─── API Server ────────────────────────────────────────────────────────────────
PORT=8080
API_SERVER_URL=http://localhost:8080

# ─── Admin Authentication ──────────────────────────────────────────────────────
ADMIN_JWT_SECRET=$ADMIN_JWT_SECRET

# ─── Dashboard Configuration ───────────────────────────────────────────────────
# These will be set when running dashboard service
# VITE_SUPABASE_URL is already set above
# BASE_PATH=/dashboard/

# ─── Admin Panel Configuration ─────────────────────────────────────────────────
# These will be set when running admin service
# VITE_SUPABASE_URL is already set above
# BASE_PATH=/admin/

EOF

echo -e "${GREEN}✓${NC} .env file created successfully"
echo ""

# ============================================================================
# VERIFY ENVIRONMENT VARIABLES
# ============================================================================

echo -e "${YELLOW}[STEP 2] Verifying Environment Variables...${NC}"
source "$ENV_FILE"

echo -e "${GREEN}✓${NC} VITE_SUPABASE_URL: $VITE_SUPABASE_URL"
echo -e "${GREEN}✓${NC} VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:0:20}..."
echo -e "${GREEN}✓${NC} SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
echo -e "${GREEN}✓${NC} ADMIN_JWT_SECRET: ${ADMIN_JWT_SECRET:0:20}..."
echo -e "${GREEN}✓${NC} API_SERVER_URL: $API_SERVER_URL"
echo ""

# ============================================================================
# CHECK IF PROJECT EXISTS
# ============================================================================

echo -e "${YELLOW}[STEP 3] Checking Project Directory...${NC}"
if [ ! -d "$PROJECT_ROOT" ]; then
    echo -e "${RED}❌ ERROR: Project directory not found at $PROJECT_ROOT${NC}"
    echo "Please ensure the project is cloned at: $PROJECT_ROOT"
    exit 1
fi
echo -e "${GREEN}✓${NC} Project directory found: $PROJECT_ROOT"
echo ""

# ============================================================================
# STOP RUNNING SERVICES
# ============================================================================

echo -e "${YELLOW}[STEP 4] Stopping Running Services...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 stop all || true
    echo -e "${GREEN}✓${NC} Services stopped"
else
    echo -e "${YELLOW}⚠${NC}  PM2 not found, skipping stop"
fi
echo ""

# ============================================================================
# INSTALL DEPENDENCIES
# ============================================================================

echo -e "${YELLOW}[STEP 5] Installing Dependencies...${NC}"
cd "$PROJECT_ROOT"
pnpm install
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# ============================================================================
# BUILD PROJECTS
# ============================================================================

echo -e "${YELLOW}[STEP 6] Building Projects...${NC}"
echo "Building API Server..."
pnpm --filter @workspace/api-server run build
echo -e "${GREEN}✓${NC} API Server built"

echo "Building Dashboard..."
pnpm --filter @workspace/dashboard run build
echo -e "${GREEN}✓${NC} Dashboard built"

echo "Building Admin..."
pnpm --filter @workspace/admin run build
echo -e "${GREEN}✓${NC} Admin built"

echo "Building Landing Page..."
pnpm --filter @workspace/ytscraper-landing run build
echo -e "${GREEN}✓${NC} Landing Page built"
echo ""

# ============================================================================
# CREATE ECOSYSTEM.CONFIG.JS IF IT DOESN'T EXIST
# ============================================================================

echo -e "${YELLOW}[STEP 7] Setting Up PM2 Configuration...${NC}"

ECOSYSTEM_FILE="$PROJECT_ROOT/ecosystem.config.js"

cat > "$ECOSYSTEM_FILE" << 'ECOSYSTEM_EOF'
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: 'artifacts/api-server/dist/index.cjs',
      cwd: '/var/www/Youtube_tubevox_ai',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      error_file: '/var/log/pm2/api-server-error.log',
      out_file: '/var/log/pm2/api-server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'dashboard',
      script: 'artifacts/dashboard/dist/server.js',
      cwd: '/var/www/Youtube_tubevox_ai',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        BASE_PATH: '/dashboard/',
      },
      error_file: '/var/log/pm2/dashboard-error.log',
      out_file: '/var/log/pm2/dashboard-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'admin',
      script: 'artifacts/admin/dist/server.js',
      cwd: '/var/www/Youtube_tubevox_ai',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        BASE_PATH: '/admin/',
      },
      error_file: '/var/log/pm2/admin-error.log',
      out_file: '/var/log/pm2/admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'landing',
      script: 'artifacts/ytscraper-landing/dist/server.js',
      cwd: '/var/www/Youtube_tubevox_ai',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        BASE_PATH: '/',
      },
      error_file: '/var/log/pm2/landing-error.log',
      out_file: '/var/log/pm2/landing-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
ECOSYSTEM_EOF

echo -e "${GREEN}✓${NC} Ecosystem config created"
echo ""

# ============================================================================
# START SERVICES WITH PM2
# ============================================================================

echo -e "${YELLOW}[STEP 8] Starting Services with PM2...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠${NC}  PM2 not found, installing..."
    npm install -g pm2
fi

# Source environment
export $(cat "$ENV_FILE" | xargs)

# Start services
cd "$PROJECT_ROOT"
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo -e "${GREEN}✓${NC} Services started with PM2"
echo ""

# ============================================================================
# DISPLAY STATUS
# ============================================================================

echo -e "${YELLOW}[STEP 9] Checking Service Status...${NC}"
pm2 status
echo ""

# ============================================================================
# DISPLAY LISTENING PORTS
# ============================================================================

echo -e "${YELLOW}[STEP 10] Checking Listening Ports...${NC}"
echo ""
echo "Checking which ports are listening..."
ss -tulpn 2>/dev/null | grep LISTEN || lsof -i -P -n 2>/dev/null | grep LISTEN || echo "Could not determine ports"
echo ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  Deployment Complete! ✓                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo "  ✓ Environment variables configured"
echo "  ✓ Dependencies installed"
echo "  ✓ Projects built"
echo "  ✓ PM2 services started"
echo ""
echo -e "${BLUE}Your services should now be running at:${NC}"
echo "  • Landing Page:  http://173.249.9.155:3002"
echo "  • Dashboard:     http://173.249.9.155:3000"
echo "  • Admin Panel:   http://173.249.9.155:3001"
echo "  • API Server:    http://173.249.9.155:8080/api"
echo ""
echo -e "${BLUE}Useful PM2 Commands:${NC}"
echo "  pm2 status          - Check service status"
echo "  pm2 logs            - View all logs"
echo "  pm2 logs api-server - View API server logs"
echo "  pm2 restart all     - Restart all services"
echo "  pm2 stop all        - Stop all services"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "  1. Make sure your Supabase credentials are correct"
echo "  2. Configure Google OAuth in Supabase dashboard"
echo "  3. Set up redirect URLs for authentication"
echo ""
