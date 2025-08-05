import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { logger } from '../../../src/utils/logger.js';

// Mock fs to test file operations
jest.mock('fs');

describe('Logger', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalLogToFile = process.env.LOG_TO_FILE;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock console.log to capture output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Mock fs methods
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockImplementation(() => {});
    fs.appendFileSync.mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore environment
    process.env.NODE_ENV = originalNodeEnv;
    process.env.LOG_TO_FILE = originalLogToFile;
    
    // Restore console.log
    console.log.mockRestore();
  });

  describe('Logging Levels', () => {
    it('should log error messages', () => {
      logger.error('Test error message');
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('❌')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('ERROR')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Test error message')
      );
    });

    it('should log warning messages', () => {
      logger.warn('Test warning message');
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('⚠️')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('WARN')
      );
    });

    it('should log info messages', () => {
      logger.info('Test info message');
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO')
      );
    });

    it('should log debug messages in development', () => {
      process.env.NODE_ENV = 'development';
      
      logger.debug('Test debug message');
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🔍')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG')
      );
    });

    it('should not log debug messages in production', () => {
      process.env.NODE_ENV = 'production';
      
      // Create new logger instance with production settings
      const prodLogger = new (logger.constructor)();
      jest.spyOn(console, 'log').mockClear();
      
      prodLogger.debug('Test debug message');
      
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('File Logging', () => {
    it('should write to file in production', () => {
      process.env.NODE_ENV = 'production';
      
      const prodLogger = new (logger.constructor)();
      prodLogger.info('Test message');
      
      expect(fs.appendFileSync).toHaveBeenCalled();
    });

    it('should write errors to separate error log', () => {
      process.env.NODE_ENV = 'production';
      
      const prodLogger = new (logger.constructor)();
      prodLogger.error('Test error');
      
      // Should write to both general log and error log
      expect(fs.appendFileSync).toHaveBeenCalledTimes(2);
      
      const calls = fs.appendFileSync.mock.calls;
      expect(calls[0][0]).toMatch(/app-\d{4}-\d{2}-\d{2}\.log$/);
      expect(calls[1][0]).toMatch(/error-\d{4}-\d{2}-\d{2}\.log$/);
    });

    it('should write to file when LOG_TO_FILE is enabled', () => {
      process.env.LOG_TO_FILE = 'true';
      
      logger.info('Test message');
      
      expect(fs.appendFileSync).toHaveBeenCalled();
    });
  });

  describe('Structured Logging', () => {
    it('should log HTTP requests with metadata', () => {
      const mockReq = {
        method: 'POST',
        url: '/api/compare',
        get: jest.fn().mockReturnValue('test-user-agent')
      };
      const mockRes = {
        statusCode: 200
      };
      
      logger.httpRequest(mockReq, mockRes, 1500);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('HTTP Request')
      );
    });

    it('should log comparison results', () => {
      const mockResult = {
        metadata: {
          figmaComponentCount: 5,
          webElementCount: 8
        },
        colors: {
          matches: ['color1', 'color2']
        },
        typography: {
          matches: ['font1']
        },
        summary: {
          overallScore: 0.85
        }
      };
      
      logger.comparison(mockResult);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Comparison Completed')
      );
    });

    it('should log extraction results', () => {
      const mockResult = {
        components: [1, 2, 3],
        colors: [1, 2],
        typography: [1]
      };
      
      logger.extraction('Figma', 'https://figma.com/test', mockResult);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Figma Extraction')
      );
    });

    it('should log performance with warning for slow operations', () => {
      logger.performance('Slow operation', 6000);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('⚠️')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Performance: Slow operation')
      );
    });

    it('should log performance with info for fast operations', () => {
      logger.performance('Fast operation', 1000);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', () => {
      fs.appendFileSync.mockImplementation(() => {
        throw new Error('File system error');
      });
      
      // Should not throw even when file writing fails
      expect(() => {
        logger.error('Test message');
      }).not.toThrow();
    });

    it('should handle missing metadata gracefully', () => {
      const emptyResult = {};
      
      expect(() => {
        logger.comparison(emptyResult);
      }).not.toThrow();
      
      expect(() => {
        logger.extraction('Test', 'url', emptyResult);
      }).not.toThrow();
    });
  });
}); 