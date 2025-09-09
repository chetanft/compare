/**
 * Circuit Breaker Pattern Implementation for macOS
 * Port of web app circuit breaker with macOS-specific optimizations
 * Prevents cascading failures by stopping calls to failing services
 */

import { EventEmitter } from 'events';

/**
 * Circuit Breaker States
 */
export const CircuitBreakerState = {
  CLOSED: 'CLOSED',     // Normal operation
  OPEN: 'OPEN',         // Circuit is open, failing fast
  HALF_OPEN: 'HALF_OPEN' // Testing if service has recovered
};

/**
 * Circuit Breaker Implementation
 */
export class CircuitBreaker extends EventEmitter {
  constructor(name, options = {}) {
    super();
    
    this.name = name;
    this.state = CircuitBreakerState.CLOSED;
    
    // Configuration
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 3;
    this.timeout = options.timeout || 60000; // 1 minute
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    this.monitoringPeriod = options.monitoringPeriod || 60000; // 1 minute
    
    // State tracking
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = 0;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      averageResponseTime: 0,
      lastExecutionTime: null
    };
    
    // Sliding window for monitoring
    this.executionHistory = [];
    this.maxHistorySize = 100;
    
    console.log(`Circuit breaker created: ${name}`, {
      failureThreshold: this.failureThreshold,
      successThreshold: this.successThreshold,
      timeout: this.timeout
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(operation, fallback = null) {
    const startTime = Date.now();
    this.stats.totalRequests++;

    // Check circuit state
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        // Circuit is open and not ready for retry
        this.stats.rejectedRequests++;
        const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
        error.circuitBreakerState = this.state;
        
        if (fallback) {
          console.log(`🔄 Using fallback for ${this.name}`);
          return await fallback();
        }
        
        throw error;
      } else {
        // Time to try half-open
        this.state = CircuitBreakerState.HALF_OPEN;
        this.emit('stateChange', {
          name: this.name,
          previousState: CircuitBreakerState.OPEN,
          newState: this.state,
          timestamp: new Date().toISOString()
        });
      }
    }

    try {
      const result = await operation();
      
      // Success
      const responseTime = Date.now() - startTime;
      this.onSuccess(responseTime);
      
      return result;
    } catch (error) {
      // Failure
      const responseTime = Date.now() - startTime;
      this.onFailure(error, responseTime);
      
      if (fallback) {
        console.log(`🔄 Using fallback for ${this.name} after failure`);
        return await fallback();
      }
      
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess(responseTime) {
    this.stats.successfulRequests++;
    this.stats.lastExecutionTime = responseTime;
    this.updateAverageResponseTime(responseTime);
    
    this.addToHistory({
      success: true,
      responseTime,
      timestamp: Date.now()
    });

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.successThreshold) {
        // Reset circuit breaker
        this.reset();
      }
    } else {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  onFailure(error, responseTime) {
    this.stats.failedRequests++;
    this.stats.lastExecutionTime = responseTime;
    this.updateAverageResponseTime(responseTime);
    
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    this.addToHistory({
      success: false,
      error: error.message,
      responseTime,
      timestamp: Date.now()
    });

    this.emit('failure', {
      name: this.name,
      error: error.message,
      failureCount: this.failureCount,
      threshold: this.failureThreshold,
      timestamp: new Date().toISOString()
    });

    if (this.failureCount >= this.failureThreshold) {
      this.trip();
    }
  }

  /**
   * Trip the circuit breaker (open it)
   */
  trip() {
    const previousState = this.state;
    this.state = CircuitBreakerState.OPEN;
    this.nextAttempt = Date.now() + this.resetTimeout;
    this.successCount = 0;

    console.log(`⚡ Circuit breaker tripped: ${this.name}`);

    this.emit('stateChange', {
      name: this.name,
      previousState,
      newState: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.nextAttempt,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Reset the circuit breaker
   */
  reset() {
    const previousState = this.state;
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = 0;

    console.log(`🔄 Circuit breaker reset: ${this.name}`);

    this.emit('stateChange', {
      name: this.name,
      previousState,
      newState: this.state,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Force close the circuit breaker
   */
  forceClose() {
    const previousState = this.state;
    this.reset();
    
    console.log(`🔧 Circuit breaker force closed: ${this.name}`);

    this.emit('stateChange', {
      name: this.name,
      previousState,
      newState: this.state,
      forced: true,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Add execution to history
   */
  addToHistory(execution) {
    this.executionHistory.push(execution);
    
    // Keep only recent history
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.shift();
    }
  }

  /**
   * Update average response time
   */
  updateAverageResponseTime(responseTime) {
    if (this.stats.averageResponseTime === 0) {
      this.stats.averageResponseTime = responseTime;
    } else {
      // Weighted average
      this.stats.averageResponseTime = 
        (this.stats.averageResponseTime * 0.8) + (responseTime * 0.2);
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    const now = Date.now();
    const recentHistory = this.executionHistory.filter(
      exec => now - exec.timestamp < this.monitoringPeriod
    );
    
    const recentSuccesses = recentHistory.filter(exec => exec.success).length;
    const recentFailures = recentHistory.filter(exec => !exec.success).length;
    
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureThreshold: this.failureThreshold,
      successThreshold: this.successThreshold,
      nextAttempt: this.nextAttempt,
      lastFailureTime: this.lastFailureTime,
      stats: { ...this.stats },
      recentActivity: {
        successes: recentSuccesses,
        failures: recentFailures,
        total: recentHistory.length,
        successRate: recentHistory.length > 0 ? 
          (recentSuccesses / recentHistory.length) * 100 : 0
      },
      isHealthy: this.state === CircuitBreakerState.CLOSED && 
                this.failureCount < this.failureThreshold / 2
    };
  }
}

/**
 * Circuit Breaker Registry for macOS
 */
export class CircuitBreakerRegistry {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Create or get a circuit breaker
   */
  getOrCreate(name, options = {}) {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(name, options);
      this.breakers.set(name, breaker);
      
      // Forward events
      breaker.on('stateChange', (event) => {
        console.log(`Circuit breaker state change: ${name}`, event);
      });
      
      breaker.on('failure', (event) => {
        if (event.failureCount >= breaker.failureThreshold - 1) {
          console.warn(`Circuit breaker approaching threshold: ${name}`, event);
        }
      });
    }

    return this.breakers.get(name);
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats() {
    const stats = {};
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Get circuit breakers by state
   */
  getBreakersByState(state) {
    const result = [];
    for (const [name, breaker] of this.breakers.entries()) {
      if (breaker.state === state) {
        result.push({ name, breaker });
      }
    }
    return result;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    console.log('All circuit breakers reset');
  }

  /**
   * Get registry health status
   */
  getHealthStatus() {
    const stats = this.getAllStats();
    const total = Object.keys(stats).length;
    const open = Object.values(stats).filter(s => s.state === CircuitBreakerState.OPEN).length;
    const halfOpen = Object.values(stats).filter(s => s.state === CircuitBreakerState.HALF_OPEN).length;
    const closed = Object.values(stats).filter(s => s.state === CircuitBreakerState.CLOSED).length;

    return {
      total,
      open,
      halfOpen,
      closed,
      healthy: open === 0,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton registry
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

export default CircuitBreaker;
