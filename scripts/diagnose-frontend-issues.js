#!/usr/bin/env node
/**
 * Frontend Issue Diagnostic Tool
 * Prevents the 48-hour debugging cycle by systematically checking common issues
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import fetch from 'node-fetch';

const ISSUES = {
  SERVER_DOWN: 'Server is not running on expected port',
  FRONTEND_BUILD_MISSING: 'Frontend build files are missing',
  API_ENDPOINTS_BROKEN: 'API endpoints are not responding',
  VERSION_MISMATCH: 'Frontend and backend versions do not match',
  STATIC_FILES_NOT_SERVED: 'Static files are not being served correctly',
  CSP_BLOCKING: 'Content Security Policy is blocking resources'
};

class FrontendDiagnostics {
  constructor() {
    this.port = process.env.PORT || 3847;
    this.baseUrl = `http://localhost:${this.port}`;
    this.results = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔍';
    console.log(`${prefix} [${timestamp}] ${message}`);
    this.results.push({ timestamp, type, message });
  }

  async checkServerRunning() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, { timeout: 5000 });
      if (response.ok) {
        this.log('Server is running and healthy', 'success');
        return true;
      } else {
        this.log(`Server responded with status ${response.status}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Server is not reachable: ${error.message}`, 'error');
      return false;
    }
  }

  checkFrontendBuild() {
    const distPath = path.join(process.cwd(), 'frontend/dist');
    const indexPath = path.join(distPath, 'index.html');
    const assetsPath = path.join(distPath, 'assets');

    if (!fs.existsSync(distPath)) {
      this.log('Frontend dist directory is missing', 'error');
      return false;
    }

    if (!fs.existsSync(indexPath)) {
      this.log('Frontend index.html is missing', 'error');
      return false;
    }

    if (!fs.existsSync(assetsPath)) {
      this.log('Frontend assets directory is missing', 'error');
      return false;
    }

    const assetFiles = fs.readdirSync(assetsPath);
    if (assetFiles.length === 0) {
      this.log('Frontend assets directory is empty', 'error');
      return false;
    }

    this.log(`Frontend build exists with ${assetFiles.length} assets`, 'success');
    return true;
  }

  async checkVersionMatch() {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`);
      const data = await response.json();
      const backendVersion = data.data?.version;
      
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const frontendPackageJson = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
      
      if (backendVersion === packageJson.version && packageJson.version === frontendPackageJson.version) {
        this.log(`Versions match: ${backendVersion}`, 'success');
        return true;
      } else {
        this.log(`Version mismatch - Backend: ${backendVersion}, Root: ${packageJson.version}, Frontend: ${frontendPackageJson.version}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Could not check version match: ${error.message}`, 'error');
      return false;
    }
  }

  async checkStaticFiles() {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      const html = await response.text();
      
      if (html.includes('<title>Figma-Web Comparison Tool')) {
        this.log('Static files are being served correctly', 'success');
        return true;
      } else {
        this.log('Static files are not being served correctly', 'error');
        return false;
      }
    } catch (error) {
      this.log(`Could not check static files: ${error.message}`, 'error');
      return false;
    }
  }

  generateReport() {
    const timestamp = new Date().toISOString();
    const report = {
      timestamp,
      diagnostics: this.results,
      quickFixes: [
        'Try hard refresh (Cmd+Shift+R)',
        'Open in incognito/private window',
        'Clear browser cache',
        'Check browser console for JavaScript errors',
        'Restart the server: npm start',
        'Rebuild frontend: npm run build:frontend'
      ]
    };

    fs.writeFileSync('frontend-diagnostics.json', JSON.stringify(report, null, 2));
    this.log(`Diagnostic report saved to frontend-diagnostics.json`, 'info');
  }

  async runDiagnostics() {
    console.log('🏥 Frontend Issue Diagnostics Starting...\n');

    const checks = [
      { name: 'Server Health', fn: () => this.checkServerRunning() },
      { name: 'Frontend Build', fn: () => this.checkFrontendBuild() },
      { name: 'Version Match', fn: () => this.checkVersionMatch() },
      { name: 'Static Files', fn: () => this.checkStaticFiles() }
    ];

    let allPassed = true;
    for (const check of checks) {
      console.log(`\n🔍 Running ${check.name} check...`);
      const passed = await check.fn();
      if (!passed) allPassed = false;
    }

    console.log('\n📋 DIAGNOSTIC SUMMARY:');
    if (allPassed) {
      this.log('All checks passed! The issue might be browser-specific.', 'success');
      console.log('\n💡 RECOMMENDED ACTIONS:');
      console.log('1. Hard refresh browser (Cmd+Shift+R)');
      console.log('2. Open in incognito window');
      console.log('3. Check browser console for JavaScript errors');
    } else {
      this.log('Issues detected. See above for details.', 'error');
      console.log('\n💡 RECOMMENDED ACTIONS:');
      console.log('1. Fix the failed checks above');
      console.log('2. Run: npm run build:frontend');
      console.log('3. Restart server: npm start');
    }

    this.generateReport();
  }
}

// Run diagnostics if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const diagnostics = new FrontendDiagnostics();
  diagnostics.runDiagnostics().catch(console.error);
}

export default FrontendDiagnostics;
