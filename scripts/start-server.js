#!/usr/bin/env node

/**
 * Server startup script for Figma Comparison Tool
 * This script starts the server on a random safe port to avoid conflicts
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use PORT environment variable or fallback to web app port
const SERVER_PORT = process.env.PORT || 3001;

console.log('🚀 Starting Figma Comparison Tool Server...');
console.log(`📡 Port: ${SERVER_PORT}`);
console.log(`📁 Working Directory: ${process.cwd()}`);

// Set environment variables
process.env.PORT = SERVER_PORT;
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Start the server
let serverPath;
const packagedServerPath = path.join(__dirname, '..', 'app', 'server.js');
const localServerPath = path.join(__dirname, '..', 'server.js');

if (fs.existsSync(packagedServerPath)) {
  serverPath = packagedServerPath;
} else {
  serverPath = localServerPath;
}

if (!fs.existsSync(serverPath)) {
  console.error('❌ Server file not found:', serverPath);
  process.exit(1);
}

const serverProcess = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env,
  cwd: process.cwd()
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  serverProcess.kill('SIGTERM');
});

console.log('✅ Server startup script initialized');
console.log('💡 Press Ctrl+C to stop the server');
