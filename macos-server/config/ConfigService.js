/**
 * Configuration Service for macOS App
 * Handles loading and saving configuration settings
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ConfigService {
  constructor() {
    // Detect if we're running from the packaged app or development
    // In packaged app: /path/to/app.asar.unpacked/macos-server/config/ConfigService.js
    // In development: /path/to/project/macos-server/config/ConfigService.js
    const isPackaged = __dirname.includes('app.asar.unpacked');
    
    if (isPackaged) {
      // In packaged app, go up to app.asar.unpacked directory where config.json is
      this.configPath = path.join(__dirname, '../../config.json');
    } else {
      // In development, go up to project root
      this.configPath = path.join(__dirname, '../../config.json');
    }
    
    console.log('📁 ConfigService using path:', this.configPath);
  }

  /**
   * Load configuration from config.json
   * @returns {Object} Configuration object
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(configData);
      }
      return this.getDefaultConfig();
    } catch (error) {
      console.warn('⚠️ Could not load config.json, using defaults:', error.message);
      return this.getDefaultConfig();
    }
  }

  /**
   * Save configuration to config.json
   * @param {Object} config - Configuration object to save
   */
  saveConfig(config) {
    try {
      config.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      console.log('✅ Configuration saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save configuration:', error.message);
      return false;
    }
  }

  /**
   * Update specific configuration values
   * @param {Object} updates - Key-value pairs to update
   */
  updateConfig(updates) {
    const config = this.loadConfig();
    Object.assign(config, updates);
    return this.saveConfig(config);
  }

  /**
   * Get Figma API key from config
   * @returns {string|null} Figma API key
   */
  getFigmaApiKey() {
    const config = this.loadConfig();
    return config.figmaApiKey || process.env.FIGMA_API_KEY || null;
  }

  /**
   * Save Figma API key to config
   * @param {string} apiKey - Figma API key
   */
  saveFigmaApiKey(apiKey) {
    return this.updateConfig({ figmaApiKey: apiKey });
  }

  /**
   * Get default configuration
   * @returns {Object} Default configuration
   */
  getDefaultConfig() {
    return {
      figmaApiKey: null,
      method: 'api',
      defaultTimeout: 30000,
      maxConcurrentComparisons: 3,
      autoDeleteOldReports: false,
      reportRetentionDays: 30,
      defaultFigmaExportFormat: 'svg',
      figmaExportScale: 2,
      mcpServer: {
        url: 'http://127.0.0.1:3845',
        endpoint: '/sse'
      },
      ports: {
        server: 3847,
        fallback: 3848
      },
      createdAt: new Date().toISOString()
    };
  }
}
