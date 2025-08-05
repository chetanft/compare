#!/usr/bin/env node

/**
 * Figma API and MCP Connection Verification Script
 * 
 * This script verifies:
 * 1. Figma API key validity
 * 2. MCP connection status
 * 3. Required API scopes
 */

import fetch from 'node-fetch';
import { loadConfig } from '../src/core/config/loader.js';
import { logger } from '../src/core/utils/logger.js';
import { MCPBridge } from '../src/figma/mcpBridge.js';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

/**
 * Main verification function
 */
async function verifyConnections() {
  console.log(`\n${colors.bold}${colors.cyan}=== Figma API & MCP Connection Verification ===${colors.reset}\n`);
  
  // Load configuration
  console.log(`${colors.blue}Loading configuration...${colors.reset}`);
  const config = await loadConfig();
  
  // Check for Figma API key
  const figmaApiKey = process.env.FIGMA_API_KEY || '';
  
  if (!figmaApiKey) {
    console.log(`${colors.red}✖ No Figma API key found in environment variables${colors.reset}`);
    console.log(`${colors.yellow}ℹ Set the FIGMA_API_KEY environment variable or add it in the settings page${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ Figma API key found in environment${colors.reset}`);
    
    // Test Figma API key
    await testFigmaApiKey(figmaApiKey);
  }
  
  // Check MCP connection
  console.log(`\n${colors.blue}Testing MCP connection...${colors.reset}`);
  await testMCPConnection();
  
  console.log(`\n${colors.bold}${colors.cyan}=== Verification Complete ===${colors.reset}\n`);
}

/**
 * Test Figma API key validity
 * @param {string} apiKey - Figma API key
 */
async function testFigmaApiKey(apiKey) {
  try {
    console.log(`${colors.blue}Testing Figma API key...${colors.reset}`);
    
    const response = await fetch('https://api.figma.com/v1/me', {
      headers: {
        'X-Figma-Token': apiKey
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log(`${colors.red}✖ Figma API key is invalid: ${errorData.err || response.statusText}${colors.reset}`);
      
      if (response.status === 403 && errorData.err?.includes('scope')) {
        console.log(`${colors.yellow}ℹ API key is missing required scopes${colors.reset}`);
        console.log(`${colors.yellow}ℹ Required scopes: file_content:read, file_dev_resources:read, library_assets:read${colors.reset}`);
        console.log(`${colors.yellow}ℹ Please generate a new token with all required scopes${colors.reset}`);
      }
      
      return false;
    }
    
    const userData = await response.json();
    console.log(`${colors.green}✓ Figma API key is valid${colors.reset}`);
    console.log(`${colors.green}✓ Connected as: ${userData.handle} (${userData.email})${colors.reset}`);
    
    // Test file access
    await testFigmaFileAccess(apiKey);
    
    return true;
  } catch (error) {
    console.log(`${colors.red}✖ Failed to test Figma API key: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Test access to a Figma file
 * @param {string} apiKey - Figma API key
 */
async function testFigmaFileAccess(apiKey) {
  try {
    console.log(`${colors.blue}Testing Figma file access...${colors.reset}`);
    
    // Use a public Figma file for testing
    const testFileId = 'xfMsPmqaYwrjxl4fog2o7X';
    
    const response = await fetch(`https://api.figma.com/v1/files/${testFileId}`, {
      headers: {
        'X-Figma-Token': apiKey
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log(`${colors.red}✖ Cannot access Figma files: ${errorData.err || response.statusText}${colors.reset}`);
      return false;
    }
    
    const fileData = await response.json();
    console.log(`${colors.green}✓ Successfully accessed Figma file: ${fileData.name}${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}✖ Failed to test Figma file access: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Test MCP connection
 */
async function testMCPConnection() {
  try {
    const mcpBridge = new MCPBridge();
    
    try {
      await mcpBridge.initialize();
      console.log(`${colors.green}✓ MCP connection successful${colors.reset}`);
      return true;
    } catch (error) {
      console.log(`${colors.red}✖ MCP connection failed: ${error.message}${colors.reset}`);
      
      // Check if Figma Dev Mode is running
      console.log(`${colors.yellow}ℹ Checking if Figma Dev Mode is running...${colors.reset}`);
      
      try {
        const response = await fetch('http://127.0.0.1:3845/sse', {
          method: 'GET',
          signal: AbortSignal.timeout(2000) // 2 second timeout
        });
        
        if (response.ok) {
          console.log(`${colors.green}✓ Figma Dev Mode is running${colors.reset}`);
        } else {
          console.log(`${colors.red}✖ Figma Dev Mode is not running or not accessible${colors.reset}`);
        }
      } catch (devModeError) {
        console.log(`${colors.red}✖ Figma Dev Mode is not running${colors.reset}`);
        console.log(`${colors.yellow}ℹ To use MCP, open Figma and enable Dev Mode${colors.reset}`);
      }
      
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✖ Failed to test MCP connection: ${error.message}${colors.reset}`);
    return false;
  }
}

// Run the verification
verifyConnections().catch(error => {
  logger.error('Verification failed', error);
  process.exit(1);
}); 