/**
 * Jest Setup File
 * Global test configuration and utilities
 */

import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate test data
  generateTestConfig: () => ({
    figma: {
      accessToken: 'test-token',
      fileId: 'test-file-id',
      nodeId: 'test-node-id'
    },
    comparison: {
      thresholds: {
        fontSize: 2,
        spacing: 4,
        borderRadius: 2,
        colorTolerance: 5
      },
      properties: ['fontSize', 'fontFamily', 'color', 'backgroundColor']
    },
    puppeteer: {
      headless: "new",
      viewport: { width: 1920, height: 1080 },
      timeout: 30000
    },
    output: {
      reportFormat: 'html',
      screenshotDir: './tests/fixtures/screenshots',
      reportDir: './tests/fixtures/reports'
    }
  }),

  // Mock Figma API response
  generateMockFigmaData: () => ({
    document: {
      id: 'test-document',
      name: 'Test Document',
      type: 'DOCUMENT',
      children: [
        {
          id: 'test-frame',
          name: 'Test Frame',
          type: 'FRAME',
          backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
          children: [
            {
              id: 'test-text',
              name: 'Test Text',
              type: 'TEXT',
              style: {
                fontFamily: 'Inter',
                fontSize: 16,
                fontWeight: 400
              },
              fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }]
            }
          ]
        }
      ]
    },
    components: {},
    styles: {}
  }),

  // Mock web data
  generateMockWebData: () => ({
    url: 'https://example.com',
    elements: [
      {
        selector: '.test-element',
        tagName: 'div',
        styles: {
          fontSize: '16px',
          fontFamily: 'Inter, sans-serif',
          color: 'rgb(0, 0, 0)',
          backgroundColor: 'rgb(255, 255, 255)'
        },
        boundingBox: { x: 0, y: 0, width: 100, height: 50 }
      }
    ],
    screenshot: 'base64-screenshot-data'
  })
};

// Setup and teardown for tests that need file system operations
beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  jest.restoreAllMocks();
}); 