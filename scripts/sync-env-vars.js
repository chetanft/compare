#!/usr/bin/env node
/**
 * Sync environment variables from root .env to frontend/.env
 * Ensures Vite can access VITE_ prefixed variables at build time
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const rootEnvPath = path.join(rootDir, '.env');
const frontendEnvPath = path.join(rootDir, 'frontend', '.env');
const frontendEnvExamplePath = path.join(rootDir, 'frontend', '.env.example');

// Vite environment variables that need to be synced
const VITE_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_API_URL',
  'VITE_WS_URL',
  'VITE_SERVER_PORT',
  'VITE_ENABLE_ANALYTICS',
  'VITE_ENABLE_AI_INSIGHTS',
  'VITE_ENABLE_REAL_TIME'
];

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const vars = {};
  
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      vars[key] = value;
    }
  }
  
  return vars;
}

function writeEnvFile(filePath, vars, examplePath) {
  let content = '';
  
  // If example file exists, use it as template
  if (fs.existsSync(examplePath)) {
    const exampleContent = fs.readFileSync(examplePath, 'utf-8');
    const lines = exampleContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check if this line defines a VITE_ variable
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        const [, key] = match;
        if (VITE_VARS.includes(key) && vars[key]) {
          // Replace with actual value from root .env
          content += `${key}=${vars[key]}\n`;
        } else {
          // Keep original line (comment or example value)
          content += line + '\n';
        }
      } else {
        // Keep non-variable lines as-is
        content += line + '\n';
      }
    }
  } else {
    // No example file, create from scratch
    content = '# Frontend Environment Configuration\n';
    content += '# Synced from root .env\n\n';
    
    for (const key of VITE_VARS) {
      if (vars[key]) {
        content += `${key}=${vars[key]}\n`;
      }
    }
  }
  
  fs.writeFileSync(filePath, content.trim() + '\n', 'utf-8');
}

function main() {
  console.log('🔄 Syncing environment variables to frontend/.env...');

  // Read root .env and merge with process.env fallbacks
  const rootVars = readEnvFile(rootEnvPath);
  const viteVars = {};
  let sourcedFromProcessEnv = false;
  for (const key of VITE_VARS) {
    if (rootVars[key]) {
      viteVars[key] = rootVars[key];
      continue;
    }
    
    if (process.env[key]) {
      viteVars[key] = process.env[key];
      sourcedFromProcessEnv = true;
    }
  }
  
  if (Object.keys(viteVars).length === 0) {
    console.log('ℹ️  No VITE_ prefixed variables found in root .env or process.env');
    console.log('ℹ️  Frontend build will use values from frontend/.env if present');
    return;
  }
  
  if (sourcedFromProcessEnv) {
    console.log('✅ Pulled VITE_ variables from process.env for CI/CD environments');
  }
  
  // Read existing frontend/.env to preserve non-VITE vars
  const existingFrontendVars = readEnvFile(frontendEnvPath);
  
  // Merge: VITE vars from root, others from existing frontend/.env
  const mergedVars = { ...existingFrontendVars, ...viteVars };
  
  // Write to frontend/.env
  writeEnvFile(frontendEnvPath, mergedVars, frontendEnvExamplePath);
  
  console.log(`✅ Synced ${Object.keys(viteVars).length} VITE_ variables to frontend/.env`);
  console.log('   Variables:', Object.keys(viteVars).join(', '));
}

main();
