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

# Validate environment variables
echo "🔍 Checking required environment variables..."

# Create a temporary file to store environment variables for validation
ENV_CHECK_FILE=$(mktemp)
cat > "$ENV_CHECK_FILE" << EOL
#!/usr/bin/env node
// Simple script to check for required environment variables
const requiredVars = ['FIGMA_API_KEY'];
const missingVars = [];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables: ' + missingVars.join(', '));
  console.error('Please set these variables in your Netlify dashboard or .env file');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set');
}
EOL

# Make the script executable
chmod +x "$ENV_CHECK_FILE"

# Run the check
if ! node "$ENV_CHECK_FILE"; then
  echo "⚠️  Warning: Missing required environment variables."
  echo "You can continue with deployment, but you MUST set these in the Netlify dashboard."
  read -p "Continue with deployment? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    rm "$ENV_CHECK_FILE"
    exit 1
  fi
fi

# Clean up the temporary file
rm "$ENV_CHECK_FILE"

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

# Run tests for Netlify functions
echo "🧪 Testing Netlify functions..."
cd netlify/functions
node test-functions.js
if [ $? -ne 0 ]; then
  echo "❌ Netlify function tests failed. Please fix the issues before deploying."
  read -p "Continue with deployment anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
  fi
fi
cd ../..

# Create deployment package
echo "📁 Creating deployment package..."
mkdir -p netlify-deploy
cp -r frontend/dist netlify-deploy/
cp -r netlify/functions netlify-deploy/
cp netlify.toml netlify-deploy/

# Copy additional required files
echo "📄 Copying additional required files..."
mkdir -p netlify-deploy/src
cp -r src/figma netlify-deploy/src/
cp -r src/compare netlify-deploy/src/
cp -r src/report netlify-deploy/src/
cp -r src/utils netlify-deploy/src/
cp -r src/types netlify-deploy/src/
cp -r src/analyze netlify-deploy/src/
cp -r src/ai netlify-deploy/src/

# Create necessary directories
mkdir -p netlify-deploy/output/reports
mkdir -p netlify-deploy/output/images
mkdir -p netlify-deploy/output/screenshots

# Copy README
cp netlify-deploy/README.md netlify-deploy/ 2>/dev/null || cp README.md netlify-deploy/

# Create .env.example file in the deployment package
cat > netlify-deploy/.env.example << EOL
# Required Environment Variables for Netlify Deployment
# Set these in your Netlify dashboard

# === REQUIRED VARIABLES ===
# Figma API Key (REQUIRED)
FIGMA_API_KEY=figd_your_token_here

# === OPTIONAL VARIABLES ===
# Comparison Thresholds
COLOR_DIFFERENCE_THRESHOLD=10
SIZE_DIFFERENCE_THRESHOLD=5
SPACING_DIFFERENCE_THRESHOLD=3
FONT_SIZE_DIFFERENCE_THRESHOLD=2
EOL

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
echo ""
echo "⚠️  IMPORTANT: Make sure to set the following environment variables in Netlify:"
echo "   - FIGMA_API_KEY (Required): Your Figma API token"
echo "   - NODE_VERSION: 18"

# Make the file executable
chmod +x deploy-netlify.sh 