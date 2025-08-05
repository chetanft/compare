/**
 * Real-time Performance Monitoring
 * Tracks performance metrics and provides insights
 * Following devops-automator agent methodology
 */

import { logger } from '../utils/logger.js';
import { EventEmitter } from 'events';

export class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      comparisons: [],
      extractions: [],
      systemHealth: {
        memoryUsage: [],
        cpuUsage: [],
        responseTime: []
      }
    };
    
    this.thresholds = {
      slowComparison: 10000,    // 10 seconds
      slowExtraction: 8000,     // 8 seconds
      highMemoryUsage: 500,     // 500MB
      slowResponseTime: 2000    // 2 seconds
    };

    this.startTime = Date.now();
    this.isMonitoring = false;
    
    // Store maximum metrics to avoid memory leaks
    this.maxMetricsLength = 100;
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    logger.info('Performance monitoring started');
    
    // Monitor system health every 30 seconds
    this.healthInterval = setInterval(() => {
      this.captureSystemHealth();
    }, 30000);
    
    // Clean up old metrics every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupMetrics();
    }, 300000);
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    logger.info('Performance monitoring stopped');
    
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Track comparison performance
   */
  trackComparison(duration, metadata = {}) {
    const metric = {
      timestamp: Date.now(),
      duration,
      ...metadata,
      isSlow: duration > this.thresholds.slowComparison
    };

    this.metrics.comparisons.push(metric);
    
    if (metric.isSlow) {
      logger.warn('Slow comparison detected', {
        duration: `${duration}ms`,
        threshold: `${this.thresholds.slowComparison}ms`,
        ...metadata
      });
      
      this.emit('slowComparison', metric);
    }

    logger.performance('Comparison', duration, metadata);
    this.emit('comparisonTracked', metric);
    
    return metric;
  }

  /**
   * Track extraction performance
   */
  trackExtraction(type, duration, metadata = {}) {
    const metric = {
      timestamp: Date.now(),
      type,
      duration,
      ...metadata,
      isSlow: duration > this.thresholds.slowExtraction
    };

    this.metrics.extractions.push(metric);
    
    if (metric.isSlow) {
      logger.warn(`Slow ${type} extraction detected`, {
        duration: `${duration}ms`,
        threshold: `${this.thresholds.slowExtraction}ms`,
        ...metadata
      });
      
      this.emit('slowExtraction', metric);
    }

    logger.performance(`${type} extraction`, duration, metadata);
    this.emit('extractionTracked', metric);
    
    return metric;
  }

  /**
   * Track API response time
   */
  trackResponseTime(endpoint, duration, statusCode, metadata = {}) {
    const metric = {
      timestamp: Date.now(),
      endpoint,
      duration,
      statusCode,
      ...metadata,
      isSlow: duration > this.thresholds.slowResponseTime
    };

    this.metrics.systemHealth.responseTime.push(metric);
    
    if (metric.isSlow) {
      logger.warn('Slow API response detected', {
        endpoint,
        duration: `${duration}ms`,
        statusCode,
        threshold: `${this.thresholds.slowResponseTime}ms`
      });
      
      this.emit('slowResponse', metric);
    }

    this.emit('responseTracked', metric);
    return metric;
  }

  /**
   * Capture system health metrics
   */
  captureSystemHealth() {
    try {
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      const healthMetric = {
        timestamp: Date.now(),
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memUsage.external / 1024 / 1024) // MB
        },
        uptime: Math.round(uptime),
        activeComparisons: this.getActiveComparisons()
      };

      this.metrics.systemHealth.memoryUsage.push(healthMetric);
      
      // Check for high memory usage
      if (healthMetric.memory.used > this.thresholds.highMemoryUsage) {
        logger.warn('High memory usage detected', {
          used: `${healthMetric.memory.used}MB`,
          threshold: `${this.thresholds.highMemoryUsage}MB`
        });
        
        this.emit('highMemoryUsage', healthMetric);
      }

      this.emit('healthCaptured', healthMetric);
      
    } catch (error) {
      logger.error('Failed to capture system health', { error: error.message });
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Filter metrics from the last hour
    const recentComparisons = this.metrics.comparisons.filter(m => m.timestamp > oneHourAgo);
    const recentExtractions = this.metrics.extractions.filter(m => m.timestamp > oneHourAgo);
    const recentResponses = this.metrics.systemHealth.responseTime.filter(m => m.timestamp > oneHourAgo);
    
    const summary = {
      timeRange: '1 hour',
      comparisons: {
        total: recentComparisons.length,
        slow: recentComparisons.filter(m => m.isSlow).length,
        avgDuration: this.calculateAverage(recentComparisons.map(m => m.duration)),
        maxDuration: Math.max(...recentComparisons.map(m => m.duration), 0)
      },
      extractions: {
        total: recentExtractions.length,
        slow: recentExtractions.filter(m => m.isSlow).length,
        avgDuration: this.calculateAverage(recentExtractions.map(m => m.duration)),
        byType: this.groupByType(recentExtractions)
      },
      api: {
        total: recentResponses.length,
        slow: recentResponses.filter(m => m.isSlow).length,
        avgResponseTime: this.calculateAverage(recentResponses.map(m => m.duration)),
        errors: recentResponses.filter(m => m.statusCode >= 400).length
      },
      system: {
        uptime: process.uptime(),
        currentMemory: this.getCurrentMemoryUsage(),
        avgMemoryUsage: this.getAverageMemoryUsage()
      }
    };

    return summary;
  }

  /**
   * Get real-time metrics for dashboard
   */
  getRealTimeMetrics() {
    const recentMetrics = this.getMetricsFromLast(5); // Last 5 minutes
    
    return {
      timestamp: Date.now(),
      comparisons: {
        active: this.getActiveComparisons(),
        recentCount: recentMetrics.comparisons.length,
        avgDuration: this.calculateAverage(recentMetrics.comparisons.map(m => m.duration))
      },
      memory: this.getCurrentMemoryUsage(),
      uptime: Math.round(process.uptime()),
      status: this.getSystemStatus()
    };
  }

  /**
   * Helper methods
   */
  calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
  }

  getMetricsFromLast(minutes) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    
    return {
      comparisons: this.metrics.comparisons.filter(m => m.timestamp > cutoff),
      extractions: this.metrics.extractions.filter(m => m.timestamp > cutoff),
      responses: this.metrics.systemHealth.responseTime.filter(m => m.timestamp > cutoff)
    };
  }

  groupByType(extractions) {
    return extractions.reduce((groups, extraction) => {
      const type = extraction.type || 'unknown';
      if (!groups[type]) {
        groups[type] = { count: 0, avgDuration: 0, durations: [] };
      }
      groups[type].count++;
      groups[type].durations.push(extraction.duration);
      groups[type].avgDuration = this.calculateAverage(groups[type].durations);
      return groups;
    }, {});
  }

  getCurrentMemoryUsage() {
    const memUsage = process.memoryUsage();
    return {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024)
    };
  }

  getAverageMemoryUsage() {
    const recent = this.metrics.systemHealth.memoryUsage.slice(-10); // Last 10 measurements
    if (recent.length === 0) return { used: 0, total: 0 };
    
    const avgUsed = this.calculateAverage(recent.map(m => m.memory.used));
    const avgTotal = this.calculateAverage(recent.map(m => m.memory.total));
    
    return { used: avgUsed, total: avgTotal };
  }

  getActiveComparisons() {
    // This would be enhanced to track actual active operations
    return 0;
  }

  getSystemStatus() {
    const currentMemory = this.getCurrentMemoryUsage();
    const recentMetrics = this.getMetricsFromLast(1);
    
    // Determine system status based on various factors
    if (currentMemory.used > this.thresholds.highMemoryUsage) {
      return 'warning';
    }
    
    if (recentMetrics.comparisons.some(m => m.isSlow) || 
        recentMetrics.extractions.some(m => m.isSlow)) {
      return 'warning';
    }
    
    return 'healthy';
  }

  cleanupMetrics() {
    // Keep only the most recent metrics to prevent memory leaks
    if (this.metrics.comparisons.length > this.maxMetricsLength) {
      this.metrics.comparisons = this.metrics.comparisons.slice(-this.maxMetricsLength);
    }
    
    if (this.metrics.extractions.length > this.maxMetricsLength) {
      this.metrics.extractions = this.metrics.extractions.slice(-this.maxMetricsLength);
    }
    
    if (this.metrics.systemHealth.responseTime.length > this.maxMetricsLength) {
      this.metrics.systemHealth.responseTime = this.metrics.systemHealth.responseTime.slice(-this.maxMetricsLength);
    }
    
    if (this.metrics.systemHealth.memoryUsage.length > this.maxMetricsLength) {
      this.metrics.systemHealth.memoryUsage = this.metrics.systemHealth.memoryUsage.slice(-this.maxMetricsLength);
    }

    logger.debug('Performance metrics cleaned up');
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor; 