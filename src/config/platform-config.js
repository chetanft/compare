/**
 * Cross-Platform Configuration Manager
 * Handles differences between Web App and macOS App
 */

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PlatformConfig {
  constructor() {
    this.platform = this.detectPlatform();
    this.config = this.loadPlatformConfig();
  }

  /**
   * Detect current platform (web vs electron/macOS)
   */
  detectPlatform() {
    // Check if running in Electron
    if (process.versions.electron) {
      return 'electron';
    }
    
    // Check if macOS
    if (process.platform === 'darwin' && process.env.NODE_ENV !== 'test') {
      return 'macos';
    }
    
    // Default to web
    return 'web';
  }

  /**
   * Load platform-specific configuration
   */
  loadPlatformConfig() {
    const baseConfig = {
      // Shared configuration
      figma: {
        useMCP: true, // Default to MCP for both platforms
        fallbackToAPI: true
      },
      web: {
        timeout: 30000,
        headless: true
      },
      comparison: {
        chunkSize: 10,
        maxComponents: 1000
      }
    };

    const platformSpecific = {
      web: {
        server: {
          port: 3001, // Web app uses port 3001
          staticPath: path.join(__dirname, '../../frontend/dist'),
          cors: {
            origin: ['http://localhost:3000', 'http://localhost:3001'],
            credentials: true
          }
        },
        figma: {
          useMCP: true,
          mcpServerUrl: 'http://localhost:3845'
        }
      },
      
      macos: {
        server: {
          port: 3007, // macOS app uses port 3007  
          staticPath: path.join(__dirname, '../../frontend/dist'),
          cors: {
            origin: ['http://localhost:3007'],
            credentials: true
          }
        },
        figma: {
          useMCP: true,
          mcpServerUrl: 'http://localhost:3845',
          fallbackToDirectAPI: true // macOS can fallback to direct API
        }
      },
      
      electron: {
        server: {
          port: 3007,
          staticPath: path.join(__dirname, '../../frontend/dist'),
          cors: {
            origin: ['http://localhost:3007'],
            credentials: true
          }
        },
        figma: {
          useMCP: true,
          mcpServerUrl: 'http://localhost:3845',
          fallbackToDirectAPI: true
        }
      }
    };

    return {
      ...baseConfig,
      ...platformSpecific[this.platform],
      platform: this.platform
    };
  }

  /**
   * Get server configuration for current platform
   */
  getServerConfig() {
    return this.config.server;
  }

  /**
   * Get Figma configuration for current platform
   */
  getFigmaConfig() {
    return this.config.figma;
  }

  /**
   * Get web extraction configuration
   */
  getWebConfig() {
    return this.config.web;
  }

  /**
   * Check if running on specific platform
   */
  isWeb() {
    return this.platform === 'web';
  }

  isMacOS() {
    return this.platform === 'macos' || this.platform === 'electron';
  }

  isElectron() {
    return this.platform === 'electron';
  }

  /**
   * Get platform-specific middleware configuration
   */
  getMiddlewareConfig() {
    const base = {
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
      },
      helmet: {
        contentSecurityPolicy: false, // Disable for development
        crossOriginEmbedderPolicy: false
      }
    };

    if (this.isElectron()) {
      // More permissive settings for Electron
      base.helmet.contentSecurityPolicy = {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https:", "http:"]
        }
      };
    }

    return base;
  }

  /**
   * Get logging configuration for platform
   */
  getLoggingConfig() {
    return {
      level: this.isElectron() ? 'debug' : 'info',
      console: true,
      file: this.isElectron() ? false : true, // File logging for web only
      format: this.isElectron() ? 'simple' : 'json'
    };
  }
}

// Export singleton instance
export const platformConfig = new PlatformConfig();
export default platformConfig;
