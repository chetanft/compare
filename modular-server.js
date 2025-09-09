/**
 * Modular macOS Server - Production Grade Architecture
 * Clean, maintainable, and scalable like the web app
 */

import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Modular imports
import { ConfigService } from './macos-server/config/ConfigService.js';
import { FigmaApiService } from './macos-server/services/FigmaApiService.js';
import { ApiRoutes } from './macos-server/routes/apiRoutes.js';

// Production integrations
import UnifiedWebExtractor from './src/web/UnifiedWebExtractor.js';
import { ComparisonService } from './src/compare/ComparisonService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3007;

console.log('🚀 Starting Modular Figma Comparison Tool...');

// Initialize services with error handling
let configService, figmaApiService;
try {
  configService = new ConfigService();
  figmaApiService = new FigmaApiService(configService);
  console.log('✅ Core services initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize core services:', error.message);
  process.exit(1);
}

let services, apiRoutes;
try {
  services = {
    configService,
    figmaApiService,
    webExtractor: UnifiedWebExtractor,
    comparisonService: ComparisonService
  };

  // Initialize routes
  apiRoutes = new ApiRoutes(services);
  console.log('✅ API routes initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize API routes:', error.message);
  console.error('❌ Stack trace:', error.stack);
  process.exit(1);
}

console.log('✅ Services initialized - modular architecture active!');

// Create HTTP server
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // Handle API requests
  if (pathname.startsWith('/api/')) {
    apiRoutes.handleApiRequest(pathname, req, res);
    return;
  }
  
  // Handle hello page for testing
  if (pathname === '/hello') {
    handleHelloPage(req, res);
    return;
  }
  
  // Serve React frontend (default)
  handleStaticFiles(req, res, pathname);
});

/**
 * Hello page for API testing
 */
function handleHelloPage(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Figma Comparison Tool - API Test</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; }
            .container { max-width: 800px; margin: 0 auto; }
            .api-info { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .status { color: #007aff; font-weight: bold; }
            code { background: #e8e8e8; padding: 2px 6px; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 Modular Figma Comparison Tool</h1>
            <p class="status">✅ Server running with clean architecture!</p>
            
            <div class="api-info">
                <h3>🎯 Production Features</h3>
                <p>✅ <strong>Modular Architecture</strong> - Clean separation like web app</p>
                <p>✅ <strong>ConfigService</strong> - Centralized configuration management</p>
                <p>✅ <strong>FigmaApiService</strong> - Direct Figma API integration</p>
                <p>✅ <strong>ApiRoutes</strong> - Organized endpoint handling</p>
                <p>✅ <strong>Real Data</strong> - Production-grade integrations</p>
                
                <h3>📡 API Endpoints</h3>
                <p>✅ <code>/api/health</code> - Server health check</p>
                <p>✅ <code>/api/status</code> - Feature status</p>
                <p>🔧 <code>/api/settings/test-connection</code> - Test Figma API</p>
                <p>💾 <code>/api/settings/save</code> - Save settings</p>
                <p>🎯 <code>/api/figma/parse</code> - Parse Figma URLs</p>
                <p>🎯 <code>/api/figma/extract</code> - Extract Figma data</p>
                <p>🌐 <code>/api/web/extract</code> - Web extraction</p>
                <p>⚖️ <code>/api/compare</code> - Compare designs</p>
            </div>
            
            <h3>📊 Server Info</h3>
            <p>Port: ${PORT}</p>
            <p>Node.js: ${process.version}</p>
            <p>Platform: ${process.platform}</p>
            <p>Uptime: ${Math.round(process.uptime())}s</p>
            
            <p><a href="/">← Back to React App</a></p>
        </div>
    </body>
    </html>
  `);
}

/**
 * Static file serving for React frontend
 */
function handleStaticFiles(req, res, pathname) {
  const frontendPath = path.join(__dirname, 'frontend', 'dist');
  
  if (!fs.existsSync(frontendPath)) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>Frontend Not Built</h1>
      <p>Please run: <code>npm run build:frontend</code></p>
      <p><a href="/hello">API Test Page</a></p>
    `);
    return;
  }

  // Serve index.html for root
  if (pathname === '/') {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(indexPath));
      return;
    }
  }

  // Serve static assets
  const filePath = path.join(frontendPath, pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = getContentType(ext);
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
    return;
  }

  // SPA routing - serve index.html for non-API routes
  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(indexPath));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
  }
}

/**
 * Get content type for file extension
 */
function getContentType(ext) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Start server with port auto-increment
 */
function startServer(port) {
  server.listen(port, () => {
    console.log('🎯 Modular Figma Comparison Tool running at http://localhost:' + port);
    console.log('✅ Clean architecture - services properly separated!');
    console.log('🔧 ConfigService: Configuration management');
    console.log('🎯 FigmaApiService: Direct Figma API integration');
    console.log('📡 ApiRoutes: Organized endpoint handling');
    console.log('🌐 Frontend: React SPA ready');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      server.close();
      startServer(port + 1);
    } else {
      console.error('❌ Server error:', err);
    }
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the server
startServer(PORT);
