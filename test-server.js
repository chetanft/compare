#!/usr/bin/env node

/**
 * Test Server - Minimal implementation to test the clean architecture
 * This demonstrates the complete rewrite without dependency issues
 */

// Simple HTTP server without external dependencies
import { createServer } from 'http';
import { parse } from 'url';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock MCP client for testing
class MockMCPClient {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    console.log('🔌 Mock MCP: Attempting connection...');
    // Simulate connection - in real implementation this would connect to Figma Dev Mode MCP
    this.isConnected = Math.random() > 0.5; // Random success/failure for demo
    console.log(`🔌 Mock MCP: ${this.isConnected ? 'Connected' : 'Failed to connect'}`);
    return this.isConnected;
  }

  async extractFigmaData(figmaUrl) {
    if (!this.isConnected) {
      throw new Error('MCP not connected');
    }

    console.log('🎨 Mock MCP: Extracting Figma data from:', figmaUrl);
    
    // Mock Figma data extraction
    return {
      colors: [
        { name: 'Primary Blue', value: '#3B82F6', hex: '#3B82F6', source: 'figma' },
        { name: 'Secondary Gray', value: '#6B7280', hex: '#6B7280', source: 'figma' },
        { name: 'Success Green', value: '#10B981', hex: '#10B981', source: 'figma' }
      ],
      typography: [
        { name: 'Heading 1', fontFamily: 'Inter', fontSize: 32, fontWeight: 600, source: 'figma' },
        { name: 'Body Text', fontFamily: 'Inter', fontSize: 16, fontWeight: 400, source: 'figma' }
      ],
      components: [
        { id: 'btn-1', name: 'Primary Button', type: 'button', source: 'figma' },
        { id: 'card-1', name: 'Product Card', type: 'card', source: 'figma' }
      ],
      metadata: {
        fileName: 'Test Design',
        extractedAt: new Date().toISOString(),
        extractionMethod: 'figma-dev-mode-mcp',
        version: '1.0.0'
      }
    };
  }
}

// Initialize mock services
const mcpClient = new MockMCPClient();
let mcpConnected = false;

// Connect to MCP on startup
mcpClient.connect().then(connected => {
  mcpConnected = connected;
});

// Simple JSON response helper
function jsonResponse(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Create server
const server = createServer(async (req, res) => {
  const { pathname, query } = parse(req.url, true);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // API Routes
  if (pathname === '/api/health') {
    jsonResponse(res, {
      status: 'ok',
      mcp: mcpConnected,
      timestamp: new Date().toISOString(),
      message: 'Clean MCP-only architecture test server'
    });
    return;
  }

  if (pathname === '/api/settings/test-connection') {
    try {
      const connected = await mcpClient.connect();
      mcpConnected = connected;
      
      if (connected) {
        jsonResponse(res, {
          success: true,
          message: 'Connected to Figma Dev Mode MCP Server (Mock)',
          type: 'official-mcp'
        });
      } else {
        jsonResponse(res, {
          success: false,
          error: 'Figma Dev Mode MCP server not available (Mock)',
          type: 'mcp-unavailable'
        });
      }
    } catch (error) {
      jsonResponse(res, {
        success: false,
        error: `MCP connection test failed: ${error.message}`
      }, 500);
    }
    return;
  }

  if (pathname === '/api/figma-only/extract' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { figmaUrl } = data;

        if (!figmaUrl) {
          jsonResponse(res, {
            success: false,
            error: 'Figma URL is required'
          }, 400);
          return;
        }

        // Check MCP connection
        if (!mcpConnected) {
          mcpConnected = await mcpClient.connect();
          
          if (!mcpConnected) {
            jsonResponse(res, {
              success: false,
              error: 'Figma Dev Mode MCP server not available (Mock)'
            }, 503);
            return;
          }
        }

        // Extract data using MCP
        const figmaData = await mcpClient.extractFigmaData(figmaUrl);
        
        jsonResponse(res, {
          success: true,
          data: figmaData
        });
      } catch (error) {
        console.error('❌ Figma extraction failed:', error.message);
        jsonResponse(res, {
          success: false,
          error: `Figma extraction failed: ${error.message}`
        }, 500);
      }
    });
    return;
  }

  // Serve frontend
  if (pathname === '/' || pathname === '/index.html') {
    try {
      const indexPath = join(__dirname, 'frontend/dist/index.html');
      const content = await readFile(indexPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Frontend not built. Run: npm run build:frontend');
    }
    return;
  }

  // 404 for other routes
  jsonResponse(res, {
    error: 'Not found',
    message: 'This is the clean MCP-only test server'
  }, 404);
});

// Start server
const port = 3007;
server.listen(port, () => {
  console.log('🚀 Clean MCP Test Server running at http://localhost:3007');
  console.log('📱 Frontend available at http://localhost:3007');
  console.log(`🔌 MCP Status: ${mcpConnected ? 'Connected' : 'Disconnected'} (Mock)`);
  console.log('');
  console.log('🧪 Test endpoints:');
  console.log('  GET  /api/health');
  console.log('  POST /api/settings/test-connection');
  console.log('  POST /api/figma-only/extract');
  console.log('');
  console.log('💡 This demonstrates the complete rewrite without dependencies');
  console.log('🔧 To use real MCP: fix node_modules permissions and run server.js');
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test server...');
  server.close(() => {
    process.exit(0);
  });
}); 