/**
 * Performance Monitor for macOS
 * Port of web app performance monitoring with macOS-specific optimizations
 * Tracks system performance, request metrics, and resource usage
 */

import { EventEmitter } from 'events';
import os from 'os';

export class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        currentRPS: 0,
        peakRPS: 0
      },
      system: {
        cpuUsage: 0,
        memoryUsage: {
          used: 0,
          free: 0,
          total: 0,
          percentage: 0
        },
        uptime: 0,
        loadAverage: [0, 0, 0]
      },
      performance: {
        figmaExtractions: {
          total: 0,
          successful: 0,
          failed: 0,
          averageTime: 0
        },
        webExtractions: {
          total: 0,
          successful: 0,
          failed: 0,
          averageTime: 0
        },
        comparisons: {
          total: 0,
          successful: 0,
          failed: 0,
          averageTime: 0
        },
        screenshots: {
          total: 0,
          successful: 0,
          failed: 0,
          averageTime: 0
        }
      }
    };
    
    this.requestHistory = [];
    this.systemHistory = [];
    this.maxHistorySize = 1000;
    this.monitoringInterval = null;
    this.isMonitoring = false;
    
    // Request tracking
    this.activeRequests = new Map();
    this.requestTimestamps = [];
    
    console.log('📊 Performance Monitor initialized');
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(interval = 5000) {
    if (this.isMonitoring) {
      console.log('⚠️ Performance monitoring already running');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.calculateRequestMetrics();
      this.cleanupOldData();
      this.emitMetrics();
    }, interval);

    console.log(`📊 Performance monitoring started (interval: ${interval}ms)`);
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    console.log('📊 Performance monitoring stopped');
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Update system metrics
    this.metrics.system = {
      cpuUsage: process.cpuUsage(),
      memoryUsage: {
        used: usedMemory,
        free: freeMemory,
        total: totalMemory,
        percentage: (usedMemory / totalMemory) * 100,
        process: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external
        }
      },
      uptime: process.uptime(),
      loadAverage: os.loadavg(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version
    };

    // Add to history
    this.systemHistory.push({
      timestamp: Date.now(),
      ...this.metrics.system
    });

    // Keep history size manageable
    if (this.systemHistory.length > this.maxHistorySize) {
      this.systemHistory.shift();
    }
  }

  /**
   * Calculate request metrics
   */
  calculateRequestMetrics() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Filter recent requests
    const recentRequests = this.requestTimestamps.filter(
      timestamp => timestamp > oneMinuteAgo
    );

    // Calculate RPS
    const currentRPS = recentRequests.length / 60;
    this.metrics.requests.currentRPS = currentRPS;

    if (currentRPS > this.metrics.requests.peakRPS) {
      this.metrics.requests.peakRPS = currentRPS;
    }

    // Clean old timestamps
    this.requestTimestamps = recentRequests;
  }

  /**
   * Track request start
   */
  trackRequestStart(requestId, type = 'general', metadata = {}) {
    const startTime = Date.now();
    
    this.activeRequests.set(requestId, {
      type,
      startTime,
      metadata
    });

    this.requestTimestamps.push(startTime);
    this.metrics.requests.total++;

    return requestId;
  }

  /**
   * Track request completion
   */
  trackRequestEnd(requestId, success = true, error = null) {
    const request = this.activeRequests.get(requestId);
    
    if (!request) {
      console.warn(`⚠️ Request ${requestId} not found in active requests`);
      return;
    }

    const endTime = Date.now();
    const responseTime = endTime - request.startTime;

    // Update request metrics
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Update average response time
    const totalRequests = this.metrics.requests.successful + this.metrics.requests.failed;
    if (totalRequests === 1) {
      this.metrics.requests.averageResponseTime = responseTime;
    } else {
      this.metrics.requests.averageResponseTime = 
        (this.metrics.requests.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    }

    // Update specific performance metrics
    this.updatePerformanceMetrics(request.type, success, responseTime);

    // Add to history
    this.requestHistory.push({
      requestId,
      type: request.type,
      startTime: request.startTime,
      endTime,
      responseTime,
      success,
      error: error?.message || null,
      metadata: request.metadata
    });

    // Clean up
    this.activeRequests.delete(requestId);

    // Keep history size manageable
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory.shift();
    }
  }

  /**
   * Update performance metrics for specific operation types
   */
  updatePerformanceMetrics(type, success, responseTime) {
    let category = null;

    // Map request types to performance categories
    if (type.includes('figma') || type.includes('Figma')) {
      category = 'figmaExtractions';
    } else if (type.includes('web') || type.includes('Web')) {
      category = 'webExtractions';
    } else if (type.includes('compare') || type.includes('comparison')) {
      category = 'comparisons';
    } else if (type.includes('screenshot')) {
      category = 'screenshots';
    }

    if (category && this.metrics.performance[category]) {
      const perf = this.metrics.performance[category];
      
      perf.total++;
      if (success) {
        perf.successful++;
      } else {
        perf.failed++;
      }

      // Update average time
      const totalCompleted = perf.successful + perf.failed;
      if (totalCompleted === 1) {
        perf.averageTime = responseTime;
      } else {
        perf.averageTime = 
          (perf.averageTime * (totalCompleted - 1) + responseTime) / totalCompleted;
      }
    }
  }

  /**
   * Clean up old data
   */
  cleanupOldData() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    // Clean request history
    this.requestHistory = this.requestHistory.filter(
      request => request.endTime > cutoffTime
    );

    // Clean system history
    this.systemHistory = this.systemHistory.filter(
      entry => entry.timestamp > cutoffTime
    );
  }

  /**
   * Emit metrics to listeners
   */
  emitMetrics() {
    this.emit('metrics', {
      timestamp: Date.now(),
      metrics: this.metrics,
      activeRequests: this.activeRequests.size
    });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    return {
      timestamp: Date.now(),
      uptime: process.uptime(),
      system: this.metrics.system,
      requests: this.metrics.requests,
      performance: this.metrics.performance,
      activeRequests: this.activeRequests.size,
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const fiveMinutesAgo = now - 300000;

    // Recent request data
    const recentRequests = this.requestHistory.filter(
      req => req.endTime > oneMinuteAgo
    );

    const last5MinRequests = this.requestHistory.filter(
      req => req.endTime > fiveMinutesAgo
    );

    return {
      timestamp: now,
      realtime: {
        activeRequests: this.activeRequests.size,
        requestsLastMinute: recentRequests.length,
        requestsLast5Minutes: last5MinRequests.length,
        averageResponseTime: recentRequests.length > 0 ? 
          recentRequests.reduce((sum, req) => sum + req.responseTime, 0) / recentRequests.length : 0,
        successRate: recentRequests.length > 0 ? 
          (recentRequests.filter(req => req.success).length / recentRequests.length) * 100 : 100
      },
      system: {
        memory: this.metrics.system.memoryUsage,
        uptime: this.metrics.system.uptime,
        loadAverage: this.metrics.system.loadAverage
      },
      trends: {
        requestTrend: this.calculateTrend('requests'),
        responseTrend: this.calculateTrend('responseTime'),
        memoryTrend: this.calculateTrend('memory')
      }
    };
  }

  /**
   * Calculate trend for a metric
   */
  calculateTrend(metric) {
    const recent = this.getRecentData(metric, 10);
    
    if (recent.length < 2) {
      return { direction: 'stable', change: 0 };
    }

    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    let direction = 'stable';
    if (change > 5) direction = 'increasing';
    else if (change < -5) direction = 'decreasing';

    return { direction, change: Math.round(change * 100) / 100 };
  }

  /**
   * Get recent data for trend calculation
   */
  getRecentData(metric, count = 10) {
    switch (metric) {
      case 'requests':
        return this.requestHistory.slice(-count).map(req => req.responseTime);
      case 'responseTime':
        return this.requestHistory.slice(-count).map(req => req.responseTime);
      case 'memory':
        return this.systemHistory.slice(-count).map(entry => entry.memoryUsage.percentage);
      default:
        return [];
    }
  }

  /**
   * Get detailed statistics
   */
  getDetailedStats() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    const recentRequests = this.requestHistory.filter(
      req => req.endTime > oneHourAgo
    );

    // Group by type
    const requestsByType = {};
    recentRequests.forEach(req => {
      if (!requestsByType[req.type]) {
        requestsByType[req.type] = [];
      }
      requestsByType[req.type].push(req);
    });

    // Calculate stats by type
    const statsByType = {};
    Object.entries(requestsByType).forEach(([type, requests]) => {
      const successful = requests.filter(req => req.success);
      const failed = requests.filter(req => !req.success);
      const avgResponseTime = requests.reduce((sum, req) => sum + req.responseTime, 0) / requests.length;

      statsByType[type] = {
        total: requests.length,
        successful: successful.length,
        failed: failed.length,
        successRate: (successful.length / requests.length) * 100,
        averageResponseTime: Math.round(avgResponseTime),
        fastestResponse: Math.min(...requests.map(req => req.responseTime)),
        slowestResponse: Math.max(...requests.map(req => req.responseTime))
      };
    });

    return {
      timestamp: now,
      period: 'Last Hour',
      overall: this.getPerformanceSummary(),
      byType: statsByType,
      systemHealth: this.getSystemHealth()
    };
  }

  /**
   * Get system health assessment
   */
  getSystemHealth() {
    const memoryUsage = this.metrics.system.memoryUsage.percentage;
    const loadAverage = this.metrics.system.loadAverage[0];
    const cpuCount = os.cpus().length;
    const normalizedLoad = loadAverage / cpuCount;

    let healthScore = 100;
    const issues = [];

    // Memory health
    if (memoryUsage > 90) {
      healthScore -= 30;
      issues.push('Critical memory usage');
    } else if (memoryUsage > 75) {
      healthScore -= 15;
      issues.push('High memory usage');
    }

    // CPU health
    if (normalizedLoad > 2) {
      healthScore -= 25;
      issues.push('Critical CPU load');
    } else if (normalizedLoad > 1) {
      healthScore -= 10;
      issues.push('High CPU load');
    }

    // Request failure rate
    const recentFailureRate = this.metrics.requests.total > 0 ? 
      (this.metrics.requests.failed / this.metrics.requests.total) * 100 : 0;
    
    if (recentFailureRate > 10) {
      healthScore -= 20;
      issues.push('High request failure rate');
    } else if (recentFailureRate > 5) {
      healthScore -= 10;
      issues.push('Elevated request failure rate');
    }

    let status = 'healthy';
    if (healthScore < 50) status = 'critical';
    else if (healthScore < 70) status = 'warning';
    else if (healthScore < 90) status = 'degraded';

    return {
      score: Math.max(0, healthScore),
      status,
      issues,
      metrics: {
        memoryUsage: Math.round(memoryUsage),
        cpuLoad: Math.round(normalizedLoad * 100) / 100,
        failureRate: Math.round(recentFailureRate * 100) / 100
      }
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

export default PerformanceMonitor;
