# Netlify Deployment Guide

This guide provides detailed instructions for deploying the Figma Comparison Tool to Netlify and troubleshooting common issues.

## Deployment Steps

### 1. Prepare Deployment Package

Use the included script to create a deployment package:

```bash
./deploy-netlify.sh
```

This script:
- Builds the frontend application
- Copies the necessary files to a deployment directory
- Creates a zip file (`netlify-deploy.zip`) ready for upload

### 2. Deploy to Netlify

#### Option A: Direct Upload (Recommended for testing)
1. Log in to your [Netlify Dashboard](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Drag and drop the `netlify-deploy.zip` file
4. Wait for the deployment to complete

#### Option B: Connect to GitHub Repository
1. Push your code to GitHub
2. Log in to your [Netlify Dashboard](https://app.netlify.com/)
3. Click "Add new site" → "Import an existing project"
4. Select GitHub and authorize Netlify
5. Choose your repository
6. Configure build settings:
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/dist`

### 3. Configure Environment Variables

After deployment, set these required environment variables:

1. Go to Site settings → Environment variables
2. Add the following variables:
   - `FIGMA_API_KEY`: Your Figma personal access token
   - `NODE_VERSION`: `18`

## Troubleshooting Common Issues

### 404 Not Found Errors for API Endpoints

If you're seeing 404 errors when making API requests:

1. **Check Netlify Functions**: Verify that the functions deployed correctly in the Netlify dashboard under Functions.
2. **Check API Routes**: Make sure the frontend is using the correct API routes:
   - In production, API requests should go to `/.netlify/functions/figma-only/api/*`
   - The `netlify.toml` file should have the correct redirects configured

### JSON Parsing Errors

If you see "Unexpected token '<', '<!DOCTYPE '... is not valid JSON":

1. **Check API Response**: The server is returning HTML instead of JSON, indicating a routing issue
2. **Verify Function Permissions**: Make sure your Netlify functions have the correct permissions
3. **Check Environment Variables**: Ensure all required environment variables are set

### Function Timeouts

If your functions are timing out:

1. **Increase Timeout**: Update the `netlify.toml` file to increase the function timeout:
   ```toml
   [functions.figma-only]
     timeout = 30
   ```
2. **Optimize API Calls**: Implement caching for Figma API calls

### CORS Issues

If you're seeing CORS errors:

1. **Check CORS Headers**: Ensure your Netlify functions include proper CORS headers
2. **Update netlify.toml**: Add appropriate headers in the `netlify.toml` file:
   ```toml
   [[headers]]
     for = "/api/*"
     [headers.values]
       Access-Control-Allow-Origin = "*"
       Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, OPTIONS"
       Access-Control-Allow-Headers = "Origin, X-Requested-With, Content-Type, Accept, Authorization"
   ```

## Figma API Integration

### Getting a Figma API Token

1. Log in to [Figma](https://www.figma.com/)
2. Go to Account Settings → Personal Access Tokens
3. Create a new personal access token
4. Copy the token and set it as the `FIGMA_API_KEY` environment variable in Netlify

### Testing Figma API Connection

1. Open the deployed application
2. Go to Settings → Figma API
3. The status indicator should show "Connected" if your API key is working correctly

## Limitations of Netlify Deployment

The Netlify deployment has some limitations compared to the full server version:

1. **No Web Extraction**: The serverless functions can't run a headless browser for web scraping
2. **No WebSockets**: Real-time updates are not available
3. **Limited File Storage**: Files are stored in Netlify's ephemeral filesystem
4. **Function Timeout Limits**: Functions have a maximum execution time (default 10s, can be increased to 26s)

For full functionality, consider deploying the complete application with a dedicated server. 