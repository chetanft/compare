#!/usr/bin/env node

/**
 * Figma MCP Server
 * Implements Model Context Protocol for Figma API integration
 * Based on the reference architecture provided
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FigmaMCPServer {
  constructor() {
    this.port = 3845;
    this.configPath = path.join(__dirname, 'config.json');
    this.server = null;
  }

  /**
   * Load Figma API key from config
   */
  loadFigmaApiKey() {
    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        return config.figmaApiKey || process.env.FIGMA_API_KEY || '';
      }
    } catch (error) {
      console.error('Error loading config:', error.message);
    }
    return process.env.FIGMA_API_KEY || '';
  }

  /**
   * Handle MCP JSON-RPC requests
   */
  async handleMCPRequest(request) {
    const { method, params, id } = request;

    try {
      switch (method) {
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
                resources: {}
              },
              serverInfo: {
                name: 'figma-mcp-server',
                version: '1.0.0'
              },
              sessionId: `session_${Date.now()}`
            }
          };

        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: [
                {
                  name: 'get_figma_file',
                  description: 'Get Figma file data',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      fileId: { type: 'string' },
                      nodeId: { type: 'string', optional: true }
                    }
                  }
                },
                {
                  name: 'test_connection',
                  description: 'Test Figma API connection',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      apiKey: { type: 'string', optional: true }
                    }
                  }
                }
              ]
            }
          };

        case 'tools/call':
          return await this.handleToolCall(params, id);

        default:
          throw new Error(`Unknown method: ${method}`);
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error.message
        }
      };
    }
  }

  /**
   * Handle tool calls
   */
  async handleToolCall(params, id) {
    const { name, arguments: args } = params;
    const apiKey = args.apiKey || this.loadFigmaApiKey();

    switch (name) {
      case 'test_connection':
        return await this.testFigmaConnection(apiKey, id);
      
      case 'get_figma_file':
        return await this.getFigmaFile(args.fileId, args.nodeId, apiKey, id);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Test Figma API connection
   */
  async testFigmaConnection(apiKey, id) {
    if (!apiKey) {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'No Figma API key provided',
              type: 'no-token'
            })
          }]
        }
      };
    }

    try {
      const response = await fetch('https://api.figma.com/v1/me', {
        headers: { 'X-Figma-Token': apiKey }
      });

      if (response.ok) {
        const userData = await response.json();
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Connected to Figma API as ${userData.email || 'user'}`,
                type: 'figma-api',
                user: userData.email
              })
            }]
          }
        };
      } else {
        const errorData = await response.json();
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Figma API error: ${errorData.err || response.statusText}`,
                type: 'invalid-token'
              })
            }]
          }
        };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Connection failed: ${error.message}`,
              type: 'api-error'
            })
          }]
        }
      };
    }
  }

  /**
   * Get Figma file data
   */
  async getFigmaFile(fileId, nodeId, apiKey, id) {
    if (!apiKey) {
      throw new Error('Figma API key not configured');
    }

    try {
      let apiUrl = `https://api.figma.com/v1/files/${fileId}`;
      if (nodeId) {
        apiUrl = `https://api.figma.com/v1/files/${fileId}/nodes?ids=${nodeId}`;
      }

      const response = await fetch(apiUrl, {
        headers: { 'X-Figma-Token': apiKey }
      });

      if (!response.ok) {
        throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
      }

      const figmaData = await response.json();
      
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify(figmaData)
          }]
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch Figma file: ${error.message}`);
    }
  }

  /**
   * Start the MCP server
   */
  start() {
    this.server = http.createServer(async (req, res) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method === 'POST' && req.url === '/mcp') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const request = JSON.parse(body);
            const response = await this.handleMCPRequest(request);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              id: null,
              error: {
                code: -32700,
                message: 'Parse error'
              }
            }));
          }
        });
      } else if (req.method === 'GET' && req.url === '/sse') {
        // Health check endpoint
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'MCP server running', port: this.port }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    this.server.listen(this.port, '127.0.0.1', () => {
      console.log(`🚀 Figma MCP Server running on http://127.0.0.1:${this.port}`);
      console.log(`📡 MCP endpoint: http://127.0.0.1:${this.port}/mcp`);
      console.log(`🔍 Health check: http://127.0.0.1:${this.port}/sse`);
    });

    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${this.port} is busy, trying ${this.port + 1}`);
        this.port++;
        this.server.listen(this.port, '127.0.0.1');
      } else {
        console.error('❌ MCP Server error:', error);
      }
    });
  }

  /**
   * Stop the MCP server
   */
  stop() {
    if (this.server) {
      this.server.close();
      console.log('🛑 Figma MCP Server stopped');
    }
  }
}

// Start the server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const mcpServer = new FigmaMCPServer();
  mcpServer.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down MCP server...');
    mcpServer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🔄 Shutting down MCP server...');
    mcpServer.stop();
    process.exit(0);
  });
}

export default FigmaMCPServer;
