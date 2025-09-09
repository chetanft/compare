/**
 * Unified Production Server
 * Single server implementation with standardized API responses
 */

import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CompareAPI } from './src/api/compare.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class UnifiedServer {
  constructor() {
    this.port = process.env.PORT || 3007;
    this.services = {};
    this.compareAPI = null;
  }

  async initializeServices() {
    console.log('📦 Initializing services...');
    
    // Try to load services from different locations
    let services = {};
    
    try {
      // Try macos-server services
      const { default: ConfigService } = await import('./macos-server/config/ConfigService.js');
      services.configService = new ConfigService();
      console.log('✅ ConfigService loaded');
    } catch (error) {
      console.log('⚠️ ConfigService not available:', error.message);
    }

    try {
      const { default: FigmaApiService } = await import('./macos-server/services/FigmaApiService.js');
      services.figmaService = new FigmaApiService(services.configService);
      console.log('✅ FigmaApiService loaded');
    } catch (error) {
      console.log('⚠️ FigmaApiService not available:', error.message);
    }

    try {
      const { default: UnifiedWebExtractor } = await import('./src/web/UnifiedWebExtractor.js');
      services.webExtractor = UnifiedWebExtractor;
      console.log('✅ UnifiedWebExtractor loaded');
    } catch (error) {
      console.log('⚠️ UnifiedWebExtractor not available:', error.message);
    }

    try {
      const { default: ComparisonService } = await import('./src/compare/ComparisonService.js');
      services.comparisonService = ComparisonService;
      console.log('✅ ComparisonService loaded');
    } catch (error) {
      console.log('⚠️ ComparisonService not available:', error.message);
    }

    return services;
  }

  async start() {
    // Initialize services first
    this.services = await this.initializeServices();
    this.compareAPI = new CompareAPI(this.services);
    
    const server = createServer(async (req, res) => {
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://localhost:${this.port}`);
      const pathname = url.pathname;

      console.log(`📥 ${req.method} ${pathname}`);

      // API Routes
      if (pathname.startsWith('/api/')) {
        await this.handleApiRequest(req, res, pathname);
      } 
      // Static file serving
      else {
        await this.handleStaticFile(req, res, pathname);
      }
    });

    server.listen(this.port, () => {
      console.log('🚀 Unified Production Server Started');
      console.log(`🎯 Server running at http://localhost:${this.port}`);
      console.log('✅ Standardized API responses enabled');
      console.log('🔧 Services loaded:', Object.keys(this.services).join(', '));
    });

    return server;
  }

  async handleApiRequest(req, res, pathname) {
    try {
      switch (pathname) {
        case '/api/health':
          this.handleHealth(req, res);
          break;
          
        case '/api/compare':
          if (req.method === 'POST') {
            const body = await this.getRequestBody(req);
            req.body = JSON.parse(body);
            await this.compareAPI.handleCompareRequest(req, res);
          } else {
            this.sendError(res, 405, 'Method not allowed');
          }
          break;
          
        case '/api/reports/list':
          this.handleReportsList(req, res);
          break;
          
        case '/api/mcp/status':
          this.handleMCPStatus(req, res);
          break;
          
        default:
          this.sendError(res, 404, 'API endpoint not found', {
            available: ['/api/health', '/api/compare', '/api/reports/list', '/api/mcp/status']
          });
      }
    } catch (error) {
      console.error('❌ API Error:', error);
      this.sendError(res, 500, 'Internal server error', { message: error.message });
    }
  }

  handleHealth(req, res) {
    const response = {
      success: true,
      data: {
        status: 'healthy',
        message: 'Unified server is running',
        version: '4.0.0',
        uptime: process.uptime(),
        services: Object.keys(this.services)
      },
      timestamp: new Date().toISOString()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  handleReportsList(req, res) {
    // Mock reports list for now
    const response = {
      success: true,
      data: {
        reports: [],
        total: 0
      },
      timestamp: new Date().toISOString()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  handleMCPStatus(req, res) {
    const response = {
      success: true,
      data: {
        available: false,
        serverUrl: null,
        status: 'unavailable',
        message: 'MCP not configured in unified server'
      },
      timestamp: new Date().toISOString()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }

  async handleStaticFile(req, res, pathname) {
    // Serve frontend files
    const frontendDir = join(__dirname, 'frontend', 'dist');
    
    let filePath;
    if (pathname === '/') {
      filePath = join(frontendDir, 'index.html');
    } else {
      filePath = join(frontendDir, pathname);
    }

    try {
      if (existsSync(filePath)) {
        const content = readFileSync(filePath);
        const ext = filePath.split('.').pop();
        const contentType = this.getContentType(ext);
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } else {
        // Fallback to index.html for SPA routing
        const indexPath = join(frontendDir, 'index.html');
        if (existsSync(indexPath)) {
          const content = readFileSync(indexPath);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
        } else {
          this.sendError(res, 404, 'File not found');
        }
      }
    } catch (error) {
      console.error('Static file error:', error);
      this.sendError(res, 500, 'Error serving file');
    }
  }

  getContentType(ext) {
    const types = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon'
    };
    return types[ext] || 'application/octet-stream';
  }

  async getRequestBody(req) {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
    });
  }

  sendError(res, statusCode, message, details = {}) {
    const response = {
      success: false,
      error: {
        message,
        code: `HTTP_${statusCode}`,
        details
      },
      timestamp: new Date().toISOString()
    };
    
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }
}

// Start the server
const server = new UnifiedServer();
server.start().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
