/**
 * Unit tests for configuration system
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { loadConfig, getFigmaApiKey } from '../../src/config/index.js';

describe('Configuration System', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    test('should load default configuration', async () => {
      // Clear environment variables
      delete process.env.PORT;
      delete process.env.FIGMA_API_KEY;
      
      const config = await loadConfig();
      
      expect(config).toMatchObject({
        server: {
          port: 3007,
          host: 'localhost',
        },
        cors: {
          origins: expect.arrayContaining([
            'http://localhost:3000',
            'http://localhost:3007',
            'http://localhost:5173',
          ]),
          credentials: true,
        },
        mcp: {
          enabled: true,
          url: 'http://127.0.0.1:3845',
          endpoint: '/mcp',
        },
        puppeteer: {
          headless: 'new',
          timeout: 30000,
          protocolTimeout: 60000,
          args: expect.any(Array),
        },
        thresholds: {
          colorDifference: 10,
          sizeDifference: 5,
          spacingDifference: 3,
          fontSizeDifference: 2,
        },
        security: {
          allowedHosts: [],
          rateLimit: {
            windowMs: 15 * 60 * 1000,
            max: 100,
            extractionMax: 10,
          },
        },
      });
    });

    test('should override defaults with environment variables', async () => {
      process.env.PORT = '8080';
      process.env.SERVER_HOST = 'example.com';
      process.env.FIGMA_API_KEY = 'test-api-key';
      process.env.MCP_ENABLED = 'false';
      process.env.PUPPETEER_HEADLESS = 'false';
      process.env.COLOR_DIFFERENCE_THRESHOLD = '20';
      
      const config = await loadConfig();
      
      expect(config.server.port).toBe(8080);
      expect(config.server.host).toBe('example.com');
      expect(config.figma.apiKey).toBe('test-api-key');
      expect(config.mcp.enabled).toBe(false);
      expect(config.puppeteer.headless).toBe(false);
      expect(config.thresholds.colorDifference).toBe(20);
    });

    test('should parse array environment variables', async () => {
      process.env.CORS_ORIGINS = 'http://localhost:3000,http://example.com,https://app.example.com';
      process.env.ALLOWED_HOSTS = 'example.com,demo.example.com';
      
      const config = await loadConfig();
      
      expect(config.cors.origins).toEqual([
        'http://localhost:3000',
        'http://example.com',
        'https://app.example.com',
      ]);
      expect(config.security.allowedHosts).toEqual([
        'example.com',
        'demo.example.com',
      ]);
    });

    test('should validate configuration schema', async () => {
      process.env.PORT = 'invalid-port';
      
      await expect(loadConfig()).rejects.toThrow('Configuration validation failed');
    });

    test('should handle boolean environment variables', async () => {
      process.env.MCP_ENABLED = 'false';
      process.env.CORS_CREDENTIALS = 'false';
      
      const config = await loadConfig();
      
      expect(config.mcp.enabled).toBe(false);
      expect(config.cors.credentials).toBe(false);
    });
  });

  describe('getFigmaApiKey', () => {
    test('should return API key from environment', async () => {
      process.env.FIGMA_API_KEY = 'test-figma-key';
      
      const apiKey = await getFigmaApiKey();
      
      expect(apiKey).toBe('test-figma-key');
    });

    test('should throw error when API key is not set', async () => {
      delete process.env.FIGMA_API_KEY;
      delete process.env.FIGMA_PERSONAL_ACCESS_TOKEN;
      
      await expect(getFigmaApiKey()).rejects.toThrow(
        'Figma API key not found. Please set FIGMA_API_KEY environment variable.'
      );
    });

    test('should accept FIGMA_PERSONAL_ACCESS_TOKEN as alternative', async () => {
      delete process.env.FIGMA_API_KEY;
      process.env.FIGMA_PERSONAL_ACCESS_TOKEN = 'test-pat';
      
      const apiKey = await getFigmaApiKey();
      
      expect(apiKey).toBe('test-pat');
    });
  });

  describe('Configuration caching', () => {
    test('should cache configuration for performance', async () => {
      process.env.FIGMA_API_KEY = 'test-key-1';
      
      const config1 = await loadConfig();
      
      // Change environment but should still get cached version
      process.env.FIGMA_API_KEY = 'test-key-2';
      const config2 = await loadConfig();
      
      expect(config1).toBe(config2); // Same object reference
      expect(config2.figma.apiKey).toBe('test-key-1'); // Original value
    });
  });

  describe('Edge cases', () => {
    test('should handle missing environment variables gracefully', async () => {
      // Clear all relevant env vars
      delete process.env.PORT;
      delete process.env.FIGMA_API_KEY;
      delete process.env.MCP_URL;
      
      const config = await loadConfig();
      
      // Should use defaults
      expect(config.server.port).toBe(3007);
      expect(config.mcp.url).toBe('http://127.0.0.1:3845');
      expect(config.figma.apiKey).toBeUndefined();
    });

    test('should handle numeric string environment variables', async () => {
      process.env.RATE_LIMIT_MAX = '200';
      process.env.FIGMA_EXTRACTION_TIMEOUT = '120000';
      
      const config = await loadConfig();
      
      expect(config.security.rateLimit.max).toBe(200);
      expect(config.timeouts.figmaExtraction).toBe(120000);
    });
  });
}); 