#!/bin/bash
# ============================================================================
# FIXED Ecosystem Configuration for PM2
# This script creates the correct ecosystem.config.js for your VPS
# ============================================================================

cat > /var/www/Youtube_tubevox_ai/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    // API Server - Node.js Express backend
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

    // Dashboard - Vite SPA served with serve package
    {
      name: 'dashboard',
      script: 'npx',
      args: 'serve -l 3000 -s artifacts/dashboard/dist',
      cwd: '/var/www/Youtube_tubevox_ai',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/dashboard-error.log',
      out_file: '/var/log/pm2/dashboard-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // Admin - Vite SPA served with serve package
    {
      name: 'admin',
      script: 'npx',
      args: 'serve -l 3001 -s artifacts/admin/dist',
      cwd: '/var/www/Youtube_tubevox_ai',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/pm2/admin-error.log',
      out_file: '/var/log/pm2/admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // Landing - Vite SPA served with serve package
    {
      name: 'landing',
      script: 'npx',
      args: 'serve -l 3002 -s artifacts/tubevox-landing/dist',
      cwd: '/var/www/Youtube_tubevox_ai',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      error_file: '/var/log/pm2/landing-error.log',
      out_file: '/var/log/pm2/landing-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
EOF

echo "✓ ecosystem.config.js created successfully"
