# Netlify Deployment Guide

This guide will help you deploy the Figma-Web Comparison Tool to Netlify.

## Overview

The project is configured to deploy as:
- **Frontend**: React/Vite application served as static files
- **Backend**: Node.js API converted to Netlify Functions (optimized, Puppeteer-free)

## Prerequisites

1. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, etc.)
3. **Figma API Key**: Get your personal access token from Figma

## Step 1: Prepare Your Repository

Ensure these files are in your repository:
- ✅ `netlify.toml` - Netlify configuration
- ✅ `netlify/functions/api.js` - Main API function
- ✅ `netlify/functions/package.json` - Functions dependencies
- ✅ Updated `vite.config.ts` - Frontend build configuration

## Step 2: Deploy to Netlify

### Option A: Deploy from Git (Recommended)

1. **Connect Repository**:
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "New site from Git"
   - Connect your Git provider and select your repository

2. **Build Settings** (Auto-configured via `netlify.toml`):
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

3. **Environment Variables**:
   Set these in Netlify Dashboard → Site Settings → Environment Variables:
   ```
   FIGMA_API_KEY=your_figma_personal_access_token
   NODE_ENV=production
   COLOR_DIFFERENCE_THRESHOLD=10
   SIZE_DIFFERENCE_THRESHOLD=5
   SPACING_DIFFERENCE_THRESHOLD=3
   FONT_SIZE_DIFFERENCE_THRESHOLD=2
   ```

4. **Deploy**:
   - Click "Deploy site"
   - Netlify will automatically build and deploy your site

### Option B: Manual Deploy

1. **Build Frontend Locally**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Deploy to Netlify**:
   - Drag and drop the `frontend/dist` folder to Netlify
   - Note: This method won't include the backend functions

## Step 3: Configure Environment Variables

In your Netlify Dashboard:

1. Go to **Site Settings** → **Environment Variables**
2. Add the following variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `FIGMA_API_KEY` | `your_token_here` | Your Figma personal access token |
| `NODE_ENV` | `production` | Environment setting |
| `COLOR_DIFFERENCE_THRESHOLD` | `10` | Color comparison threshold |
| `SIZE_DIFFERENCE_THRESHOLD` | `5` | Size comparison threshold |
| `SPACING_DIFFERENCE_THRESHOLD` | `3` | Spacing comparison threshold |
| `FONT_SIZE_DIFFERENCE_THRESHOLD` | `2` | Font size comparison threshold |

## Step 4: Get Your Figma API Key

1. Go to [Figma Settings](https://www.figma.com/settings)
2. Scroll to "Personal access tokens"
3. Click "Create a new personal access token"
4. Give it a name (e.g., "Netlify Comparison Tool")
5. Copy the token and add it to Netlify environment variables

## Step 5: Test Your Deployment

1. **Check Health Endpoint**:
   ```
   GET https://your-site-name.netlify.app/api/health
   ```

2. **Test Figma Extraction**:
   ```bash
   curl -X POST https://your-site-name.netlify.app/api/figma/extract \
     -H "Content-Type: application/json" \
     -d '{"url": "https://www.figma.com/design/your-file-id"}'
   ```

3. **Test Full Comparison**:
   ```bash
   curl -X POST https://your-site-name.netlify.app/api/compare \
     -H "Content-Type: application/json" \
     -d '{
       "figmaUrl": "https://www.figma.com/design/your-file-id",
       "webUrl": "https://example.com"
     }'
   ```

## Available API Endpoints

Once deployed, your API will be available at:

- `GET /api/health` - Check service status
- `POST /api/compare` - Full comparison between Figma and web
- `POST /api/figma/extract` - Extract data from Figma only
- `POST /api/web/extract` - Extract data from web page only

## Troubleshooting

### Common Issues

1. **Build Fails**:
   - Check build logs in Netlify dashboard
   - Ensure all dependencies are in `package.json`
   - Verify Node.js version compatibility

2. **API Functions Don't Work**:
   - Check function logs in Netlify dashboard
   - Verify environment variables are set
   - Ensure Figma API key is valid

3. **Frontend Can't Connect to API**:
   - Check network tab in browser dev tools
   - Verify API endpoints in frontend code
   - Check CORS configuration

4. **Puppeteer Issues in Functions** (SOLVED):
   - ✅ Now using Puppeteer-free functions by default
   - ✅ Ultra-lightweight figma-only function for maximum compatibility
   - ✅ No more Puppeteer deprecation warnings

### Performance Optimization

1. **Function Timeout**:
   - Netlify functions have a 10-second timeout on free plan
   - Consider upgrading to Pro plan for 26-second timeout
   - Optimize extraction logic for faster execution

2. **Memory Limits**:
   - Functions have 1GB memory limit
   - Monitor function logs for memory usage
   - Consider breaking large operations into smaller chunks

3. **Cold Starts**:
   - Functions may have cold start delays
   - Consider keeping functions warm with scheduled pings
   - Optimize initialization code

## Alternative Deployment Options

If Netlify Functions have limitations for your use case:

1. **Vercel**: Similar serverless platform with different limits
2. **Railway**: Full-stack deployment with persistent servers
3. **Heroku**: Traditional PaaS with always-on dynos
4. **DigitalOcean App Platform**: Container-based deployment

## Security Considerations

1. **Environment Variables**: Never commit API keys to Git
2. **CORS**: Configured for all origins in demo - restrict in production
3. **Rate Limiting**: Consider adding rate limiting for production use
4. **Input Validation**: Validate all user inputs on server-side

## Next Steps

1. **Custom Domain**: Add your custom domain in Netlify settings
2. **SSL Certificate**: Netlify provides automatic HTTPS
3. **Analytics**: Set up Netlify Analytics or Google Analytics
4. **Monitoring**: Set up uptime monitoring and error tracking
5. **CI/CD**: Configure automatic deployments on Git push

## Support

For deployment issues:
- Check [Netlify Documentation](https://docs.netlify.com)
- Review function logs in Netlify dashboard
- Test locally with `netlify dev` command

For application issues:
- Check the application logs
- Verify Figma API connectivity
- Test individual components locally 