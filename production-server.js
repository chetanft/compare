/**
 * Production-specific server for macOS app
 * Handles ASAR packaging and Electron environment differences
 */

import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3007;

console.log('🚀 Starting Production Figma Comparison Tool...');
console.log('📁 Working directory:', process.cwd());
console.log('📂 __dirname:', __dirname);

// Production-specific initialization with fallbacks
let configService, figmaApiService, webExtractor, comparisonService, apiRoutes;

async function initializeServices() {
  try {
    // Import with dynamic imports for better error handling
    console.log('📦 Loading ConfigService...');
    const { ConfigService } = await import('./macos-server/config/ConfigService.js');
    configService = new ConfigService();
    console.log('✅ ConfigService loaded');

    console.log('📦 Loading FigmaApiService...');
    const { FigmaApiService } = await import('./macos-server/services/FigmaApiService.js');
    figmaApiService = new FigmaApiService(configService);
    console.log('✅ FigmaApiService loaded');

    console.log('📦 Loading UnifiedWebExtractor...');
    const UnifiedWebExtractorModule = await import('./src/web/UnifiedWebExtractor.js');
    webExtractor = UnifiedWebExtractorModule.default;
    console.log('✅ UnifiedWebExtractor loaded');

    console.log('📦 Loading ComparisonService...');
    const { ComparisonService } = await import('./src/compare/ComparisonService.js');
    comparisonService = ComparisonService;
    console.log('✅ ComparisonService loaded');

    console.log('📦 Loading ApiRoutes...');
    const { ApiRoutes } = await import('./macos-server/routes/apiRoutes.js');
    
    const services = {
      configService,
      figmaApiService,
      webExtractor,
      comparisonService
    };

    apiRoutes = new ApiRoutes(services);
    console.log('✅ ApiRoutes loaded');

    return true;
  } catch (error) {
    console.error('❌ Service initialization failed:', error.message);
    console.error('❌ Stack trace:', error.stack);
    return false;
  }
}

// Initialize services and start server
async function startServer() {
  const initialized = await initializeServices();
  
  if (!initialized) {
    console.error('❌ Failed to initialize services, exiting...');
    process.exit(1);
  }

  console.log('✅ All services initialized - starting HTTP server...');

  // Create HTTP server
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      // Route API requests
      if (url.pathname.startsWith('/api/')) {
        await apiRoutes.handleApiRequest(url.pathname, req, res);
        return;
      }

      // Serve static files
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const indexPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
        if (fs.existsSync(indexPath)) {
          const content = fs.readFileSync(indexPath, 'utf8');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
          return;
        }
      }

      // Serve other static assets
      const filePath = path.join(__dirname, 'frontend', 'dist', url.pathname);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const contentType = {
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.html': 'text/html',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml'
        }[ext] || 'application/octet-stream';

        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
        return;
      }

      // SPA fallback - serve index.html for client-side routing
      if (!url.pathname.startsWith('/api/')) {
        const indexPath = path.join(__dirname, 'frontend', 'dist', 'index.html');
        if (fs.existsSync(indexPath)) {
          const content = fs.readFileSync(indexPath, 'utf8');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
          return;
        }
      }

      // 404 for everything else
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');

    } catch (error) {
      console.error('❌ Request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  });

  // Start listening
  server.listen(PORT, () => {
    console.log('🎯 Production Figma Comparison Tool running at http://localhost:' + PORT);
    console.log('✅ Clean architecture - services properly separated!');
    console.log('🔧 ConfigService: Configuration management');
    console.log('🎯 FigmaApiService: Direct Figma API integration');
    console.log('📡 ApiRoutes: Organized endpoint handling');
    console.log('🌐 Frontend: React SPA ready');
  });

  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${PORT} is busy, trying ${PORT + 1}...`);
      server.listen(PORT + 1);
    } else {
      console.error('❌ Server error:', error);
      process.exit(1);
    }
  });
}

// Handle process termination
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
