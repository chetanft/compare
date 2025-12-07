# Vite Environment Variables Setup Guide

## Problem

Vite only injects environment variables that:
1. Are prefixed with `VITE_`
2. Exist in the environment **at build time**
3. Are available in `frontend/.env` (not just root `.env`)

If you run `npm run build` from the repo root, Vite doesn't automatically inherit variables from the root `.env` file.

## Solution

### Option 1: Use the Sync Script (Recommended)

The project includes a sync script that automatically copies `VITE_` prefixed variables from root `.env` to `frontend/.env`:

```bash
npm run sync:env
```

This script runs automatically before `npm run build:frontend`.

### Option 2: Manual Setup

1. **Copy Supabase variables to `frontend/.env`:**

```bash
# In frontend/.env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

2. **Or export them in your shell before building:**

```bash
export VITE_SUPABASE_URL=https://xxx.supabase.co
export VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
npm run build
```

### Option 3: Vercel Deployment

For Vercel deployments, add these environment variables in the Vercel dashboard:

1. Go to your project in Vercel dashboard
2. Navigate to **Settings > Environment Variables**
3. Add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Make sure they're available for **Production**, **Preview**, and **Development** environments
5. Trigger a new deployment (push a commit or redeploy)

## Required Variables

The following `VITE_` prefixed variables are used by the frontend:

- `VITE_SUPABASE_URL` - Supabase project URL (required for SaaS mode)
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (required for SaaS mode)
- `VITE_API_URL` - Backend API URL (optional, defaults to localhost:3847)
- `VITE_WS_URL` - WebSocket URL (optional)
- `VITE_SERVER_PORT` - Server port (optional, defaults to 3847)

## Verification

After setting up environment variables, rebuild the frontend:

```bash
npm run build:frontend
```

Check the build output - you should **not** see the warning:
```
⚠️ Supabase not configured - Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

If the warning persists, verify:
1. Variables are in `frontend/.env` (not just root `.env`)
2. Variables are prefixed with `VITE_`
3. You've rebuilt after adding the variables

## Troubleshooting

### Warning persists after adding variables

1. **Check file location**: Variables must be in `frontend/.env`, not root `.env`
2. **Check variable names**: Must start with `VITE_`
3. **Rebuild**: Run `npm run build:frontend` again after adding variables
4. **Clear cache**: Delete `frontend/dist` and rebuild

### Vercel build still shows warning

1. **Verify in dashboard**: Check that variables are set in Vercel dashboard
2. **Check environment**: Ensure variables are available for the correct environment (Production/Preview/Development)
3. **Redeploy**: Push a new commit or trigger a manual redeploy
4. **Check build logs**: Look for the variables in Vercel build logs

