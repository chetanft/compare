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
import { PORTS, CONFIGURED_PORTS } from '../src/config/PORTS.js';

const errors = [];
const warnings = [];

console.log('🔍 Validating port configurations...');

/**
 * Check if a file contains hardcoded ports that should use PORTS.js
 */
function checkFileForHardcodedPorts(filePath, content) {
  const hardcodedPorts = [
    '3001', '3007', '3008', '3847', '3845', 
    '5173', '5174', '4173', '8080', '8000'
  ];
  
  const allowedFiles = [
    'src/config/PORTS.js',
    'scripts/validate-ports.js',
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
      new RegExp(`'${port}'`, 'g'),
      new RegExp(`port.*${port}`, 'gi'),
      new RegExp(`PORT.*${port}`, 'g')
    ];
    
    patterns.forEach(pattern => {
      if (pattern.test(content)) {
        errors.push(`${filePath}: Contains hardcoded port ${port} - should import from PORTS.js`);
      }
    });
  });
}

/**
 * Check Vite configuration uses PORTS.js
 */
function validateViteConfig() {
  const viteConfigPath = 'frontend/vite.config.ts';
  
  if (!fs.existsSync(viteConfigPath)) {
    errors.push(`${viteConfigPath}: File not found`);
    return;
  }
  
  const content = fs.readFileSync(viteConfigPath, 'utf8');
  
  // Check if it imports PORTS
  if (!content.includes('PORTS') && !content.includes('API_PORT')) {
    warnings.push(`${viteConfigPath}: Should import port from PORTS.js for consistency`);
  }
  
  // Check for hardcoded ports in define section
  const defineMatch = content.match(/define:\s*{[\s\S]*?}/);
  if (defineMatch) {
    const defineSection = defineMatch[0];
    if (defineSection.includes('3847') && !defineSection.includes('API_PORT') && !defineSection.includes('PORTS')) {
      errors.push(`${viteConfigPath}: Hardcodes port 3847 in define section - should use PORTS.SERVER`);
    }
  }
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
    if (!content.includes(`localhost:${CONFIGURED_PORTS.SERVER}`)) {
      warnings.push(`${file}: Built file doesn't contain expected port ${CONFIGURED_PORTS.SERVER}`);
    }
  });
}

/**
 * Check backend configuration files
 */
function validateBackendConfig() {
  const configFiles = [
    'src/config/index.js',
    'src/config/platform-config.js'
  ];
  
  configFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      warnings.push(`${file}: File not found`);
      return;
    }
    
    const content = fs.readFileSync(file, 'utf8');
    
    // Should reference environment variables or PORTS.js, not hardcode
    if (content.includes('3847') && !content.includes('env.PORT') && !content.includes('PORTS')) {
      warnings.push(`${file}: Consider importing from PORTS.js for consistency`);
    }
  });
}

/**
 * Check all source files for hardcoded ports
 */
function validateSourceFiles() {
  const sourceFiles = glob.sync('src/**/*.{js,ts}', { ignore: ['src/config/PORTS.js'] });
  const frontendFiles = glob.sync('frontend/src/**/*.{js,ts,tsx}');
  
  [...sourceFiles, ...frontendFiles].forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    checkFileForHardcodedPorts(file, content);
  });
}

/**
 * Main validation function
 */
async function validatePorts() {
  try {
    // Import and validate PORTS configuration
    console.log('✅ PORTS.js loaded successfully');
    console.log('📊 Configured ports:', CONFIGURED_PORTS);
    
    // Run all validations
    validateViteConfig();
    validateBuiltFrontend();
    validateBackendConfig();
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
      console.log('  1. Update files to import from src/config/PORTS.js');
      console.log('  2. Remove hardcoded port values');
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

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validatePorts();
}

export { validatePorts };
