#!/bin/bash

# VPS Deployment Script - Optimized Version
# Deploys Dashboard, Admin, Landing, and API Server to VPS

set -e

VPS_IP="173.249.9.155"
VPS_USER="root"

echo "🚀 Starting Full VPS Deployment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Use sshpass if needed, or assume SSH keys are set up
SSH_CMD="ssh ${VPS_USER}@${VPS_IP}"

$SSH_CMD << 'DEPLOY_EOF'
  cd /var/www/Youtube_tubevox_ai
  
  # Step 1: Pull latest code
  echo "📥 Step 1: Pulling latest code from git..."
  git pull origin azad
  
  # Step 2: Load g9T3X88orBfsUV
  echo "🔧 Step 2: Loading environment variables..."
  export $(cat .env | grep -v '^#' | xargs)
  
  # Step 3: Install dependencies if package.json or pnpm-lock.yaml changed
  echo "📦 Step 3: Updating dependencies..."
  pnpm install
  
  # Step 4: Rebuild API Server
  echo "🔨 Step 4: Rebuilding API Server..."
  pnpm --filter @workspace/api-server run build
  
  # Step 5: Rebuild Frontend Panels (React/Vite)
  echo "🔨 Step 5: Rebuilding Frontend Panels..."
  
  echo "  → Dashboard..."
  PORT=3000 pnpm --filter @workspace/dashboard run build
  
  echo "  → Admin Panel..."
  PORT=3001 pnpm --filter @workspace/admin run build
  
  echo "  → Landing Page..."
  PORT=3002 pnpm --filter @workspace/tubevox-landing run build
  
  # Step 6: Restart services via PM2
  echo "♻️  Step 6: Restarting all services..."
  pm2 restart ecosystem.config.js --env production
  
  echo "⏳ Waiting for services to stabilize..."
  sleep 5
  pm2 status
  
  # Step 7: Final Verification
  echo ""
  echo "✅ Step 7: Verifying services..."
  echo ""
  
  # Check local ports on VPS
  curl -s -o /dev/null -w "Landing (3002): %{http_code}\n" http://localhost:3002
  curl -s -o /dev/null -w "Dashboard (3000): %{http_code}\n" http://localhost:3000
  curl -s -o /dev/null -w "Admin (3001): %{http_code}\n" http://localhost:3001
  curl -s -o /dev/null -w "API Server (8080): %{http_code}\n" http://localhost:8080/api/healthz
  
DEPLOY_EOF

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Deployment complete!"
echo ""
echo "Live Links:"
echo "  → Landing:   https://tubevox.com"
echo "  → Dashboard: https://tubevox.com/dashboard/"
echo "  → Admin:     https://tubevox.com/admin/"
echo ""
echo "📝 Post-Deployment Checklist:"
echo "  1. If you added new environment variables, verify they are in the VPS .env file."
echo "  2. Clear browser cache if assets (CSS/JS) don't seem updated."
echo "  3. Check PM2 logs on VPS if any service is 'errored': pm2 logs"
echo ""
