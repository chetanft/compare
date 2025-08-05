/**
 * Test Data Fixtures
 * Centralized test data to replace scattered mock data throughout the test suite
 * Provides realistic, consistent test data for all test scenarios
 */

// Base test configuration
export const TEST_CONFIG = {
  figma: {
    fileId: 'fb5Yc1aKJv9YWsMLnNlWeK',
    nodeId: '2:22260',
    url: 'https://www.figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys?node-id=2-22260'
  },
  web: {
    url: 'https://www.freighttiger.com/v10/journey/listing',
    loginUrl: 'https://www.freighttiger.com/login'
  },
  thresholds: {
    fontSize: 2,
    spacing: 4,
    borderRadius: 2,
    colorTolerance: 5
  }
};

// Realistic Figma component data
export const FIGMA_TEST_DATA = {
  fileId: TEST_CONFIG.figma.fileId,
  fileName: 'My Journeys Design System',
  components: [
    {
      id: 'btn-primary',
      name: 'Primary Button',
      type: 'INSTANCE',
      properties: {
        width: 120,
        height: 40,
        backgroundColor: '#007bff',
        color: '#ffffff',
        fontSize: 16,
        fontFamily: 'Inter',
        fontWeight: 500,
        borderRadius: 8,
        padding: {
          top: 12,
          right: 24,
          bottom: 12,
          left: 24
        }
      },
      styles: {
        fills: [{ type: 'SOLID', color: { r: 0, g: 0.48, b: 1 } }],
        effects: [
          {
            type: 'DROP_SHADOW',
            color: { r: 0, g: 0, b: 0, a: 0.1 },
            offset: { x: 0, y: 2 },
            radius: 4,
            spread: 0
          }
        ]
      }
    },
    {
      id: 'card-component',
      name: 'Journey Card',
      type: 'FRAME',
      properties: {
        width: 320,
        height: 200,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: {
          top: 16,
          right: 16,
          bottom: 16,
          left: 16
        }
      },
      children: [
        {
          id: 'card-title',
          name: 'Card Title',
          type: 'TEXT',
          properties: {
            fontSize: 18,
            fontFamily: 'Inter',
            fontWeight: 600,
            color: '#1a1a1a'
          }
        },
        {
          id: 'card-description',
          name: 'Card Description',
          type: 'TEXT',
          properties: {
            fontSize: 14,
            fontFamily: 'Inter',
            fontWeight: 400,
            color: '#666666'
          }
        }
      ]
    }
  ],
  designTokens: {
    colors: [
      { name: 'primary-blue', value: '#007bff', usage: 'primary actions' },
      { name: 'text-primary', value: '#1a1a1a', usage: 'main text' },
      { name: 'text-secondary', value: '#666666', usage: 'secondary text' },
      { name: 'background-white', value: '#ffffff', usage: 'backgrounds' }
    ],
    typography: [
      { name: 'heading-large', fontSize: 18, fontFamily: 'Inter', fontWeight: 600 },
      { name: 'body-regular', fontSize: 14, fontFamily: 'Inter', fontWeight: 400 },
      { name: 'button-text', fontSize: 16, fontFamily: 'Inter', fontWeight: 500 }
    ],
    spacing: [
      { name: 'space-xs', value: 4 },
      { name: 'space-sm', value: 8 },
      { name: 'space-md', value: 12 },
      { name: 'space-lg', value: 16 },
      { name: 'space-xl', value: 24 }
    ]
  }
};

