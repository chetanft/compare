#!/usr/bin/env node

/**
 * Cleanup script to remove unnecessary files from the codebase
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files and directories to remove
const toRemove = [
  // Netlify-related files
  'netlify.toml',
  'netlify/',
  'NETLIFY_DEPLOYMENT_GUIDE.md',
  'NETLIFY_DEPLOYMENT_PROGRESS.md',
  'netlify-deploy/',
  'deploy-netlify.sh',
  
  // Duplicate server files
  'server.js',
  'server-unified.js',
  'simple-server.js',
  
  // Test files with no integration
  'test-color-server.js',
  'test-comparison.js',
  'test-direct-comparison.js'
];

async function cleanup() {
  console.log('🧹 Starting cleanup...');
  
  for (const item of toRemove) {
    const fullPath = path.join(__dirname, item);
    
    try {
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        console.log(`📁 Removing directory: ${item}`);
        await fs.rm(fullPath, { recursive: true, force: true });
      } else {
        console.log(`📄 Removing file: ${item}`);
        await fs.unlink(fullPath);
      }
      
      console.log(`✅ Removed: ${item}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`⚠️ Item not found: ${item}`);
      } else {
        console.error(`❌ Error removing ${item}: ${error.message}`);
      }
    }
  }
  
  console.log('🎉 Cleanup completed!');
}

cleanup().catch(error => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
}); 