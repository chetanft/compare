/**
 * Service Container for Dependency Injection
 * Manages service lifecycle and dependencies without breaking existing functionality
 * Implements IoC (Inversion of Control) pattern
 */

import { logger } from '../../utils/logger.js';
import { healthChecker } from '../../core/health/HealthChecker.js';

export class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
    this.initializing = new Set();
    this.initialized = new Set();
    this.dependencies = new Map();
  }

  /**
   * Register a singleton service
   */
  registerSingleton(name, factory, dependencies = []) {
    this.services.set(name, {
      type: 'singleton',
      factory,
      dependencies,
      instance: null
    });

    this.dependencies.set(name, dependencies);
    logger.debug(`Registered singleton service: ${name}`, { dependencies });
    return this;
  }

  /**
   * Register a transient service (new instance each time)
   */
  registerTransient(name, factory, dependencies = []) {
    this.services.set(name, {
      type: 'transient',
      factory,
      dependencies,
      instance: null
    });

    this.dependencies.set(name, dependencies);
    logger.debug(`Registered transient service: ${name}`, { dependencies });
    return this;
  }

  /**
   * Register an existing instance
   */
  registerInstance(name, instance) {
    this.singletons.set(name, instance);
    this.initialized.add(name);
    logger.debug(`Registered instance: ${name}`);
    return this;
  }

  /**
   * Register a factory function
   */
  registerFactory(name, factory) {
    this.factories.set(name, factory);
    logger.debug(`Registered factory: ${name}`);
    return this;
  }

  /**
   * Resolve a service with dependency injection
   */
  async resolve(name) {
    // Check if it's an existing instance
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Check if it's a factory
    if (this.factories.has(name)) {
      return this.factories.get(name)();
    }

    // Check if service is registered
    if (!this.services.has(name)) {
      throw new Error(`Service '${name}' is not registered`);
    }

    const serviceConfig = this.services.get(name);

    // For singletons, return existing instance if available
    if (serviceConfig.type === 'singleton' && serviceConfig.instance) {
      return serviceConfig.instance;
    }

    // Prevent circular dependencies
    if (this.initializing.has(name)) {
      throw new Error(`Circular dependency detected for service '${name}'`);
    }

    try {
      this.initializing.add(name);

      // Resolve dependencies first
      const resolvedDependencies = [];
      for (const depName of serviceConfig.dependencies) {
        const dependency = await this.resolve(depName);
        resolvedDependencies.push(dependency);
      }

      // Create the service instance
      const instance = await serviceConfig.factory(...resolvedDependencies);

      // Store singleton instances
      if (serviceConfig.type === 'singleton') {
        serviceConfig.instance = instance;
        this.singletons.set(name, instance);
      }

      this.initialized.add(name);
      logger.debug(`Resolved service: ${name}`, { 
        type: serviceConfig.type,
        dependencies: serviceConfig.dependencies.length 
      });

      return instance;

    } finally {
      this.initializing.delete(name);
    }
  }

  /**
   * Initialize all services in dependency order
   */
  async initializeAll() {
    logger.info('🔧 Initializing service container...');
    
    const startTime = Date.now();
    const initOrder = this.getInitializationOrder();
    const results = {
      initialized: [],
      failed: [],
      skipped: []
    };

    for (const serviceName of initOrder) {
      try {
        if (!this.initialized.has(serviceName)) {
          await this.resolve(serviceName);
          results.initialized.push(serviceName);
        } else {
          results.skipped.push(serviceName);
        }
      } catch (error) {
        logger.error(`Failed to initialize service: ${serviceName}`, { error: error.message });
        results.failed.push({ service: serviceName, error: error.message });
        
        // For backward compatibility, don't fail completely - just log the error
        logger.warn(`Continuing without service: ${serviceName} (backward compatibility mode)`);
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`✅ Service container initialization completed`, {
      initialized: results.initialized.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      duration: `${duration}ms`
    });

    return results;
  }

  /**
   * Get initialization order based on dependencies (topological sort)
   */
  getInitializationOrder() {
    const visited = new Set();
    const visiting = new Set();
    const order = [];

    const visit = (serviceName) => {
      if (visited.has(serviceName)) return;
      if (visiting.has(serviceName)) {
        throw new Error(`Circular dependency detected involving: ${serviceName}`);
      }

      visiting.add(serviceName);

      // Visit dependencies first
      const deps = this.dependencies.get(serviceName) || [];
      for (const dep of deps) {
        if (this.dependencies.has(dep)) {
          visit(dep);
        }
      }

      visiting.delete(serviceName);
      visited.add(serviceName);
      order.push(serviceName);
    };

    // Visit all services
    for (const serviceName of this.services.keys()) {
      visit(serviceName);
    }

    return order;
  }

  /**
   * Check if a service is registered
   */
  has(name) {
    return this.services.has(name) || this.singletons.has(name) || this.factories.has(name);
  }

  /**
   * Get all registered service names
   */
  getRegisteredServices() {
    return {
      services: Array.from(this.services.keys()),
      singletons: Array.from(this.singletons.keys()),
      factories: Array.from(this.factories.keys())
    };
  }

  /**
   * Get service status
   */
  getServiceStatus() {
    const status = {};
    
    for (const [name, config] of this.services.entries()) {
      status[name] = {
        type: config.type,
        dependencies: config.dependencies,
        initialized: this.initialized.has(name),
        hasInstance: config.instance !== null
      };
    }

    for (const name of this.singletons.keys()) {
      if (!status[name]) {
        status[name] = {
          type: 'instance',
          dependencies: [],
          initialized: true,
          hasInstance: true
        };
      }
    }

    return status;
  }

  /**
   * Graceful shutdown of all services
   */
  async shutdown() {
    logger.info('🛑 Shutting down service container...');
    
    // Shutdown in reverse order
    const shutdownOrder = this.getInitializationOrder().reverse();
    
    for (const serviceName of shutdownOrder) {
      try {
        const service = this.singletons.get(serviceName);
        if (service && typeof service.shutdown === 'function') {
          await service.shutdown();
          logger.debug(`Shut down service: ${serviceName}`);
        }
      } catch (error) {
        logger.error(`Error shutting down service: ${serviceName}`, { error: error.message });
      }
    }

    // Clear all instances
    this.singletons.clear();
    this.initialized.clear();
    
    logger.info('✅ Service container shutdown completed');
  }

  /**
   * Register health checks for all services
   */
  registerHealthChecks() {
    for (const [serviceName, service] of this.singletons.entries()) {
      if (typeof service.healthCheck === 'function') {
        healthChecker.registerCheck(
          serviceName,
          () => service.healthCheck(),
          {
            critical: service.critical !== false,
            timeout: service.healthTimeout || 5000
          }
        );
      }
    }
  }
}

