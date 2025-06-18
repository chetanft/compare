#!/usr/bin/env node

/**
 * Unified Server Startup Script
 * Ensures the correct server is started with proper port configuration
 */

import { findAvailablePort, syncPortAcrossConfigs, DEFAULT_PORT } from './src/config/ports.js';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

const SERVER_OPTIONS = {
  'unified': {
    file: 'server-unified.js',
    description: 'Modern UI server (RECOMMENDED)'
  },
  'main': {
    file: 'server.js', 
    description: 'Main server'
  },
  'enhanced': {
    file: 'src/enhancedServer.js',
    description: 'Enhanced server (experimental)'
  }
};

async function showUsage(port) {
  console.log('\n🚀 Figma-Web Comparison Tool Server Startup\n');
  console.log('Usage: node start-server.js [server-type] [options]\n');
  console.log('Available servers:');
  
  Object.entries(SERVER_OPTIONS).forEach(([key, config]) => {
    console.log(`  ${key.padEnd(10)} - ${config.description}`);
  });
  
  console.log('\nOptions:');
  console.log('  --port=XXXX   Specify port (default: 3007)');
  console.log('  --help, -h    Show this help message');
  
  console.log(`\nDefault: unified (recommended)`);
  console.log(`Port: ${port}\n`);
}

async function updateFrontendConfig(port) {
  try {
    // Update frontend environment variables
    const envFilePath = path.resolve(process.cwd(), 'frontend/.env');
    let envContent = '';
    
    try {
      envContent = await fs.readFile(envFilePath, 'utf8');
    } catch (err) {
      // File doesn't exist, create it
      envContent = '';
    }
    
    // Update or add VITE_API_URL
    const apiUrlRegex = /VITE_API_URL=http:\/\/localhost:\d+/;
    const wsUrlRegex = /VITE_WS_URL=ws:\/\/localhost:\d+/;
    
    if (apiUrlRegex.test(envContent)) {
      envContent = envContent.replace(apiUrlRegex, `VITE_API_URL=http://localhost:${port}`);
    } else {
      envContent += `\nVITE_API_URL=http://localhost:${port}`;
    }
    
    if (wsUrlRegex.test(envContent)) {
      envContent = envContent.replace(wsUrlRegex, `VITE_WS_URL=ws://localhost:${port}`);
    } else {
      envContent += `\nVITE_WS_URL=ws://localhost:${port}`;
    }
    
    await fs.writeFile(envFilePath, envContent, 'utf8');
    console.log(`✅ Updated frontend environment with port: ${port}`);
    
    return true;
  } catch (err) {
    console.error(`❌ Failed to update frontend environment: ${err.message}`);
    return false;
  }
}

async function startServer(serverType = 'unified', options = {}) {
  const serverConfig = SERVER_OPTIONS[serverType];
  
  if (!serverConfig) {
    console.error(`❌ Unknown server type: ${serverType}`);
    await showUsage(DEFAULT_PORT);
    process.exit(1);
  }
  
  // Find an available port starting with the requested one
  const requestedPort = options.port || DEFAULT_PORT;
  const port = await findAvailablePort(requestedPort);
  
  if (port !== requestedPort) {
    console.log(`⚠️ Requested port ${requestedPort} is in use, using port ${port} instead`);
  }
  
  // Synchronize port across all configurations
  await syncPortAcrossConfigs(port);
  
  // Update frontend environment
  await updateFrontendConfig(port);
  
  console.log(`🚀 Starting ${serverConfig.description}...`);
  console.log(`📁 File: ${serverConfig.file}`);
  console.log(`🌐 Port: ${port}`);
  console.log(`🔗 URL: http://localhost:${port}\n`);
  
  const serverProcess = spawn('node', [serverConfig.file], {
    stdio: 'inherit',
    env: { ...process.env, PORT: port.toString() }
  });
  
  serverProcess.on('error', (error) => {
    console.error(`❌ Failed to start server: ${error.message}`);
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
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

// Extract options
const serverTypeArg = args.find(arg => !arg.startsWith('--'));
const serverType = serverTypeArg || 'unified';

// Parse port option
const portArg = args.find(arg => arg.startsWith('--port='));
if (portArg) {
  const portValue = portArg.split('=')[1];
  options.port = parseInt(portValue, 10);
}

if (args.includes('--help') || args.includes('-h')) {
  await showUsage(options.port || DEFAULT_PORT);
  process.exit(0);
}

// Start server with parsed options
startServer(serverType, options); 