#!/bin/bash

# VPS Deployment Script - Fixed Version
# This script deploys the latest code to the VPS with proper environment setup

set -e

VPS_IP="173.249.9.155"
VPS_USER="root"

echo "🚀 Starting VPS Deployment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Deploy with environment variables set
ssh ${VPS_USER}@${VPS_IP} << 'DEPLOY_EOF'
  cd /var/www/Youtube_tubevox_ai
  
  # Step 1: Pull latest code
  echo "📥 Step 1: Pulling latest code..."
  git pull origin azad
  
  # Step 2: Load environment
  echo "🔧 Step 2: Loading environment variables..."
  export $(cat .env | grep -v '^#' | xargs)
  
  # Step 3: Rebuild dashboard with PORT env set
  echo "🔨 Step 3: Rebuilding dashboard..."
  PORT=3000 pnpm --filter @workspace/dashboard run build
  
  # Step 4: Rebuild admin with PORT env set
  echo "🔨 Step 4: Rebuilding admin..."
  PORT=3001 pnpm --filter @workspace/admin run build
  
  # Step 5: Rebuild landing with PORT env set
  echo "🔨 Step 5: Rebuilding landing..."
  PORT=3002 pnpm --filter @workspace/tubevox-landing run build
  
  # Step 6: Restart services
  echo "♻️  Step 6: Restarting services..."
  pm2 restart dashboard admin landing
  sleep 3
  pm2 status
  
  # Step 7: Verify deployment
  echo ""
  echo "✅ Step 7: Verifying services..."
  echo ""
  echo "Testing dashboard..."
  curl -s -o /dev/null -w "Dashboard (3000): %{http_code}\n" http://localhost:3000
  echo "Testing admin..."
  curl -s -o /dev/null -w "Admin (3001): %{http_code}\n" http://localhost:3001
  echo "Testing landing..."
  curl -s -o /dev/null -w "Landing (3002): %{http_code}\n" http://localhost:3002
  echo "Testing API..."
  curl -s -o /dev/null -w "API (8080): %{http_code}\n" http://localhost:8080/api/healthz
  
DEPLOY_EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Deployment complete!"
echo ""
echo "Your application is now updated and running:"
echo "  → Dashboard: https://tubevox.com (http://173.249.9.155:3000)"
echo "  → Admin: http://173.249.9.155:3001"
echo "  → Landing: http://173.249.9.155:3002"
echo ""
echo "📝 Next steps:"
echo "  1. Clear your browser cache (Cmd+Shift+Delete on macOS)"
echo "  2. Visit https://tubevox.com and test Google sign-in"
echo "  3. Check browser console (F12) for OAuth debug logs"
echo ""
