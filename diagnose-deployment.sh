#!/bin/bash
# ============================================================================
# VPS Deployment Diagnostic Script
# Run this to check if your app is deployed correctly
# ============================================================================

set +e  # Don't exit on errors, just report them

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         TubeVox VPS Deployment Diagnostic Report            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Generated: $(date)"
echo ""

# ============================================================================
# 1. CHECK SYSTEM RESOURCES
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ 1. SYSTEM RESOURCES                                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}→ Disk Space:${NC}"
df -h | head -n 5
echo ""

echo -e "${YELLOW}→ Memory Usage:${NC}"
free -h
echo ""

echo -e "${YELLOW}→ CPU Info:${NC}"
nproc
echo ""

# ============================================================================
# 2. CHECK PROJECT DIRECTORY
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ 2. PROJECT DIRECTORY & FILES                                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

PROJECT_ROOT="/var/www/Youtube_tubevox_ai"

echo -e "${YELLOW}→ Checking project directory: $PROJECT_ROOT${NC}"
if [ -d "$PROJECT_ROOT" ]; then
    echo -e "${GREEN}✓${NC} Project directory exists"
    echo ""
    
    echo -e "${YELLOW}→ Key files present:${NC}"
    [ -f "$PROJECT_ROOT/.env" ] && echo -e "${GREEN}✓${NC} .env file exists" || echo -e "${RED}✗${NC} .env file missing"
    [ -f "$PROJECT_ROOT/ecosystem.config.js" ] && echo -e "${GREEN}✓${NC} ecosystem.config.js exists" || echo -e "${RED}✗${NC} ecosystem.config.js missing"
    [ -d "$PROJECT_ROOT/artifacts/api-server/dist" ] && echo -e "${GREEN}✓${NC} API server built" || echo -e "${RED}✗${NC} API server NOT built"
    [ -d "$PROJECT_ROOT/artifacts/dashboard/dist" ] && echo -e "${GREEN}✓${NC} Dashboard built" || echo -e "${RED}✗${NC} Dashboard NOT built"
    [ -d "$PROJECT_ROOT/artifacts/admin/dist" ] && echo -e "${GREEN}✓${NC} Admin panel built" || echo -e "${RED}✗${NC} Admin panel NOT built"
    [ -d "$PROJECT_ROOT/artifacts/tubevox-landing/dist" ] && echo -e "${GREEN}✓${NC} Landing page built" || echo -e "${RED}✗${NC} Landing page NOT built"
    echo ""
else
    echo -e "${RED}✗${NC} Project directory NOT found!"
    echo ""
fi

# ============================================================================
# 3. CHECK ENVIRONMENT VARIABLES
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ 3. ENVIRONMENT VARIABLES                                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${GREEN}✓${NC} .env file found"
    echo ""
    echo -e "${YELLOW}→ Environment variables in .env:${NC}"
    
    source "$PROJECT_ROOT/.env" 2>/dev/null
    
    if [ -z "$VITE_SUPABASE_URL" ]; then
        echo -e "${RED}✗${NC} VITE_SUPABASE_URL: NOT SET"
    else
        echo -e "${GREEN}✓${NC} VITE_SUPABASE_URL: $VITE_SUPABASE_URL"
    fi
    
    if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
        echo -e "${RED}✗${NC} VITE_SUPABASE_ANON_KEY: NOT SET"
    else
        echo -e "${GREEN}✓${NC} VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:0:20}..."
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        echo -e "${RED}✗${NC} SUPABASE_SERVICE_ROLE_KEY: NOT SET"
    else
        echo -e "${GREEN}✓${NC} SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
    fi
    
    if [ -z "$ADMIN_JWT_SECRET" ]; then
        echo -e "${RED}✗${NC} ADMIN_JWT_SECRET: NOT SET"
    else
        echo -e "${GREEN}✓${NC} ADMIN_JWT_SECRET: ${ADMIN_JWT_SECRET:0:20}..."
    fi
    
    if [ -z "$PORT" ]; then
        echo -e "${RED}✗${NC} PORT: NOT SET"
    else
        echo -e "${GREEN}✓${NC} PORT: $PORT"
    fi
    
    if [ -z "$API_SERVER_URL" ]; then
        echo -e "${RED}✗${NC} API_SERVER_URL: NOT SET"
    else
        echo -e "${GREEN}✓${NC} API_SERVER_URL: $API_SERVER_URL"
    fi
else
    echo -e "${RED}✗${NC} .env file NOT found!"
