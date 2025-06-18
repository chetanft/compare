/**
 * Unit Tests for WebExtractor
 * Tests web scraping and style extraction functionality
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { WebExtractor } from '../../../src/scraper/webExtractor.js';

describe('WebExtractor', () => {
  let webExtractor;
  let config;

  beforeEach(() => {
    config = {
      headless: "new",
      timeout: 30000,
      viewport: { width: 1200, height: 800 }
    };
    webExtractor = new WebExtractor(config);
  });

  afterEach(async () => {
    // Clean up any browser instances
    if (webExtractor && webExtractor.browser) {
      try {
        await webExtractor.cleanup();
      } catch (error) {
        // Ignore cleanup errors in tests
      }
    }
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with valid config', () => {
      expect(webExtractor).toBeInstanceOf(WebExtractor);
      expect(webExtractor.config).toEqual(expect.objectContaining(config));
    });

    test('should initialize with default config when none provided', () => {
      const extractor = new WebExtractor();
      expect(extractor.config).toBeDefined();
      expect(extractor.config.headless).toBe("new");
      expect(extractor.config.timeout).toBe(30000);
      expect(extractor.config.viewport).toBeDefined();
    });

    test('should have null browser and page initially', () => {
      expect(webExtractor.browser).toBeNull();
      expect(webExtractor.page).toBeNull();
    });
  });

  describe('Utility Functions', () => {
    test('should convert RGB to hex correctly', () => {
      expect(webExtractor.rgbToHex('rgb(255, 0, 0)')).toBe('#ff0000');
      expect(webExtractor.rgbToHex('rgb(0, 255, 0)')).toBe('#00ff00');
      expect(webExtractor.rgbToHex('rgb(0, 0, 255)')).toBe('#0000ff');
      expect(webExtractor.rgbToHex('rgb(128, 128, 128)')).toBe('#808080');
    });

    test('should generate CSS selector correctly', () => {
      const mockElementWithId = {
        tagName: 'DIV',
        id: 'test-id',
        className: 'test-class another-class'
      };
      
      const selectorWithId = webExtractor.generateCSSSelector(mockElementWithId);
      expect(selectorWithId).toBe('#test-id');
      
      const mockElementWithClass = {
        tagName: 'DIV',
        className: 'test-class another-class'
      };
      
      const selectorWithClass = webExtractor.generateCSSSelector(mockElementWithClass);
      expect(selectorWithClass).toBe('DIV.test-class.another-class');
      
      const mockElementPlain = {
        tagName: 'DIV'
      };
      
      const selectorPlain = webExtractor.generateCSSSelector(mockElementPlain);
      expect(selectorPlain).toBe('DIV');
    });

    test('should handle config merging correctly', () => {
      const customConfig = {
        headless: false,
        timeout: 60000,
        customOption: 'test'
      };
      
      const extractor = new WebExtractor(customConfig);
      expect(extractor.config.headless).toBe(false);
      expect(extractor.config.timeout).toBe(60000);
      expect(extractor.config.customOption).toBe('test');
      expect(extractor.config.viewport).toBeDefined(); // Should still have defaults
    });
  });

  describe('Configuration and Setup', () => {
    test('should handle authentication config validation', () => {
      const validCredentialsAuth = {
        type: 'credentials',
        loginUrl: 'https://example.com/login',
        username: 'test',
        password: 'test',
        usernameSelector: '#username',
        passwordSelector: '#password',
        submitSelector: '#submit'
      };

      // Should not throw for valid config
      expect(() => {
        const extractor = new WebExtractor({ authentication: validCredentialsAuth });
      }).not.toThrow();
    });

    test('should handle cookies authentication config', () => {
      const cookiesAuth = {
        type: 'cookies',
        cookies: [
          { name: 'session', value: 'abc123', domain: 'example.com' }
        ]
      };

      expect(() => {
        const extractor = new WebExtractor({ authentication: cookiesAuth });
      }).not.toThrow();
    });

    test('should handle headers authentication config', () => {
      const headersAuth = {
        type: 'headers',
        headers: {
          'Authorization': 'Bearer token123',
          'X-API-Key': 'key123'
        }
      };

      expect(() => {
        const extractor = new WebExtractor({ authentication: headersAuth });
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid RGB color format', () => {
      expect(webExtractor.rgbToHex('invalid-color')).toBe('invalid-color');
      expect(webExtractor.rgbToHex('')).toBe('transparent');
      expect(webExtractor.rgbToHex(null)).toBe('transparent');
      expect(webExtractor.rgbToHex('transparent')).toBe('transparent');
      expect(webExtractor.rgbToHex('rgba(0, 0, 0, 0)')).toBe('transparent');
    });

    test('should handle element without ID or class in CSS selector generation', () => {
      const mockElement = {
        tagName: 'DIV'
      };
      
      const selector = webExtractor.generateCSSSelector(mockElement);
      expect(selector).toBe('DIV');
    });

    test('should handle missing config properties gracefully', () => {
      const extractor = new WebExtractor({});
      expect(extractor.config.headless).toBe("new");
      expect(extractor.config.timeout).toBe(30000);
      expect(extractor.config.viewport).toBeDefined();
    });
  });

  describe('Data Validation', () => {
    test('should validate viewport configuration', () => {
      const customViewport = { width: 1920, height: 1080 };
      const extractor = new WebExtractor({ viewport: customViewport });
      
      expect(extractor.config.viewport.width).toBe(1920);
      expect(extractor.config.viewport.height).toBe(1080);
    });

    test('should validate timeout configuration', () => {
      const extractor = new WebExtractor({ timeout: 60000 });
      expect(extractor.config.timeout).toBe(60000);
    });

    test('should validate headless configuration', () => {
      const extractor = new WebExtractor({ headless: false });
      expect(extractor.config.headless).toBe(false);
    });
  });
}); 