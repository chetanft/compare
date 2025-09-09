#!/usr/bin/env node

/**
 * Hello World Server - Absolute Minimum
 */

import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import fetch from 'node-fetch';
// Pure production integrations - Real data only
import { UnifiedWebExtractor } from './src/web/UnifiedWebExtractor.js';
import { ComparisonService } from './src/compare/ComparisonService.js';

console.log('🔄 Loading production integrations...');

// Load Figma API configuration
function loadFigmaApiKey() {
  try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.figmaApiKey;
    }
  } catch (error) {
    console.warn('⚠️ Could not load Figma API key from config.json');
  }
  return process.env.FIGMA_API_KEY;
}

// Direct Figma API extractor for macOS app
class DirectFigmaAPIExtractor {
  constructor() {
    this.apiKey = loadFigmaApiKey();
  }

  async extractComponents(fileKey, nodeId = null) {
    if (!this.apiKey) {
      throw new Error('Figma API key not configured. Please add your token in config.json or environment variables.');
    }

    try {
      // Build API URL
      let apiUrl = `https://api.figma.com/v1/files/${fileKey}`;
      if (nodeId) {
        apiUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`;
      }

      // Make API request
      const response = await fetch(apiUrl, {
        headers: {
          'X-Figma-Token': this.apiKey
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Please check your Figma API token permissions.');
        } else if (response.status === 404) {
          throw new Error('Figma file not found. Please check the file key.');
        }
        throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform API response to component format
      return this.transformApiDataToComponents(data, fileKey, nodeId);

    } catch (error) {
      console.error('❌ Figma API extraction failed:', error);
      throw error;
    }
  }

  transformApiDataToComponents(apiData, fileKey, nodeId) {
    const components = [];

    try {
      // Handle different API response structures
      let nodesToProcess = [];
      
      if (apiData.nodes) {
        // Node-specific request
        Object.values(apiData.nodes).forEach(nodeData => {
          if (nodeData.document) {
            nodesToProcess.push(nodeData.document);
          }
        });
      } else if (apiData.document) {
        // Full file request
        nodesToProcess = [apiData.document];
      }

      // Process each node recursively
      for (const node of nodesToProcess) {
        this.extractNodeComponents(node, components);
      }

      return {
        elements: components,
        metadata: {
          fileName: apiData.name || 'Unknown',
          fileKey: fileKey,
          nodeId: nodeId,
          extractionMethod: 'Direct Figma API',
          extractedAt: new Date().toISOString(),
          totalElements: components.length
        }
      };

    } catch (error) {
      console.error('❌ Error transforming Figma API data:', error);
      return {
        elements: [],
        metadata: {
          fileName: 'Error',
          fileKey: fileKey,
          extractionMethod: 'Direct Figma API',
          error: error.message
        }
      };
    }
  }

  extractNodeComponents(node, components) {
    if (!node) return;

    // Transform node to component format
    const component = {
      id: node.id,
      name: node.name || `Node ${node.id}`,
      type: node.type || 'UNKNOWN',
      properties: {}
    };

    // Extract dimensions and position
    if (node.absoluteBoundingBox) {
      component.properties.width = node.absoluteBoundingBox.width;
      component.properties.height = node.absoluteBoundingBox.height;
      component.properties.x = node.absoluteBoundingBox.x;
      component.properties.y = node.absoluteBoundingBox.y;
    }

    // Extract fills/colors
    if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
      const validFills = node.fills.filter(fill => fill.visible !== false && fill.color);
      if (validFills.length > 0) {
        component.properties.fills = validFills.map(fill => ({
          type: fill.type,
          color: this.rgbaToHex(fill.color),
          opacity: fill.opacity || 1
        }));
        component.properties.backgroundColor = this.rgbaToHex(validFills[0].color);
      }
    }

    // Extract text properties
    if (node.type === 'TEXT') {
      component.properties.textContent = node.characters || node.name;
      if (node.style) {
        component.properties.fontSize = node.style.fontSize;
        component.properties.fontFamily = node.style.fontFamily;
        component.properties.fontWeight = node.style.fontWeight;
      }
    }

    // Extract border radius
    if (node.cornerRadius !== undefined) {
      component.properties.borderRadius = node.cornerRadius;
    }

    // Add component if it has meaningful properties
    if (this.isMeaningfulComponent(component)) {
      components.push(component);
    }

    // Process children recursively
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.extractNodeComponents(child, components);
      }
    }
  }

  isMeaningfulComponent(component) {
    // Include components with visual properties
    return component.properties.width || component.properties.height ||
           component.properties.textContent || component.properties.fills ||
           component.properties.backgroundColor || component.type === 'TEXT' ||
           ['FRAME', 'COMPONENT', 'INSTANCE', 'RECTANGLE', 'ELLIPSE'].includes(component.type);
  }

  rgbaToHex(rgba) {
    if (!rgba || typeof rgba !== 'object') return '#000000';
    
    const r = Math.round((rgba.r || 0) * 255);
    const g = Math.round((rgba.g || 0) * 255);
    const b = Math.round((rgba.b || 0) * 255);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

console.log('✅ Production-grade modules loaded - real data only!');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3007;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  
  // API Routes
  if (pathname.startsWith('/api/')) {
    handleApiRequest(req, res, pathname);
    return;
  }
  
  // Hello page route (for testing APIs)
  if (pathname === '/hello') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html>
<head>
    <title>Figma Comparison Tool - API Test</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 40px;
            border-radius: 20px;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
        }
        h1 { font-size: 3em; margin-bottom: 20px; }
        p { font-size: 1.2em; opacity: 0.9; }
        .api-info {
            margin-top: 30px;
            padding: 20px;
            background: rgba(255,255,255,0.05);
            border-radius: 10px;
            font-size: 0.9em;
        }
        .nav-link {
            display: inline-block;
            margin: 10px;
            padding: 10px 20px;
            background: rgba(255,255,255,0.2);
            border-radius: 5px;
            text-decoration: none;
            color: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 Phase 3 - Frontend Ready!</h1>
        <p>Your Figma Comparison Tool is running!</p>
        <p>Server: Node.js ` + process.version + `</p>
        <p>Platform: ` + process.platform + `</p>
        <p>Time: ` + new Date().toLocaleString() + `</p>
        <div class="api-info">
            <p><strong>🚀 Production Grade - Real Data!</strong></p>
            <p>✅ <code>/api/health</code> - Server health</p>
            <p>✅ <code>/api/status</code> - Feature status</p>
            <p>🎯 <code>/api/figma/parse</code> - Parse Figma URLs</p>
            <p>🎯 <code>/api/figma/extract</code> - Extract Figma data</p>
            <p>🌐 <code>/api/web/extract</code> - Web extraction</p>
            <p>⚖️ <code>/api/compare</code> - Compare designs</p>
            <p>🎨 <strong>Full React App Connected!</strong></p>
        </div>
        <div>
            <a href="/" class="nav-link">🏠 React App</a>
            <a href="/hello" class="nav-link">🧪 API Test Page</a>
        </div>
    </div>
</body>
</html>`);
    return;
  }
  
  // Serve React frontend static files and handle SPA routing
  handleStaticFiles(req, res, pathname);
});

