#!/bin/bash

# Netlify Deployment Script for Figma-Web Comparison Tool
# This script prepares and deploys the project to Netlify

set -e

echo "🚀 Starting Netlify Deployment Process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📦 Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# Check if user is logged in to Netlify
echo "🔐 Checking Netlify authentication..."
if ! netlify status &> /dev/null; then
    echo "Please log in to Netlify:"
    netlify login
fi

# Install dependencies
echo "📦 Installing root dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Build the frontend
echo "🏗️ Building frontend..."
cd frontend
npm run build
cd ..

# Check if netlify.toml exists
if [ ! -f "netlify.toml" ]; then
    echo "❌ Error: netlify.toml not found. Please ensure configuration files are present."
    exit 1
fi

# Check for environment variables
echo "🔧 Environment Variables Required:"
echo "   - FIGMA_API_KEY: Your Figma personal access token"
echo "   - NODE_ENV: production"
echo ""
echo "Set these in Netlify Dashboard → Site Settings → Environment Variables"
echo ""

# Deploy to Netlify
echo "🚀 Deploying to Netlify..."
echo "Choose deployment option:"
echo "1) Deploy to production"
echo "2) Deploy preview"
echo "3) Initialize new site"

read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo "🌟 Deploying to production..."
        netlify deploy --prod --dir=frontend/dist
        ;;
    2)
        echo "👀 Creating preview deployment..."
        netlify deploy --dir=frontend/dist
        ;;
    3)
        echo "🆕 Initializing new site..."
        netlify init
        netlify deploy --dir=frontend/dist
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 Next steps:"
echo "1. Set environment variables in Netlify Dashboard"
echo "2. Test your deployment endpoints"
echo "3. Configure custom domain (optional)"
echo ""
echo "📋 API Endpoints:"
echo "   GET  /api/health"
echo "   POST /api/compare"
echo "   POST /api/figma/extract"
echo "   POST /api/web/extract"
echo ""
echo "📖 See NETLIFY_DEPLOYMENT_GUIDE.md for detailed instructions" 