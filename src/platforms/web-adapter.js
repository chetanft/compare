/**
 * Web Platform Adapter
 * Handles web-specific configurations and paths
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WebAdapter {
  constructor() {
    this.platform = 'web';
  }

  /**
   * Get configuration file path for web environment
   */
  getConfigPath() {
    // Web app stores config in project root
    return path.join(__dirname, '../../config.json');
  }

  /**
   * Get output directory path
   */
  getOutputPath() {
    return path.join(__dirname, '../../output');
  }

  /**
   * Get frontend build path
   */
  getFrontendPath() {
    return path.join(__dirname, '../../frontend/dist');
  }

  /**
   * Get logs directory
   */
  getLogsPath() {
    return path.join(__dirname, '../../logs');
  }

  /**
   * Get temporary directory
   */
  getTempPath() {
    return path.join(__dirname, '../../temp');
  }

  /**
   * Get platform-specific server configuration
   */
  getServerConfig() {
    return {
      host: '0.0.0.0', // Allow external connections
      port: process.env.PORT || 3847,
      staticFiles: true,
      cors: {
        origin: true, // Allow all origins in development
        credentials: true
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
      }
    };
  }

  /**
   * Get platform-specific middleware configuration
   */
  getMiddlewareConfig() {
    return {
      bodyParser: {
        json: { limit: '50mb' },
        urlencoded: { limit: '50mb', extended: true }
      },
      compression: true,
      helmet: true,
      morgan: 'combined'
    };
  }

  /**
   * Platform-specific initialization
   */
  async initialize() {
    console.log('🌐 Initializing Web Platform Adapter');
    
    // Web-specific initialization
    // - Set up process handlers
    // - Configure environment variables
    // - Initialize logging
    
    return {
      platform: this.platform,
      initialized: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Platform-specific cleanup
   */
  async cleanup() {
    console.log('🧹 Cleaning up Web Platform Adapter');
    
    // Web-specific cleanup
    // - Close database connections
    // - Clean temporary files
    // - Graceful shutdown
    
    return true;
  }

  /**
   * Check if running in development mode
   */
  isDevelopment() {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Check if running in production mode
   */
  isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Get environment information
   */
  getEnvironmentInfo() {
    return {
      platform: this.platform,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cwd: process.cwd()
    };
  }
}

export default WebAdapter;
