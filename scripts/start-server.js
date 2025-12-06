#!/usr/bin/env node

/**
 * Server startup script for Figma Comparison Tool
 * This script starts the server on a random safe port to avoid conflicts
 */

import { spawn } from 'child_process';
import net from 'net';
import { PORTS } from '../src/config/PORTS.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PORT = String(PORTS.SERVER);
const requestedPort =
  process.env.PORT ||
  process.env.SERVER_PORT ||
  process.env.VITE_SERVER_PORT ||
  null;

if (requestedPort && requestedPort !== DEFAULT_PORT) {
  console.warn(
    `⚠️ Ignoring custom port "${requestedPort}". This tool is locked to ${DEFAULT_PORT}.`
  );
}

const SERVER_PORT = DEFAULT_PORT;

console.log('🚀 Starting Figma Comparison Tool Server...');
console.log(`📡 Desired port: ${SERVER_PORT}`);
console.log(`📁 Working Directory: ${process.cwd()}`);

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: '127.0.0.1' });
    socket.setTimeout(250);

    const finalize = (inUse) => {
      socket.destroy();
      resolve(inUse);
    };

    socket.once('connect', () => finalize(true));
    socket.once('timeout', () => finalize(false));
    socket.once('error', (error) => {
      if (error && error.code === 'ECONNREFUSED') {
        finalize(false);
      } else {
        finalize(false);
      }
    });
  });
}

function openBrowser(url) {
  try {
    let child;
    if (process.platform === 'darwin') {
      child = spawn('open', [url], { stdio: 'ignore', detached: true });
    } else if (process.platform === 'win32') {
      child = spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true });
    } else {
      child = spawn('xdg-open', [url], { stdio: 'ignore', detached: true });
    }

    if (child && typeof child.unref === 'function') {
      child.unref();
    }
  } catch (error) {
    console.warn('⚠️ Failed to open browser automatically:', error.message);
  }
}

async function start() {
  const portNumber = Number(SERVER_PORT);
  const inUse = await isPortInUse(portNumber);

  if (inUse) {
    const url = `http://localhost:${SERVER_PORT}`;
    console.log(`ℹ️ Detected existing server on port ${SERVER_PORT}. Reusing running instance.`);
    console.log(`🔗 Opening ${url}`);
    openBrowser(url);
    return;
  }

  // Set environment variables for unified configuration (force port 3847)
  process.env.PORT = SERVER_PORT;
  process.env.SERVER_PORT = SERVER_PORT;
  process.env.VITE_SERVER_PORT = SERVER_PORT;
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';

  // Resolve server path (packaged vs local)
  let serverPath;
  const packagedServerPath = path.join(__dirname, '..', 'app', 'server.js');
  const localServerPath = path.join(__dirname, '..', 'server.js');

  serverPath = fs.existsSync(packagedServerPath) ? packagedServerPath : localServerPath;

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
}

start().catch((error) => {
  console.error('❌ Unexpected error during server startup:', error.message);
  process.exit(1);
});
