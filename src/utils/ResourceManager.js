/**
 * Resource Management System
 * Tracks and properly cleans up browser resources to prevent memory leaks
 */

import { EventEmitter } from 'events';

export class ResourceManager extends EventEmitter {
  constructor() {
    super();
    this.resources = new Map(); // resourceId -> { resource, type, createdAt, metadata }
    this.cleanupInterval = null;
    this.isShuttingDown = false;
    
    // Start automatic cleanup of old resources
    this.startPeriodicCleanup();
    
    // Handle process termination
    this.setupGracefulShutdown();
  }

  /**
   * Track a resource for automatic cleanup
   */
  track(resourceId, resource, type, metadata = {}) {
    if (this.isShuttingDown) {
      console.warn(`⚠️ Cannot track resource ${resourceId} during shutdown`);
      return false;
    }

    const resourceInfo = {
      resource,
      type,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      metadata: {
        ...metadata,
        pid: process.pid,
        platform: process.platform
      }
    };

    this.resources.set(resourceId, resourceInfo);
    this.emit('resourceTracked', { resourceId, type, metadata });
    
    console.log(`📝 Tracking ${type} resource: ${resourceId}`);
    return true;
  }

  /**
   * Update last accessed time for a resource
   */
  touch(resourceId) {
    const resource = this.resources.get(resourceId);
    if (resource) {
      resource.lastAccessed = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Clean up a specific resource
   */
  async cleanup(resourceId) {
    const resourceInfo = this.resources.get(resourceId);
    if (!resourceInfo) {
      console.warn(`⚠️ Resource ${resourceId} not found for cleanup`);
      return false;
    }

    const { resource, type, metadata } = resourceInfo;
    
    try {
      console.log(`🧹 Cleaning up ${type} resource: ${resourceId}`);
      
      switch (type) {
        case 'page':
          if (resource && !resource.isClosed()) {
            await this.cleanupPage(resource);
          }
          break;
          
        case 'browser':
          if (resource && resource.isConnected()) {
            await this.cleanupBrowser(resource);
          }
          break;
          
        case 'extraction':
          if (resource && resource.abort) {
            resource.abort();
          }
          break;
          
        default:
          // Generic cleanup for custom resource types
          if (resource && typeof resource.close === 'function') {
            await resource.close();
          } else if (resource && typeof resource.destroy === 'function') {
            await resource.destroy();
          }
      }

      this.resources.delete(resourceId);
      this.emit('resourceCleaned', { resourceId, type, metadata });
      
      console.log(`✅ Successfully cleaned up ${type} resource: ${resourceId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to cleanup ${type} resource ${resourceId}:`, error.message);
      
      // Still remove from tracking to prevent memory leaks
      this.resources.delete(resourceId);
      this.emit('resourceCleanupFailed', { resourceId, type, error: error.message });
      
      return false;
    }
  }

  /**
   * Clean up a Puppeteer page
   */
  async cleanupPage(page) {
    try {
      // Remove all listeners to prevent memory leaks
      page.removeAllListeners();
      
      // Close the page
      await page.close();
      
    } catch (error) {
      console.warn(`Page cleanup warning: ${error.message}`);
      // Don't throw - page might already be closed
    }
  }

  /**
   * Clean up a Puppeteer browser
   */
  async cleanupBrowser(browser) {
    try {
      // Get all pages and close them first
      const pages = await browser.pages();
      await Promise.allSettled(
        pages.map(page => this.cleanupPage(page))
      );
      
      // Close the browser
      await browser.close();
      
    } catch (error) {
      console.warn(`Browser cleanup warning: ${error.message}`);
      // Don't throw - browser might already be closed
    }
  }

  /**
   * Clean up all resources
   */
  async cleanupAll() {
    console.log(`🧹 Cleaning up all ${this.resources.size} tracked resources...`);
    
    const cleanupPromises = Array.from(this.resources.keys()).map(
      resourceId => this.cleanup(resourceId)
    );
    
    const results = await Promise.allSettled(cleanupPromises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - successful;
    
    console.log(`✅ Cleanup complete: ${successful} successful, ${failed} failed`);
    
    return { successful, failed, total: results.length };
  }

  /**
   * Clean up old/stale resources
   */
  async cleanupStale(maxAge = 5 * 60 * 1000) { // 5 minutes default
    const now = Date.now();
    const staleResources = [];
    
    for (const [resourceId, resourceInfo] of this.resources.entries()) {
      const age = now - resourceInfo.lastAccessed;
      if (age > maxAge) {
        staleResources.push(resourceId);
      }
    }
    
    if (staleResources.length > 0) {
      console.log(`🧹 Cleaning up ${staleResources.length} stale resources...`);
      
      const cleanupPromises = staleResources.map(id => this.cleanup(id));
      await Promise.allSettled(cleanupPromises);
    }
    
    return staleResources.length;
  }

  /**
   * Get resource statistics
   */
  getStats() {
    const stats = {
      total: this.resources.size,
      byType: {},
      oldestResource: null,
      newestResource: null
    };
    
    let oldestTime = Date.now();
    let newestTime = 0;
    
    for (const [resourceId, resourceInfo] of this.resources.entries()) {
      const { type, createdAt } = resourceInfo;
      
      // Count by type
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      
      // Track oldest and newest
      if (createdAt < oldestTime) {
        oldestTime = createdAt;
        stats.oldestResource = { resourceId, createdAt };
      }
      
      if (createdAt > newestTime) {
        newestTime = createdAt;
        stats.newestResource = { resourceId, createdAt };
      }
    }
    
    return stats;
  }

  /**
   * Start periodic cleanup of stale resources
   */
  startPeriodicCleanup(interval = 60000) { // 1 minute default
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupStale();
      } catch (error) {
        console.error('Periodic cleanup failed:', error.message);
      }
    }, interval);
    
    console.log(`🔄 Started periodic resource cleanup (${interval}ms interval)`);
  }

  /**
   * Stop periodic cleanup
   */
  stopPeriodicCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('⏹️ Stopped periodic resource cleanup');
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdownHandler = async (signal) => {
      console.log(`📤 Received ${signal}, starting graceful resource cleanup...`);
      this.isShuttingDown = true;
      
      this.stopPeriodicCleanup();
      await this.cleanupAll();
      
      console.log('✅ Resource cleanup complete');
      process.exit(0);
    };
    
    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);
    process.on('SIGHUP', shutdownHandler);
  }

  /**
   * Generate a unique resource ID
   */
  generateResourceId(prefix = 'resource') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
let resourceManager = null;

export function getResourceManager() {
  if (!resourceManager) {
    resourceManager = new ResourceManager();
  }
  return resourceManager;
}

export async function shutdownResourceManager() {
  if (resourceManager) {
    await resourceManager.cleanupAll();
    resourceManager.stopPeriodicCleanup();
    resourceManager = null;
  }
}

export default {
  ResourceManager,
  getResourceManager,
  shutdownResourceManager
};