// Realistic Web component data
export const WEB_TEST_DATA = {
  url: TEST_CONFIG.web.url,
  title: 'Journey Listing - FreightTiger',
  elements: [
    {
      id: 'primary-btn',
      tagName: 'button',
      className: 'btn btn-primary',
      text: 'Create Journey',
      styles: {
        width: '118px',
        height: '38px',
        backgroundColor: 'rgb(0, 123, 255)',
        color: 'rgb(255, 255, 255)',
        fontSize: '15px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: '500',
        borderRadius: '6px',
        padding: '11px 22px'
      },
      detailedStyles: {
        layout: {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        },
        spacing: {
          marginTop: '0px',
          marginRight: '8px',
          marginBottom: '0px',
          marginLeft: '0px'
        }
      }
    },
    {
      id: 'journey-card',
      tagName: 'div',
      className: 'journey-card',
      styles: {
        width: '315px',
        height: '195px',
        backgroundColor: 'rgb(255, 255, 255)',
        borderRadius: '10px',
        padding: '15px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      },
      children: [
        {
          id: 'journey-title',
          tagName: 'h3',
          className: 'journey-title',
          text: 'Mumbai to Delhi Express',
          styles: {
            fontSize: '17px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '600',
            color: 'rgb(26, 26, 26)',
            marginBottom: '8px'
          }
        },
        {
          id: 'journey-description',
          tagName: 'p',
          className: 'journey-description',
          text: 'Fast delivery service for urgent shipments',
          styles: {
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '400',
            color: 'rgb(102, 102, 102)'
          }
        }
      ]
    }
  ]
};

// Test comparison results
export const COMPARISON_TEST_RESULTS = {
  metadata: {
    figmaUrl: TEST_CONFIG.figma.url,
    webUrl: TEST_CONFIG.web.url,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  },
  summary: {
    totalComparisons: 2,
    matches: 1,
    differences: 1,
    severity: {
      high: 0,
      medium: 1,
      low: 0
    }
  },
  comparisons: [
    {
      figmaComponent: 'btn-primary',
      webElement: 'primary-btn',
      matchConfidence: 0.85,
      differences: [
        {
          property: 'width',
          figmaValue: '120px',
          webValue: '118px',
          difference: 2,
          severity: 'low'
        },
        {
          property: 'borderRadius',
          figmaValue: '8px',
          webValue: '6px',
          difference: 2,
          severity: 'medium'
        }
      ]
    }
  ]
};

// Authentication test data
export const AUTH_TEST_DATA = {
  credentials: {
    loginUrl: TEST_CONFIG.web.loginUrl,
    username: "test@example.com",
    password: process.env.TEST_PASSWORD || 'test-password',
    usernameSelector: 'input#username',
    passwordSelector: 'input#password',
    submitSelector: 'button[type="submit"]',
    successIndicator: '.dashboard, .user-menu'
  },
  cookies: [
    {
      name: 'session_id',
      value: 'test-session-123',
      domain: '.freighttiger.com',
      path: '/',
      httpOnly: true,
      secure: true
    }
  ],
  headers: {
    'Authorization': 'Bearer test-token-123',
    'X-API-Key': 'test-api-key-456'
  }
};

// Error test scenarios
export const ERROR_TEST_SCENARIOS = {
  invalidFigmaUrl: 'https://invalid-figma-url.com',
  invalidWebUrl: 'https://non-existent-website-12345.com',
  malformedFigmaData: {
    fileId: 'invalid',
    components: null
  },
  emptyWebData: {
    url: TEST_CONFIG.web.url,
    elements: []
  },
  networkError: {
    code: 'NETWORK_ERROR',
    message: 'Failed to connect to server'
  }
};

// Performance test data
export const PERFORMANCE_TEST_DATA = {
  largeFigmaFile: {
    fileId: 'large-test-file',
    components: Array.from({ length: 100 }, (_, i) => ({
      id: `component-${i}`,
      name: `Component ${i}`,
      type: 'FRAME',
      properties: {
        width: 100 + i,
        height: 50 + i,
        backgroundColor: `#${Math.floor(Math.random()*16777215).toString(16)}`
      }
    }))
  },
  complexWebPage: {
    url: 'https://complex-test-page.com',
    elements: Array.from({ length: 150 }, (_, i) => ({
      id: `element-${i}`,
      tagName: i % 2 === 0 ? 'div' : 'button',
      className: `test-element-${i}`,
      styles: {
        width: `${100 + i}px`,
        height: `${50 + i}px`
      }
    }))
  }
};

// Helper functions for test data generation
export const TestDataHelpers = {
  /**
   * Generate mock Figma data with specified number of components
   */
  generateMockFigmaData(componentCount = 5) {
    return {
      ...FIGMA_TEST_DATA,
      components: Array.from({ length: componentCount }, (_, i) => ({
        id: `test-component-${i}`,
        name: `Test Component ${i}`,
        type: 'FRAME',
        properties: {
          width: 100 + (i * 10),
          height: 50 + (i * 5),
          backgroundColor: '#ffffff'
        }
      }))
    };
  },

  /**
   * Generate mock web data with specified number of elements
   */
  generateMockWebData(elementCount = 5) {
    return {
      ...WEB_TEST_DATA,
      elements: Array.from({ length: elementCount }, (_, i) => ({
        id: `test-element-${i}`,
        tagName: 'div',
        className: `test-class-${i}`,
        styles: {
          width: `${100 + (i * 10)}px`,
          height: `${50 + (i * 5)}px`,
          backgroundColor: 'rgb(255, 255, 255)'
        }
      }))
    };
  },

  /**
   * Generate test configuration with custom values
   */
  generateTestConfig(overrides = {}) {
    return {
      ...TEST_CONFIG,
      ...overrides
    };
  }
};

export default {
  TEST_CONFIG,
  FIGMA_TEST_DATA,
  WEB_TEST_DATA,
  COMPARISON_TEST_RESULTS,
  AUTH_TEST_DATA,
  ERROR_TEST_SCENARIOS,
  PERFORMANCE_TEST_DATA,
  TestDataHelpers
}; 