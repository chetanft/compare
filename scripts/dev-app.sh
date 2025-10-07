#!/bin/bash

# Development App Manager
# Ensures we always run the latest build, not old installed versions

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_PATH="$PROJECT_DIR/dist/mac-arm64/Figma Comparison Tool.app"
INSTALLED_PATH="/Applications/Figma Comparison Tool.app"

echo "🔧 Development App Manager"
echo "=========================="

# Kill any running instances
echo "🛑 Stopping any running instances..."
pkill -f "Figma Comparison Tool" 2>/dev/null || true

# Check if there's an installed version that might cause confusion
if [ -d "$INSTALLED_PATH" ]; then
    echo "⚠️  WARNING: Found installed version at $INSTALLED_PATH"
    echo "   This might cause confusion. Consider removing it:"
    echo "   rm -rf '$INSTALLED_PATH'"
    echo ""
fi

# Check if development build exists
if [ ! -d "$APP_PATH" ]; then
    echo "❌ Development build not found at: $APP_PATH"
    echo "   Run: npm run build:mac"
    exit 1
fi

# Start the development version
echo "🚀 Starting development app from: $APP_PATH"
"$APP_PATH/Contents/MacOS/Figma Comparison Tool" &

# Wait a moment and check if it started
sleep 2
if curl -s http://localhost:3847/api/test > /dev/null 2>&1; then
    echo "✅ App started successfully on http://localhost:3847"
else
    echo "❌ App failed to start or server not responding"
    exit 1
fi

echo ""
echo "📝 Development Notes:"
echo "   - App is running from: $APP_PATH"
echo "   - Server: http://localhost:3847"
echo "   - To rebuild: npm run build:mac"
echo "   - To stop: pkill -f 'Figma Comparison Tool'"
