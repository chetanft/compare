#!/usr/bin/env node

/**
 * Port Verification Script
 * 
 * This script checks for port consistency across all configuration files
 * and can automatically fix any mismatches.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Default port to use if none is specified
const DEFAULT_PORT = 3007;

// Files that need to be checked for port consistency
const FILES_TO_CHECK = [
  {
    path: 'config.json',
    portPath: 'ports.server',
    type: 'json'
  },
  {
    path: 'frontend/.env',
    portPath: 'VITE_SERVER_PORT',
    type: 'env'
  },
  {
    path: 'frontend/src/config/ports.ts',
    portPath: 'DEFAULT_SERVER_PORT',
    type: 'ts'
  },
  {
    path: 'src/config/ports.js',
    portPath: 'DEFAULT_PORT',
    type: 'js'
  }
];

// Parse command line arguments
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');
const specifiedPort = args.find(arg => arg.startsWith('--port='))?.split('=')[1];
const targetPort = specifiedPort ? parseInt(specifiedPort, 10) : null;

async function readConfigPort(filePath, portPath, type) {
  try {
    const fullPath = path.resolve(rootDir, filePath);
    const fileContent = await fs.readFile(fullPath, 'utf8');
    
    switch (type) {
      case 'json': {
        const config = JSON.parse(fileContent);
        const parts = portPath.split('.');
        let value = config;
        for (const part of parts) {
          value = value?.[part];
        }
        return value;
      }
      case 'env': {
        const match = fileContent.match(new RegExp(`${portPath}=(\\d+)`));
        return match ? parseInt(match[1], 10) : null;
      }
      case 'ts':
      case 'js': {
        const match = fileContent.match(new RegExp(`(?:const|let|var)\\s+${portPath}\\s*=\\s*(\\d+)`));
        return match ? parseInt(match[1], 10) : null;
      }
      default:
        return null;
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`⚠️ File not found: ${filePath}`);
      return null;
    }
    console.error(`❌ Error reading ${filePath}:`, error.message);
    return null;
  }
}

async function updateConfigPort(filePath, portPath, type, newPort) {
  try {
    const fullPath = path.resolve(rootDir, filePath);
    
    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Create directory if it doesn't exist
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        
        // Create a new file with default content
        let defaultContent = '';
        switch (type) {
          case 'json':
            defaultContent = '{}';
            break;
          case 'env':
            defaultContent = '';
            break;
          case 'ts':
            defaultContent = '// Default port configuration\n';
            break;
          case 'js':
            defaultContent = '// Default port configuration\n';
            break;
        }
        
        await fs.writeFile(fullPath, defaultContent, 'utf8');
      } else {
        throw error;
      }
    }
    
    let fileContent = await fs.readFile(fullPath, 'utf8');
    
    switch (type) {
      case 'json': {
        const config = JSON.parse(fileContent || '{}');
        const parts = portPath.split('.');
        let current = config;
        
        // Create nested objects if they don't exist
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
        
        // Set the port value
        current[parts[parts.length - 1]] = newPort;
        
        // Write back to file
        await fs.writeFile(fullPath, JSON.stringify(config, null, 2), 'utf8');
        break;
      }
      case 'env': {
        const regex = new RegExp(`${portPath}=\\d+`);
        const newLine = `${portPath}=${newPort}`;
        
        if (regex.test(fileContent)) {
          fileContent = fileContent.replace(regex, newLine);
        } else {
          fileContent = fileContent.trim() + '\n' + newLine + '\n';
        }
        
        await fs.writeFile(fullPath, fileContent, 'utf8');
        break;
      }
      case 'ts':
      case 'js': {
        const regex = new RegExp(`(const|let|var)\\s+${portPath}\\s*=\\s*\\d+`);
        const newLine = `$1 ${portPath} = ${newPort}`;
        
        if (regex.test(fileContent)) {
          fileContent = fileContent.replace(regex, newLine);
        } else {
          const exportRegex = /export\s+{/;
          if (exportRegex.test(fileContent)) {
            // Add before exports
            const constLine = `const ${portPath} = ${newPort};\n\n`;
            fileContent = fileContent.replace(exportRegex, constLine + 'export {');
          } else {
            // Add to the top of the file
            fileContent = `const ${portPath} = ${newPort};\n\n` + fileContent;
          }
        }
        
        await fs.writeFile(fullPath, fileContent, 'utf8');
        break;
      }
    }
    
    console.log(`✅ Updated ${filePath} with port ${newPort}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Checking port consistency across configuration files...\n');
  
  // Read all port configurations
  const portConfigs = [];
  for (const file of FILES_TO_CHECK) {
    const port = await readConfigPort(file.path, file.portPath, file.type);
    portConfigs.push({
      ...file,
      port,
      exists: port !== null
    });
  }
  
  // Determine the correct port to use
  let correctPort = targetPort;
  if (!correctPort) {
    // Use the most common port from the configs
    const portCounts = {};
    for (const config of portConfigs) {
      if (config.port) {
        portCounts[config.port] = (portCounts[config.port] || 0) + 1;
      }
    }
    
    let maxCount = 0;
    for (const [port, count] of Object.entries(portCounts)) {
      if (count > maxCount) {
        maxCount = count;
        correctPort = parseInt(port, 10);
      }
    }
    
    // If no port found, use default
    if (!correctPort) {
      correctPort = DEFAULT_PORT;
    }
  }
  
  console.log(`📊 Port configuration summary:`);
  for (const config of portConfigs) {
    const status = !config.exists ? '❓ Missing' : 
                  config.port === correctPort ? '✅ Correct' : 
                  `❌ Mismatch (${config.port})`;
    console.log(`  ${config.path}: ${status}`);
  }
  
  console.log(`\n🎯 Target port: ${correctPort}\n`);
  
  // Check if any mismatches exist
  const mismatches = portConfigs.filter(config => config.port !== correctPort);
  
  if (mismatches.length === 0) {
    console.log('✅ All configurations are using the same port!');
    return;
  }
  
  console.log(`⚠️ Found ${mismatches.length} port mismatches.`);
  
  if (shouldFix) {
    console.log('🔧 Fixing port mismatches...\n');
    
    for (const mismatch of mismatches) {
      await updateConfigPort(mismatch.path, mismatch.portPath, mismatch.type, correctPort);
    }
    
    console.log('\n✅ All port configurations have been synchronized to port', correctPort);
  } else {
    console.log('ℹ️  Run with --fix to automatically fix mismatches.');
    console.log('ℹ️  Run with --port=XXXX to specify a target port.');
  }
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
}); 