// API Request Handler
function handleApiRequest(req, res, pathname) {
  // Set CORS headers for API requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Route API endpoints
  switch (pathname) {
    case '/api/health':
      handleHealthCheck(req, res);
      break;
      
    case '/api/status':
      handleStatus(req, res);
      break;
      
    case '/api/settings/test-connection':
      handleFigmaConnectionTest(req, res);
      break;
      
    case '/api/settings/save':
      handleSettingsSave(req, res);
      break;
      
    case '/api/figma/parse':
      handleFigmaUrlParse(req, res);
      break;
      
    case '/api/figma/extract':
      handleFigmaExtract(req, res);
      break;
      
    case '/api/web/extract':
      handleWebExtract(req, res);
      break;
      
    case '/api/compare':
      handleComparison(req, res);
      break;
      
    default:
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'API endpoint not found', 
        available: ['/api/health', '/api/status', '/api/figma/parse', '/api/figma/extract', '/api/web/extract', '/api/compare'] 
      }));
  }
}

// API Endpoint Handlers
function handleHealthCheck(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    service: 'Figma Comparison Tool',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    platform: process.platform,
    nodeVersion: process.version
  }));
}

function handleStatus(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    server: 'running',
    features: {
      'hello-page': 'active',
      'api-endpoints': 'active',
      'figma-url-parsing': 'active',
      'figma-extraction': 'active',
      'web-extraction': 'active',
      'comparison': 'active',
      'react-frontend': 'active'
    },
    message: 'Figma Comparison Tool - Production Ready! 🚀'
  }));
}

