/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping calls to failing services
 * Implements Netflix Hystrix-like behavior
 */

import { logger } from '../../utils/logger.js';
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
    
    logger.info(`Circuit breaker created: ${name}`, {
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
    this.stats.lastExecutionTime = new Date().toISOString();

    // Check if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        // Circuit is still open, reject immediately
        this.stats.rejectedRequests++;
        const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
        error.circuitBreakerOpen = true;
        
        this.emit('rejected', { name: this.name, error });
        
        // Execute fallback if provided
        if (fallback && typeof fallback === 'function') {
          try {
            return await fallback();
          } catch (fallbackError) {
            logger.warn(`Fallback failed for ${this.name}`, { error: fallbackError.message });
            throw error; // Throw original circuit breaker error
          }
        }
        
        throw error;
      } else {
        // Time to try again, move to half-open
        this.moveToHalfOpen();
      }
    }

    try {
      // Execute the operation with timeout
      const result = await this.executeWithTimeout(operation);
      
      // Record successful execution
      const executionTime = Date.now() - startTime;
      this.recordSuccess(executionTime);
      
      return result;
      
    } catch (error) {
      // Record failed execution
      const executionTime = Date.now() - startTime;
      this.recordFailure(error, executionTime);
      
      // Execute fallback if provided
      if (fallback && typeof fallback === 'function') {
        try {
          logger.warn(`Primary operation failed for ${this.name}, trying fallback`, { 
            error: error.message 
          });
          return await fallback();
        } catch (fallbackError) {
          logger.error(`Both primary and fallback failed for ${this.name}`, {
            primaryError: error.message,
            fallbackError: fallbackError.message
          });
        }
      }
      
      throw error;
    }
  }

  /**
   * Execute operation with timeout
   */
  async executeWithTimeout(operation) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timeout after ${this.timeout}ms`));
      }, this.timeout);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  /**
   * Record successful execution
   */
  recordSuccess(executionTime) {
    this.stats.successfulRequests++;
    this.updateAverageResponseTime(executionTime);
    this.addToHistory(true, executionTime);

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.successThreshold) {
        this.moveToClosed();
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }

    this.emit('success', { 
      name: this.name, 
      executionTime, 
      state: this.state 
    });
  }

  /**
   * Record failed execution
   */
  recordFailure(error, executionTime) {
    this.stats.failedRequests++;
    this.updateAverageResponseTime(executionTime);
    this.addToHistory(false, executionTime, error.message);
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.CLOSED || this.state === CircuitBreakerState.HALF_OPEN) {
      this.failureCount++;
      
      if (this.failureCount >= this.failureThreshold) {
        this.moveToOpen();
      }
    }

    this.emit('failure', { 
      name: this.name, 
      error: error.message, 
      executionTime, 
      state: this.state,
      failureCount: this.failureCount 
    });
  }

  /**
   * Move circuit breaker to OPEN state
   */
  moveToOpen() {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttempt = Date.now() + this.resetTimeout;
    
    logger.warn(`Circuit breaker OPENED for ${this.name}`, {
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      nextAttempt: new Date(this.nextAttempt).toISOString()
    });

    this.emit('stateChange', { 
      name: this.name, 
      oldState: 'CLOSED', 
      newState: 'OPEN',
      failureCount: this.failureCount
    });
  }

  /**
   * Move circuit breaker to HALF_OPEN state
   */
  moveToHalfOpen() {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.successCount = 0;
    
    logger.info(`Circuit breaker moved to HALF_OPEN for ${this.name}`);

    this.emit('stateChange', { 
      name: this.name, 
      oldState: 'OPEN', 
      newState: 'HALF_OPEN' 
    });
  }

  /**
   * Move circuit breaker to CLOSED state
   */
  moveToClosed() {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    
    logger.info(`Circuit breaker CLOSED for ${this.name} - service recovered`);

    this.emit('stateChange', { 
      name: this.name, 
      oldState: 'HALF_OPEN', 
      newState: 'CLOSED' 
    });
  }

  /**
   * Update average response time
   */
  updateAverageResponseTime(executionTime) {
    const totalRequests = this.stats.successfulRequests + this.stats.failedRequests;
    this.stats.averageResponseTime = 
      ((this.stats.averageResponseTime * (totalRequests - 1)) + executionTime) / totalRequests;
  }

  /**
   * Add execution to history
   */
  addToHistory(success, executionTime, error = null) {
    this.executionHistory.push({
      timestamp: Date.now(),
      success,
      executionTime,
      error
    });

    // Keep history size manageable
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    const recentHistory = this.getRecentHistory();
    const recentFailureRate = recentHistory.length > 0 
      ? (recentHistory.filter(h => !h.success).length / recentHistory.length) * 100 
      : 0;

    return {
      name: this.name,
      state: this.state,
      ...this.stats,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureThreshold: this.failureThreshold,
      successThreshold: this.successThreshold,
      recentFailureRate: Math.round(recentFailureRate * 100) / 100,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      nextAttempt: this.state === CircuitBreakerState.OPEN 
        ? new Date(this.nextAttempt).toISOString() 
        : null
    };
  }

  /**
   * Get recent execution history
   */
  getRecentHistory(periodMs = this.monitoringPeriod) {
    const cutoff = Date.now() - periodMs;
    return this.executionHistory.filter(h => h.timestamp >= cutoff);
  }

  /**
   * Reset circuit breaker statistics
   */
  reset() {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = 0;
    this.executionHistory = [];
    
    // Reset stats but keep total counters
    this.stats.averageResponseTime = 0;
    
    logger.info(`Circuit breaker reset: ${this.name}`);
    
    this.emit('reset', { name: this.name });
  }

  /**
   * Force circuit breaker to open (for testing or manual intervention)
   */
  forceOpen() {
    const oldState = this.state;
    this.moveToOpen();
    
    this.emit('forceOpen', { 
      name: this.name, 
      oldState, 
      newState: this.state 
    });
  }

  /**
   * Force circuit breaker to close (for testing or manual intervention)
   */
  forceClose() {
    const oldState = this.state;
    this.moveToClosed();
    
    this.emit('forceClose', { 
      name: this.name, 
      oldState, 
      newState: this.state 
    });
  }
}

/**
 * Circuit Breaker Registry
 * Manages multiple circuit breakers
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
        logger.info(`Circuit breaker state change: ${name}`, event);
      });
      
      breaker.on('failure', (event) => {
        if (event.failureCount >= breaker.failureThreshold - 1) {
          logger.warn(`Circuit breaker approaching threshold: ${name}`, event);
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
    logger.info('All circuit breakers reset');
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
      healthy: open === 0
    };
  }
}

// Export singleton registry
export const circuitBreakerRegistry = new CircuitBreakerRegistry();
