#!/usr/bin/env node

/**
 * Main server entry point
 * Clean MCP-only implementation
 */

import { startServer } from './src/core/server/index.js';

/**
 * Start the server
 */
async function main() {
  try {
    console.log('🚀 Starting Figma Web Comparison Tool (Clean MCP Edition)...');
    
    // Start server
    await startServer();
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

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, waiting for active extractions to complete...');
  isShuttingDown = true;
  
  const gracefulShutdown = () => {
    if (activeExtractions > 0) {
      console.log(`⏳ Waiting for ${activeExtractions} active extraction(s) to complete...`);
      setTimeout(gracefulShutdown, 1000);
    } else {
      console.log('✅ All extractions completed, shutting down gracefully');
      process.exit(0);
    }
  };
  
  gracefulShutdown();
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, waiting for active extractions to complete...');
  isShuttingDown = true;
  
  const gracefulShutdown = () => {
    if (activeExtractions > 0) {
      console.log(`⏳ Waiting for ${activeExtractions} active extraction(s) to complete...`);
      setTimeout(gracefulShutdown, 1000);
    } else {
      console.log('✅ All extractions completed, shutting down gracefully');
      process.exit(0);
    }
  };
  
  gracefulShutdown();
});

// Start the server
main(); 