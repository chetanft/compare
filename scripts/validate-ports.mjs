#!/usr/bin/env node

/**
 * Port Configuration Validation Script
 * 
 * This script ensures all port configurations are consistent across the codebase.
 * It runs during build and CI/CD to prevent port configuration drift.
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Define expected ports directly (since import might be problematic)
const EXPECTED_PORTS = {
  SERVER: 3847,
  WEB_DEV: 5173,
  FIGMA_MCP: 3845,
  PREVIEW: 4173
};

const errors = [];
const warnings = [];

console.log('🔍 Validating port configurations...');
console.log('📊 Expected ports:', EXPECTED_PORTS);

/**
 * Check if a file contains hardcoded ports that should use PORTS.js
 */
function checkFileForHardcodedPorts(filePath, content) {
  const hardcodedPorts = [
    '3001', '3007', '3008', // Wrong ports
    '5174', '8080', '8000'  // Other common ports
  ];
  
  const allowedFiles = [
    'src/config/PORTS.js',
    'scripts/validate-ports',
    'PORT_CONFIGURATION_FINAL_SOLUTION.md',
    'PORT_CONFIGURATION_SYSTEMIC_FAILURE_ANALYSIS.md'
  ];
  
  // Skip allowed files
  if (allowedFiles.some(allowed => filePath.includes(allowed))) {
    return;
  }
  
  hardcodedPorts.forEach(port => {
    const patterns = [
      new RegExp(`localhost:${port}`, 'g'),
      new RegExp(`"${port}"`, 'g'),
      new RegExp(`'${port}'`, 'g')
    ];
    
    patterns.forEach(pattern => {
      if (pattern.test(content)) {
        errors.push(`${filePath}: Contains hardcoded wrong port ${port}`);
      }
    });
  });
}

/**
 * Check built frontend files for wrong ports
 */
function validateBuiltFrontend() {
  const distPath = 'frontend/dist';
  
  if (!fs.existsSync(distPath)) {
    warnings.push('Frontend not built - run npm run build:frontend first');
    return;
  }
  
  const jsFiles = glob.sync('frontend/dist/assets/*.js');
  
  jsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for wrong ports that indicate configuration drift
    const wrongPorts = ['3001', '3007', '3008'];
    wrongPorts.forEach(port => {
      if (content.includes(`localhost:${port}`)) {
        errors.push(`${file}: Built file contains wrong port ${port} - rebuild needed`);
      }
    });
    
    // Verify correct port is present
    if (!content.includes(`localhost:${EXPECTED_PORTS.SERVER}`)) {
      warnings.push(`${file}: Built file doesn't contain expected port ${EXPECTED_PORTS.SERVER}`);
    }
  });
}

/**
 * Check all source files for hardcoded wrong ports
 */
function validateSourceFiles() {
  const sourceFiles = glob.sync('src/**/*.{js,ts}', { ignore: ['src/config/PORTS.js'] });
  const frontendFiles = glob.sync('frontend/src/**/*.{js,ts,tsx}');
  
  [...sourceFiles, ...frontendFiles].forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      checkFileForHardcodedPorts(file, content);
    } catch (err) {
      warnings.push(`${file}: Could not read file - ${err.message}`);
    }
  });
}

/**
 * Main validation function
 */
async function validatePorts() {
  try {
    // Run all validations
    validateBuiltFrontend();
    validateSourceFiles();
    
    // Report results
    console.log('\n📊 VALIDATION RESULTS:');
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ All port configurations are consistent!');
      process.exit(0);
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      warnings.forEach(warning => console.log(`  ${warning}`));
    }
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach(error => console.log(`  ${error}`));
      
      console.log('\n🔧 RECOMMENDED FIXES:');
      console.log('  1. Update files to use correct port 3847');
      console.log('  2. Remove hardcoded wrong port values');
      console.log('  3. Rebuild frontend: npm run build:frontend');
      console.log('  4. Re-run validation: npm run ports:validate');
      
      process.exit(1);
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️ Validation completed with warnings');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Port validation failed:', error.message);
    process.exit(1);
  }
}

// Run validation
validatePorts();