/**
 * Service factory functions for easy registration
 */
export class ServiceFactories {
  /**
   * Create a factory for browser pool
   */
  static browserPool() {
    return async () => {
      const { getBrowserPool } = await import('../../browser/BrowserPool.js');
      const pool = getBrowserPool();
      await pool.initialize();
      
      // Add health check method
      pool.healthCheck = async () => {
        const stats = pool.getStats();
        return {
          status: 'healthy',
          ...stats
        };
      };
      
      return pool;
    };
  }

  /**
   * Create a factory for MCP client
   */
  static mcpClient() {
    return async () => {
      const FigmaMCPClient = (await import('../../figma/mcpClient.js')).default;
      const client = new FigmaMCPClient();
      
      // Add health check method
      client.healthCheck = async () => {
        const connected = await client.connect();
        if (!connected) {
          throw new Error('MCP client not connected');
        }
        return { status: 'healthy', connected: true };
      };
      
      return client;
    };
  }

  /**
   * Create a factory for web extractor
   */
  static webExtractor(browserPool) {
    return async () => {
      const { default: UnifiedWebExtractor } = await import('../../web/UnifiedWebExtractor.js');
      const extractor = new UnifiedWebExtractor();
      
      // Initialize the extractor properly
      try {
        await extractor.initialize();
      } catch (initError) {
        console.warn('Web extractor initialization failed, will initialize on first use:', initError.message);
      }
      
      // Inject browser pool dependency
      if (browserPool) {
        extractor.browserPool = browserPool;
      }
      
      // Add health check method
      extractor.healthCheck = async () => {
        // Check if extractor is ready
        if (!extractor.isReady || !extractor.isReady()) {
          throw new Error('Web extractor browser not initialized');
        }
        return { status: 'healthy', ready: true };
      };
      
      return extractor;
    };
  }

  /**
   * Create a factory for comparison engine
   */
  static comparisonEngine() {
    return async () => {
      const ComparisonEngine = (await import('../../compare/comparisonEngine.js')).default;
      const engine = new ComparisonEngine();
      
      // Add health check method
      engine.healthCheck = async () => {
        return { status: 'healthy', ready: true };
      };
      
      return engine;
    };
  }

  /**
   * Create a factory for configuration
   */
  static config() {
    return async () => {
      const { loadConfig } = await import('../../config/index.js');
      const config = await loadConfig();
      
      // Add health check method
      config.healthCheck = async () => {
        const requiredFields = ['server.port', 'server.host'];
        for (const field of requiredFields) {
          const value = field.split('.').reduce((obj, key) => obj?.[key], config);
          if (!value) {
            throw new Error(`Missing required configuration: ${field}`);
          }
        }
        return { status: 'healthy', valid: true };
      };
      
      return config;
    };
  }

  /**
   * Create a factory for performance monitor
   */
  static performanceMonitor() {
    return async () => {
      const { performanceMonitor } = await import('../../monitoring/performanceMonitor.js');
      
      // Add health check method if not present
      if (!performanceMonitor.healthCheck) {
        performanceMonitor.healthCheck = async () => {
          const status = performanceMonitor.getSystemStatus();
          return { 
            status: 'healthy', 
            monitoring: performanceMonitor.isMonitoring,
            systemStatus: status 
          };
        };
      }
      
      return performanceMonitor;
    };
  }
}

// Export singleton instance
export const serviceContainer = new ServiceContainer();
