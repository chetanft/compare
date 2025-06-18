/**
 * API Endpoint Integration Tests
 * Tests the REAL server endpoints, not mocks
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

// Test against the real server
let serverProcess;
const TEST_PORT = 3002;
let BASE_URL = `http://localhost:${TEST_PORT}`;

const startRealServer = () => {
  return new Promise((resolve, reject) => {
    console.log('Starting real server for testing...');
    
    serverProcess = spawn('node', ['server.js'], {
      env: { ...process.env, PORT: TEST_PORT },
      stdio: 'pipe'
    });

    let serverReady = false;
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Server output:', output);
      
      // Look for any indication that the server is running
      if ((output.includes('running at http://localhost:') || 
           output.includes('Server running on port') ||
           output.includes('Open http://localhost:')) && !serverReady) {
        
        // Extract the actual port from the output
        const portMatch = output.match(/localhost:(\d+)/);
        if (portMatch) {
          const actualPort = portMatch[1];
          // Update our BASE_URL to use the actual port
          BASE_URL = `http://localhost:${actualPort}`;
          console.log(`✅ Real server started on port ${actualPort}`);
        }
        
        serverReady = true;
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server stderr:', data.toString());
    });

    serverProcess.on('error', (error) => {
      console.error('Server process error:', error);
      reject(error);
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('Real server failed to start within 15 seconds'));
      }
    }, 15000);
  });
};

const stopRealServer = () => {
  return new Promise((resolve) => {
    if (serverProcess) {
      console.log('Stopping real server...');
      serverProcess.kill('SIGTERM');
      serverProcess.on('exit', () => {
        console.log('✅ Real server stopped');
        resolve();
      });
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (serverProcess) {
          serverProcess.kill('SIGKILL');
          resolve();
        }
      }, 5000);
    } else {
      resolve();
    }
  });
};

describe('Real API Endpoints Integration Tests', () => {
  beforeAll(async () => {
    await startRealServer();
    // Wait a bit more for server to be fully ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 30000); // 30 second timeout for server startup

  afterAll(async () => {
    await stopRealServer();
  }, 10000);

  describe('Health and Info Endpoints', () => {
    test('GET /api/health should return real health status', async () => {
      const response = await axios.get(`${BASE_URL}/api/health`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('components');
    });

    test('GET /api/settings/current should return current settings', async () => {
      const response = await axios.get(`${BASE_URL}/api/settings/current`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('settings');
      expect(response.data.settings).toHaveProperty('figmaApi');
      expect(response.data.settings).toHaveProperty('mcpServer');
    });
  });

  describe('Figma URL Parser Endpoint', () => {
    test('POST /api/parse-figma-url should parse valid Figma URLs', async () => {
      const testUrl = 'https://www.figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys?node-id=2-22260';
      
      const response = await axios.post(`${BASE_URL}/api/parse-figma-url`, { url: testUrl });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data.data).toHaveProperty('fileId', 'fb5Yc1aKJv9YWsMLnNlWeK');
      expect(response.data.data).toHaveProperty('nodeId');
      expect(response.data.data).toHaveProperty('fileName');
      expect(response.data.data).toHaveProperty('urlType');
    });

    test('POST /api/parse-figma-url should reject invalid URLs', async () => {
      try {
        await axios.post(`${BASE_URL}/api/parse-figma-url`, { url: 'https://invalid-url.com' });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
      }
    });
  });

  describe('Test Endpoints', () => {
    test('POST /api/test/figma should test Figma connection', async () => {
      const response = await axios.post(`${BASE_URL}/api/test/figma`, { 
        figmaFileId: 'fb5Yc1aKJv9YWsMLnNlWeK',  // Correct parameter name
        nodeId: '2:22260'
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success');
      expect(response.data).toHaveProperty('data');
    });

    test('POST /api/test/web should test web extraction', async () => {
      const response = await axios.post(`${BASE_URL}/api/test/web`, { 
        webUrl: 'https://httpbin.org/html'  // Correct parameter name
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success');
      expect(response.data).toHaveProperty('data');
    });
  });

  describe('Reports Endpoint', () => {
    test('GET /api/reports should list available reports', async () => {
      const response = await axios.get(`${BASE_URL}/api/reports`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('reports');
      expect(Array.isArray(response.data.reports)).toBe(true);
    });
  });

  describe('Main Comparison Endpoint', () => {
    test('POST /api/compare should validate required parameters', async () => {
      try {
        await axios.post(`${BASE_URL}/api/compare`, {}); // Missing required params
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data.error).toContain('Missing required parameters');
      }
    });

    test('POST /api/compare should validate Figma URL format', async () => {
      try {
        await axios.post(`${BASE_URL}/api/compare`, {
          figmaUrl: 'https://invalid-url.com',
          webUrl: 'https://httpbin.org/html'
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data.error).toContain('Invalid Figma URL');
      }
    });

    // Note: We're not testing the full comparison here because it requires
    // valid Figma tokens and can be slow. That should be in separate E2E tests.
  });

  describe('Settings Endpoints', () => {
    test('POST /api/settings/test-connection should test connections', async () => {
      const response = await axios.post(`${BASE_URL}/api/settings/test-connection`, {
        method: 'api',  // Required parameter
        accessToken: 'test-token'  // Correct parameter structure
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success');
      expect(response.data).toHaveProperty('message');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for unknown endpoints', async () => {
      try {
        await axios.get(`${BASE_URL}/api/unknown-endpoint`);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });

    test('should handle malformed JSON', async () => {
      try {
        await axios.post(`${BASE_URL}/api/compare`, 'invalid-json', {
          headers: { 'Content-Type': 'application/json' }
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });
}); 