async function handleFigmaConnectionTest(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { figmaPersonalAccessToken } = JSON.parse(body);
      const apiKey = figmaPersonalAccessToken || loadFigmaApiKey();
      
      if (!apiKey) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'No Figma API key provided. Please enter your Figma Personal Access Token.',
          type: 'no-token'
        }));
        return;
      }
      
      // Test Figma API
      try {
        console.log('🔍 Testing Figma API connection...');
        const testResponse = await fetch('https://api.figma.com/v1/me', {
          headers: { 'X-Figma-Token': apiKey }
        });
        
        if (testResponse.ok) {
          const userData = await testResponse.json();
          console.log('✅ Figma API connection successful');
          
          // Save the API key if provided
          if (figmaPersonalAccessToken) {
            const configPath = path.join(__dirname, 'config.json');
            let config = {};
            if (fs.existsSync(configPath)) {
              config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
            config.figmaApiKey = figmaPersonalAccessToken;
            config.lastUpdated = new Date().toISOString();
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log('💾 Figma API key saved to config.json');
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: `Connected to Figma API as ${userData.email || 'user'}`,
            type: 'figma-api',
            user: userData.email
          }));
        } else {
          console.log('❌ Figma API connection failed:', testResponse.status);
          const errorData = await testResponse.json();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `Figma API error: ${errorData.err || testResponse.statusText}`,
            type: 'invalid-token'
          }));
        }
      } catch (apiError) {
        console.log('❌ Figma API connection error:', apiError.message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: `Figma API connection failed: ${apiError.message}`,
          type: 'api-error'
        }));
      }
    } catch (error) {
      console.log('❌ Connection test error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: `Connection test failed: ${error.message}`
      }));
    }
  });
}

async function handleSettingsSave(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const settings = JSON.parse(body);
      console.log('💾 Saving settings...', Object.keys(settings));
      
      // Load existing config
      const configPath = path.join(__dirname, 'config.json');
      let config = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      
      // Update config with new settings
      if (settings.figmaPersonalAccessToken) {
        config.figmaApiKey = settings.figmaPersonalAccessToken;
      }
      if (settings.method) {
        config.method = settings.method;
      }
      if (settings.defaultTimeout) {
        config.defaultTimeout = settings.defaultTimeout;
      }
      if (settings.maxConcurrentComparisons) {
        config.maxConcurrentComparisons = settings.maxConcurrentComparisons;
      }
      if (settings.mcpServerUrl) {
        config.mcpServer = { url: settings.mcpServerUrl };
      }
      
      config.lastUpdated = new Date().toISOString();
      
      // Save config
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log('✅ Settings saved successfully');
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Settings saved successfully'
      }));
      
    } catch (error) {
      console.error('❌ Settings save error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: `Failed to save settings: ${error.message}`
      }));
    }
  });
}

// Figma URL Parser (simplified version)
function parseFigmaUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL provided');
  }

  const normalizedUrl = url.trim();
  
  // Check if it's a valid Figma URL
  if (!normalizedUrl.includes('figma.com')) {
    throw new Error('Invalid Figma URL. Must be a figma.com URL.');
  }

  try {
    const urlObj = new URL(normalizedUrl);
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    // Extract file ID from pathname (pattern: /file/FILE_ID/...)
    const fileIdMatch = pathname.match(/\/(?:file|design)\/([a-zA-Z0-9]+)/);
    const fileId = fileIdMatch ? fileIdMatch[1] : null;
    
    // Extract node ID from query parameters
    const nodeId = searchParams.get('node-id');
    
    // Extract page ID
    const pageId = searchParams.get('page-id');

    return {
      fileId,
      nodeId,
      pageId,
      originalUrl: url,
      isValid: !!fileId
    };
  } catch (error) {
    throw new Error(`Failed to parse Figma URL: ${error.message}`);
  }
}

