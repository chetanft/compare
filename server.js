#!/usr/bin/env node

/**
 * Main server entry point
 * Clean MCP-only implementation
 */

import { startUnifiedServer, shutdownUnifiedServer } from './src/server/unified-server-starter.js';

// Force unified port across all entry points
process.env.PORT = process.env.SERVER_PORT = process.env.VITE_SERVER_PORT = '3847';

/**
 * Start the server
 */
async function main() {
  try {
    console.log('🚀 Starting Figma Web Comparison Tool (Unified Cross-Platform)...');
    
    // Start unified server (auto-detects platform)
    const server = await startUnifiedServer();
    
    // Store server reference for graceful shutdown
    global.serverInstance = server;
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle process signals
let isShuttingDown = false;
let activeExtractions = 0;

// Track active extractions
global.trackExtraction = {
  start: () => activeExtractions++,
  end: () => activeExtractions--,
  getActive: () => activeExtractions
};

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, waiting for active extractions to complete...');
  isShuttingDown = true;
  
  const gracefulShutdown = async () => {
    if (activeExtractions > 0) {
      console.log(`⏳ Waiting for ${activeExtractions} active extraction(s) to complete...`);
      setTimeout(gracefulShutdown, 1000);
    } else {
      console.log('✅ All extractions completed, shutting down gracefully');
      await shutdownUnifiedServer(global.serverInstance);
      process.exit(0);
    }
  };
  
  await gracefulShutdown();
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, waiting for active extractions to complete...');
  isShuttingDown = true;
  
  const gracefulShutdown = async () => {
    if (activeExtractions > 0) {
      console.log(`⏳ Waiting for ${activeExtractions} active extraction(s) to complete...`);
      setTimeout(gracefulShutdown, 1000);
    } else {
      console.log('✅ All extractions completed, shutting down gracefully');
      await shutdownUnifiedServer(global.serverInstance);
      process.exit(0);
    }
  };
  
  await gracefulShutdown();
});

// Start the server
main(); 
