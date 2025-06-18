/**
 * Mock Services for Testing
 * Provides mock implementations for external dependencies
 */

import nock from 'nock';
import { jest } from '@jest/globals';

export class MockFigmaAPI {
  static setup() {
    // Mock Figma API endpoints
    nock('https://api.figma.com')
      .persist()
      .get('/v1/files/test-file-id')
      .reply(200, {
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
              absoluteBoundingBox: { x: 0, y: 0, width: 375, height: 812 },
              children: [
                {
                  id: 'test-text',
                  name: 'Test Text',
                  type: 'TEXT',
                  characters: 'Hello World',
                  style: {
                    fontFamily: 'Inter',
                    fontSize: 16,
                    fontWeight: 400,
                    textAlignHorizontal: 'LEFT',
                    textAlignVertical: 'TOP'
                  },
                  fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
                  absoluteBoundingBox: { x: 20, y: 20, width: 100, height: 24 }
                },
                {
                  id: 'test-button',
                  name: 'Test Button',
                  type: 'RECTANGLE',
                  fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 1, a: 1 } }],
                  cornerRadius: 8,
                  absoluteBoundingBox: { x: 20, y: 60, width: 120, height: 40 }
                }
              ]
            }
          ]
        },
        components: {},
        styles: {}
      });

    // Mock Figma node-specific endpoint
    nock('https://api.figma.com')
      .persist()
      .get('/v1/files/test-file-id/nodes')
      .query({ ids: 'test-node-id' })
      .reply(200, {
        nodes: {
          'test-node-id': {
            document: {
              id: 'test-node-id',
              name: 'Test Node',
              type: 'FRAME',
              children: []
            }
          }
        }
      });

    // Mock Figma images endpoint
    nock('https://api.figma.com')
      .persist()
      .get('/v1/images/test-file-id')
      .query(true)
      .reply(200, {
        images: {
          'test-node-id': 'https://figma-alpha-api.s3.us-west-2.amazonaws.com/test-image.png'
        }
      });
  }

  static teardown() {
    nock.cleanAll();
  }
}

export class MockPuppeteer {
  static createMockBrowser() {
    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      setViewport: jest.fn().mockResolvedValue(undefined),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
      evaluate: jest.fn().mockResolvedValue({
        elements: [
          {
            selector: '.test-element',
            tagName: 'div',
            styles: {
              fontSize: '16px',
              fontFamily: 'Inter, sans-serif',
              color: 'rgb(0, 0, 0)',
              backgroundColor: 'rgb(255, 255, 255)',
              padding: '10px',
              margin: '5px'
            },
            boundingBox: { x: 0, y: 0, width: 100, height: 50 }
          }
        ]
      }),
      close: jest.fn().mockResolvedValue(undefined),
      type: jest.fn().mockResolvedValue(undefined),
      click: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue({}),
      waitForNavigation: jest.fn().mockResolvedValue(undefined),
      cookies: jest.fn().mockResolvedValue([]),
      setCookie: jest.fn().mockResolvedValue(undefined),
      setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined)
    };

    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
      pages: jest.fn().mockResolvedValue([mockPage])
    };

    return { browser: mockBrowser, page: mockPage };
  }
}

export class MockFileSystem {
  static setup() {
    // Mock fs operations
    const mockFs = {
      readFile: jest.fn(),
      writeFile: jest.fn().mockResolvedValue(undefined),
      mkdir: jest.fn().mockResolvedValue(undefined),
      readdir: jest.fn().mockResolvedValue(['test-report.html', 'test-report.json']),
      stat: jest.fn().mockResolvedValue({ isFile: () => true, isDirectory: () => false })
    };

    return mockFs;
  }
}

export class MockMCPServer {
  static setup() {
    // Mock MCP server endpoints
    nock('http://127.0.0.1:3845')
      .persist()
      .post('/sse')
      .reply(200, {
        result: {
          fileKey: 'test-file-id',
          document: {
            id: 'test-document',
            name: 'Test Document',
            children: []
          }
        }
      });
  }

  static teardown() {
    nock.cleanAll();
  }
}

export class MockExpressApp {
  static create() {
    const mockApp = {
      use: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      listen: jest.fn((port, callback) => {
        if (callback) callback();
        return { close: jest.fn() };
      })
    };

    const mockReq = {
      body: {},
      params: {},
      query: {},
      headers: {}
    };

    const mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis()
    };

    return { app: mockApp, req: mockReq, res: mockRes };
  }
}

// Utility function to reset all mocks
export function resetAllMocks() {
  MockFigmaAPI.teardown();
  MockMCPServer.teardown();
  jest.clearAllMocks();
} 