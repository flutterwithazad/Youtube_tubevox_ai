#!/bin/bash

# Quick fix for VPS .env - Add BASE_PATH variable

VPS_IP="173.249.9.155"
VPS_USER="root"

ssh ${VPS_USER}@${VPS_IP} << 'EOF'
  # Check if BASE_PATH is already in .env
  if ! grep -q "BASE_PATH" /var/www/Youtube_tubevox_ai/.env; then
    echo "BASE_PATH=/dashboard" >> /var/www/Youtube_tubevox_ai/.env
    echo "✅ Added BASE_PATH to .env"
  else
    echo "✅ BASE_PATH already exists in .env"
  fi
  
  echo ""
  echo "Current .env configuration:"
  grep -E "VITE_|BASE_PATH|PORT=" /var/www/Youtube_tubevox_ai/.env | head -10
EOF
