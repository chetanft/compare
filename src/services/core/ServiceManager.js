/**
 * Enhanced Service Manager
 * Orchestrates service initialization, health monitoring, and graceful shutdown
 * Maintains backward compatibility while adding production-ready features
 */

import { logger } from '../../utils/logger.js';
import { serviceContainer, ServiceFactories } from './ServiceContainer.js';
import { healthChecker, HealthChecker } from '../../core/health/HealthChecker.js';
import { circuitBreakerRegistry } from '../../core/resilience/CircuitBreaker.js';
import { performanceMonitor } from '../../monitoring/performanceMonitor.js';

export class ServiceManager {
  constructor() {
    this.initialized = false;
    this.shutdownInProgress = false;
    this.services = new Map();
    this.startupTime = null;
    this.shutdownCallbacks = [];
  }

  /**
   * Initialize all services with proper dependency order and health checks
   * This method enhances the existing startup process without breaking it
   */
  async initializeServices(config) {
    if (this.initialized) {
      logger.warn('Services already initialized, skipping...');
      return;
    }

    logger.info('🚀 Enhanced service initialization starting...');
    this.startupTime = Date.now();

    try {
      // Phase 1: Register core services with the container
      await this.registerCoreServices(config);

      // Phase 2: Register health checks
      this.registerHealthChecks();

      // Phase 3: Initialize service container
      const containerResults = await serviceContainer.initializeAll();

      // Phase 4: Register circuit breakers for external services
      this.registerCircuitBreakers();

      // Phase 5: Validate startup health
      const healthResults = await healthChecker.validateStartup();

      // Phase 6: Start continuous monitoring
      this.startMonitoring();

      // Phase 7: Register services in the local map for backward compatibility
      await this.registerLegacyServices();

      this.initialized = true;
      const duration = Date.now() - this.startupTime;

      logger.info('✅ Enhanced service initialization completed', {
        duration: `${duration}ms`,
        servicesInitialized: containerResults.initialized.length,
        servicesFailed: containerResults.failed.length,
        healthStatus: healthResults.failed.length === 0 ? 'healthy' : 'degraded'
      });

      return {
        success: true,
        duration,
        container: containerResults,
        health: healthResults
      };

    } catch (error) {
      logger.error('❌ Service initialization failed', { error: error.message });
      
      // For backward compatibility, don't fail completely
      logger.warn('🔄 Falling back to legacy initialization mode...');
      await this.initializeLegacyMode(config);
      
      return {
        success: false,
        error: error.message,
        fallback: true
      };
    }
  }

  /**
   * Register core services in the dependency injection container
   */
  async registerCoreServices(config) {
    logger.debug('Registering core services...');

    // Register configuration first (no dependencies)
    serviceContainer.registerInstance('config', config);

    // Register services with their dependencies
    serviceContainer
      .registerSingleton('performanceMonitor', ServiceFactories.performanceMonitor(), [])
      .registerSingleton('browserPool', ServiceFactories.browserPool(), [])
      .registerSingleton('mcpClient', ServiceFactories.mcpClient(), [])
      .registerSingleton('webExtractor', ServiceFactories.webExtractor(), ['browserPool'])
      .registerSingleton('comparisonEngine', ServiceFactories.comparisonEngine(), []);

    logger.debug('Core services registered successfully');
  }

  /**
   * Register health checks for all services
   */
  registerHealthChecks() {
    logger.debug('Registering health checks...');

    // Configuration health check
    healthChecker.registerCheck(
      'config',
      HealthChecker.createConfigCheck(serviceContainer.singletons.get('config')),
      { critical: true, timeout: 1000 }
    );

    // Memory health check
    healthChecker.registerCheck(
      'memory',
      HealthChecker.createMemoryCheck(500), // 500MB threshold
      { critical: false, timeout: 1000 }
    );

    // Register health checks from service container
    serviceContainer.registerHealthChecks();

    logger.debug('Health checks registered successfully');
  }

  /**
   * Register circuit breakers for external services
   */
  registerCircuitBreakers() {
    logger.debug('Registering circuit breakers...');

    // Circuit breaker for Figma API calls
    const figmaBreaker = circuitBreakerRegistry.getOrCreate('figma-api', {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000,
      resetTimeout: 60000
    });

    // Circuit breaker for web extraction
    const webBreaker = circuitBreakerRegistry.getOrCreate('web-extraction', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 45000,
      resetTimeout: 30000
    });

    // Circuit breaker for MCP calls
    const mcpBreaker = circuitBreakerRegistry.getOrCreate('mcp-client', {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 15000,
      resetTimeout: 30000
    });

    logger.debug('Circuit breakers registered successfully');
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    logger.debug('Starting monitoring systems...');

    // Start health monitoring
    healthChecker.startContinuousMonitoring();

    // Start performance monitoring (if not already started)
    if (!performanceMonitor.isMonitoring) {
      performanceMonitor.startMonitoring();
    }

