#!/usr/bin/env node
/**
 * Test Script for Netlify Functions
 * 
 * This script tests the Netlify functions locally to ensure they work correctly
 * before deployment. It simulates Netlify function invocations and verifies responses.
 */

import { handler as figmaOnlyHandler } from './figma-only.js';
import { handler as staticHandler } from './static.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Test cases
const tests = [
  {
    name: 'Figma-only: Health Check',
    handler: figmaOnlyHandler,
    event: {
      path: '/health',
      httpMethod: 'GET',
      headers: {},
      queryStringParameters: {},
    },
    validate: (response) => {
      const body = JSON.parse(response.body);
      return body.status === 'ok' && response.statusCode === 200;
    }
  },
  {
    name: 'Figma-only: API Health Check',
    handler: figmaOnlyHandler,
    event: {
      path: '/api/health',
      httpMethod: 'GET',
      headers: {},
      queryStringParameters: {},
    },
    validate: (response) => {
      const body = JSON.parse(response.body);
      return body.status === 'ok' && response.statusCode === 200;
    }
  },
  {
    name: 'Figma-only: Socket Fallback',
    handler: figmaOnlyHandler,
    event: {
      path: '/socket-fallback',
      httpMethod: 'GET',
      headers: {},
      queryStringParameters: {},
    },
    validate: (response) => {
      const body = JSON.parse(response.body);
      return body.success === true && response.statusCode === 200;
    }
  },
  {
    name: 'Figma-only: 404 Handler',
    handler: figmaOnlyHandler,
    event: {
      path: '/non-existent-path',
      httpMethod: 'GET',
      headers: {},
      queryStringParameters: {},
    },
    validate: (response) => {
      const body = JSON.parse(response.body);
      return body.error === 'API endpoint not found' && response.statusCode === 404;
    }
  },
  {
    name: 'Static: Missing Path',
    handler: staticHandler,
    event: {
      path: '/',
      httpMethod: 'GET',
      headers: {},
      queryStringParameters: {},
    },
    validate: (response) => {
      const body = JSON.parse(response.body);
      return body.error === 'No file path specified' && response.statusCode === 400;
    }
  }
];

// Run tests
async function runTests() {
  console.log(`${colors.cyan}Starting Netlify Functions Tests${colors.reset}`);
  console.log(`${colors.cyan}================================${colors.reset}\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    process.stdout.write(`Testing: ${test.name}... `);
    
    try {
      const response = await test.handler(test.event);
      
      if (test.validate(response)) {
        console.log(`${colors.green}PASSED${colors.reset}`);
        passed++;
      } else {
        console.log(`${colors.red}FAILED${colors.reset}`);
        console.log(`  Expected: Check validation function`);
        console.log(`  Received: ${JSON.stringify(response, null, 2)}`);
        failed++;
      }
    } catch (error) {
      console.log(`${colors.red}ERROR${colors.reset}`);
      console.error(`  ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n${colors.cyan}Test Results${colors.reset}`);
  console.log(`${colors.cyan}============${colors.reset}`);
  console.log(`Total: ${tests.length}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error(`${colors.red}Test runner error:${colors.reset}`, error);
  process.exit(1);
}); 