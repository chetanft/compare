/**
 * Electron Platform Adapter
 * Handles Electron-specific configurations and paths
 */

import path from 'path';
import { fileURLToPath } from 'url';
import electron from 'electron';
const { app } = electron;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ElectronAdapter {
  constructor() {
    this.platform = 'electron';
  }

  /**
   * Get configuration file path for Electron environment
   */
  getConfigPath() {
    try {
      // Use Electron's userData directory for config
      if (app && app.getPath) {
        return path.join(app.getPath('userData'), 'config.json');
      }
    } catch (error) {
      // Fallback if Electron app is not available
      console.warn('⚠️ Electron app not available, using fallback config path');
    }
    
    // Fallback to project directory
    return path.join(__dirname, '../../config.json');
  }

  /**
   * Get output directory path
   */
  getOutputPath() {
    try {
      if (app && app.getPath) {
        return path.join(app.getPath('userData'), 'output');
      }
    } catch (error) {
      console.warn('⚠️ Electron app not available, using fallback output path');
    }
    
    return path.join(__dirname, '../../output');
  }

  /**
   * Get frontend build path
   */
  getFrontendPath() {
    // In packaged app, frontend is bundled with the app
    if (this.isPackaged()) {
      return path.join(__dirname, '../../frontend/dist');
    }
    
    // In development, use project directory
    return path.join(__dirname, '../../frontend/dist');
  }

  /**
   * Get logs directory
   */
  getLogsPath() {
    try {
      if (app && app.getPath) {
        return path.join(app.getPath('logs'));
      }
    } catch (error) {
      console.warn('⚠️ Electron app not available, using fallback logs path');
    }
    
    return path.join(__dirname, '../../logs');
  }

  /**
   * Get temporary directory
   */
  getTempPath() {
    try {
      if (app && app.getPath) {
        return path.join(app.getPath('temp'), 'figma-comparison-tool');
      }
    } catch (error) {
      console.warn('⚠️ Electron app not available, using fallback temp path');
    }
    
    return path.join(__dirname, '../../temp');
  }

  /**
   * Get platform-specific server configuration
   */
  getServerConfig() {
    return {
      host: '127.0.0.1', // Local only for security
      port: 3847, // Unified port for consistency across platforms
      staticFiles: true,
      cors: {
        origin: ['http://localhost:3847', 'file://', 'app://'], // Updated for unified port
        credentials: true
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000 // Higher limit for local app
      }
    };
  }

  /**
   * Get platform-specific middleware configuration
   */
  getMiddlewareConfig() {
    return {
      bodyParser: {
        json: { limit: '100mb' }, // Higher limits for desktop app
        urlencoded: { limit: '100mb', extended: true }
      },
      compression: false, // Not needed for local app
      helmet: false, // Not needed for local app
      morgan: this.isDevelopment() ? 'dev' : false
    };
  }

  /**
   * Platform-specific initialization
   */
  async initialize() {
    console.log('🖥️ Initializing Electron Platform Adapter');
    
    // Electron-specific initialization
    // - Set up app event handlers
    // - Configure security policies
    // - Initialize native modules
    
    // Ensure required directories exist
    const directories = [
      this.getOutputPath(),
      this.getLogsPath(),
      this.getTempPath()
    ];

    const fs = await import('fs');
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
    
    return {
      platform: this.platform,
      packaged: this.isPackaged(),
      development: this.isDevelopment(),
      initialized: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Platform-specific cleanup
   */
  async cleanup() {
    console.log('🧹 Cleaning up Electron Platform Adapter');
    
    // Electron-specific cleanup
    // - Close native resources
    // - Clean temporary files
    // - Prepare for app quit
    
    return true;
  }

  /**
   * Check if running in development mode
   */
  isDevelopment() {
    return process.env.NODE_ENV === 'development' || !this.isPackaged();
  }

  /**
   * Check if running in production mode
   */
  isProduction() {
    return process.env.NODE_ENV === 'production' && this.isPackaged();
  }

  /**
   * Check if app is packaged
   */
  isPackaged() {
    try {
      return app ? app.isPackaged : false;
    } catch (error) {
      // If app is not available, assume not packaged
      return false;
    }
  }

  /**
   * Get Electron-specific paths
   */
  getElectronPaths() {
    try {
      if (!app || !app.getPath) {
        return {};
      }

      return {
        userData: app.getPath('userData'),
        appData: app.getPath('appData'),
        temp: app.getPath('temp'),
        exe: app.getPath('exe'),
        desktop: app.getPath('desktop'),
        documents: app.getPath('documents'),
        downloads: app.getPath('downloads'),
        logs: app.getPath('logs')
      };
    } catch (error) {
      console.warn('⚠️ Could not get Electron paths:', error.message);
      return {};
    }
  }

  /**
   * Get environment information
   */
  getEnvironmentInfo() {
    return {
      platform: this.platform,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      environment: process.env.NODE_ENV || 'development',
      packaged: this.isPackaged(),
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cwd: process.cwd(),
      electronPaths: this.getElectronPaths()
    };
  }
}

export default ElectronAdapter;