    logger.debug('Monitoring systems started');
  }

  /**
   * Register services in legacy format for backward compatibility
   */
  async registerLegacyServices() {
    try {
      console.log('[DEBUG] registerLegacyServices starting...');
      // Get services from container and register them in the legacy format
      console.log('[DEBUG] Resolving config...');
      this.services.set('config', await serviceContainer.resolve('config'));
      console.log('[DEBUG] Resolving browserPool...');
      this.services.set('browserPool', await serviceContainer.resolve('browserPool'));
      console.log('[DEBUG] Resolving mcpClient...');
      this.services.set('mcpClient', await serviceContainer.resolve('mcpClient'));
      console.log('[DEBUG] Resolving webExtractor...');
      this.services.set('webExtractor', await serviceContainer.resolve('webExtractor'));
      console.log('[DEBUG] Resolving comparisonEngine...');
      this.services.set('comparisonEngine', await serviceContainer.resolve('comparisonEngine'));
      console.log('[DEBUG] Resolving performanceMonitor...');
      this.services.set('performanceMonitor', await serviceContainer.resolve('performanceMonitor'));

      logger.debug('Legacy service registration completed');
      console.log('[DEBUG] About to return from registerLegacyServices');
    } catch (error) {
      logger.error('Failed to register legacy services', { error: error.message });
      console.log('[DEBUG] Error in registerLegacyServices:', error.message);
    }
    console.log('[DEBUG] Exiting registerLegacyServices');
  }

  /**
   * Fallback to legacy initialization mode
   */
  async initializeLegacyMode(config) {
    logger.warn('Initializing in legacy mode (backward compatibility)...');

    try {
      // Import and initialize services the old way
      const { getBrowserPool } = await import('../../browser/BrowserPool.js');
      const { default: FigmaMCPClient } = await import('../../figma/mcpClient.js');
      const { default: UnifiedWebExtractor } = await import('../../web/UnifiedWebExtractor.js');
      const ComparisonEngine = (await import('../../compare/comparisonEngine.js')).default;

      // Initialize services
      const browserPool = getBrowserPool();
      await browserPool.initialize();

      const mcpClient = new FigmaMCPClient();
      const webExtractor = new UnifiedWebExtractor();
      const comparisonEngine = new ComparisonEngine();

      // Store in legacy format
      this.services.set('config', config);
      this.services.set('browserPool', browserPool);
      this.services.set('mcpClient', mcpClient);
      this.services.set('webExtractor', webExtractor);
      this.services.set('comparisonEngine', comparisonEngine);
      this.services.set('performanceMonitor', performanceMonitor);

      this.initialized = true;
      logger.info('✅ Legacy mode initialization completed');

    } catch (error) {
      logger.error('❌ Legacy mode initialization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get a service (backward compatible method)
   */
  getService(name) {
    // Try new container first
    if (serviceContainer.has(name)) {
      return serviceContainer.singletons.get(name);
    }

    // Fall back to legacy services
    return this.services.get(name);
  }

  /**
   * Get all services status
   */
  getServicesStatus() {
    const containerStatus = serviceContainer.getServiceStatus();
    const healthStatus = healthChecker.getHealthStatus();
    const circuitBreakerStatus = circuitBreakerRegistry.getHealthStatus();

    return {
      container: containerStatus,
      health: healthStatus,
      circuitBreakers: circuitBreakerStatus,
      uptime: this.startupTime ? Date.now() - this.startupTime : 0,
      initialized: this.initialized
    };
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async executeWithCircuitBreaker(serviceName, operation, fallback = null) {
    const breaker = circuitBreakerRegistry.getOrCreate(serviceName);
    return breaker.execute(operation, fallback);
  }

  /**
   * Add a shutdown callback
   */
  onShutdown(callback) {
    this.shutdownCallbacks.push(callback);
  }

  /**
   * Graceful shutdown of all services
   */
  async shutdown() {
    if (this.shutdownInProgress) {
      logger.warn('Shutdown already in progress...');
      return;
    }

    this.shutdownInProgress = true;
    logger.info('🛑 Starting graceful service shutdown...');

    try {
      // Execute custom shutdown callbacks first
      for (const callback of this.shutdownCallbacks) {
        try {
          await callback();
        } catch (error) {
          logger.error('Error in shutdown callback', { error: error.message });
        }
      }

      // Stop monitoring
      healthChecker.stop();
      
      // Shutdown service container
      await serviceContainer.shutdown();

      // Shutdown legacy services
      for (const [name, service] of this.services.entries()) {
        try {
          if (service && typeof service.shutdown === 'function') {
            await service.shutdown();
            logger.debug(`Shut down service: ${name}`);
          }
        } catch (error) {
          logger.error(`Error shutting down service: ${name}`, { error: error.message });
        }
      }

      // Clear services
      this.services.clear();
      this.initialized = false;

      logger.info('✅ Graceful shutdown completed');

    } catch (error) {
      logger.error('❌ Error during shutdown', { error: error.message });
    } finally {
      this.shutdownInProgress = false;
    }
  }

  /**
   * Get service manager statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      uptime: this.startupTime ? Date.now() - this.startupTime : 0,
      servicesCount: this.services.size,
      containerServices: serviceContainer.getRegisteredServices(),
      health: healthChecker.getHealthStatus(),
      circuitBreakers: circuitBreakerRegistry.getAllStats()
    };
  }
}

// Export singleton instance
export const serviceManager = new ServiceManager();
