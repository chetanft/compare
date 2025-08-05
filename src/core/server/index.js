/**
 * Clean Server Implementation
 * Single server with MCP-only Figma extraction
 */

import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { FigmaMCPClient } from '../../figma/mcpClient.js';
import { EnhancedWebExtractor } from '../../web/enhancedWebExtractor.js';
import ComparisonEngine from '../../compare/comparisonEngine.js';
import { loadConfig, getFigmaApiKey } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { performanceMonitor } from '../../monitoring/performanceMonitor.js';
import { 
  configureSecurityMiddleware, 
  configureRateLimit, 
  errorHandler, 
  notFoundHandler,
  responseFormatter,
  requestLogger,
  validateExtractionUrl 
} from '../../server/middleware.js';
import { getBrowserPool, shutdownBrowserPool } from '../../browser/BrowserPool.js';
import WebExtractorV2 from '../../web/WebExtractorV2.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config file path
const configPath = path.join(__dirname, '../../../config.json');

// Load Figma API key from config
function loadFigmaApiKey() {
  try {
    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return configData.figmaApiKey || process.env.FIGMA_API_KEY || '';
    }
  } catch (error) {
  }
  return process.env.FIGMA_API_KEY || '';
}

// Save Figma API key to config
function saveFigmaApiKey(apiKey) {
  try {
    let configData = {};
    if (fs.existsSync(configPath)) {
      configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    configData.figmaApiKey = apiKey;
    configData.lastUpdated = new Date().toISOString();
    if (!configData.createdAt) {
      configData.createdAt = new Date().toISOString();
    }
    
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
    return true;
  } catch (error) {
    return false;
  }
}

export async function startServer() {
  // Load configuration with fallback to defaults
  let config;
  try {
    config = await loadConfig();
  } catch (error) {
    console.warn('Failed to load new config, using legacy config:', error.message);
    // Fallback to legacy config for now
    const legacyConfig = await import('../../config.js');
    config = legacyConfig.config;
  }
  
  // Create Express app and HTTP server
  const app = express();
  const httpServer = createServer(app);
  
  // Initialize services
  const figmaClient = new FigmaMCPClient();
  const comparisonEngine = new ComparisonEngine();
  const browserPool = getBrowserPool();
  const webExtractorV2 = new WebExtractorV2();
  
  // Start performance monitoring
  performanceMonitor.startMonitoring();
  
  // TODO: Initialize WebSocket server once compiled
  // const webSocketManager = initializeWebSocket(httpServer, config);
  const webSocketManager = {
    getActiveConnectionsCount: () => 0,
    getActiveComparisonsCount: () => 0,
    createProgressTracker: (id) => ({
      update: () => {},
      complete: () => {},
      error: () => {}
    })
  };
  
  // Global MCP connection status
  let mcpConnected = false;
  
  // Configure enhanced middleware
  configureSecurityMiddleware(app, config);
  
  // Request logging
  app.use(requestLogger);
  
  // Response formatting
  app.use(responseFormatter);
  
  // Rate limiting
  const { generalLimiter, extractionLimiter } = configureRateLimit(config);
  app.use('/api', generalLimiter);
  
  // Serve frontend static files
  const frontendPath = path.join(__dirname, '../../../frontend/dist');
  app.use(express.static(frontendPath));
  
  // Serve output files (reports, images, screenshots)
  const outputPath = path.join(__dirname, '../../../output');
  app.use('/output', express.static(outputPath));
  app.use('/reports', express.static(path.join(outputPath, 'reports')));
  app.use('/images', express.static(path.join(outputPath, 'images')));
  app.use('/screenshots', express.static(path.join(outputPath, 'screenshots')));
  
  // Serve CSS styles for reports
  const stylesPath = path.join(__dirname, '../../reporting/styles');
  app.use('/styles', express.static(stylesPath));
  
  // Initialize MCP connection on startup
  figmaClient.connect().then(connected => {
    mcpConnected = connected;
    if (connected) {
    } else {
    }
  });

  // API Routes - Enhanced health endpoint
  app.get('/api/health', (req, res) => {
    const realTimeMetrics = performanceMonitor.getRealTimeMetrics();
    const browserStats = browserPool.getStats();
    
    res.json({
      status: 'ok', 
      mcp: mcpConnected,
      webSocket: {
        connected: webSocketManager.getActiveConnectionsCount() > 0,
        activeConnections: webSocketManager.getActiveConnectionsCount(),
        activeComparisons: webSocketManager.getActiveComparisonsCount(),
      },
      browser: {
        pool: browserStats,
        activeExtractions: webExtractorV2.getActiveExtractions(),
      },
      timestamp: new Date().toISOString(),
      performance: realTimeMetrics
    });
  });

  /**
   * Performance monitoring endpoints
   */
  app.get('/api/performance/summary', (req, res) => {
    try {
      const summary = performanceMonitor.getPerformanceSummary();
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Failed to get performance summary', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance data'
      });
    }
  });

  app.get('/api/performance/realtime', (req, res) => {
    try {
      const metrics = performanceMonitor.getRealTimeMetrics();
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Failed to get real-time metrics', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve real-time metrics'
      });
    }
  });

  /**
   * Reports listing endpoint
   */
  app.get('/api/reports/list', async (req, res) => {
    try {
      const fs = await import('fs');
      const reportsPath = path.join(__dirname, '../../../output/reports');
      
      // Ensure reports directory exists
      if (!fs.existsSync(reportsPath)) {
        return res.json({
          success: true,
          reports: []
        });
      }

      // Read directory and get file stats
      const files = fs.readdirSync(reportsPath);
      const reports = [];

      for (const file of files) {
        if (file.endsWith('.html')) {
          const filePath = path.join(reportsPath, file);
          const stats = fs.statSync(filePath);
          reports.push({
            name: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            url: `/reports/${file}`
          });
        }
      }

      // Sort by creation date (newest first)
      reports.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

      res.json({
        success: true,
        reports
      });
    } catch (error) {
      logger.error('Failed to list reports', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to list reports'
      });
    }
  });

  /**
   * Settings endpoints
   */
  app.get('/api/settings', (req, res) => {
    const apiKey = loadFigmaApiKey();
    res.json({
      success: true,
      data: {
        mcpServer: {
          url: config.mcp.url,
          endpoint: config.mcp.endpoint,
          connected: mcpConnected
        },
        figmaApiKey: apiKey ? '***' + apiKey.slice(-4) : '', // Show last 4 chars only
        hasApiKey: !!apiKey
      }
    });
  });

  app.post('/api/settings/save', (req, res) => {
    try {
      const { figmaPersonalAccessToken } = req.body;
      
      if (figmaPersonalAccessToken) {
        const saved = saveFigmaApiKey(figmaPersonalAccessToken);
        if (saved) {
          res.json({
            success: true,
            message: 'Figma API key saved successfully'
          });
        } else {
          res.status(500).json({
            success: false,
            error: 'Failed to save Figma API key'
          });
        }
      } else {
        res.json({
          success: true,
          message: 'Settings saved (MCP configuration is automatic)'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to save settings: ${error.message}`
      });
    }
  });

  app.post('/api/settings/test-connection', async (req, res) => {
    try {
      const { figmaPersonalAccessToken } = req.body;
      
      // Use provided token or load from config
      const apiKey = figmaPersonalAccessToken || loadFigmaApiKey();
      
      if (!apiKey) {
        return res.json({
          success: false,
          error: 'No Figma API key provided. Please enter your Figma Personal Access Token.',
          type: 'no-token'
        });
      }
      
      // Test Figma API
      try {
        const testResponse = await fetch('https://api.figma.com/v1/me', {
          headers: {
            'X-Figma-Token': apiKey
          }
        });
        
        if (testResponse.ok) {
          const userData = await testResponse.json();
          
          // Save the API key if it was provided in the request
          if (figmaPersonalAccessToken) {
            saveFigmaApiKey(figmaPersonalAccessToken);
          }
          
          res.json({
            success: true,
            message: `Connected to Figma API as ${userData.email || 'user'}`,
            type: 'figma-api',
            user: userData.email
          });
        } else {
          const errorData = await testResponse.json();
          res.json({
            success: false,
            error: `Figma API error: ${errorData.err || testResponse.statusText}`,
            type: 'invalid-token'
          });
        }
      } catch (apiError) {
        res.json({
          success: false,
          error: `Figma API connection failed: ${apiError.message}`,
          type: 'api-error'
        });
      }
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Connection test failed: ${error.message}`
      });
    }
  });

  /**
   * Figma extraction endpoint
   */
  app.post('/api/figma-only/extract',
    extractionLimiter,
    validateExtractionUrl(config.security.allowedHosts),
    async (req, res, next) => {
    try {
      const { figmaUrl, extractionMode = 'both' } = req.body;

      // Check MCP connection
      if (!mcpConnected) {
        // Try to reconnect
        mcpConnected = await figmaClient.connect();
        
        if (!mcpConnected) {
          return res.status(503).json({
            success: false,
            error: 'Figma Dev Mode MCP server not available. Please ensure Figma Desktop is running with Dev Mode MCP enabled.'
          });
        }
      }

      // Extract data using MCP
      const figmaData = await figmaClient.extractFigmaData(figmaUrl);
      
      // Generate HTML report for Figma extraction
      const reportGenerator = await import('../../reporting/index.js');
      let reportPath = null;
      
      try {
        const reportData = {
          figmaData: {
            fileName: figmaData.fileName || 'Figma Extraction',
            extractedAt: new Date().toISOString(),
            components: figmaData.components || [],
            metadata: figmaData.metadata || {}
          },
          webData: {
            url: '',
            elements: [],
            colorPalette: [],
            typography: { fontFamilies: [], fontSizes: [], fontWeights: [] }
          },
          timestamp: new Date().toISOString(),
          metadata: {
            extractionType: 'figma-only',
            componentsExtracted: figmaData.components?.length || 0,
            timestamp: new Date().toISOString()
          }
        };
        
        reportPath = await reportGenerator.generateReport(reportData, {
          filename: `figma-extraction-${Date.now()}.html`
        });
        
        console.log(`📄 HTML report generated: ${reportPath}`);
      } catch (reportError) {
        console.warn('⚠️ HTML report generation failed:', reportError.message);
        console.warn('Report Error Stack:', reportError.stack);
      }
      
      res.json({
        success: true,
        data: {
          ...figmaData,
          reportPath: reportPath ? `/reports/${reportPath.split('/').pop()}` : null
        }
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * Web extraction endpoint (legacy route)
   */
  app.post('/api/web/extract', async (req, res) => {
    let webExtractor = null;
    
    // Track this extraction to prevent SIGTERM interruption
    if (global.trackExtraction) {
      global.trackExtraction.start();
    }
    
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required'
        });
      }

      console.log(`🔗 Starting web extraction for: ${url}`);
      
      // Create a completely fresh extractor instance for each request
      webExtractor = new EnhancedWebExtractor();
      
      // Initialize the browser
      await webExtractor.initialize();
      
      // Extract web data (no authentication for legacy endpoint)
      const rawWebData = await webExtractor.extractWebData(url);

      // Ensure all async operations complete before cleanup
      await new Promise(resolve => setTimeout(resolve, 500));

      return res.json({
        success: true,
        data: rawWebData
      });

    } catch (error) {
      console.error('❌ Web extraction failed:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    } finally {
      // Always cleanup, even if there was an error
      if (webExtractor) {
        try {
          await webExtractor.cleanup();
        } catch (cleanupError) {
          console.error('❌ Cleanup failed:', cleanupError.message);
        }
      }
      
      // Mark extraction as completed
      if (global.trackExtraction) {
        global.trackExtraction.end();
        console.log(`✅ Extraction completed. Active extractions: ${global.trackExtraction.getActive()}`);
      }
    }
  });

  /**
   * Web extraction endpoint
   */
  app.post('/api/web-only/extract', async (req, res) => {
    
    try {
      const { webUrl, authentication } = req.body;
      
      if (!webUrl) {
        return res.status(400).json({
          success: false,
          error: 'Web URL is required'
        });
      }

      console.log(`🔗 Starting web-only extraction for: ${webUrl}`);
      
      // Use the new enhanced extractor with browser pool
      const webData = await webExtractorV2.extractWebData(webUrl, {
        authentication,
        timeout: config.timeouts.webExtraction,
        includeScreenshot: true
      });
      
      // Generate HTML report for web extraction
      const reportGenerator = await import('../../reporting/index.js');
      let reportPath = null;
      
      try {
        // Create a properly structured report data for web-only extractions
        const elements = webData.elements || [];
        const colorPalette = webData.colorPalette || [];
        const typography = webData.typography || { fontFamilies: [], fontSizes: [], fontWeights: [] };
        
        const reportData = {
          figmaData: {
            fileName: `Web Extraction Report for ${new URL(webUrl).hostname}`,
            extractedAt: new Date().toISOString(),
            components: [],
            metadata: {}
          },
          webData: {
            url: webData.url || webUrl,
            extractedAt: webData.extractedAt || new Date().toISOString(),
            elements: elements,
            colorPalette: colorPalette,
            typography: typography,
            screenshot: webData.screenshot
          },
          summary: {
            componentsAnalyzed: elements.length,
            overallMatchPercentage: 100.00, // For web-only, everything is "matched"
            overallSeverity: 'info',
            matchStats: {
              colors: {
                matched: colorPalette.length,
                total: colorPalette.length,
                percentage: 100
              },
              typography: {
                matched: typography.fontFamilies?.length || 0,
                total: typography.fontFamilies?.length || 0,
                percentage: 100
              }
            },
            severityCounts: {
              high: 0,
              medium: 0,
              low: 0
            }
          },
          comparisons: [], // No comparisons for web-only extraction
          timestamp: new Date().toISOString(),
          metadata: {
            extractionType: 'web-only',
            elementsExtracted: elements.length,
            timestamp: new Date().toISOString()
          }
        };
        
        reportPath = await reportGenerator.generateReport(reportData, {
          filename: `web-extraction-${Date.now()}.html`
        });
        
        console.log(`📄 HTML report generated: ${reportPath}`);
      } catch (reportError) {
        console.warn('⚠️ HTML report generation failed:', reportError.message);
        console.warn('Report Error Stack:', reportError.stack); // Log stack for debugging
        // Do not block the main response if report generation fails
      }

      return res.json({
        success: true,
        data: {
          elements: (webData.elements || []).map(element => ({
            ...element,
            tag: element.type, // Frontend expects 'tag' field
            classes: element.className ? element.className.split(' ').filter(c => c) : [] // Frontend expects 'classes' array
          })),
          colorPalette: webData.colorPalette || [],
          typography: webData.typography || { fontFamilies: [], fontSizes: [], fontWeights: [] },
          metadata: {
            url: webData.url || webUrl,
            timestamp: webData.extractedAt || new Date().toISOString(),
            elementsExtracted: webData.elements?.length || 0
          },
          screenshot: webData.screenshot?.data ? `data:image/${webData.screenshot.type || 'png'};base64,${webData.screenshot.data}` : undefined,
          reportPath: reportPath ? `/reports/${path.basename(reportPath)}` : null
        }
      });

    } catch (error) {
      console.error('❌ Web-only extraction failed:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Comparison endpoint
   */
  app.post('/api/compare', async (req, res) => {
    try {
      const { figmaUrl, webUrl, includeVisual = false } = req.body;
      
      if (!figmaUrl || !webUrl) {
        return res.status(400).json({
          success: false,
          error: 'Both Figma URL and Web URL are required'
        });
      }


      // Check MCP connection
      if (!mcpConnected) {
        mcpConnected = await figmaClient.connect();
        
        if (!mcpConnected) {
          return res.status(503).json({
            success: false,
            error: 'Figma Dev Mode MCP server not available. Please ensure Figma Desktop is running with Dev Mode MCP enabled.'
          });
        }
      }

        // Extract data from both sources
  logger.info('Starting data extraction', { figmaUrl, webUrl });
  const startTime = Date.now();
  
  const figmaStartTime = Date.now();
  const figmaData = await figmaClient.extractFigmaData(figmaUrl);
  const figmaDuration = Date.now() - figmaStartTime;
  performanceMonitor.trackExtraction('Figma', figmaDuration, { url: figmaUrl });
  
  const webStartTime = Date.now();
  const webExtractor = new EnhancedWebExtractor();
  let webData;
  
  try {
    await webExtractor.initialize();
    webData = await webExtractor.extractWebData(webUrl);
    
    // Ensure all async operations complete before cleanup
    await new Promise(resolve => setTimeout(resolve, 500));
  } finally {
    // Always cleanup
    try {
      await webExtractor.cleanup();
    } catch (cleanupError) {
      console.error('❌ Cleanup failed:', cleanupError.message);
    }
  }
  
  const webDuration = Date.now() - webStartTime;
  performanceMonitor.trackExtraction('Web', webDuration, { url: webUrl });

  logger.extraction('Figma', figmaUrl, figmaData);
  logger.extraction('Web', webUrl, webData);

  // Compare the data
  const comparisonStartTime = Date.now();
  const comparison = await comparisonEngine.compareDesigns(figmaData, webData);
  const comparisonDuration = Date.now() - comparisonStartTime;
  
  const totalDuration = Date.now() - startTime;
  performanceMonitor.trackComparison(comparisonDuration, {
    figmaComponents: figmaData?.components?.length || 0,
    webElements: webData?.elements?.length || 0,
    totalDuration
  });
  
  logger.performance('Full comparison pipeline', totalDuration);
  logger.comparison(comparison);

      // Generate HTML report for comparison
      const reportGenerator = await import('../../reporting/index.js');
      let reportPath = null;
      
      try {
        const reportData = {
          figmaData: {
            fileName: figmaData.fileName || 'Figma Design',
            extractedAt: new Date().toISOString(),
            components: figmaData.components || [],
            metadata: figmaData.metadata || {}
          },
          webData: {
            url: webUrl,
            extractedAt: new Date().toISOString(),
            elements: webData.elements || [],
            colorPalette: webData.colorPalette || [],
            typography: webData.typography || { fontFamilies: [], fontSizes: [], fontWeights: [] },
            screenshot: webData.screenshot
          },
          comparisons: comparison.comparisons || [],
          summary: {
            componentsAnalyzed: figmaData?.components?.length || 0,
            overallMatchPercentage: comparison.overallMatch || 0,
            overallSeverity: comparison.severity || 'info',
            matchStats: comparison.matchStats || {},
            severityCounts: comparison.summary?.severity || { high: 0, medium: 0, low: 0 }
          },
          timestamp: new Date().toISOString(),
          metadata: {
            extractionType: 'comparison',
            comparedAt: new Date().toISOString(),
            figmaComponentCount: figmaData?.components?.length || 0,
            webElementCount: webData?.elements?.length || 0
          }
        };
        
        reportPath = await reportGenerator.generateReport(reportData, {
          filename: `comparison-${Date.now()}.html`
        });
        
        console.log(`📄 HTML report generated: ${reportPath}`);
      } catch (reportError) {
        console.warn('⚠️ HTML report generation failed:', reportError.message);
        console.warn('Report Error Stack:', reportError.stack);
      }

      // Add component counts to the response data
      const responseData = {
        figmaData: {
          ...figmaData,
          componentsCount: figmaData?.components?.length || 0
        },
        webData: {
          ...webData,
          elementsCount: webData?.elements?.length || 0
        },
        comparison,
        metadata: {
          comparedAt: new Date().toISOString(),
          includeVisual,
          version: '1.0.0',
          figmaComponentCount: figmaData?.components?.length || 0,
          webElementCount: webData?.elements?.length || 0
        },
        reportPath: reportPath ? `/reports/${reportPath.split('/').pop()}` : null
      };

      res.json({
        success: true,
        data: responseData
      });
    } catch (error) {
      console.error('❌ Comparison failed:', error.message);
      
      res.status(500).json({
        success: false,
        error: `Comparison failed: ${error.message}`
      });
    }
  });

  /**
   * Catch-all route - serve frontend
   */
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  /**
   * Enhanced web extraction endpoint
   */
  app.post('/api/web/extract-v2',
    extractionLimiter,
    validateExtractionUrl(config.security.allowedHosts),
    async (req, res, next) => {
    try {
      const { url, authentication, options = {} } = req.body;

      // Extract using improved extractor
      const webData = await webExtractorV2.extractWebData(url, {
        authentication,
        timeout: config.timeouts.webExtraction,
        includeScreenshot: options.includeScreenshot !== false,
        viewport: options.viewport,
        ...options
      });

      res.json(webData);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Browser pool statistics endpoint
   */
  app.get('/api/browser/stats', (req, res) => {
    const stats = browserPool.getStats();
    res.json({
      browserPool: stats,
      activeExtractions: webExtractorV2.getActiveExtractions()
    });
  });

  /**
   * Cancel extraction endpoint
   */
  app.post('/api/extractions/:id/cancel', async (req, res, next) => {
    try {
      const { id } = req.params;
      await webExtractorV2.cancelExtraction(id);
      res.json({ message: 'Extraction cancelled' });
    } catch (error) {
      next(error);
    }
  });

  // 404 handler for API routes
  app.use('/api', notFoundHandler);
  
  // Global error handler
  app.use(errorHandler);

  // Enhanced graceful shutdown handling
  async function gracefulShutdown(signal) {
    console.log(`Received ${signal}, initiating graceful shutdown...`);
    
    try {
      // Cancel all active extractions
      console.log('Cancelling active extractions...');
      await webExtractorV2.cancelAllExtractions();
      
      // Shutdown browser pool
      console.log('Shutting down browser pool...');
      await shutdownBrowserPool();
      
      // Close server
      console.log('Closing HTTP server...');
      server.close(() => {
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      });
      
      // Force exit after 30 seconds
      setTimeout(() => {
        console.log('⚠️ Force exit after timeout');
        process.exit(1);
      }, 30000);
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
      process.exit(1);
    }
  }

  // Start server
  const PORT = config.server.port;
  const server = httpServer.listen(PORT, config.server.host, () => {
    console.log(`🚀 Server running at http://${config.server.host}:${PORT}`);
    console.log(`📱 Frontend available at http://${config.server.host}:${PORT}`);
    console.log(`🔌 MCP Status: ${mcpConnected ? 'Connected' : 'Disconnected'}`);
    console.log(`🔌 WebSocket server ready for connections`);
    console.log(`🔧 Enhanced features: Browser Pool, Security, Rate Limiting`);
    
    // Start periodic status checks
    setInterval(async () => {
      try {
        const wasConnected = mcpConnected;
        mcpConnected = await figmaClient.connect();
        
        if (wasConnected !== mcpConnected) {
          console.log(`🔌 MCP Status changed: ${mcpConnected ? 'Connected' : 'Disconnected'}`);
        }
      } catch (error) {
        if (mcpConnected) {
          mcpConnected = false;
          console.log('🔌 MCP Status changed: Disconnected');
        }
      }
    }, 30000); // Check every 30 seconds
  });

  // Setup signal handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

  return server;
} 