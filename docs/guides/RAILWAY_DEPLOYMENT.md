# Railway Deployment Guide

This guide explains how to deploy the Figma Web Comparison Tool to Railway.

## 🚀 Quick Start

1. **Connect your repository** to Railway
2. **Railway will automatically detect** the `Dockerfile` and `railway.toml`
3. **Set environment variables** (see below)
4. **Deploy!**

## 📋 Prerequisites

- Railway account ([railway.app](https://railway.app))
- GitHub repository connected to Railway
- Environment variables ready (see below)

## ⚙️ Configuration

### Build Configuration

Railway uses the `Dockerfile` for builds, which:
- ✅ Skips Chromium download during build (faster builds)
- ✅ Uses multi-stage build for optimized image size
- ✅ Installs only essential dependencies

The build process:
1. Installs root dependencies (with `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`)
2. Installs frontend dependencies
3. Builds the frontend (`npm run build`)
4. Creates production image with only runtime dependencies

### Required Environment Variables

Set these in Railway Dashboard → Your Project → Variables:

#### **Core Configuration**
```bash
# Server Port (Railway sets this automatically, but you can override)
PORT=3847

# Node Environment
NODE_ENV=production

# Skip Chromium download during build (already set in Dockerfile, but good to have here too)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Disable local MCP health checks (Railway doesn't have Figma Desktop running)
ENABLE_LOCAL_MCP=false
```

#### **Figma API Configuration**
```bash
# Figma Personal Access Token (REQUIRED)
FIGMA_API_KEY=figd_your_token_here
# OR
FIGMA_TOKEN=figd_your_token_here

# Connection Mode (optional, defaults to 'api')
FIGMA_CONNECTION_MODE=api  # options: api, desktop, figma
```

#### **Frontend Build Variables (VITE_*)**
These are needed **at build time** for the frontend:

```bash
# Supabase Configuration (if using SaaS mode)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration (optional)
VITE_API_URL=https://your-railway-app.up.railway.app
VITE_SERVER_PORT=3847
```

**Important:** Railway reads these variables during the build phase, so make sure they're set before deploying.

#### **MCP Configuration (Optional)**
```bash
# MCP Server Configuration
MCP_ENABLED=true
MCP_URL=http://127.0.0.1:3845
MCP_ENDPOINT=/mcp
```

#### **CORS Configuration**
```bash
# CORS Origins (comma-separated)
CORS_ORIGINS=https://your-railway-app.up.railway.app,https://yourdomain.com
CORS_CREDENTIALS=true
```

#### **Database Configuration**
```bash
# For Supabase (SaaS mode)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key

# For SQLite (local mode - Railway provides persistent storage)
DATABASE_URL=file:./data/app.db
```

#### **Puppeteer Configuration (if using web extraction)**
```bash
# Puppeteer Settings
PUPPETEER_HEADLESS=new
PUPPETEER_TIMEOUT=30000
PUPPETEER_PROTOCOL_TIMEOUT=60000
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox
```

## 🔧 Railway-Specific Settings

### Port Configuration

Railway automatically sets the `PORT` environment variable. The app reads this and binds to it:

```javascript
// server.js reads PORT from environment
process.env.PORT = process.env.SERVER_PORT = process.env.VITE_SERVER_PORT = '3847';
```

Railway will override this with its own port, so the app will work automatically.

### Build Time vs Runtime Variables

- **Build-time variables** (VITE_*): Must be set before deployment starts
- **Runtime variables**: Can be changed without rebuilding

### Persistent Storage

If using SQLite, Railway provides persistent storage. The database file will persist across deployments.

## 📝 Step-by-Step Deployment

### 1. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### 2. Configure Environment Variables

1. Go to your project in Railway
2. Click on "Variables" tab
3. Add all required variables (see above)
4. Make sure `VITE_*` variables are set (needed at build time)

### 3. Deploy

Railway will automatically:
1. Detect the `Dockerfile`
2. Run the build process
3. Deploy the application

### 4. Get Your URL

1. Railway will provide a URL like: `https://your-app.up.railway.app`
2. Update `CORS_ORIGINS` to include this URL
3. Update `VITE_API_URL` if needed

## 🐛 Troubleshooting

### Build Timeout

If builds timeout:
- ✅ Already fixed! The Dockerfile skips Chromium download
- Builds should complete in 2-5 minutes

### "Vite variables not found"

- Make sure `VITE_*` variables are set in Railway **before** deployment
- These variables are read at build time, not runtime

### "Port already in use"

- Railway sets `PORT` automatically
- Don't hardcode ports in your code
- The app reads `process.env.PORT`

### "Puppeteer not working"

- Chromium libraries are installed in the Dockerfile
- If Puppeteer is needed, it will download Chromium on first use
- Or set `PUPPETEER_EXECUTABLE_PATH` to use system Chromium

### "CORS errors"

- Add your Railway URL to `CORS_ORIGINS`
- Format: `https://your-app.up.railway.app`
- Separate multiple origins with commas

## 🔍 Monitoring

Railway provides:
- **Logs**: View real-time logs in Railway dashboard
- **Metrics**: CPU, memory, network usage
- **Deployments**: View deployment history

## 🔄 Updating Deployment

1. **Push changes** to your GitHub repository
2. Railway **automatically detects** changes
3. **Triggers new deployment**
4. Environment variables persist across deployments

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Environment Variables Guide](./ENV_SETUP_SUMMARY.md)

## ✅ Deployment Checklist

- [ ] Railway project created
- [ ] Repository connected
- [ ] `PORT` variable set (or Railway auto-sets it)
- [ ] `NODE_ENV=production` set
- [ ] `FIGMA_API_KEY` set
- [ ] `VITE_SUPABASE_URL` set (if using Supabase)
- [ ] `VITE_SUPABASE_ANON_KEY` set (if using Supabase)
- [ ] `CORS_ORIGINS` includes Railway URL
- [ ] `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` set
- [ ] First deployment successful
- [ ] Application accessible at Railway URL
- [ ] CORS configured correctly

## 🎉 Success!

Once deployed, your app will be available at:
```
https://your-app-name.up.railway.app
```

The build should complete in **2-5 minutes** (much faster than before! 🚀)
