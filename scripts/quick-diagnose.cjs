#!/usr/bin/env node
/**
 * Quick Frontend Issue Diagnostic
 * Prevents 48-hour debugging cycles with immediate checks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');

const PORT = process.env.PORT || 3847;

function log(message, type = 'info') {
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔍';
  console.log(`${prefix} ${message}`);
}

function checkServerRunning() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/api/health`, (res) => {
      if (res.statusCode === 200) {
        log('Server is running and healthy', 'success');
        resolve(true);
      } else {
        log(`Server responded with status ${res.statusCode}`, 'error');
        resolve(false);
      }
    });
    
    req.on('error', () => {
      log('Server is not reachable', 'error');
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      log('Server request timed out', 'error');
      req.destroy();
      resolve(false);
    });
  });
}

function checkFrontendBuild() {
  const distPath = path.join(process.cwd(), 'frontend/dist');
  const indexPath = path.join(distPath, 'index.html');
  const assetsPath = path.join(distPath, 'assets');

  if (!fs.existsSync(distPath)) {
    log('Frontend dist directory missing', 'error');
    return false;
  }

  if (!fs.existsSync(indexPath)) {
    log('Frontend index.html missing', 'error');
    return false;
  }

  if (!fs.existsSync(assetsPath)) {
    log('Frontend assets directory missing', 'error');
    return false;
  }

  const assetFiles = fs.readdirSync(assetsPath);
  if (assetFiles.length === 0) {
    log('Frontend assets directory empty', 'error');
    return false;
  }

  log(`Frontend build exists with ${assetFiles.length} assets`, 'success');
  return true;
}

function checkProcesses() {
  try {
    const result = execSync(`lsof -i :${PORT}`, { encoding: 'utf8' });
    if (result.includes('node')) {
      log(`Node process found on port ${PORT}`, 'success');
      return true;
    } else {
      log(`No node process on port ${PORT}`, 'error');
      return false;
    }
  } catch (error) {
    log(`No process found on port ${PORT}`, 'error');
    return false;
  }
}

async function runQuickDiagnosis() {
  console.log('🏥 Quick Frontend Diagnostics\n');

  const serverRunning = await checkServerRunning();
  const processRunning = checkProcesses();
  const frontendBuilt = checkFrontendBuild();

  console.log('\n📋 DIAGNOSIS SUMMARY:');
  
  if (serverRunning && frontendBuilt) {
    log('Core systems are healthy', 'success');
    console.log('\n💡 BROWSER ISSUE LIKELY:');
    console.log('1. Hard refresh: Cmd+Shift+R (Chrome/Safari)');
    console.log('2. Open incognito/private window');
    console.log('3. Clear browser cache');
    console.log('4. Check browser console (F12 → Console)');
    console.log('5. Try different browser');
  } else {
    log('System issues detected', 'error');
    console.log('\n💡 SYSTEM FIXES:');
    if (!processRunning) console.log('• Start server: npm start');
    if (!frontendBuilt) console.log('• Rebuild frontend: npm run build:frontend');
    if (!serverRunning && processRunning) console.log('• Restart server: pkill -f "PORT=3847" && npm start');
  }

  console.log('\n🚀 QUICK RECOVERY COMMANDS:');
  console.log('npm run fix:frontend  # Rebuild + diagnose');
  console.log('npm run diagnose      # Run this diagnosis again');
}

runQuickDiagnosis().catch(console.error);
