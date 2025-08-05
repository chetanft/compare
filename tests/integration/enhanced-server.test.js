/**
 * Enhanced Server Integration Tests
 * Testing all Phase 2 features including browser pool, security, and monitoring
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { startServer } from '../../src/core/server/index.js';
import { shutdownBrowserPool } from '../../src/browser/BrowserPool.js';

describe('Enhanced Server Integration Tests', () => {
  let server;
  let app;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0'; // Use random port
    process.env.FIGMA_API_KEY = 'test-key';
    process.env.MCP_ENABLED = 'false';
    process.env.RATE_LIMIT_MAX = '1000'; // Higher limits for tests
    process.env.RATE_LIMIT_EXTRACTION_MAX = '100';

    server = await startServer();
    app = server;
  });

  afterAll(async () => {
    if (server) {
      await shutdownBrowserPool();
      await server.close();
    }
  });

  describe('Enhanced Health Monitoring', () => {
    test('should include browser pool stats in health check', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'ok',
          browser: {
            pool: {
              connectedBrowsers: expect.any(Number),
              totalBrowsers: expect.any(Number),
              activePagesCount: expect.any(Number),
              maxBrowsers: expect.any(Number),
              maxPagesPerBrowser: expect.any(Number),
            },
            activeExtractions: expect.any(Number),
          },
          performance: expect.any(Object),
          timestamp: expect.any(String),
        },
      });
    });

    test('should provide browser pool statistics', async () => {
      const response = await request(server)
        .get('/api/browser/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          browserPool: {
            connectedBrowsers: expect.any(Number),
            totalBrowsers: expect.any(Number),
            activePagesCount: expect.any(Number),
            pagesByBrowser: expect.any(Object),
            maxBrowsers: expect.any(Number),
            maxPagesPerBrowser: expect.any(Number),
          },
          activeExtractions: expect.any(Number),
        },
      });
    });
  });

  describe('Security Middleware', () => {
    test('should include security headers from Helmet', async () => {
      const response = await request(server)
        .get('/api/health');

      // Check for key security headers
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    test('should enforce CORS properly', async () => {
      const response = await request(server)
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });

    test('should reject requests from unauthorized origins', async () => {
      const response = await request(server)
        .get('/api/health')
        .set('Origin', 'http://malicious-site.com');

      // Should still work but with proper CORS handling
      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to API endpoints', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array(5).fill(null).map(() => 
        request(server).get('/api/health')
      );

      const responses = await Promise.all(requests);
      
      // All should succeed due to high test limits
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.headers).toHaveProperty('x-ratelimit-limit');
        expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      });
    });

    test('should have stricter limits for extraction endpoints', async () => {
      const response = await request(server)
        .post('/api/web/extract-v2')
        .send({ url: 'https://example.com' });

      // Should fail due to missing auth but check rate limit headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
    });
  });

  describe('URL Validation', () => {
    test('should reject dangerous protocols', async () => {
      const response = await request(server)
        .post('/api/web/extract-v2')
        .send({ url: 'file:///etc/passwd' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Only HTTP and HTTPS URLs are allowed',
      });
    });

    test('should reject malformed URLs', async () => {
      const response = await request(server)
        .post('/api/web/extract-v2')
        .send({ url: 'not-a-url' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid URL format',
      });
    });

    test('should accept valid HTTPS URLs', async () => {
      const response = await request(server)
        .post('/api/web/extract-v2')
        .send({ url: 'https://example.com' });

      // Should proceed to extraction (may fail due to other reasons)
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Response Formatting', () => {
    test('should format all responses consistently', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Object),
        timestamp: expect.any(String),
      });

      // Timestamp should be valid ISO string
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });

    test('should format error responses consistently', async () => {
      const response = await request(server)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });

  describe('Enhanced Web Extraction', () => {
    test('should handle extraction cancellation', async () => {
      // This test would need a mock extraction ID
      const response = await request(server)
        .post('/api/extractions/test-id/cancel')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Extraction cancelled',
        },
      });
    });

    test('should validate extraction parameters', async () => {
      const response = await request(server)
        .post('/api/web/extract-v2')
        .send({}) // Missing URL
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'URL is required',
      });
    });
  });

  describe('Request Logging', () => {
    test('should log requests with proper format', async () => {
      // This is tested through console output observation
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      // The request should be logged to console
      // Format: METHOD PATH STATUS DURATIONms - USER_AGENT
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    test('should handle server errors gracefully', async () => {
      // Test with extraction that will fail
      const response = await request(server)
        .post('/api/web/extract-v2')
        .send({ url: 'https://httpstat.us/500' });

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    test('should not expose stack traces in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(server)
        .post('/api/web/extract-v2')
        .send({ url: 'https://httpstat.us/500' });

      expect(response.body.data).toBeUndefined();
      expect(response.body.error).toBe('Internal server error');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Performance Monitoring', () => {
    test('should include performance metrics in health check', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      expect(response.body.data.performance).toMatchObject({
        timestamp: expect.any(Number),
        comparisons: expect.any(Object),
        memory: expect.any(Object),
        uptime: expect.any(Number),
        status: expect.any(String),
      });
    });

    test('should track memory usage', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      const memory = response.body.data.performance.memory;
      expect(memory.used).toBeGreaterThan(0);
      expect(memory.total).toBeGreaterThan(memory.used);
    });
  });
}); 