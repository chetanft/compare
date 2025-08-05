import { EnhancedWebExtractor } from '../../../src/web/enhancedWebExtractor.js';

describe('EnhancedWebExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new EnhancedWebExtractor();
  });

  afterEach(async () => {
    if (extractor.browser) {
      await extractor.browser.close();
    }
  });

  describe('Browser Initialization', () => {
    test('should initialize browser when not already initialized', async () => {
      expect(extractor.browser).toBeNull();
      
      await extractor.initialize();
      
      expect(extractor.browser).toBeTruthy();
      expect(typeof extractor.browser.newPage).toBe('function');
    });

    test('should not reinitialize browser if already initialized', async () => {
      await extractor.initialize();
      const firstBrowser = extractor.browser;
      
      await extractor.initialize();
      
      expect(extractor.browser).toBe(firstBrowser);
    });

    test('should handle browser initialization failure gracefully', async () => {
      // Mock puppeteer to throw error
      const puppeteer = await import('puppeteer');
      const originalLaunch = puppeteer.default.launch;
      puppeteer.default.launch = jest.fn().mockRejectedValue(new Error('Launch failed'));

      await expect(extractor.initialize()).rejects.toThrow('Browser initialization failed: Launch failed');
      expect(extractor.browser).toBeNull();

      // Restore original
      puppeteer.default.launch = originalLaunch;
    });
  });

  describe('extractWebData', () => {
    test('should auto-initialize browser if not initialized', async () => {
      const initializeSpy = jest.spyOn(extractor, 'initialize');
      
      // Mock the rest of the extraction process
      const mockPage = {
        setViewport: jest.fn(),
        goto: jest.fn(),
        close: jest.fn(),
        evaluate: jest.fn().mockResolvedValue([])
      };
      
      // Mock browser after initialization
      extractor.initialize = jest.fn().mockImplementation(async () => {
        extractor.browser = {
          newPage: jest.fn().mockResolvedValue(mockPage)
        };
      });

      await extractor.extractWebData('https://example.com');
      
      expect(initializeSpy).toHaveBeenCalled();
    });

    test('should not reinitialize if browser already exists', async () => {
      // Pre-initialize browser
      const mockPage = {
        setViewport: jest.fn(),
        goto: jest.fn(),
        close: jest.fn(),
        evaluate: jest.fn().mockResolvedValue([])
      };
      
      extractor.browser = {
        newPage: jest.fn().mockResolvedValue(mockPage)
      };
      
      const initializeSpy = jest.spyOn(extractor, 'initialize');
      
      await extractor.extractWebData('https://example.com');
      
      expect(initializeSpy).not.toHaveBeenCalled();
    });

    test('should handle null browser gracefully', async () => {
      extractor.browser = null;
      
      // Mock successful initialization
      extractor.initialize = jest.fn().mockImplementation(async () => {
        extractor.browser = {
          newPage: jest.fn().mockResolvedValue({
            setViewport: jest.fn(),
            goto: jest.fn(),
            close: jest.fn(),
            evaluate: jest.fn().mockResolvedValue([])
          })
        };
      });

      const result = await extractor.extractWebData('https://example.com');
      
      expect(result).toBeDefined();
      expect(extractor.initialize).toHaveBeenCalled();
    });
  });
}); 