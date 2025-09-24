/**
 * Clean Server Implementation
 * Single server with MCP-only Figma extraction
 */

import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import FigmaMCPClient from '../../figma/mcpClient.js';
import UnifiedWebExtractor from '../../web/UnifiedWebExtractor.js';
import ComparisonEngine from '../../compare/comparisonEngine.js';
import { ScreenshotComparisonService } from '../../compare/ScreenshotComparisonService.js';
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
import rateLimit from 'express-rate-limit';
import { getBrowserPool, shutdownBrowserPool } from '../../browser/BrowserPool.js';
import { getResourceManager, shutdownResourceManager } from '../../utils/ResourceManager.js';

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
  
  // Enhanced service initialization with backward compatibility
  let serviceManager;
  let figmaClient, comparisonEngine, browserPool, unifiedWebExtractor, resourceManager;
  // Legacy compatibility aliases - all point to UnifiedWebExtractor
  let webExtractorV2, enhancedWebExtractor;
  
  try {
    // Try enhanced service initialization
    const { serviceManager: sm } = await import('../../services/core/ServiceManager.js');
    serviceManager = sm;
    
    const initResults = await serviceManager.initializeServices(config);
    if (initResults.success) {
      console.log('✅ Enhanced service initialization successful');
      
      // Get services from enhanced service manager
      figmaClient = serviceManager.getService('mcpClient');
      comparisonEngine = serviceManager.getService('comparisonEngine');
      browserPool = serviceManager.getService('browserPool');
      
      // Initialize unified extractor and resource manager
      unifiedWebExtractor = new UnifiedWebExtractor();
      resourceManager = getResourceManager();
      
      // Legacy compatibility - all extractors point to the unified one
      enhancedWebExtractor = serviceManager.getService('webExtractor'); // This now returns UnifiedWebExtractor
      webExtractorV2 = unifiedWebExtractor; // Compatibility alias
      
    } else {
      throw new Error('Enhanced initialization failed, using fallback');
    }
  } catch (error) {
    console.warn('⚠️ Enhanced service initialization failed, using legacy mode:', error.message);
    
    // Fallback to legacy initialization (preserve existing functionality)
    figmaClient = new FigmaMCPClient();
    comparisonEngine = new ComparisonEngine();
    browserPool = getBrowserPool();
    unifiedWebExtractor = new UnifiedWebExtractor();
    resourceManager = getResourceManager();
    
    // Legacy compatibility - all extractors point to the unified one
    enhancedWebExtractor = unifiedWebExtractor; // Compatibility alias
    webExtractorV2 = unifiedWebExtractor; // Compatibility alias
    
    // Start performance monitoring the old way
    performanceMonitor.startMonitoring();
  }
  
  // WebSocket server implementation pending - will be added in future version
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
  
  // Initialize Screenshot Comparison Service
  let screenshotComparisonService;
  try {
    screenshotComparisonService = new ScreenshotComparisonService(config);
  } catch (error) {
    console.warn('⚠️ Screenshot comparison service initialization failed:', error.message);
  }
  
  // Configure enhanced middleware
  configureSecurityMiddleware(app, config);
  
  // Development cache control (prevent browser caching issues)
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      next();
    });
  }

  // Request logging
  app.use(requestLogger);
  
  // Response formatting
  app.use(responseFormatter);
  
  // Rate limiting - ONLY for Figma API calls (external API that needs protection)
  const { generalLimiter, healthLimiter, extractionLimiter } = configureRateLimit(config);
  
  // Apply extraction rate limiting ONLY to Figma API endpoints
  app.use('/api/figma-only/extract', extractionLimiter);
  // Note: /api/compare and /api/web/extract* should NOT be rate limited
  // They are internal operations, not external API calls
  
  // NO rate limiting for any other endpoints - all operations should be unlimited except Figma API
  
  // Server Control Routes
  try {
    const serverControlRoutes = await import('../../routes/server-control.js');
    app.use('/api/server', serverControlRoutes.default);
    console.log('✅ Server control routes registered');
  } catch (error) {
    console.warn('⚠️ Failed to load server control routes:', error.message);
  }

  // MCP Routes
  try {
    const mcpRoutes = await import('../../routes/mcp-routes.js');
    app.use('/api/mcp', mcpRoutes.default);
    console.log('✅ MCP routes registered');
    
    // MCP Test Routes
    const mcpTestRoutes = await import('../../routes/mcp-test-routes.js');
    app.use('/api/mcp', mcpTestRoutes.default);
    console.log('✅ MCP test routes registered');
  } catch (error) {
    console.warn('⚠️ Failed to load MCP routes:', error.message);
  }

  // Color Analytics Routes
  try {
    const colorAnalyticsRoutes = await import('../../routes/color-analytics-routes.js');
    app.use('/api/colors', colorAnalyticsRoutes.default);
    console.log('✅ Color analytics routes registered');
  } catch (error) {
    console.warn('⚠️ Failed to load color analytics routes:', error.message);
  }
  
  // Serve frontend static files (exclude report files)
  const frontendPath = path.join(__dirname, '../../../frontend/dist');
  
  // Custom middleware to block report files from frontend static serving
  app.use((req, res, next) => {
    if (req.path.startsWith('/report_') && req.path.endsWith('.html')) {
      return next(); // Skip static middleware for report files
    }
    
    // Add cache-busting headers for JS/CSS assets to prevent cache conflicts
    if (req.path.match(/\.(js|css|html)$/)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    express.static(frontendPath)(req, res, next);
  });
  
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

  // API Routes - Enhanced health endpoint with comprehensive monitoring
  app.get('/api/health', (req, res) => {
    try {
      const realTimeMetrics = performanceMonitor.getRealTimeMetrics();
      const browserStats = browserPool.getStats();
      
      // Enhanced health data with service manager integration
      let enhancedHealth = {};
      if (serviceManager) {
        enhancedHealth = serviceManager.getServicesStatus();
      }
      
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
        performance: realTimeMetrics,
        // Enhanced monitoring data
        enhanced: enhancedHealth
      });
    } catch (error) {
      // Ensure health endpoint never crashes
      res.json({
        status: 'degraded',
        error: 'Health check error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Version endpoint for build tracking
  app.get('/api/version', (req, res) => {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
      res.json({
        success: true,
        data: {
          version: packageJson.version,
          name: packageJson.name,
          buildTime: new Date().toISOString(),
          phase: 'Phase 13 - Architectural Consolidation Complete',
          architecture: {
            servers: 1,
            extractors: 1,
            mcpClients: 1,
            consolidated: true
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get version info',
        details: error.message
      });
    }
  });

  // New detailed health endpoint
  app.get('/api/health/detailed', (req, res) => {
    try {
      if (!serviceManager) {
        return res.json({
          success: false,
          error: 'Enhanced monitoring not available',
          mode: 'legacy'
        });
      }

      const servicesStatus = serviceManager.getServicesStatus();
      
      res.json({
        success: true,
        data: {
          ...servicesStatus,
          legacy: {
            mcp: mcpConnected,
            webSocket: {
              connected: webSocketManager.getActiveConnectionsCount() > 0,
              activeConnections: webSocketManager.getActiveConnectionsCount(),
              activeComparisons: webSocketManager.getActiveComparisonsCount(),
            },
            browser: browserPool.getStats(),
            performance: performanceMonitor.getRealTimeMetrics()
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // MCP status endpoint
  app.get('/api/mcp/status', async (req, res) => {
    try {
      let mcpStatus = {
        available: false,
        connected: mcpConnected,
        error: null
      };

      if (figmaClient) {
        try {
          const connectionTest = await figmaClient.connect();
          mcpStatus.available = connectionTest;
          mcpStatus.connected = connectionTest;
        } catch (error) {
          mcpStatus.error = error.message;
        }
      }

      res.json(mcpStatus);
    } catch (error) {
      res.status(500).json({
        available: false,
        connected: false,
        error: error.message
      });
    }
  });

  // Circuit breaker status endpoint
  app.get('/api/health/circuit-breakers', async (req, res) => {
    try {
      if (!serviceManager) {
        return res.json({
          success: false,
          error: 'Circuit breakers not available',
          mode: 'legacy'
        });
      }

      const { circuitBreakerRegistry } = await import('../resilience/CircuitBreaker.js');
      
      res.json({
        success: true,
        data: {
          summary: circuitBreakerRegistry.getHealthStatus(),
          details: circuitBreakerRegistry.getAllStats()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
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
   * Reports listing endpoint with parsed metadata
   */
  app.get('/api/reports/list', async (req, res) => {
    try {
      // Import the reports data adapter
      const { default: ReportsDataAdapter } = await import('../../services/reports/ReportsDataAdapter.js');
      const reportsPath = path.join(__dirname, '../../../output/reports');
      
      const adapter = new ReportsDataAdapter(reportsPath);
      const reports = await adapter.getAllReports();

      res.json({
        success: true,
        reports,
        total: reports.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to list reports', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to list reports',
        message: error.message
      });
    }
  });

  /**
   * Delete report endpoint
   */
  app.delete('/api/reports/:id', async (req, res) => {
    try {
      const fs = await import('fs');
      const { id } = req.params;
      const reportsPath = path.join(__dirname, '../../../output/reports');
      
      // Find the report file
      const files = fs.readdirSync(reportsPath);
      const reportFile = files.find(file => 
        file.includes(id) && file.endsWith('.html')
      );
      
      if (!reportFile) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }
      
      const filePath = path.join(reportsPath, reportFile);
      fs.unlinkSync(filePath);
      
      logger.info(`Report deleted: ${reportFile}`);
      
      res.json({
        success: true,
        message: 'Report deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete report', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to delete report',
        message: error.message
      });
    }
  });

  /**
   * Settings endpoints
   */
  app.get('/api/settings', healthLimiter, (req, res) => {
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

  app.post('/api/settings/save', healthLimiter, (req, res) => {
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

  app.post('/api/settings/test-connection', healthLimiter, async (req, res) => {
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
   * Figma extraction endpoint using unified extractor
   */
  app.post('/api/figma-only/extract',
    extractionLimiter,
    validateExtractionUrl(config.security.allowedHosts),
    async (req, res, next) => {
    try {
      const { figmaUrl, extractionMode = 'both', preferredMethod = null } = req.body;

      // Use unified extractor
      const { UnifiedFigmaExtractor } = await import('../../shared/extractors/UnifiedFigmaExtractor.js');
      const extractor = new UnifiedFigmaExtractor(config);

      // Extract data using best available method
      const extractionResult = await extractor.extract(figmaUrl, {
        preferredMethod,
        timeout: 30000,
        apiKey: loadFigmaApiKey()
      });

      if (!extractionResult.success) {
        throw new Error(extractionResult.error || 'Extraction failed');
      }

      const standardizedData = extractionResult.data;
      
      // Generate HTML report for Figma extraction
      const reportGenerator = await import('../../reporting/index.js');
      let reportPath = null;
      
      try {
        const reportData = {
          figmaData: {
            fileName: standardizedData.metadata.fileName,
            extractedAt: standardizedData.extractedAt,
            components: standardizedData.components,
            metadata: standardizedData.metadata
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
            componentsExtracted: standardizedData.components.length,
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
      
      // Count all components recursively
      const countAllComponents = (components) => {
        let count = 0;
        components.forEach(component => {
          count += 1;
          if (component.children && component.children.length > 0) {
            count += countAllComponents(component.children);
          }
        });
        return count;
      };

      const totalComponentCount = countAllComponents(standardizedData.components);

      // Ensure metadata is properly constructed even if standardizedData.metadata is null
      const metadata = {
        ...(standardizedData.metadata || {}), // Handle null metadata gracefully
        componentCount: totalComponentCount, // Use actual count
        colorCount: standardizedData.colors?.length || 0, // Use actual count with fallback
        typographyCount: standardizedData.typography?.length || 0, // Use actual count with fallback
        extractedAt: new Date().toISOString(),
        source: standardizedData.extractionMethod || 'figma-mcp'
      };

      console.log('🔍 Figma extraction metadata debug:', {
        originalMetadata: standardizedData.metadata,
        colorsLength: standardizedData.colors?.length,
        constructedMetadata: metadata
      });

      res.json({
        success: true,
        data: {
          ...standardizedData,
          componentCount: totalComponentCount, // Override with actual recursive count
          extractionMethod: standardizedData.extractionMethod, // Ensure it's at root level
          metadata,
          reportPath: reportPath ? `/reports/${reportPath.split('/').pop()}` : null
        }
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * Web extraction endpoint (legacy route)
   * @deprecated Use /api/web/extract-v3 instead
   */
  app.post('/api/web/extract', async (req, res) => {
    console.warn('⚠️ DEPRECATED: /api/web/extract will be removed. Use /api/web/extract-v3');
    res.setHeader('X-Deprecated-Endpoint', 'true');
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
      
      // Use the unified extractor instead of creating a new instance
      webExtractor = unifiedWebExtractor;
      
      // Ensure extractor is initialized
      if (!webExtractor.isReady()) {
        await webExtractor.initialize();
      }
      
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
      // Mark extraction as completed (cleanup is handled by unified extractor internally)
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
      const targetUrl = webUrl || req.body.url;

      if (!targetUrl) {
        return res.status(400).json({
          success: false,
          error: 'Web URL is required'
        });
      }

      console.log(`🔗 Starting web-only extraction for: ${targetUrl}`);

      // Route web-only extractions through the unified extractor for robustness
      const isFreightTiger = targetUrl.includes('freighttiger.com');
      const unifiedOptions = {
        authentication,
        includeScreenshot: false,
        viewport: { width: 1920, height: 1080 },
        timeout: isFreightTiger ? Math.max(config.timeouts.webExtraction, 120000) : config.timeouts.webExtraction
      };

      const webData = await unifiedWebExtractor.extractWebData(targetUrl, unifiedOptions);
      
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
            fileName: `Web Extraction Report for ${new URL(targetUrl).hostname}`,
            extractedAt: new Date().toISOString(),
            components: [],
            metadata: {}
          },
          webData: {
            url: webData.url || targetUrl,
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
    console.log('🚀 COMPARE ENDPOINT HIT - Request received');
    console.log('🔍 Request body keys:', Object.keys(req.body));
    console.log('🔍 Authentication in body:', !!req.body.authentication);
    
    try {
      const { figmaUrl, webUrl, includeVisual = false, nodeId } = req.body;
      
      if (!figmaUrl || !webUrl) {
        return res.status(400).json({
          success: false,
          error: 'Both Figma URL and Web URL are required'
        });
      }


      // Extract data from both sources using the same method as single source
      logger.info('Starting data extraction', { figmaUrl, webUrl });
      const startTime = Date.now();
      
      const figmaStartTime = Date.now();
      let figmaData = null;
      try {
        console.log('🎨 Using UnifiedFigmaExtractor for comparison (same as single source)');
        console.log('🎯 NodeId from request:', nodeId || 'No nodeId - extracting full file');
        
        // Use unified extractor - SAME AS SINGLE SOURCE
        const { UnifiedFigmaExtractor } = await import('../../shared/extractors/UnifiedFigmaExtractor.js');
        const extractor = new UnifiedFigmaExtractor(config);

        // Extract data using best available method (MCP first, API fallback)
        const extractionResult = await extractor.extract(figmaUrl, {
          preferredMethod: null,
          timeout: 30000,
          apiKey: loadFigmaApiKey(),
          nodeId: nodeId  // Pass nodeId for specific component extraction
        });

        if (!extractionResult.success) {
          throw new Error(extractionResult.error || 'Extraction failed');
        }

        const standardizedData = extractionResult.data;

        if (standardizedData && standardizedData.components) {
          // Use the SAME structure as single extraction endpoint
          figmaData = {
            ...standardizedData,  // Include ALL standardized data fields
            componentCount: standardizedData.componentCount || standardizedData.components.length,
            componentsCount: standardizedData.componentCount || standardizedData.components.length, // Legacy compatibility
            // Ensure these fields are explicitly available
            components: standardizedData.components,
            colors: standardizedData.colors || [],
            typography: standardizedData.typography || [],
            metadata: standardizedData.metadata,
            extractionMethod: standardizedData.extractionMethod
          };
          
          // Colors extracted successfully
          
          console.log('✅ Figma extraction successful via UnifiedFigmaExtractor');
          console.log('📊 Figma data summary:', {
            components: figmaData.components?.length || 0,
            componentCount: figmaData.componentCount,
            colors: figmaData.colors?.length || 0,
            typography: figmaData.typography?.length || 0,
            extractionMethod: figmaData.extractionMethod,
            fileName: standardizedData.metadata?.fileName || 'Unknown'
          });
        } else {
          throw new Error('Figma extraction returned no components');
        }
      } catch (figmaError) {
        console.log('⚠️ Figma extraction failed, continuing with web extraction only:', figmaError.message);
        figmaData = { 
          components: [], 
          componentCount: 0,
          componentsCount: 0,
          error: figmaError.message 
        };
      }
  const figmaDuration = Date.now() - figmaStartTime;
  performanceMonitor.trackExtraction('Figma', figmaDuration, { url: figmaUrl });
  
  const webStartTime = Date.now();
  let webData;
  
  // DEBUG: Log the full request body to understand the structure
  console.log('🔍 DEBUG: Full request body:', JSON.stringify(req.body, null, 2));
  console.log('🔍 DEBUG: Authentication object:', JSON.stringify(req.body.authentication, null, 2));
  
  // Extract authentication from request body if available
  const authentication = req.body.authentication?.webAuth ? {
    type: 'form',
    username: req.body.authentication.webAuth.username,
    password: req.body.authentication.webAuth.password
  } : req.body.authentication && req.body.authentication.type ? {
    type: req.body.authentication.type,
    username: req.body.authentication.username,
    password: req.body.authentication.password,
    loginUrl: req.body.authentication.loginUrl,
    waitTime: req.body.authentication.waitTime,
    successIndicator: req.body.authentication.successIndicator
  } : null;

  console.log('🔧 Using UnifiedWebExtractor for comparison with auth:', authentication ? 'enabled' : 'disabled');
  console.log('🔍 DEBUG: Parsed authentication:', JSON.stringify(authentication, null, 2));
  
  try {
    console.log(`🔧 Using authentication: ${authentication ? 'enabled' : 'disabled'}`);
    
    // Use the UnifiedWebExtractor instead of EnhancedWebExtractor
    webData = await unifiedWebExtractor.extractWebData(webUrl, {
      authentication: authentication,
      timeout: webUrl.includes('freighttiger.com') ? 300000 : 60000, // 5 minutes for FreightTiger
      includeScreenshot: false,
      stabilityTimeout: webUrl.includes('freighttiger.com') ? 60000 : 5000 // Extra stability time for FreightTiger
    });
    
    console.log('✅ Web extraction completed:', webData.elements?.length || 0, 'elements');
    console.log('📊 Web data summary:', {
      elements: webData.elements?.length || 0,
      colors: webData.colorPalette?.length || 0,
      fontFamilies: webData.typography?.fontFamilies?.length || 0,
      fontSizes: webData.typography?.fontSizes?.length || 0,
      spacing: webData.spacing?.length || 0,
      borderRadius: webData.borderRadius?.length || 0
    });
    
    // Debug: Sample extracted data
    if (webData.colorPalette?.length > 0) {
      console.log('🎨 Sample colors:', webData.colorPalette.slice(0, 3));
    }
    if (webData.typography?.fontFamilies?.length > 0) {
      console.log('📝 Sample fonts:', webData.typography.fontFamilies.slice(0, 3));
    }
    if (webData.spacing?.length > 0) {
      console.log('📏 Sample spacing:', webData.spacing.slice(0, 3));
    }
  } catch (webError) {
    console.error('❌ Web extraction failed:', webError.message);
    throw webError;
  }
  
  const webDuration = Date.now() - webStartTime;
  performanceMonitor.trackExtraction('Web', webDuration, { url: webUrl });

  logger.extraction('Figma', figmaUrl, figmaData);
  logger.extraction('Web', webUrl, webData);

  // Compare the data
  const comparisonStartTime = Date.now();
  console.log('🔄 Starting comparison with data:', {
    figmaComponents: figmaData.components?.length || 0,
    webElements: webData.elements?.length || 0
  });
  
  const comparison = await comparisonEngine.compareDesigns(figmaData, webData);
  const comparisonDuration = Date.now() - comparisonStartTime;
  
  console.log('✅ Comparison completed:', {
    totalComparisons: comparison.comparisons?.length || 0,
    totalMatches: comparison.summary?.totalMatches || 0,
    totalDeviations: comparison.summary?.totalDeviations || 0
  });
  
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

      // Figma extraction completed successfully

      // Prepare extraction details for frontend
      const extractionDetails = {
        figma: {
          componentCount: figmaData?.components?.length || 0,
          colors: figmaData?.colors || [],
          typography: {
            fontFamilies: [...new Set((figmaData?.typography || []).map(t => t.fontFamily).filter(Boolean))],
            fontSizes: [...new Set((figmaData?.typography || []).map(t => t.fontSize ? `${t.fontSize}px` : null).filter(Boolean))],
            fontWeights: [...new Set((figmaData?.typography || []).map(t => t.fontWeight?.toString()).filter(Boolean))]
          },
          extractionTime: figmaDuration,
          fileInfo: {
            name: figmaData?.fileName || 'Unknown',
            nodeId: figmaData?.nodeId
          }
        },
        web: {
          elementCount: webData?.elements?.length || 0,
          colors: (webData?.colors || webData?.colorPalette || []).map(color => {
            // Convert RGB colors to hex format for consistency
            if (typeof color === 'string' && color.startsWith('rgb(')) {
              const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
              if (match) {
                const [, r, g, b] = match;
                return `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
              }
            }
            // Handle RGBA colors
            if (typeof color === 'string' && color.startsWith('rgba(')) {
              const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/);
              if (match) {
                const [, r, g, b, a] = match;
                const alpha = parseFloat(a);
                if (alpha === 1) {
                  // Full opacity, convert to hex
                  return `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
                }
                // Keep RGBA for transparency
                return color;
              }
            }
            return color; // Return as-is if already hex or other format
          }),
          typography: {
            fontFamilies: webData?.typography?.fontFamilies || [],
            fontSizes: webData?.typography?.fontSizes || [],
            fontWeights: webData?.typography?.fontWeights || []
          },
          spacing: webData?.spacing || [],
          borderRadius: webData?.borderRadius || [],
          extractionTime: webDuration,
          urlInfo: {
            url: webUrl,
            title: webData?.metadata?.title
          }
        },
        comparison: {
          totalComparisons: comparison?.comparisons?.length || 0,
          matches: comparison?.summary?.totalMatches || 0,
          deviations: comparison?.summary?.totalDeviations || 0,
          matchPercentage: comparison?.overallMatch || 0
        }
      };

      // Add component counts to the response data
      const responseData = {
        figmaData: {
          ...figmaData,
          // STANDARDIZED FIELDS (preferred)
          componentCount: figmaData?.components?.length || 0, // Standard field name
          
          // LEGACY FIELDS (maintained for backward compatibility)
          componentsCount: figmaData?.components?.length || 0 // Keep for compatibility
        },
        webData: {
          ...webData,
          // STANDARDIZED FIELDS (preferred)
          elementCount: webData?.elements?.length || 0, // Standard field name
          
          // LEGACY FIELDS (maintained for backward compatibility)
          elementsCount: webData?.elements?.length || 0 // Keep for compatibility
        },
        comparison,
        metadata: {
          comparedAt: new Date().toISOString(),
          includeVisual,
          version: '1.0.0',
          
          // STANDARDIZED FIELDS (preferred)
          figmaComponentCount: figmaData?.components?.length || 0, // Standard field name
          webElementCount: webData?.elements?.length || 0, // Standard field name
          
          // LEGACY FIELDS (maintained for backward compatibility)
          figmaComponentsCount: figmaData?.components?.length || 0, // Keep for compatibility
          webElementsCount: webData?.elements?.length || 0 // Keep for compatibility
        },
        reportPath: reportPath ? `/reports/${reportPath.split('/').pop()}` : null,
        extractionDetails
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
   * Screenshot Comparison Endpoints
   */
  
  // Configure multer for file uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadId = req.uploadId || uuidv4();
      req.uploadId = uploadId;
      const uploadDir = path.join(process.cwd(), 'output/screenshots/uploads', uploadId);
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const prefix = file.fieldname === 'figmaScreenshot' ? 'figma' : 'developed';
      cb(null, `${prefix}-original${ext}`);
    }
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 2
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
      }
    }
  });

  // Screenshot upload endpoint (NO rate limiting - internal file processing)
  app.post('/api/screenshots/upload',
    (req, res, next) => {
      upload.fields([
        { name: 'figmaScreenshot', maxCount: 1 },
        { name: 'developedScreenshot', maxCount: 1 }
      ])(req, res, (err) => {
        if (err) {
          console.error('Multer error:', err);
          return res.status(400).json({
            success: false,
            error: 'File upload error: ' + err.message
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        console.log('Upload request received:', {
          hasFiles: !!req.files,
          fileFields: req.files ? Object.keys(req.files) : [],
          body: req.body,
          headers: {
            'content-type': req.headers['content-type'],
            'content-length': req.headers['content-length']
          }
        });
        
        const files = req.files;
        
        if (!files || !files.figmaScreenshot || !files.developedScreenshot) {
          console.log('Missing files:', {
            files: !!files,
            figmaScreenshot: files ? !!files.figmaScreenshot : false,
            developedScreenshot: files ? !!files.developedScreenshot : false
          });
          return res.status(400).json({
            success: false,
            error: 'Both Figma and developed screenshots are required'
          });
        }

        // Get upload ID from multer storage
        const uploadId = req.uploadId;
        
        // Store upload metadata
        const metadata = {
          uploadId,
          figmaPath: files.figmaScreenshot[0].path,
          developedPath: files.developedScreenshot[0].path,
          figmaOriginalName: files.figmaScreenshot[0].originalname,
          developedOriginalName: files.developedScreenshot[0].originalname,
          uploadedAt: new Date().toISOString(),
          metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
        };

        const uploadDir = path.dirname(files.figmaScreenshot[0].path);
        await fs.promises.writeFile(
          path.join(uploadDir, 'metadata.json'),
          JSON.stringify(metadata, null, 2)
        );

        res.json({
          success: true,
          data: { uploadId },
          message: 'Screenshots uploaded successfully'
        });

      } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
          success: false,
          error: 'Upload failed: ' + error.message
        });
      }
    }
  );

  // Start screenshot comparison endpoint
  app.post('/api/screenshots/compare', async (req, res) => {
    try {
      const { uploadId, settings } = req.body;
      
      if (!uploadId) {
        return res.status(400).json({
          success: false,
          error: 'Upload ID is required'
        });
      }

      if (!screenshotComparisonService) {
        return res.status(503).json({
          success: false,
          error: 'Screenshot comparison service not available'
        });
      }

      // Default settings
      const comparisonSettings = {
        threshold: 0.1,
        colorTolerance: 30,
        ignoreAntiAliasing: false,
        includeTextAnalysis: true,
        layoutAnalysis: true,
        colorAnalysis: true,
        spacingAnalysis: true,
        ...settings
      };

      console.log(`📸 Starting screenshot comparison for upload: ${uploadId}`);
      
      const result = await screenshotComparisonService.compareScreenshots(uploadId, comparisonSettings);
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Screenshot comparison error:', error);
      res.status(500).json({
        success: false,
        error: 'Screenshot comparison failed: ' + error.message
      });
    }
  });

  // Serve screenshot comparison images
  app.get('/api/screenshots/images/:comparisonId/:imageType', async (req, res) => {
    try {
      const { comparisonId, imageType } = req.params;
      
      // Validate image type
      const allowedTypes = ['pixel-diff', 'side-by-side', 'figma-processed', 'developed-processed'];
      if (!allowedTypes.includes(imageType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid image type'
        });
      }
      
      const comparisonDir = path.join(process.cwd(), 'output/screenshots/comparisons', comparisonId);
      let imagePath;
      
      switch (imageType) {
        case 'pixel-diff':
          imagePath = path.join(comparisonDir, 'pixel-diff.png');
          break;
        case 'side-by-side':
          imagePath = path.join(comparisonDir, 'side-by-side.png');
          break;
        case 'figma-processed':
          imagePath = path.join(comparisonDir, 'figma-processed.png');
          break;
        case 'developed-processed':
          imagePath = path.join(comparisonDir, 'developed-processed.png');
          break;
      }
      
      // Check if image exists
      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({
          success: false,
          error: 'Image not found'
        });
      }
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      
      // Stream the image file
      const imageStream = fs.createReadStream(imagePath);
      imageStream.pipe(res);
      
    } catch (error) {
      console.error('Error serving image:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to serve image'
      });
    }
  });

  // Serve screenshot comparison detailed reports
  app.get('/api/screenshots/reports/:comparisonId', async (req, res) => {
    try {
      const { comparisonId } = req.params;
      
      const comparisonDir = path.join(process.cwd(), 'output/screenshots/comparisons', comparisonId);
      const reportPath = path.join(comparisonDir, 'detailed-report.html');
      
      // Check if report exists
      if (!fs.existsSync(reportPath)) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }
      
      // Set appropriate headers for HTML
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      
      // Stream the HTML file
      const reportStream = fs.createReadStream(reportPath);
      reportStream.pipe(res);
      
    } catch (error) {
      console.error('Error serving report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to serve report'
      });
    }
  });

  // Get screenshot comparison status/result endpoint
  app.get('/api/screenshots/compare/:comparisonId', async (req, res) => {
    try {
      const { comparisonId } = req.params;
      const resultPath = path.join(process.cwd(), 'output/screenshots/comparisons', comparisonId, 'result.json');
      
      if (!fs.existsSync(resultPath)) {
        return res.status(404).json({
          success: false,
          error: 'Comparison result not found'
        });
      }

      const result = JSON.parse(await fs.promises.readFile(resultPath, 'utf8'));
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Get comparison result error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve comparison result: ' + error.message
      });
    }
  });

  // List screenshot comparisons endpoint
  app.get('/api/screenshots/list', async (req, res) => {
    try {
      const comparisonsDir = path.join(process.cwd(), 'output/screenshots/comparisons');
      
      if (!fs.existsSync(comparisonsDir)) {
        return res.json({
          success: true,
          data: []
        });
      }

      const dirs = await fs.promises.readdir(comparisonsDir);
      const comparisons = [];

      for (const dir of dirs) {
        const resultPath = path.join(comparisonsDir, dir, 'result.json');
        if (fs.existsSync(resultPath)) {
          try {
            const result = JSON.parse(await fs.promises.readFile(resultPath, 'utf8'));
            comparisons.push({
              id: result.id,
              status: result.status,
              createdAt: result.createdAt,
              metrics: result.metrics ? {
                overallSimilarity: result.metrics.overallSimilarity,
                totalDiscrepancies: result.metrics.totalDiscrepancies,
                qualityScore: result.metrics.qualityScore
              } : null
            });
          } catch (parseError) {
            console.warn(`Failed to parse result for ${dir}:`, parseError.message);
          }
        }
      }

      // Sort by creation date (newest first)
      comparisons.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({
        success: true,
        data: comparisons
      });

    } catch (error) {
      console.error('List comparisons error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list comparisons: ' + error.message
      });
    }
  });

  /**
   * Catch-all route - serve frontend (exclude report files)
   */
  app.get('*', (req, res) => {
    // Don't serve frontend for report files
    if (req.path.startsWith('/report_') && req.path.endsWith('.html')) {
      return res.status(404).send('Report not found');
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  /**
   * Enhanced web extraction endpoint (V2 - Legacy)
   * @deprecated Use /api/web/extract-v3 instead
   */
  app.post('/api/web/extract-v2',
    extractionLimiter,
    validateExtractionUrl(config.security.allowedHosts),
    async (req, res, next) => {
    console.warn('⚠️ DEPRECATED: /api/web/extract-v2 will be removed. Use /api/web/extract-v3');
    res.setHeader('X-Deprecated-Endpoint', 'true');
    
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
   * Unified web extraction endpoint (V3 - Recommended)
   */
  app.post('/api/web/extract-v3',
    extractionLimiter,
    validateExtractionUrl(config.security.allowedHosts),
    async (req, res, next) => {
    try {
      const { url, authentication, options = {} } = req.body;
      const startTime = Date.now();

      console.log(`🚀 Starting unified extraction for: ${url}`);

      // Extract using unified extractor with cross-platform support
      const webData = await unifiedWebExtractor.extractWebData(url, {
        authentication,
        timeout: options.timeout || config.timeouts.webExtraction,
        includeScreenshot: options.includeScreenshot !== false,
        viewport: options.viewport || { width: 1920, height: 1080 },
        stabilityTimeout: options.stabilityTimeout || 5000,
        ...options
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Unified extraction completed in ${duration}ms`);

      // Track performance
      if (performanceMonitor) {
        performanceMonitor.trackExtraction('unified-web', duration, {
          url,
          elementsExtracted: webData.elements?.length || 0,
          hasScreenshot: !!webData.screenshot
        });
      }

      res.json({
        ...webData,
        extractor: 'unified-v3',
        performance: { duration }
      });
    } catch (error) {
      console.error(`❌ Unified extraction failed: ${error.message}`);
      next(error);
    }
  });

  /**
   * Browser pool statistics endpoint
   */
  app.get('/api/browser/stats', (req, res) => {
    const stats = browserPool.getStats();
    const resourceStats = resourceManager.getStats();
    
    res.json({
      browserPool: stats,
      resourceManager: resourceStats,
      activeExtractions: {
        v2: webExtractorV2.getActiveExtractions(),
        v3: unifiedWebExtractor.getActiveExtractions()
      },
      platform: {
        os: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      }
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
      // Shutdown enhanced services first
      if (serviceManager) {
        console.log('Shutting down enhanced service manager...');
        await serviceManager.shutdown();
      }
      
      // Cancel all active extractions
      console.log('Cancelling active extractions...');
      await webExtractorV2.cancelAllExtractions();
      await unifiedWebExtractor.cancelAllExtractions();
      
      // Shutdown resource manager
      console.log('Shutting down resource manager...');
      await shutdownResourceManager();
      
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