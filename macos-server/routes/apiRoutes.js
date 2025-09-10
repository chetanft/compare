/**
 * API Routes for macOS App
 * Handles all API endpoint routing and logic
 */

import { parseFigmaUrl } from '../utils/urlParser.js';
import fs from 'fs';
import path from 'path';

export class ApiRoutes {
  constructor(services) {
    this.configService = services.configService;
    this.figmaApiService = services.figmaApiService;
    this.webExtractor = services.webExtractor;
    this.comparisonService = services.comparisonService;
  }

  /**
   * Handle API requests based on pathname
   * @param {string} pathname - API endpoint path
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async handleApiRequest(pathname, req, res) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      switch (pathname) {
        case '/api/health':
          this.handleHealthCheck(req, res);
          break;
        case '/api/settings/current':
          this.handleSettingsCurrent(req, res);
          break;
          
        case '/api/status':
          this.handleStatus(req, res);
          break;
          
        case '/api/settings/test-connection':
          await this.handleFigmaConnectionTest(req, res);
          break;
          
        case '/api/settings/save':
          await this.handleSettingsSave(req, res);
          break;
          
        case '/api/figma/parse':
          this.handleFigmaUrlParse(req, res);
          break;
          
        case '/api/figma/validate':
          await this.handleFigmaValidate(req, res);
          break;
          
        case '/api/figma/extract':
          await this.handleFigmaExtract(req, res);
          break;
          
        case '/api/figma-only/extract':
          await this.handleFigmaExtract(req, res);
          break;
          
        case '/api/web/extract':
          await this.handleWebExtract(req, res);
          break;
          
        case '/api/web/extract-v3':
          await this.handleWebExtract(req, res);
          break;
          
        case '/api/compare':
          await this.handleComparison(req, res);
          break;
          
        case '/api/mcp/status':
          this.handleMCPStatus(req, res);
          break;
          
        case '/api/reports/list':
          this.handleReportsList(req, res);
          break;
          
        case '/api/test':
          this.handleTest(req, res);
          break;
          
        default:
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'API endpoint not found', 
            available: [
              '/api/health', '/api/status', '/api/settings/test-connection', 
              '/api/settings/save', '/api/figma/parse', '/api/figma/extract', 
              '/api/figma-only/extract', '/api/web/extract', '/api/web/extract-v3', 
              '/api/compare', '/api/mcp/status', '/api/reports/list'
            ] 
          }));
      }
    } catch (error) {
      console.error('❌ API request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      }));
    }
  }

  /**
   * Health check endpoint
   */
  handleHealthCheck(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: {
        status: 'healthy',
        message: 'Figma Comparison Tool is running',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Status endpoint
   */
  handleStatus(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      server: 'running',
      features: {
        'figma-api': 'active',
        'web-extraction': 'active',
        'comparison': 'active',
        'settings': 'active',
        'react-frontend': 'active'
      },
      message: 'Figma Comparison Tool - Production Ready! 🚀'
    }));
  }

  /**
   * Test Figma API connection
   */
  async handleFigmaConnectionTest(req, res) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const body = await this.getRequestBody(req);
    try {
      const { figmaPersonalAccessToken } = JSON.parse(body);
      const result = await this.figmaApiService.testConnection(figmaPersonalAccessToken);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (error) {
      console.error('❌ Connection test error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: `Connection test failed: ${error.message}`
      }));
    }
  }

  /**
   * Save settings
   */
  async handleSettingsSave(req, res) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const body = await this.getRequestBody(req);
    try {
      const settings = JSON.parse(body);
      console.log('💾 Saving settings...', Object.keys(settings));
      
      // Update configuration
      const updates = {};
      if (settings.figmaPersonalAccessToken) {
        updates.figmaApiKey = settings.figmaPersonalAccessToken;
      }
      if (settings.method) updates.method = settings.method;
      if (settings.defaultTimeout) updates.defaultTimeout = settings.defaultTimeout;
      if (settings.maxConcurrentComparisons) updates.maxConcurrentComparisons = settings.maxConcurrentComparisons;
      if (settings.mcpServerUrl) {
        updates.mcpServer = { url: settings.mcpServerUrl };
      }
      
      const success = this.configService.updateConfig(updates);
      
      if (success) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Settings saved successfully'
        }));
      } else {
        throw new Error('Failed to save configuration');
      }
      
    } catch (error) {
      console.error('❌ Settings save error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: `Failed to save settings: ${error.message}`
      }));
    }
  }

  /**
   * Parse Figma URL
   */
  handleFigmaUrlParse(req, res) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    this.getRequestBody(req).then(body => {
      try {
        const { figmaUrl } = JSON.parse(body);
        const parsed = parseFigmaUrl(figmaUrl);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: parsed
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
  }

  /**
   * Validate Figma file access
   */
  async handleFigmaValidate(req, res) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const body = await this.getRequestBody(req);
    try {
      const { figmaUrl } = JSON.parse(body);
      const parsed = parseFigmaUrl(figmaUrl);
      
      console.log(`🔍 Validating Figma file access: ${parsed.fileId}`);
      const validation = await this.figmaApiService.validateFileAccess(parsed.fileId);
      
      if (validation.success) {
        console.log(`✅ Figma validation successful for user: ${validation.user}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            fileKey: validation.fileKey,
            user: validation.user,
            message: `Access confirmed for ${validation.user}`
          }
        }));
      } else {
        console.log(`❌ Figma validation failed: ${validation.error}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: validation.error,
          type: validation.type,
          user: validation.user,
          fileKey: validation.fileKey
        }));
      }

    } catch (error) {
      console.error('❌ Figma validation error:', error.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: `Invalid Figma URL: ${error.message}`
      }));
    }
  }

  /**
   * Extract Figma data
   */
  async handleFigmaExtract(req, res) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const body = await this.getRequestBody(req);
    try {
      const { figmaUrl } = JSON.parse(body);
      const parsed = parseFigmaUrl(figmaUrl);
      
      console.log('🎯 Starting Figma API extraction');
      const extractedData = await this.figmaApiService.extractComponents(
        parsed.fileId,
        parsed.nodeId
      );

      console.log(`✅ Figma extraction completed: ${extractedData.elements?.length || 0} elements found`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: extractedData
      }));

    } catch (error) {
      console.error('❌ Figma extraction error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
  }

  /**
   * Extract web data
   */
  async handleWebExtract(req, res) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const body = await this.getRequestBody(req);
    try {
      const { webUrl, cssSelector } = JSON.parse(body);
      
      console.log(`🌐 Starting web extraction for: ${webUrl}`);
      
      const extractor = new this.webExtractor({
        headless: true,
        timeout: 30000
      });

      const extractedData = await extractor.extractWebData(webUrl, {
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
        data: extractedData
      }));

    } catch (error) {
      console.error('❌ Web extraction error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
  }

  /**
   * Compare designs
   */
  async handleComparison(req, res) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const body = await this.getRequestBody(req);
    try {
      const requestData = JSON.parse(body);
      console.log('🔍 DEBUG: Received request body:', body);
      console.log('🔍 DEBUG: Parsed request data:', JSON.stringify(requestData, null, 2));
      
      // Handle both URL-based requests (from frontend) and data-based requests (from direct API calls)
      let figmaData, webData, comparisonOptions = {};
      
      if (requestData.figmaUrl && requestData.webUrl) {
        // URL-based comparison - extract data first
        const { figmaUrl, webUrl, authentication } = requestData;
        comparisonOptions = requestData.comparisonOptions || {};
        
        console.log('🔍 DEBUG: Starting URL-based comparison');
        console.log('🔍 DEBUG: figmaUrl =', figmaUrl);
        console.log('🔍 DEBUG: webUrl =', webUrl);
        
        if (!figmaUrl || !webUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Both figmaUrl and webUrl are required'
          }));
          return;
        }
        
        console.log('🎨 Extracting Figma data from:', figmaUrl);
        try {
          // Parse Figma URL first
          const parsed = parseFigmaUrl(figmaUrl);
          
          // Validate access before attempting extraction
          console.log(`🔍 Pre-validating Figma access for file: ${parsed.fileId}`);
          const validation = await this.figmaApiService.validateFileAccess(parsed.fileId);
          
          if (!validation.success) {
            console.error('❌ Figma access validation failed:', validation.error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: validation.error,
              type: validation.type,
              user: validation.user,
              fileKey: validation.fileKey,
              details: 'Figma file access validation failed. Please ensure the file is shared with your API token user.'
            }));
            return;
          }
          
          console.log(`✅ Figma access validated for user: ${validation.user}`);
          
          // Extract Figma data
          figmaData = await this.figmaApiService.extractComponents(parsed.fileId, parsed.nodeId);
        } catch (figmaError) {
          console.error('❌ Figma extraction failed:', figmaError.message);
          // Production: no mock fallback. Fail with precise error.
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `Figma extraction failed: ${figmaError.message}`
          }));
          return;
        }
        
        console.log('🌐 Extracting web data from:', webUrl);
        try {
          // Extract web data
          const webExtractorInstance = new this.webExtractor();
          webData = await webExtractorInstance.extractWebData(webUrl, {
            authentication: authentication,
            timeout: 60000,
            includeScreenshot: false
          });
        } catch (webError) {
          console.error('❌ Web extraction failed:', webError.message);
          // Production: no mock fallback. Fail with precise error.
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `Web extraction failed: ${webError.message}`
          }));
          return;
        }
        
      } else if (requestData.figmaData && requestData.webData) {
        // Data-based comparison - use provided data
        figmaData = requestData.figmaData;
        webData = requestData.webData;
        comparisonOptions = requestData.comparisonOptions || {};
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Either provide figmaUrl+webUrl or figmaData+webData'
        }));
        return;
      }
      
      console.log('⚖️ Starting comparison analysis');
      const startTime = Date.now();
      
      const comparisonService = new this.comparisonService({
        algorithm: comparisonOptions.algorithm || 'advanced',
        threshold: comparisonOptions.threshold || 0.7,
        includePositional: comparisonOptions.includePositional !== false,
        includeStyle: comparisonOptions.includeStyle !== false,
        includeContent: comparisonOptions.includeContent !== false
      });

      // Use the compareExtractedData method instead of compare (which expects URLs)
      const comparisonResult = await comparisonService.compareExtractedData(figmaData, webData, comparisonOptions);
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`✅ Comparison completed: ${comparisonResult.summary?.overallSimilarity || 'N/A'} similarity`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: comparisonResult,
        processingTime
      }));

    } catch (error) {
      console.error('❌ Comparison error:', error.message);
      
      // Return 400 for validation/input errors, 500 for server errors
      const statusCode = error.message.includes('Invalid') || 
                        error.message.includes('required') || 
                        error.message.includes('URL') ? 400 : 500;
      
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
  }

  /**
   * Handle MCP status endpoint
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  handleMCPStatus(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: {
        available: false,
        serverUrl: null,
        status: 'unavailable',
        message: 'MCP server not configured in production server'
      }
    }));
  }

  /**
   * Return current settings
   */
  handleSettingsCurrent(req, res) {
    try {
      const cfg = this.configService.loadConfig();
      // Do not leak secrets
      const sanitized = { ...cfg };
      if (sanitized.figmaApiKey) sanitized.figmaApiKey = !!sanitized.figmaApiKey;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: sanitized }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Failed to load settings' }));
    }
  }

  /**
   * Handle reports list endpoint
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  handleReportsList(req, res) {
    try {
      const reportsDir = path.join(process.cwd(), 'output', 'reports');
      
      // Check if reports directory exists
      if (!fs.existsSync(reportsDir)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          reports: [],
          message: 'No reports directory found'
        }));
        return;
      }
      
      // Read reports directory
      const files = fs.readdirSync(reportsDir);
      const reports = files
        .filter(file => file.endsWith('.html') || file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(reportsDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: `/reports/${file}`,
            type: file.endsWith('.html') ? 'html' : 'json',
            size: stats.size,
            created: stats.mtime.toISOString()
          };
        })
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        reports: reports
      }));
      
    } catch (error) {
      console.error('Error reading reports:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to read reports directory'
      }));
    }
  }

  /**
   * Simple test endpoint for debugging
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async handleTest(req, res) {
    if (req.method === 'POST') {
      const body = await this.getRequestBody(req);
      try {
        const requestData = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Test endpoint working',
          received: requestData,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Invalid JSON',
          body: body
        }));
      }
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Test endpoint is working',
        method: req.method,
        timestamp: new Date().toISOString()
      }));
    }
  }

  /**
   * Helper to get request body
   * @param {Object} req - Request object
   * @returns {Promise<string>} Request body
   */
  getRequestBody(req) {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => resolve(body));
    });
  }
}
