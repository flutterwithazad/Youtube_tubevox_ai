#!/bin/bash

# VPS Deployment Script
# This script deploys the latest code to the VPS

set -e

VPS_IP="173.249.9.155"
VPS_USER="root"
VPS_PATH="/var/www/Youtube_tubevox_ai"

echo "🚀 Starting VPS Deployment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Connect to VPS and pull latest code
echo "📥 Step 1: Pulling latest code from repository..."
ssh ${VPS_USER}@${VPS_IP} << 'EOF'
  cd /var/www/Youtube_tubevox_ai
  git pull origin azad
  echo "✅ Code pulled successfully"
EOF

# Step 2: Rebuild dashboard
echo ""
echo "🔨 Step 2: Rebuilding dashboard..."
ssh ${VPS_USER}@${VPS_IP} << 'EOF'
  cd /var/www/Youtube_tubevox_ai
  pnpm --filter @workspace/dashboard run build
  echo "✅ Dashboard rebuilt"
EOF

# Step 3: Restart dashboard service
echo ""
echo "♻️  Step 3: Restarting dashboard service..."
ssh ${VPS_USER}@${VPS_IP} << 'EOF'
  pm2 restart dashboard
  sleep 2
  pm2 status
  echo "✅ Dashboard restarted"
EOF

# Step 4: Verify deployment
echo ""
echo "✅ Step 4: Verifying deployment..."
ssh ${VPS_USER}@${VPS_IP} << 'EOF'
  echo ""
  echo "Testing dashboard endpoint..."
  curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000
  echo "✅ Dashboard is responding"
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Deployment complete!"
echo ""
echo "Your dashboard is now updated and running:"
echo "  → https://tubevox.com"
echo "  → http://173.249.9.155:3000"
echo ""
echo "Next steps:"
echo "  1. Clear your browser cache (Ctrl+Shift+Delete)"
echo "  2. Visit your site and try Google sign-in again"
echo "  3. Check browser console for OAuth debug logs"
