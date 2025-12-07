# Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Build Verification
- [x] Frontend builds successfully (`npm run build`)
- [x] No Supabase warnings in build output
- [x] Environment variables configured in `frontend/.env`
- [x] `.env` files are gitignored

### 2. Local Testing
- [ ] Application starts locally (`npm start`)
- [ ] Frontend loads at http://localhost:3847
- [ ] Supabase connection works (if using SaaS mode)
- [ ] All features function correctly

### 3. Vercel Deployment Preparation
- [ ] Environment variables set in Vercel dashboard:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] Variables available for Production, Preview, and Development
- [ ] Git repository is connected to Vercel
- [ ] Build command verified: `npm run sync:env && cd frontend && npm run build`
- [ ] Output directory verified: `frontend/dist`

## 🚀 Deployment Steps

### Step 1: Test Locally
```bash
npm start
```
Visit http://localhost:3847 and verify everything works.

### Step 2: Commit Changes
```bash
git add .
git commit -m "Configure Supabase environment variables"
git push
```

### Step 3: Configure Vercel Environment Variables
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
3. Select environments: Production, Preview, Development
4. Save

### Step 4: Deploy
- Push to main branch (auto-deploys) OR
- Go to Deployments → Redeploy

### Step 5: Verify Deployment
- [ ] Build completes successfully
- [ ] No Supabase warnings in build logs
- [ ] Application loads correctly
- [ ] Supabase features work

## 🔍 Troubleshooting

### Build Fails on Vercel
- Check build logs for errors
- Verify environment variables are set correctly
- Ensure variables have `VITE_` prefix
- Check that `vercel.json` build command is correct

### Supabase Warning Still Appears
- Verify variables are set in Vercel dashboard
- Check that variables are available for the correct environment
- Trigger a new deployment after adding variables
- Check build logs to confirm variables are being injected

### Application Doesn't Load
- Check Vercel deployment logs
- Verify `outputDirectory` is set to `frontend/dist`
- Check that `index.html` exists in `frontend/dist`
- Verify rewrite rules in `vercel.json`

## 📝 Post-Deployment

- [ ] Test all features on production URL
- [ ] Verify Supabase connection works
- [ ] Check browser console for errors
- [ ] Test on different devices/browsers
- [ ] Monitor error logs

