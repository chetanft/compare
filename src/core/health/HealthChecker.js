/**
 * Service Health Checker
 * Validates service dependencies and readiness during startup
 * Provides continuous health monitoring without breaking existing functionality
 */

import { logger } from '../../utils/logger.js';
import { performanceMonitor } from '../../monitoring/performanceMonitor.js';

export class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.healthStatus = {
      overall: 'unknown',
      services: {},
      lastCheck: null,
      startupTime: Date.now()
    };
    this.checkInterval = null;
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Register a health check for a service
   */
  registerCheck(serviceName, checkFunction, options = {}) {
    this.checks.set(serviceName, {
      check: checkFunction,
      critical: options.critical !== false, // Default to critical
      timeout: options.timeout || 5000,
      interval: options.interval || 30000,
      lastStatus: 'unknown',
      lastCheck: null,
      consecutiveFailures: 0,
      maxFailures: options.maxFailures || 3
    });

    logger.info(`Health check registered for ${serviceName}`, {
      critical: options.critical !== false,
      timeout: options.timeout || 5000
    });
  }

  /**
   * Perform startup health validation
   * Returns promise that resolves when all critical services are healthy
   */
  async validateStartup() {
    logger.info('🔍 Starting service health validation...');
    
    const startTime = Date.now();
    const results = {
      passed: [],
      failed: [],
      warnings: [],
      duration: 0
    };

    // Run all health checks in parallel with timeout
    const checkPromises = Array.from(this.checks.entries()).map(async ([serviceName, checkConfig]) => {
      try {
        const checkStart = Date.now();
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Health check timeout after ${checkConfig.timeout}ms`)), checkConfig.timeout);
        });

        // Run the actual health check
        const healthResult = await Promise.race([
          checkConfig.check(),
          timeoutPromise
        ]);

        const duration = Date.now() - checkStart;
        
        // Update service status
        this.healthStatus.services[serviceName] = {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          duration,
          details: healthResult
        };

        checkConfig.lastStatus = 'healthy';
        checkConfig.lastCheck = Date.now();
        checkConfig.consecutiveFailures = 0;

        results.passed.push({
          service: serviceName,
          duration,
          critical: checkConfig.critical,
          details: healthResult
        });

        logger.info(`✅ ${serviceName} health check passed`, { duration: `${duration}ms` });

      } catch (error) {
        const duration = Date.now() - checkStart;
        
        // Update service status
        this.healthStatus.services[serviceName] = {
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          duration,
          error: error.message
        };

        checkConfig.lastStatus = 'unhealthy';
        checkConfig.lastCheck = Date.now();
        checkConfig.consecutiveFailures++;

        const failure = {
          service: serviceName,
          error: error.message,
          duration,
          critical: checkConfig.critical
        };

        if (checkConfig.critical) {
          results.failed.push(failure);
          logger.error(`❌ Critical service ${serviceName} health check failed`, {
            error: error.message,
            duration: `${duration}ms`
          });
        } else {
          results.warnings.push(failure);
          logger.warn(`⚠️ Non-critical service ${serviceName} health check failed`, {
            error: error.message,
            duration: `${duration}ms`
          });
        }
      }
    });

    await Promise.allSettled(checkPromises);
    
    results.duration = Date.now() - startTime;
    this.healthStatus.lastCheck = new Date().toISOString();

    // Determine overall health status
    if (results.failed.length > 0) {
      this.healthStatus.overall = 'unhealthy';
      logger.error(`💥 Startup health validation failed`, {
        failed: results.failed.length,
        warnings: results.warnings.length,
        passed: results.passed.length,
        duration: `${results.duration}ms`
      });
      
      // For startup, we'll allow the server to continue but log the issues
      // This prevents breaking existing functionality while highlighting problems
      logger.warn('🚀 Server starting despite health check failures (backward compatibility mode)');
      
    } else {
      this.healthStatus.overall = results.warnings.length > 0 ? 'degraded' : 'healthy';
      logger.info(`✅ Startup health validation completed`, {
        status: this.healthStatus.overall,
        passed: results.passed.length,
        warnings: results.warnings.length,
        duration: `${results.duration}ms`
      });
    }

    return results;
  }

  /**
   * Start continuous health monitoring
   */
  startContinuousMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Run health checks every 30 seconds
    this.checkInterval = setInterval(async () => {
      try {
        await this.runHealthChecks();
      } catch (error) {
        logger.error('Error during continuous health monitoring', { error: error.message });
      }
    }, 30000);

    logger.info('🔄 Continuous health monitoring started');
  }

  /**
   * Run all health checks (for continuous monitoring)
   */
  async runHealthChecks() {
    const results = { healthy: 0, unhealthy: 0, degraded: 0 };

    for (const [serviceName, checkConfig] of this.checks.entries()) {
      try {
        const healthResult = await Promise.race([
          checkConfig.check(),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Health check timeout')), checkConfig.timeout);
          })
        ]);

        // Service is healthy
        this.healthStatus.services[serviceName] = {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          details: healthResult
        };

        checkConfig.lastStatus = 'healthy';
        checkConfig.consecutiveFailures = 0;
        results.healthy++;

      } catch (error) {
        checkConfig.consecutiveFailures++;
        
        // Determine if service is degraded or completely unhealthy
        const status = checkConfig.consecutiveFailures >= checkConfig.maxFailures ? 'unhealthy' : 'degraded';
        
        this.healthStatus.services[serviceName] = {
          status,
          lastCheck: new Date().toISOString(),
          error: error.message,
          consecutiveFailures: checkConfig.consecutiveFailures
        };

        checkConfig.lastStatus = status;
        
        if (status === 'unhealthy') {
          results.unhealthy++;
          if (checkConfig.critical) {
            logger.warn(`🚨 Critical service ${serviceName} is unhealthy`, {
              error: error.message,
              consecutiveFailures: checkConfig.consecutiveFailures
            });
          }
        } else {
          results.degraded++;
        }
      }
    }

    // Update overall status
    if (results.unhealthy > 0) {
      this.healthStatus.overall = 'unhealthy';
    } else if (results.degraded > 0) {
      this.healthStatus.overall = 'degraded';
    } else {
      this.healthStatus.overall = 'healthy';
    }

    this.healthStatus.lastCheck = new Date().toISOString();

    // Log status changes
    const totalServices = this.checks.size;
    logger.debug('Health check summary', {
      overall: this.healthStatus.overall,
      healthy: results.healthy,
      degraded: results.degraded,
      unhealthy: results.unhealthy,
      total: totalServices
    });
  }

  /**
   * Get current health status
   */
  getHealthStatus() {
    return {
      ...this.healthStatus,
      uptime: Date.now() - this.healthStatus.startupTime,
      checksRegistered: this.checks.size
    };
  }

  /**
   * Get health status for a specific service
   */
  getServiceHealth(serviceName) {
    return this.healthStatus.services[serviceName] || {
      status: 'unknown',
      error: 'Service not registered'
    };
  }

  /**
   * Stop health monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logger.info('🛑 Health monitoring stopped');
  }

  /**
   * Create a health check function for browser pool
   */
  static createBrowserPoolCheck(browserPool) {
    return async () => {
      const stats = browserPool.getStats();
      
      if (stats.totalBrowsers === 0) {
        // Try to create a test browser to verify functionality
        try {
          const { page, pageId } = await browserPool.createPage();
          await browserPool.closePage(pageId);
          return { status: 'healthy', message: 'Browser pool can create pages' };
        } catch (error) {
          throw new Error(`Browser pool cannot create pages: ${error.message}`);
        }
      }

      return {
        status: 'healthy',
        totalBrowsers: stats.totalBrowsers,
        connectedBrowsers: stats.connectedBrowsers,
        activePagesCount: stats.activePagesCount
      };
    };
  }

  /**
   * Create a health check function for MCP client
   */
  static createMCPCheck(mcpClient) {
    return async () => {
      const isConnected = await mcpClient.connect();
      
      if (!isConnected) {
        throw new Error('MCP client cannot establish connection');
      }

      return {
        status: 'healthy',
        connected: true,
        message: 'MCP client is connected and responsive'
      };
    };
  }

  /**
   * Create a health check for configuration
   */
  static createConfigCheck(config) {
    return async () => {
      // Validate essential configuration
      const requiredFields = [
        'server.port',
        'server.host',
        'puppeteer.executablePath'
      ];

      for (const field of requiredFields) {
        const value = field.split('.').reduce((obj, key) => obj?.[key], config);
        if (!value) {
          throw new Error(`Missing required configuration: ${field}`);
        }
      }

      return {
        status: 'healthy',
        message: 'Configuration is valid',
        serverPort: config.server.port,
        serverHost: config.server.host
      };
    };
  }

  /**
   * Create a health check for memory usage
   */
  static createMemoryCheck(thresholdMB = 500) {
    return async () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

      if (heapUsedMB > thresholdMB) {
        throw new Error(`Memory usage too high: ${heapUsedMB}MB (threshold: ${thresholdMB}MB)`);
      }

      return {
        status: 'healthy',
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`,
        threshold: `${thresholdMB}MB`
      };
    };
  }
}

// Export singleton instance
export const healthChecker = new HealthChecker();
