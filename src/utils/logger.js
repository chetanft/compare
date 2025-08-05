/**
 * Professional Logging System
 * Provides structured logging with different levels and environments
 * Following devops-automator agent methodology
 */

import fs from 'fs';
import path from 'path';

class Logger {
  constructor() {
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };

    this.currentLevel = process.env.NODE_ENV === 'production' 
      ? this.levels.INFO 
      : this.levels.DEBUG;

    this.colors = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow  
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[37m', // White
      RESET: '\x1b[0m'
    };

    this.emojis = {
      ERROR: '❌',
      WARN: '⚠️',
      INFO: 'ℹ️',
      DEBUG: '🔍'
    };

    // Ensure logs directory exists
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDir();
  }

  ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      // Fallback - don't fail if we can't create logs directory
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const emoji = this.emojis[level];
    const color = this.colors[level];
    const reset = this.colors.RESET;

    // Console format (with colors and emojis)
    const consoleMessage = `${color}${emoji} [${timestamp}] ${level}:${reset} ${message}`;
    
    // File format (no colors/emojis, structured)
    const fileMessage = JSON.stringify({
      timestamp,
      level,
      message,
      ...meta
    });

    return { consoleMessage, fileMessage };
  }

  shouldLog(level) {
    return this.levels[level] <= this.currentLevel;
  }

  writeToFile(message, level) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = path.join(this.logDir, `app-${date}.log`);
      
      // Append to daily log file
      fs.appendFileSync(filename, message + '\n');
      
      // Also write errors to separate error log
      if (level === 'ERROR') {
        const errorFilename = path.join(this.logDir, `error-${date}.log`);
        fs.appendFileSync(errorFilename, message + '\n');
      }
    } catch (error) {
      // Fallback - don't fail the application if logging fails
    }
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const { consoleMessage, fileMessage } = this.formatMessage(level, message, meta);
    
    // Output to console
    console.log(consoleMessage);
    
    // Write to file in production or if specifically enabled
    if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
      this.writeToFile(fileMessage, level);
    }
  }

  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  // Structured logging for specific use cases
  httpRequest(req, res, duration) {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent')
    });
  }

  comparison(result) {
    this.info('Comparison Completed', {
      figmaComponents: result.metadata?.figmaComponentCount || 0,
      webElements: result.metadata?.webElementCount || 0,
      colorMatches: result.colors?.matches?.length || 0,
      typographyMatches: result.typography?.matches?.length || 0,
      overallScore: result.summary?.overallScore || 0
    });
  }

  extraction(type, url, result) {
    this.info(`${type} Extraction`, {
      url,
      success: !!result,
      componentCount: result?.components?.length || 0,
      colorCount: result?.colors?.length || 0,
      typographyCount: result?.typography?.length || 0
    });
  }

  performance(operation, duration, metadata = {}) {
    const level = duration > 5000 ? 'WARN' : 'INFO';
    this.log(level, `Performance: ${operation}`, {
      duration: `${duration}ms`,
      slow: duration > 5000,
      ...metadata
    });
  }
}

// Export singleton instance
export const logger = new Logger();
export default logger; 