fi
echo ""

# ============================================================================
# 4. CHECK NODE & NPM VERSIONS
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ 4. NODE & PACKAGE MANAGERS                                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}→ Node version:${NC}"
node --version 2>/dev/null || echo -e "${RED}✗${NC} Node not installed"
echo ""

echo -e "${YELLOW}→ NPM version:${NC}"
npm --version 2>/dev/null || echo -e "${RED}✗${NC} NPM not installed"
echo ""

echo -e "${YELLOW}→ PNPM version:${NC}"
pnpm --version 2>/dev/null || echo -e "${RED}✗${NC} PNPM not installed"
echo ""

echo -e "${YELLOW}→ PM2 version:${NC}"
pm2 --version 2>/dev/null || echo -e "${RED}✗${NC} PM2 not installed"
echo ""

# ============================================================================
# 5. CHECK PM2 SERVICES
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ 5. PM2 SERVICES STATUS                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}→ PM2 Status:${NC}"
    pm2 status
    echo ""
    
    echo -e "${YELLOW}→ Running processes (ps aux):${NC}"
    ps aux | grep -E "node|npm|pnpm" | grep -v grep
    echo ""
else
    echo -e "${RED}✗${NC} PM2 is not installed!"
    echo ""
fi

# ============================================================================
# 6. CHECK LISTENING PORTS
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ 6. LISTENING PORTS                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}→ Services should be listening on:${NC}"
echo "  • Port 3002 - Landing Page"
echo "  • Port 3000 - Dashboard"
echo "  • Port 3001 - Admin Panel"
echo "  • Port 8080 - API Server"
echo ""

echo -e "${YELLOW}→ Currently listening ports:${NC}"
ss -tulpn 2>/dev/null | grep LISTEN | grep -E "3000|3001|3002|8080" || lsof -i -P -n 2>/dev/null | grep -E "3000|3001|3002|8080" || echo -e "${RED}✗${NC} Could not determine listening ports"
echo ""

# ============================================================================
# 7. CHECK SERVICE LOGS
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ 7. RECENT SERVICE LOGS                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}→ Last 10 lines of PM2 error logs:${NC}"
    pm2 logs --err --lines 10 2>/dev/null || echo "No error logs found"
    echo ""
    
    echo -e "${YELLOW}→ Last 10 lines of PM2 output logs:${NC}"
    pm2 logs --lines 10 2>/dev/null | head -n 10 || echo "No output logs found"
    echo ""
else
    echo -e "${RED}✗${NC} PM2 not available"
    echo ""
fi

# ============================================================================
# 8. CHECK CONNECTIVITY
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ 8. CONNECTIVITY TESTS                                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}→ Checking Supabase connectivity:${NC}"
curl -s -I "https://jxceenqmcyclbxaxvxto.supabase.co" | head -n 1 && echo -e "${GREEN}✓${NC} Supabase reachable" || echo -e "${RED}✗${NC} Cannot reach Supabase"
echo ""

# ============================================================================
# 9. SUMMARY & RECOMMENDATIONS
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ 9. SUMMARY & NEXT STEPS                                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}If your deployment is working:${NC}"
echo "  ✓ You should see all services running in PM2 status"
echo "  ✓ Ports 3000, 3001, 3002, 8080 should be listening"
echo "  ✓ No errors in the PM2 logs"
echo ""

echo -e "${YELLOW}Test your services:${NC}"
echo "  • Landing: curl http://localhost:3002"
echo "  • Dashboard: curl http://localhost:3000"
echo "  • Admin: curl http://localhost:3001"
echo "  • API: curl http://localhost:8080/api/healthz"
echo ""

echo -e "${YELLOW}Common issues:${NC}"
echo "  1. Environment variables not set → run: source /var/www/Youtube_tubevox_ai/.env"
echo "  2. Services not running → run: pm2 start ecosystem.config.js"
echo "  3. Port conflicts → check: ss -tulpn | grep LISTEN"
echo "  4. Missing builds → run: cd /var/www/Youtube_tubevox_ai && pnpm install && pnpm -r build"
echo ""

echo -e "${YELLOW}Useful commands:${NC}"
echo "  pm2 status           - View all services"
echo "  pm2 logs             - View logs"
echo "  pm2 restart all      - Restart services"
echo "  pm2 stop all         - Stop services"
echo "  pm2 delete all       - Remove all services"
echo ""

echo -e "${BLUE}End of diagnostic report${NC}"
echo ""
