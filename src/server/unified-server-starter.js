/**
 * Unified Server Starter
 * Automatically detects platform and starts appropriate server
 */

import { platformConfig } from '../config/platform-config.js';
import { logger } from '../utils/logger.js';

/**
 * Start the appropriate server based on platform detection
 */
export async function startUnifiedServer() {
  const platform = platformConfig.platform;
  const serverConfig = platformConfig.getServerConfig();
  
  logger.info(`🚀 Starting ${platform} server on port ${serverConfig.port}`);
  
  try {
    // Always use the unified web server (works for both web and Electron)
    console.log('🌐 Starting Web server...');
    const { startServer } = await import('../core/server/index.js');
    const server = await startServer();
    return server;
    
  } catch (error) {
    logger.error(`❌ Failed to start ${platform} server:`, error);
    
    // Try fallback server if primary fails
    console.log('🔄 Attempting fallback server...');
    try {
      if (platformConfig.isElectron()) {
        // Fallback to web server for Electron
        const { startServer } = await import('../core/server/index.js');
        return await startServer();
      } else {
        // Fallback to simple server for web
        const { startSimpleServer } = await import('./simple-fallback-server.js');
        return await startSimpleServer(serverConfig.port);
      }
    } catch (fallbackError) {
      logger.error('❌ Fallback server also failed:', fallbackError);
      throw new Error(`All server startup attempts failed: ${error.message}`);
    }
  }
}

/**
 * Graceful shutdown handler
 */
export async function shutdownUnifiedServer(server) {
  logger.info('🛑 Shutting down server gracefully...');
  
  try {
    if (server && typeof server.close === 'function') {
      await server.close();
    } else if (server && typeof server.stop === 'function') {
      await server.stop();
    }
    
    // Clean up resources
    const { shutdownBrowserPool } = await import('../browser/BrowserPool.js');
    const { shutdownResourceManager } = await import('../utils/ResourceManager.js');
    
    await shutdownBrowserPool();
    await shutdownResourceManager();
    
    logger.info('✅ Server shutdown complete');
    
  } catch (error) {
    logger.error('⚠️ Error during server shutdown:', error);
  }
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('📡 Received SIGTERM, shutting down gracefully...');
  await shutdownUnifiedServer();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📡 Received SIGINT, shutting down gracefully...');
  await shutdownUnifiedServer();
  process.exit(0);
});

export default { startUnifiedServer, shutdownUnifiedServer };
