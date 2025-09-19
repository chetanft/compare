#!/usr/bin/env node

/**
 * Platform Synchronization Script
 * Automatically syncs shared modules between web and macOS apps
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

class PlatformSyncer {
  constructor() {
    this.sharedPath = path.join(projectRoot, 'src/shared');
    this.webServerPath = path.join(projectRoot, 'src/core/server/index.js');
    // this.macosServerPath = path.join(projectRoot, 'src/macos/server/electron-server.js'); // DEPRECATED
    this.syncLog = [];
  }

  /**
   * Main sync process
   */
  async sync() {
    console.log('🔄 Starting platform synchronization...');
    
    try {
      // 1. Validate shared modules
      await this.validateSharedModules();
      
      // 2. Check for API endpoint parity
      await this.checkApiParity();
      
      // 3. Sync configuration schemas
      await this.syncConfigurations();
      
      // 4. Update package.json dependencies
      await this.syncDependencies();
      
      // 5. Run tests
      await this.runTests();
      
      // 6. Generate sync report
      await this.generateReport();
      
      console.log('✅ Platform synchronization completed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Platform synchronization failed:', error.message);
      return false;
    }
  }

  /**
   * Validate shared modules exist and are properly structured
   */
  async validateSharedModules() {
    console.log('🔍 Validating shared modules...');
    
    const requiredModules = [
      'src/shared/config/unified-config.js',
      'src/shared/api/handlers/figma-handler.js',
      'src/shared/services/ScreenshotService.js',
      'src/platforms/web-adapter.js',
      'src/platforms/electron-adapter.js'
    ];

    const missingModules = [];
    
    for (const module of requiredModules) {
      const modulePath = path.join(projectRoot, module);
      if (!fs.existsSync(modulePath)) {
        missingModules.push(module);
      }
    }

    if (missingModules.length > 0) {
      throw new Error(`Missing shared modules: ${missingModules.join(', ')}`);
    }

    this.syncLog.push('✅ All shared modules validated');
  }

  /**
   * Check API endpoint parity between web and macOS apps
   */
  async checkApiParity() {
    console.log('🔍 Checking API endpoint parity...');
    
    // Extract endpoints from web server
    const webEndpoints = this.extractEndpoints(this.webServerPath, 'web');
    
    // Extract endpoints from macOS server
    const macosEndpoints = this.extractEndpoints(this.macosServerPath, 'macos');
    
    // Compare endpoints
    const webOnly = webEndpoints.filter(ep => !macosEndpoints.some(mep => mep.path === ep.path && mep.method === ep.method));
    const macosOnly = macosEndpoints.filter(ep => !webEndpoints.some(wep => wep.path === ep.path && wep.method === ep.method));
    
    if (webOnly.length > 0) {
      console.warn('⚠️ Endpoints only in web app:', webOnly);
      this.syncLog.push(`⚠️ Web-only endpoints: ${webOnly.length}`);
    }
    
    if (macosOnly.length > 0) {
      console.warn('⚠️ Endpoints only in macOS app:', macosOnly);
      this.syncLog.push(`⚠️ macOS-only endpoints: ${macosOnly.length}`);
    }
    
    if (webOnly.length === 0 && macosOnly.length === 0) {
      this.syncLog.push('✅ API endpoint parity achieved');
    }
    
    return { webEndpoints, macosEndpoints, webOnly, macosOnly };
  }

  /**
   * Extract API endpoints from server file
   */
  extractEndpoints(serverPath, platform) {
    try {
      const content = fs.readFileSync(serverPath, 'utf8');
      const endpoints = [];
      
      // Match Express.js route patterns
      const routePattern = /app\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g;
      let match;
      
      while ((match = routePattern.exec(content)) !== null) {
        endpoints.push({
          method: match[1].toUpperCase(),
          path: match[2],
          platform
        });
      }
      
      return endpoints;
    } catch (error) {
      console.error(`❌ Error extracting endpoints from ${platform}:`, error.message);
      return [];
    }
  }

  /**
   * Sync configuration schemas
   */
  async syncConfigurations() {
    console.log('🔧 Syncing configuration schemas...');
    
    try {
      // Read unified config
      const unifiedConfigPath = path.join(projectRoot, 'src/shared/config/unified-config.js');
      const unifiedConfig = fs.readFileSync(unifiedConfigPath, 'utf8');
      
      // Extract default configuration
      const defaultsMatch = unifiedConfig.match(/getDefaults\(\)\s*\{[\s\S]*?return\s*(\{[\s\S]*?\});/);
      
      if (defaultsMatch) {
        this.syncLog.push('✅ Configuration schema validated');
      } else {
        this.syncLog.push('⚠️ Could not validate configuration schema');
      }
      
    } catch (error) {
      console.error('❌ Configuration sync error:', error.message);
      this.syncLog.push('❌ Configuration sync failed');
    }
  }

  /**
   * Sync package.json dependencies
   */
  async syncDependencies() {
    console.log('📦 Syncing dependencies...');
    
    try {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Required dependencies for unified architecture
      const requiredDeps = [
        'express',
        'cors',
        'helmet',
        'morgan',
        'compression',
        'express-rate-limit',
        'multer',
        'sharp',
        'pixelmatch',
        'pngjs',
        'node-fetch'
      ];
      
      const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
      
      if (missingDeps.length > 0) {
        console.warn('⚠️ Missing dependencies:', missingDeps);
        this.syncLog.push(`⚠️ Missing dependencies: ${missingDeps.join(', ')}`);
      } else {
        this.syncLog.push('✅ All required dependencies present');
      }
      
    } catch (error) {
      console.error('❌ Dependency sync error:', error.message);
      this.syncLog.push('❌ Dependency sync failed');
    }
  }

  /**
   * Run tests to ensure everything works
   */
  async runTests() {
    console.log('🧪 Running tests...');
    
    try {
      // Run basic syntax checks
      execSync('node --check src/shared/config/unified-config.js', { cwd: projectRoot });
      execSync('node --check src/shared/api/handlers/figma-handler.js', { cwd: projectRoot });
      // execSync('node --check src/macos/server/electron-server.js', { cwd: projectRoot }); // DEPRECATED
      
      this.syncLog.push('✅ Syntax validation passed');
      
      // Run unit tests if available
      try {
        execSync('npm test', { cwd: projectRoot, stdio: 'pipe' });
        this.syncLog.push('✅ Unit tests passed');
      } catch (testError) {
        this.syncLog.push('⚠️ Unit tests failed or not available');
      }
      
    } catch (error) {
      console.error('❌ Test execution error:', error.message);
      this.syncLog.push('❌ Tests failed');
    }
  }

  /**
   * Generate synchronization report
   */
  async generateReport() {
    console.log('📊 Generating sync report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      platform: 'unified',
      syncLog: this.syncLog,
      summary: {
        totalChecks: this.syncLog.length,
        passed: this.syncLog.filter(log => log.startsWith('✅')).length,
        warnings: this.syncLog.filter(log => log.startsWith('⚠️')).length,
        errors: this.syncLog.filter(log => log.startsWith('❌')).length
      },
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    const reportPath = path.join(projectRoot, 'PLATFORM_SYNC_REPORT.md');
    const reportContent = this.formatReport(report);
    
    fs.writeFileSync(reportPath, reportContent);
    
    console.log(`📋 Sync report saved: ${reportPath}`);
    return report;
  }

  /**
   * Generate recommendations based on sync results
   */
  generateRecommendations() {
    const recommendations = [];
    
    const hasErrors = this.syncLog.some(log => log.startsWith('❌'));
    const hasWarnings = this.syncLog.some(log => log.startsWith('⚠️'));
    
    if (hasErrors) {
      recommendations.push('🚨 Critical: Fix all errors before deploying to production');
    }
    
    if (hasWarnings) {
      recommendations.push('⚠️ Review warnings and consider addressing them');
    }
    
    if (!hasErrors && !hasWarnings) {
      recommendations.push('✅ All systems synchronized - ready for deployment');
    }
    
    recommendations.push('🔄 Run this sync script before each release');
    recommendations.push('📝 Update both platforms simultaneously when adding new features');
    
    return recommendations;
  }

  /**
   * Format report as Markdown
   */
  formatReport(report) {
    return `# Platform Synchronization Report

**Generated:** ${report.timestamp}
**Version:** ${report.version}
**Platform:** ${report.platform}

## Summary

- **Total Checks:** ${report.summary.totalChecks}
- **Passed:** ${report.summary.passed}
- **Warnings:** ${report.summary.warnings}
- **Errors:** ${report.summary.errors}

## Sync Log

${report.syncLog.map(log => `- ${log}`).join('\n')}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Next Steps

1. Address any errors or warnings listed above
2. Test both web and macOS applications
3. Deploy updates to both platforms simultaneously
4. Monitor for any platform-specific issues

---
*Generated by Platform Synchronization Script v2.0.0*
`;
  }
}

// CLI interface - Always run when executed directly
const syncer = new PlatformSyncer();

syncer.sync()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Sync script error:', error);
    process.exit(1);
  });

export default PlatformSyncer;
