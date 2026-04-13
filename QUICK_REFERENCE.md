# ⚡ Quick Reference - TubeVox Deployment

## 🌐 Live URLs

```
Landing:  http://173.249.9.155:3002
Dashboard: http://173.249.9.155:3000
Admin:    http://173.249.9.155:3001
API:      http://173.249.9.155:8080/api
```

## 🔑 Access VPS

```bash
ssh root@173.249.9.155
# Enter your password (the new one you set)
```

## 📊 Check Services

```bash
pm2 status              # See all services
pm2 logs                # View all logs
pm2 logs api-server     # View specific service
```

## 🔄 Manage Services

```bash
pm2 restart all         # Restart everything
pm2 restart api-server  # Restart one service
pm2 stop all           # Stop everything
pm2 start all          # Start everything
```

## 🐛 Debugging

```bash
pm2 logs --lines 50 --follow   # Watch logs in real-time
curl http://localhost:8080/api/healthz  # Test API
```

## 📁 Project Location

```
/var/www/Youtube_tubevox_ai/
```

## 🛠️ Configuration Files

```
.env                    # Environment variables
ecosystem.config.js     # PM2 services config
```

## ⚠️ Current Issues

1. **Google OAuth**: Not configured yet
   - See: `GOOGLE_OAUTH_SETUP.md`
   - Follow 7 steps in the guide
   - Rebuild dashboard after config

2. **System Restart Pending**
   ```bash
   sudo apt update && sudo apt upgrade
   sudo reboot
   ```

## ✅ What's Working

- ✅ All services running
- ✅ All ports listening
- ✅ Database connected
- ✅ Environment variables set
- ✅ PM2 persistent across reboots

## ❌ What Needs Work

- ❌ Google OAuth (see setup guide)
- ❌ HTTPS/SSL (if using custom domain)

## 🚀 Next Step

**Complete Google OAuth Setup** → See `GOOGLE_OAUTH_SETUP.md`

1. Create Google Cloud OAuth credentials
2. Add credentials to Supabase
3. Whitelist redirect URLs
4. Rebuild and restart
5. Test sign-in

## 📞 VPS Details

- **IP**: 173.249.9.155
- **Provider**: Contabo
- **Root User**: root
- **Node**: v20.20.2
- **PM2**: Managing 4 services

