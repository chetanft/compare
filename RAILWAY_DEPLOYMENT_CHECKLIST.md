# ✅ Railway Deployment Checklist

## Pre-Deployment Verification

### ✅ Dockerfile Structure Verified
- [x] Builder stage copies package files first
- [x] npm ci runs immediately after copying package files
- [x] Frontend source files copied before build
- [x] npm run build executes after copying source files
- [x] Production stage copies scripts before npm ci
- [x] All RUN commands have echo statements for visibility

### ✅ Build Context Optimized
- [x] `.dockerignore` excludes large directories (docs, tests, electron, etc.)
- [x] Build context reduced from ~2.8GB to ~10-20MB
- [x] Only essential files copied

### ✅ Fixes Applied
- [x] Missing `frontend/public` directory handled (creates empty dir)
- [x] `scripts/` directory copied before npm ci in production stage
- [x] npm install/build commands execute immediately
- [x] Echo statements added for build visibility

## Railway Deployment Steps

### 1. Connect Repository to Railway
- [ ] Go to https://railway.app
- [ ] Click "New Project"
- [ ] Select "Deploy from GitHub repo"
- [ ] Choose your repository
- [ ] Railway will detect `Dockerfile` automatically

### 2. Set Environment Variables
**Critical: Set these BEFORE first deployment**

Go to Railway Dashboard → Your Project → Variables:

#### Required Variables:
- [ ] `NODE_ENV=production`
- [ ] `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- [ ] `FIGMA_API_KEY=figd_your_token_here`

#### Frontend Build Variables (Must be set before first deploy):
- [ ] `VITE_SUPABASE_URL=https://xxx.supabase.co` (if using Supabase)
- [ ] `VITE_SUPABASE_ANON_KEY=your_key_here` (if using Supabase)

#### Optional Variables:
- [ ] `CORS_ORIGINS=https://your-app.up.railway.app`
- [ ] `PORT` (Railway sets automatically, but can override)

### 3. Monitor First Build
Watch the Railway build logs. You should see:

```
✅ Installing root dependencies...
✅ Installing frontend dependencies...
✅ Dependencies installed successfully
✅ Building frontend...
✅ Frontend build completed successfully
```

**Expected Build Time:** 2-5 minutes

### 4. Verify Deployment
- [ ] Build completes successfully (no timeout)
- [ ] Application starts without errors
- [ ] App accessible at Railway URL
- [ ] Frontend loads correctly
- [ ] API endpoints respond

## Troubleshooting

### If Build Times Out
1. Check Railway logs for which step is timing out
2. Verify `.dockerignore` is working (check build context size)
3. Ensure npm install/build commands are executing (look for echo messages)
4. Check Railway build timeout settings (default: 10 minutes)

### If npm ci Fails
1. Verify `scripts/` directory is being copied before npm ci
2. Check if `scripts/postinstall.cjs` exists
3. Review postinstall script for any issues

### If Frontend Build Fails
1. Verify all frontend source files are copied
2. Check if `frontend/public` directory is created
3. Review Vite build errors in logs
4. Ensure `VITE_*` environment variables are set

### If Application Won't Start
1. Check Railway logs for runtime errors
2. Verify `PORT` environment variable (Railway sets automatically)
3. Ensure all required environment variables are set
4. Check if `server.js` and `src/` directory are copied correctly

## Build Verification Commands

### Check Build Context Size Locally
```bash
tar --exclude-from=.dockerignore -czf test.tar.gz . 2>/dev/null
du -sh test.tar.gz
rm test.tar.gz
```

### Test Docker Build Locally (Optional)
```bash
docker build -t figma-comparison-tool:test .
```

### Run Locally (Optional)
```bash
docker run -p 3847:3847 \
  -e PORT=3847 \
  -e NODE_ENV=production \
  -e FIGMA_API_KEY=your_token \
  figma-comparison-tool:test
```

## Success Criteria

✅ **Build completes in 2-5 minutes**
✅ **No timeout errors**
✅ **All npm install/build steps execute**
✅ **Application starts successfully**
✅ **Frontend accessible at Railway URL**
✅ **API endpoints respond**

## Post-Deployment

- [ ] Test all major features
- [ ] Verify environment variables are working
- [ ] Check application logs for any warnings
- [ ] Monitor resource usage
- [ ] Set up Railway monitoring/alerts (optional)

## Documentation

- **Full Guide**: `docs/guides/RAILWAY_DEPLOYMENT.md`
- **Build Fix Details**: `docs/guides/RAILWAY_BUILD_FIX.md`
- **Quick Start**: `RAILWAY_READY.md`
- **Deployment Status**: `DEPLOYMENT_STATUS.md`

## 🚀 Ready to Deploy!

All fixes are applied and verified. Railway deployment should now succeed!
