import { test } from 'node:test';
import { WebExtractionService } from '../../src/services/WebExtractionService.js';
import { ChunkedReportGenerator } from '../../src/report/ChunkedReportGenerator.js';
import { ErrorHandlingService } from '../../src/utils/ErrorHandlingService.js';
import assert from 'assert';

// Mock EnhancedWebExtractor
class MockEnhancedWebExtractor {
  constructor() {
    this.initialized = false;
    this.mockPages = {
      'mock://login': {
        title: 'Login Page',
        elements: [
          { id: 'username', type: 'input', name: 'username' },
          { id: 'password', type: 'input', name: 'password' },
          { id: 'submit', type: 'button', name: 'submit' }
        ]
      },
      'mock://dashboard': {
        title: 'Dashboard',
        elements: [
          { id: 'header', type: 'div', text: 'Welcome' },
          { id: 'content', type: 'div', text: 'Main Content' }
        ]
      }
    };
  }

  async initialize() {
    if (this.initialized) return;
    
    this.page = {
      goto: async (url) => {
        this.currentUrl = url;
        if (!url.startsWith('mock://')) {
          throw new Error('Only mock:// URLs are supported in tests');
        }
        if (!this.mockPages[url]) {
          throw new Error(`Mock page not found: ${url}`);
        }
      },
      waitForSelector: async (selector) => {
        if (this.currentUrl === 'mock://login' && selector.includes('password')) {
          // Simulate auth failure for specific test case
          if (this.shouldFailAuth) {
            throw new Error('Authentication failed');
          }
        }
      },
      type: async () => {},
      click: async () => {},
      waitForNavigation: async () => {}
    };
    
    this.initialized = true;
  }

  async extract(url) {
    if (!this.initialized) {
      throw new Error('Extractor not initialized');
    }

    // Simulate browser crash for specific test case
    if (this.shouldCrash) {
      throw new Error('Browser crashed');
    }

    return {
      elements: this.mockPages[url]?.elements || [],
      version: '1.0.0'
    };
  }

  async cleanup() {
    this.initialized = false;
    this.page = null;
    this.currentUrl = null;
  }
}

// Mock failing extractor
class MockFailingExtractor extends MockEnhancedWebExtractor {
  async initialize() {
    throw new Error('Failed to initialize browser');
  }

  async extract() {
    throw new Error('Extraction failed');
  }
}

test('Comparison Service Integration Tests', async (t) => {
  let webExtractor;
  let reportGenerator;
  let errorHandler;

  // Setup before each test
  t.beforeEach(async () => {
    webExtractor = new WebExtractionService({
      timeout: 1000,
      maxRetries: 1
    });
    
    reportGenerator = new ChunkedReportGenerator({
      chunkSize: 5,
      maxStringLength: 1000,
      maxArraySize: 100
    });
    
    errorHandler = new ErrorHandlingService();

    // Override extractor with mock
    webExtractor.extractor = new MockEnhancedWebExtractor();
  });

  // Cleanup after each test
  t.afterEach(async () => {
    if (webExtractor?.extractor) {
      await webExtractor.cleanup();
    }
  });

  await t.test('should handle successful extraction', async () => {
    await webExtractor.initialize();
    const result = await webExtractor.extractWebData('mock://dashboard');
    
    assert(result.elements.length === 2, 'Should extract elements');
    assert(result.metadata.extractorVersion === '1.0.0', 'Should include metadata');
  });

  await t.test('should handle initialization errors', async () => {
    webExtractor.extractor = new MockFailingExtractor();

    try {
      await webExtractor.initialize();
      assert.fail('Should throw initialization error');
    } catch (error) {
      assert(error.categorized.category === 'browser_error', 'Should categorize browser error');
      assert(error.categorized.actionable === true, 'Should be actionable');
    }
  });

  await t.test('should handle large reports with chunking', async () => {
    const largeData = {
      components: Array(100).fill(null).map((_, i) => ({
        id: `component-${i}`,
        name: `Test Component ${i}`,
        styles: {
          width: '100px',
          height: '100px',
          color: '#000000'
        },
        children: Array(5).fill(null).map((_, j) => ({
          id: `child-${i}-${j}`,
          type: 'div',
          text: 'Sample text'.repeat(100)
        }))
      }))
    };

    const result = await reportGenerator.generateReport(largeData, {
      format: 'json',
      compress: true
    });

    assert(result.reportPath, 'Should generate report path');
    assert(result.stats.totalChunks > 1, 'Should split into multiple chunks');
    assert(result.stats.processedChunks === result.stats.totalChunks, 'Should process all chunks');
  });

  await t.test('should handle authentication errors', async () => {
    await webExtractor.initialize();

    // Set mock to fail authentication
    webExtractor.extractor.shouldFailAuth = true;

    try {
      await webExtractor.extractWebData('mock://dashboard', {
        loginUrl: 'mock://login',
        username: 'test',
        password: 'test'
      });
      
      assert.fail('Should throw authentication error');
    } catch (error) {
      assert(error.categorized.category === 'authentication_error', 'Should categorize auth error');
      assert(error.categorized.actionable === true, 'Should be actionable');
    }
  });

  await t.test('should handle browser crashes', async () => {
    await webExtractor.initialize();

    // Set mock to simulate crash
    webExtractor.extractor.shouldCrash = true;

    try {
      await webExtractor.extractWebData('mock://dashboard');
      assert.fail('Should throw browser error');
    } catch (error) {
      assert(error.categorized.category === 'browser_error', 'Should categorize browser error');
      assert(error.categorized.actionable === true, 'Should be actionable');
    }
  });
}); 