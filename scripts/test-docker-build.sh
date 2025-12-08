#!/bin/bash
# Test Docker build locally before deploying to Railway

set -e

echo "🐳 Testing Docker build locally..."
echo ""

# Build the Docker image
echo "📦 Building Docker image..."
docker build \
  --build-arg PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  -t figma-comparison-tool:local-test \
  .

echo ""
echo "✅ Docker build completed successfully!"
echo ""
echo "To test the container locally, run:"
echo "  docker run -p 3847:3847 -e PORT=3847 figma-comparison-tool:local-test"
echo ""
echo "Or with environment variables:"
echo "  docker run -p 3847:3847 \\"
echo "    -e PORT=3847 \\"
echo "    -e NODE_ENV=production \\"
echo "    -e FIGMA_API_KEY=your_token_here \\"
echo "    figma-comparison-tool:local-test"
