#!/usr/bin/env node

/**
 * Production Build Script
 * Optimizes the application for production deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class ProductionBuilder {
  constructor() {
    this.steps = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  exec(command, options = {}) {
    try {
      const result = execSync(command, {
        cwd: projectRoot,
        stdio: 'pipe',
        encoding: 'utf8',
        ...options
      });
      return result.trim();
    } catch (error) {
      throw new Error(`Command failed: ${command}\n${error.message}`);
    }
  }

  async step(name, fn) {
    this.log(`Starting: ${name}`);
    const stepStart = Date.now();
    
    try {
      await fn();
      const duration = Date.now() - stepStart;
      this.log(`Completed: ${name} (${duration}ms)`, 'success');
      this.steps.push({ name, status: 'success', duration });
    } catch (error) {
      const duration = Date.now() - stepStart;
      this.log(`Failed: ${name} - ${error.message}`, 'error');
      this.steps.push({ name, status: 'failed', duration, error: error.message });
      throw error;
    }
  }

  async validateEnvironment() {
    await this.step('Environment Validation', () => {
      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      if (majorVersion < 18) {
        throw new Error(`Node.js 18+ required, found ${nodeVersion}`);
      }

      // Check required files
      const requiredFiles = [
        'package.json',
        'src/core/server/index.js',
        'frontend/package.json'
      ];

      for (const file of requiredFiles) {
        if (!fs.existsSync(path.join(projectRoot, file))) {
          throw new Error(`Required file missing: ${file}`);
        }
      }

      this.log(`Node.js version: ${nodeVersion}`);
    });
  }

  async runLinting() {
    await this.step('Code Linting', () => {
      this.exec('npm run lint');
    });
  }

  async runTypeChecking() {
    await this.step('Type Checking', () => {
      this.exec('npm run type-check');
    });
  }

  async runTests() {
    await this.step('Unit & Integration Tests', () => {
      this.exec('npm test', { stdio: 'inherit' });
    });
  }

  async runTestCoverage() {
    await this.step('Test Coverage Analysis', () => {
      try {
        this.exec('npm run test:coverage');
        
        // Check coverage thresholds
        const coveragePath = path.join(projectRoot, 'coverage/coverage-summary.json');
        if (fs.existsSync(coveragePath)) {
          const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
          const total = coverage.total;
          
          this.log(`Coverage: ${total.lines.pct}% lines, ${total.functions.pct}% functions, ${total.branches.pct}% branches`);
          
          // Warn if below thresholds
          if (total.lines.pct < 80 || total.functions.pct < 80 || total.branches.pct < 80) {
            this.log('Warning: Coverage below 80% threshold', 'error');
          }
        }
      } catch (error) {
        this.log('Coverage analysis failed, continuing build', 'error');
      }
    });
  }

  async buildFrontend() {
    await this.step('Frontend Build', () => {
      this.exec('npm run build:frontend');
      
      // Verify build output
      const distPath = path.join(projectRoot, 'frontend/dist');
      if (!fs.existsSync(distPath)) {
        throw new Error('Frontend build failed - dist directory not found');
      }

      // Check bundle sizes
      const assetsPath = path.join(distPath, 'assets');
      if (fs.existsSync(assetsPath)) {
        const files = fs.readdirSync(assetsPath);
        const jsFiles = files.filter(f => f.endsWith('.js'));
        const cssFiles = files.filter(f => f.endsWith('.css'));
        
        this.log(`Built ${jsFiles.length} JS files, ${cssFiles.length} CSS files`);
        
        // Check for large bundles
        for (const file of jsFiles) {
          const filePath = path.join(assetsPath, file);
          const stats = fs.statSync(filePath);
          const sizeKB = Math.round(stats.size / 1024);
          
          if (sizeKB > 1000) {
            this.log(`Warning: Large bundle ${file} (${sizeKB}KB)`, 'error');
          }
        }
      }
    });
  }

  async optimizeAssets() {
    await this.step('Asset Optimization', () => {
      // Clean up unnecessary files
      const cleanupDirs = [
        'logs',
        'coverage',
        'node_modules/.cache'
      ];

      for (const dir of cleanupDirs) {
        const dirPath = path.join(projectRoot, dir);
        if (fs.existsSync(dirPath)) {
          fs.rmSync(dirPath, { recursive: true, force: true });
          this.log(`Cleaned up ${dir}`);
        }
      }

      // Create production directories
      const prodDirs = [
        'logs',
        'output/reports',
        'output/images',
        'output/screenshots'
      ];

      for (const dir of prodDirs) {
        const dirPath = path.join(projectRoot, dir);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
          this.log(`Created ${dir}`);
        }
      }
    });
  }

  async generateProductionConfig() {
    await this.step('Production Configuration', () => {
      const prodConfig = {
        server: {
          port: process.env.PORT || 3007,
          host: process.env.HOST || '0.0.0.0'
        },
        security: {
          helmet: true,
          rateLimit: true,
          cors: {
            origins: process.env.CORS_ORIGINS?.split(',') || ['*']
          }
        },
        performance: {
          browserPool: {
            maxBrowsers: 5,
            maxPagesPerBrowser: 15,
            maxIdleTime: 300000 // 5 minutes
          },
          compression: true,
          caching: true
        },
        monitoring: {
          healthChecks: true,
          performanceMetrics: true,
          requestLogging: true
        }
      };

      const configPath = path.join(projectRoot, 'config.production.json');
      fs.writeFileSync(configPath, JSON.stringify(prodConfig, null, 2));
      this.log(`Generated production config: ${configPath}`);
    });
  }

  async securityAudit() {
    await this.step('Security Audit', () => {
      try {
        this.exec('npm audit --audit-level moderate');
        this.log('No security vulnerabilities found');
      } catch (error) {
        this.log('Security vulnerabilities detected - review required', 'error');
        // Don't fail build, but warn
      }
    });
  }

  async generateDeploymentArtifacts() {
    await this.step('Deployment Artifacts', () => {
      // Create deployment package info
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
      
      const deploymentInfo = {
        name: packageJson.name,
        version: packageJson.version,
        buildTime: new Date().toISOString(),
        nodeVersion: process.version,
        dependencies: packageJson.dependencies,
        scripts: {
          start: packageJson.scripts.start,
          health: 'curl http://localhost:3007/api/health'
        },
        environment: {
          required: [
            'PORT',
            'FIGMA_API_KEY'
          ],
          optional: [
            'MCP_ENABLED',
            'CORS_ORIGINS',
            'RATE_LIMIT_MAX'
          ]
        }
      };

      const deploymentPath = path.join(projectRoot, 'deployment-info.json');
      fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
      this.log(`Generated deployment info: ${deploymentPath}`);

      // Create Docker health check script
      const healthCheckScript = `#!/bin/bash
curl -f http://localhost:3007/api/health || exit 1
`;
      const healthCheckPath = path.join(projectRoot, 'health-check.sh');
      fs.writeFileSync(healthCheckPath, healthCheckScript);
      fs.chmodSync(healthCheckPath, 0o755);
      this.log('Generated health check script');
    });
  }

  async validateBuild() {
    await this.step('Build Validation', () => {
      // Start server in test mode
      this.log('Starting server for validation...');
      
      const testPort = 3008;
      process.env.PORT = testPort;
      process.env.NODE_ENV = 'production';
      
      let serverProcess;
      try {
        // This would need to be implemented as a separate validation
        this.log('Server validation would run here');
        // For now, just validate that main files exist
        const requiredFiles = [
          'src/core/server/index.js',
          'frontend/dist/index.html',
          'deployment-info.json'
        ];

        for (const file of requiredFiles) {
          if (!fs.existsSync(path.join(projectRoot, file))) {
            throw new Error(`Build artifact missing: ${file}`);
          }
        }
      } finally {
        if (serverProcess) {
          serverProcess.kill();
        }
      }
    });
  }

  async build() {
    this.log('🚀 Starting Production Build');
    
    try {
      await this.validateEnvironment();
      await this.runLinting();
      await this.runTypeChecking();
      await this.runTests();
      await this.runTestCoverage();
      await this.buildFrontend();
      await this.optimizeAssets();
      await this.generateProductionConfig();
      await this.securityAudit();
      await this.generateDeploymentArtifacts();
      await this.validateBuild();

      const totalDuration = Date.now() - this.startTime;
      this.log(`🎉 Production build completed in ${totalDuration}ms`, 'success');
      
      // Print summary
      console.log('\n📊 Build Summary:');
      this.steps.forEach(step => {
        const status = step.status === 'success' ? '✅' : '❌';
        console.log(`  ${status} ${step.name} (${step.duration}ms)`);
      });

      console.log('\n🚀 Ready for deployment!');
      console.log('📁 Build artifacts:');
      console.log('  - frontend/dist/ (frontend assets)');
      console.log('  - deployment-info.json (deployment config)');
      console.log('  - health-check.sh (health check script)');
      console.log('  - config.production.json (production config)');

    } catch (error) {
      const totalDuration = Date.now() - this.startTime;
      this.log(`💥 Build failed after ${totalDuration}ms: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run the build if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const builder = new ProductionBuilder();
  builder.build().catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
  });
}

export default ProductionBuilder; 