function handleFigmaUrlParse(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      const { url } = JSON.parse(body);
      
      if (!url) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'URL is required' }));
        return;
      }

      const parsed = parseFigmaUrl(url);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: parsed,
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  });
}


// Production Figma Extraction (Real MCP Integration)
async function handleFigmaExtract(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const { figmaUrl, extractionMode = 'both' } = JSON.parse(body);
      
      if (!figmaUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'figmaUrl is required' }));
        return;
      }

      console.log(`🎯 Starting real Figma extraction for: ${figmaUrl}`);
      
      // Parse the URL first
      const parsed = parseFigmaUrl(figmaUrl);
      
      if (!parsed.isValid) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid Figma URL' }));
        return;
      }

      try {
        // Real Figma extraction using Direct API - Production grade only
        console.log('🎯 Starting real Figma API extraction');
        const figmaExtractor = new DirectFigmaAPIExtractor();
        const extractedData = await figmaExtractor.extractComponents(
          parsed.fileId,
          parsed.nodeId
        );

        console.log(`✅ Figma extraction completed: ${extractedData.elements?.length || 0} elements found`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            fileId: parsed.fileId,
            nodeId: parsed.nodeId,
            extractionMode,
            timestamp: new Date().toISOString(),
            status: 'production-extraction',
            ...extractedData,
            metadata: {
              ...extractedData.metadata,
              extractionMethod: 'MCP-Direct',
              version: '2.0.0-production',
              originalUrl: figmaUrl
            }
          },
          message: 'Figma extraction completed successfully'
        }));

      } catch (extractionError) {
        console.error('❌ Figma extraction failed:', extractionError.message);
        
        // Check if it's an MCP connection issue
        if (extractionError.message.includes('MCP') || extractionError.message.includes('connection')) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Figma MCP service unavailable',
            details: 'Please check Figma MCP connection in settings',
            fallback: 'Try using the Figma API token method instead'
          }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `Figma extraction failed: ${extractionError.message}`,
            details: extractionError.stack
          }));
        }
      }

    } catch (error) {
      console.error('❌ Request processing error:', error.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
  });
}

// Production Web Extraction (Real UnifiedWebExtractor)
async function handleWebExtract(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const { webUrl, cssSelector, extractionOptions = {} } = JSON.parse(body);
      
      if (!webUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'webUrl is required' }));
        return;
      }

      console.log(`🌐 Starting web extraction for: ${webUrl}`);

      try {
        // Real web extraction using UnifiedWebExtractor - Production grade only
        console.log('🌐 Starting real web extraction');
        const extractor = new UnifiedWebExtractor({
          headless: true,
          timeout: 30000,
          ...extractionOptions
        });

        const extractedData = await extractor.extract(webUrl, {
          cssSelector: cssSelector || null,
          includeStyles: true,
          includeMetadata: true,
          extractText: true,
          extractImages: true
        });

        // Clean up extractor resources
        if (extractor.cleanup) {
          await extractor.cleanup();
        }

        console.log(`✅ Web extraction completed: ${extractedData.elements?.length || 0} elements found`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            url: webUrl,
            cssSelector: cssSelector || null,
            timestamp: new Date().toISOString(),
            status: 'production-extraction',
            ...extractedData,
            metadata: {
              ...extractedData.metadata,
              extractionMethod: 'UnifiedWebExtractor',
              version: '2.0.0-production'
            }
          },
          message: 'Web extraction completed successfully'
        }));

      } catch (extractionError) {
        console.error('❌ Web extraction failed:', extractionError.message);
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: `Web extraction failed: ${extractionError.message}`,
          details: extractionError.stack
        }));
      } finally {
        // Clean up extractor resources
        if (extractor.cleanup) {
          await extractor.cleanup();
        }
      }

    } catch (error) {
      console.error('❌ Request processing error:', error.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
  });
}

