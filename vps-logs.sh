#!/bin/bash
# Script to fetch logs from VPS
VPS_IP="173.249.9.155"
VPS_USER="root"
SSH_CMD="ssh ${VPS_USER}@${VPS_IP}"

echo "📡 Fetching API Server logs from VPS..."
$SSH_CMD "pm2 logs api-server --lines 100 --no-daemon"
