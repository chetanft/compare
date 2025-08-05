#!/bin/bash

# Disable ZSH compinit to avoid security warnings
export SHELL=/bin/bash

# Get absolute path to script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Print welcome message
echo "🚀 Starting Figma Web Comparison Tool..."
echo "📂 Working directory: $SCRIPT_DIR"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "Visit: https://nodejs.org/"
    read -p "Press Enter to exit..."
    exit 1
fi

echo "✅ Node.js is installed"

# Function to handle errors
handle_error() {
    echo "❌ Error: $1"
    read -p "Press Enter to exit..."
    exit 1
}

# Install root dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install || handle_error "Failed to install dependencies"
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    (cd frontend && npm install) || handle_error "Failed to install frontend dependencies"
fi

echo "✅ Dependencies are ready"

# Build frontend if dist doesn't exist
if [ ! -d "frontend/dist" ]; then
    echo "🔨 Building frontend..."
    (cd frontend && npm run build) || handle_error "Failed to build frontend"
fi

# Start the application
echo "🌐 Starting the application..."
echo "🔗 The app will open at: http://localhost:3007"
echo "💡 To stop the app, press Ctrl+C in this window"
echo

# Kill any existing node processes on port 3007
lsof -ti:3007 | xargs kill -9 2>/dev/null

# Open browser after a delay
(sleep 3 && open http://localhost:3007) &

# Start the server
node server.js

echo
echo "🛑 Application stopped"
read -p "Press Enter to close this window..." 