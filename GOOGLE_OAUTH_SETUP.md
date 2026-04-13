# 🔐 Google OAuth Setup Guide for TubeVox

## Status: Deployment Complete ✅

Your TubeVox application is fully deployed and running on your VPS. All services are online:
- ✅ Landing Page (port 3002)
- ✅ Dashboard (port 3000)
- ✅ Admin Panel (port 3001)
- ✅ API Server (port 8080)

**Current Issue:** Google OAuth sign-in is not working because:
1. Google OAuth provider not registered in Supabase
2. Callback URL not whitelisted
3. Google Cloud credentials not configured

---

## Step 1: Create a Google Cloud Project

1. Go to **Google Cloud Console**: https://console.cloud.google.com
2. Create a new project:
   - Click **"Select a Project"** → **"New Project"**
   - Name: `TubeVox` (or your app name)
   - Click **"Create"**
3. Wait for the project to be created

---

## Step 2: Create OAuth 2.0 Credentials

1. In Google Cloud Console, go to **APIs & Services → OAuth consent screen**
2. Select **User Type**: `External`
3. Click **"Create"**
4. Fill out the OAuth consent screen:
   - **App name**: TubeVox
   - **User support email**: your-email@gmail.com
   - **Developer contact**: your-email@gmail.com
   - Click **"Save and Continue"**

5. On **Scopes** step:
   - Click **"Save and Continue"** (default scopes are fine)

6. On **Test users** step:
   - Add your email address as a test user
   - Click **"Save and Continue"**

7. On **Summary** step:
   - Click **"Back to Dashboard"**

---

## Step 3: Create OAuth 2.0 Client ID

1. Go to **APIs & Services → Credentials**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Select **"Web application"**
4. Fill in:
   - **Name**: `TubeVox Web Client`
   - **Authorized JavaScript origins**: Add these:
     ```
     http://localhost:3000
     http://localhost:3001
     http://localhost:3002
     http://173.249.9.155:3000
     http://173.249.9.155:3001
     http://173.249.9.155:3002
     https://your-domain.com (if you have a domain)
     ```
   - **Authorized redirect URIs**: Add these:
     ```
     https://jxceenqmcyclbxaxvxto.supabase.co/auth/v1/callback
     http://localhost:3000/auth/callback
     http://173.249.9.155:3000/auth/callback
     https://your-domain.com/auth/callback (if you have a domain)
     ```

5. Click **"Create"**
6. Copy the **Client ID** and **Client Secret**

---

## Step 4: Configure Supabase

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: `jxceenqmcyclbxaxvxto`
3. Go to **Authentication → Providers → Google**
4. **Enable** the Google provider
5. Paste your credentials:
   - **Client ID**: (from Google Cloud)
   - **Client Secret**: (from Google Cloud)
6. Click **"Save"**

---

## Step 5: Whitelist Callback URLs in Supabase

1. In Supabase Dashboard, go to **Authentication → URL Configuration**
2. Under **Redirect URLs**, add:
   ```
   http://173.249.9.155:3000/dashboard/auth/callback
   http://173.249.9.155:3000/auth/callback
   http://localhost:3000/dashboard/auth/callback
   http://localhost:3000/auth/callback
   ```
   (Add https URLs if you have a domain)
3. Click **"Save"**

---

## Step 6: Rebuild & Deploy on VPS

1. Go back to your VPS terminal:
   ```bash
   ssh root@173.249.9.155
   cd /var/www/Youtube_tubevox_ai
   
   # Rebuild Dashboard with latest code
   pnpm --filter @workspace/dashboard run build
   
   # Restart services
   pm2 restart all
   pm2 save
   
   # Check status
   pm2 status
   ```

---

## Step 7: Test Google OAuth

1. Open your browser to: `http://173.249.9.155:3000`
2. Click **"Sign in with Google"**
3. You should be redirected to Google's login
4. After login, you should return to the dashboard

### If it fails:
- **Open Browser Console** (F12 → Console tab)
- Look for logs starting with `[Google OAuth]`
- Share the error message

---

## Troubleshooting

### Error: "redirect_uri_mismatch"
- **Fix**: Make sure all redirect URIs are added in Google Cloud AND Supabase

### Error: "invalid_client"
- **Fix**: Check that Client ID and Secret are correct and pasted exactly

### Error: "Authorization required"
- **Fix**: Make sure Google OAuth provider is ENABLED in Supabase

### Redirect not working after login
- **Fix**: Check that callback URL is in the whitelist

---

## Next Steps After Google OAuth Works

Once Google sign-in is working:
1. Test user registration with Google
2. Test login with Google
3. Verify user profile is created
4. Check that credits are assigned

---

## Dashboard URLs

- **Landing**: http://173.249.9.155:3002
- **Dashboard**: http://173.249.9.155:3000
- **Admin**: http://173.249.9.155:3001
- **API**: http://173.249.9.155:8080/api

---

## Support

If you encounter issues:
1. Check browser console for OAuth errors
2. Check PM2 logs: `pm2 logs`
3. Check Supabase logs: Supabase Dashboard → Logs

