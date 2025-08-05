/**
 * Integration tests for the updated server
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { startServer } from '../../src/core/server/index.js';

describe('Server Integration Tests', () => {
  let server;
  let app;

  beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0'; // Use random port
    process.env.FIGMA_API_KEY = 'test-key';
    process.env.MCP_ENABLED = 'false'; // Disable MCP for tests
    
    server = await startServer();
    app = server;
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('Health endpoints', () => {
    test('GET /api/health should return server status', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'ok',
          mcp: false,
          webSocket: expect.any(Object),
          timestamp: expect.any(String),
          performance: expect.any(Object),
        },
      });
    });

    test('GET /api/v1/health should return detailed health info', async () => {
      const response = await request(server)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'ok',
          uptime: expect.any(Number),
          timestamp: expect.any(String),
          performance: expect.any(Object),
          version: expect.any(String),
          node: expect.any(String),
        },
      });
    });

    test('GET /api/v1/health/ready should return readiness status', async () => {
      const response = await request(server)
        .get('/api/v1/health/ready')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'ready',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('API versioning', () => {
    test('Should handle both /api and /api/v1 prefixes', async () => {
      const [legacyResponse, v1Response] = await Promise.all([
        request(server).get('/api/health'),
        request(server).get('/api/v1/health'),
      ]);

      expect(legacyResponse.status).toBe(200);
      expect(v1Response.status).toBe(200);
    });
  });

  describe('Error handling', () => {
    test('Should return 404 for unknown API routes', async () => {
      const response = await request(server)
        .get('/api/unknown-route')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('not found'),
        timestamp: expect.any(String),
      });
    });

    test('Should handle malformed requests gracefully', async () => {
      const response = await request(server)
        .post('/api/v1/figma-only/extract')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });

  describe('Security middleware', () => {
    test('Should include security headers', async () => {
      const response = await request(server)
        .get('/api/health');

      // Check for helmet headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    test('Should enforce CORS', async () => {
      const response = await request(server)
        .options('/api/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Response format', () => {
    test('Should format all API responses consistently', async () => {
      const response = await request(server)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Object),
        timestamp: expect.any(String),
      });
    });
  });
}); 