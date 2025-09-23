/**
 * Unified Configuration System
 * Single source of truth for both web and macOS apps
 */

import fs from 'fs';
import path from 'path';

export class UnifiedConfig {
  constructor(platformAdapter) {
    this.platformAdapter = platformAdapter;
    this.config = null;
    this.configPath = platformAdapter.getConfigPath();
  }

  /**
   * Load configuration with platform-specific paths
   */
  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        this.config = { ...this.getDefaults(), ...configData };
      } else {
        this.config = this.getDefaults();
        this.save(); // Create default config file
      }
      return this.config;
    } catch (error) {
      console.error('❌ Config load error:', error.message);
      this.config = this.getDefaults();
      return this.config;
    }
  }

  /**
   * Save configuration
   */
  save() {
    try {
      // Ensure directory exists
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Save with timestamp
      const configToSave = {
        ...this.config,
        lastUpdated: new Date().toISOString()
      };

      fs.writeFileSync(this.configPath, JSON.stringify(configToSave, null, 2));
      console.log('✅ Configuration saved:', this.configPath);
      return true;
    } catch (error) {
      console.error('❌ Config save error:', error.message);
      return false;
    }
  }

  /**
   * Get configuration value
   */
  get(key, defaultValue = null) {
    if (!this.config) {
      this.load();
    }
    return this.config[key] ?? defaultValue;
  }

  /**
   * Set configuration value
   */
  set(key, value) {
    if (!this.config) {
      this.load();
    }
    this.config[key] = value;
    return this.save();
  }

  /**
   * Update multiple configuration values
   */
  update(updates) {
    if (!this.config) {
      this.load();
    }
    this.config = { ...this.config, ...updates };
    return this.save();
  }

  /**
   * Default configuration schema
   */
  getDefaults() {
    return {
      // Figma API Configuration
      figmaApiKey: '',
      figmaTimeout: 30000,
      figmaLightMode: true,        // Enable light mode by default for faster extraction
      figmaSkipAnalysis: false,    // Skip heavy analysis for fastest extraction
      figmaMaxDepth: 3,            // Maximum traversal depth for analysis
      figmaMaxNodes: 50,           // Maximum nodes to analyze per type
      
      // Web Extraction Configuration
      webTimeout: 60000,
      maxConcurrentExtractions: 3,
      
      // Comparison Configuration
      comparisonThreshold: 0.8,
      maxConcurrentComparisons: 2,
      
      // Screenshot Configuration
      screenshotQuality: 90,
      screenshotFormat: 'png',
      maxScreenshotSize: 10485760, // 10MB
      
      // Performance Configuration
      enablePerformanceMonitoring: true,
      performanceMetricsRetention: 7, // days
      
      // Report Configuration
      maxReportsRetention: 30, // days
      reportCompressionEnabled: true,
      
      // Server Configuration
      serverPort: 3847,
      enableCORS: true,
      enableRateLimit: true,
      rateLimitWindow: 900000, // 15 minutes
      rateLimitMax: 100,
      
      // MCP Configuration (for backward compatibility)
      mcpServer: {
        enabled: false, // Disabled by default in unified architecture
        port: 3845,
        timeout: 10000
      },
      
      // Platform-specific overrides
      platform: 'unknown',
      
      // Metadata
      version: '2.0.0',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];
    
    if (!this.config) {
      this.load();
    }

    // Validate required fields
    if (!this.config.figmaApiKey) {
      errors.push('Figma API key is required');
    }

    // Validate numeric values
    const numericFields = [
      'figmaTimeout', 'webTimeout', 'maxConcurrentExtractions',
      'comparisonThreshold', 'maxConcurrentComparisons', 'screenshotQuality',
      'maxScreenshotSize', 'performanceMetricsRetention', 'maxReportsRetention',
      'serverPort', 'rateLimitWindow', 'rateLimitMax'
    ];

    numericFields.forEach(field => {
      if (typeof this.config[field] !== 'number' || this.config[field] < 0) {
        errors.push(`${field} must be a positive number`);
      }
    });

    // Validate ranges
    if (this.config.comparisonThreshold < 0 || this.config.comparisonThreshold > 1) {
      errors.push('comparisonThreshold must be between 0 and 1');
    }

    if (this.config.screenshotQuality < 1 || this.config.screenshotQuality > 100) {
      errors.push('screenshotQuality must be between 1 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Reset to defaults
   */
  reset() {
    this.config = this.getDefaults();
    return this.save();
  }

  /**
   * Get configuration summary for debugging
   */
  getSummary() {
    if (!this.config) {
      this.load();
    }

    return {
      configPath: this.configPath,
      platform: this.config.platform,
      version: this.config.version,
      figmaConfigured: !!this.config.figmaApiKey,
      lastUpdated: this.config.lastUpdated,
      validation: this.validate()
    };
  }
}

export default UnifiedConfig;