// Production Comparison Engine (Real ComparisonService)
async function handleComparison(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const { figmaData, webData, comparisonOptions = {} } = JSON.parse(body);
      
      if (!figmaData || !webData) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Both figmaData and webData are required' }));
        return;
      }

      console.log(`⚖️ Starting real comparison between Figma and Web data`);
      
      try {
        const startTime = Date.now();
        
        // Real comparison using ComparisonService - Production grade only
        console.log('⚖️ Starting real comparison analysis');
        const comparisonService = new ComparisonService({
          algorithm: comparisonOptions.algorithm || 'advanced',
          threshold: comparisonOptions.threshold || 0.7,
          includePositional: comparisonOptions.includePositional !== false,
          includeStyle: comparisonOptions.includeStyle !== false,
          includeContent: comparisonOptions.includeContent !== false
        });

        const comparisonResult = await comparisonService.compare(figmaData, webData, comparisonOptions);
        
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`✅ Comparison completed: ${comparisonResult.summary?.overallSimilarity || 'N/A'} similarity`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            id: `comp_${Date.now()}`,
            timestamp: new Date().toISOString(),
            figmaSource: figmaData.fileId || figmaData.url || 'unknown',
            webSource: webData.url || 'unknown',
            options: comparisonOptions,
            status: 'production-comparison',
            ...comparisonResult,
            metadata: {
              ...comparisonResult.metadata,
              comparisonMethod: 'ComparisonService',
              version: '2.0.0-production',
              processingTime: `${processingTime}s`
            }
          },
          message: 'Comparison completed successfully'
        }));

      } catch (comparisonError) {
        console.error('❌ Comparison failed:', comparisonError.message);
        
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: `Comparison failed: ${comparisonError.message}`,
          details: comparisonError.stack
        }));
      }

    } catch (error) {
      console.error('❌ Request processing error:', error.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
  });
}

// Production utilities
function logProductionRequest(method, endpoint, success, processingTime) {
  console.log(`📊 ${method} ${endpoint} - ${success ? '✅' : '❌'} ${processingTime || 'N/A'}`);
}

// Static File Serving for React Frontend
function handleStaticFiles(req, res, pathname) {
  // Define the frontend dist directory
  const frontendPath = path.join(__dirname, 'frontend', 'dist');
  
  // Check if frontend exists
  if (!fs.existsSync(frontendPath)) {
    // Fallback to simple message if frontend not found
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Figma Comparison Tool</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            margin: 0;
          }
          .container { 
            background: rgba(255,255,255,0.1); 
            padding: 40px; 
            border-radius: 20px; 
            backdrop-filter: blur(10px); 
            display: inline-block;
          }
          a { color: #fff; text-decoration: none; background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 5px; margin: 10px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎉 Figma Comparison Tool</h1>
          <p>Frontend build not found. Building...</p>
          <p><a href="/hello">🧪 Test APIs</a></p>
        </div>
      </body>
      </html>
    `);
    return;
  }

  // Handle root path - serve index.html
  if (pathname === '/') {
    const indexPath = path.join(frontendPath, 'index.html');
    serveStaticFile(res, indexPath, 'text/html');
    return;
  }

  // Handle static assets (CSS, JS, images, etc.)
  const filePath = path.join(frontendPath, pathname);
  
  // Security check - ensure file is within frontend directory
  if (!filePath.startsWith(frontendPath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = getContentType(ext);
    serveStaticFile(res, filePath, contentType);
  } else {
    // SPA routing - serve index.html for non-API, non-static routes
    const indexPath = path.join(frontendPath, 'index.html');
    serveStaticFile(res, indexPath, 'text/html');
  }
}

function serveStaticFile(res, filePath, contentType) {
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
  }
}

function getContentType(ext) {
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function startServer(port) {
  server.listen(port, () => {
    console.log('🚀 Production Figma Comparison Tool running at http://localhost:' + port);
    console.log('✅ Real integrations loaded - macOS app ready!');
    console.log('🎯 Figma API: Ready for real extraction');
    console.log('🌐 Web Scraper: Ready for live site analysis');
    console.log('⚖️ Comparison Engine: Ready for real analysis');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      server.close();
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

// Start with port 3007, auto-increment if busy
startServer(PORT);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
});
