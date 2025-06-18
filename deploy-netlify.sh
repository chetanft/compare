#!/bin/bash

# Figma Comparison Tool - Netlify Deployment Script
# This script builds the frontend and packages everything for Netlify deployment

# Exit on error
set -e

echo "🚀 Starting Netlify deployment preparation..."

# Check if we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "netlify" ]; then
  echo "❌ Error: Please run this script from the project root directory"
  exit 1
fi

# Clean up any previous deployment files
echo "🧹 Cleaning up previous deployment files..."
rm -rf netlify-deploy netlify-deploy.zip

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

# Build the frontend
echo "🔨 Building frontend..."
npm run build
cd ..

# Create deployment package
echo "📁 Creating deployment package..."
mkdir -p netlify-deploy
cp -r frontend/dist netlify-deploy/
cp -r netlify/functions netlify-deploy/
cp netlify.toml netlify-deploy/
cp netlify-deploy/README.md netlify-deploy/ 2>/dev/null || cp README.md netlify-deploy/

# Create zip file
echo "🗜️ Creating zip archive..."
cd netlify-deploy
zip -r ../netlify-deploy.zip .
cd ..

echo "✅ Deployment package created: netlify-deploy.zip"
echo "📋 Next steps:"
echo "1. Upload netlify-deploy.zip to Netlify or connect your GitHub repository"
echo "2. Set the FIGMA_API_KEY environment variable in the Netlify dashboard"
echo "3. Set NODE_VERSION to 18 in the Netlify dashboard"

# Make the file executable
chmod +x deploy-netlify.sh 