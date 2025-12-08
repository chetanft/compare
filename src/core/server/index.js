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
import { getMCPClient, getMCPProvider } from '../../config/mcp-config.js';
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
import { getOutputBaseDir } from '../../utils/outputPaths.js';
import { getSupabaseClient } from '../../config/supabase.js';
import { initDatabase } from '../../database/init.js';

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
  
  const figmaConnectionMode = getMCPProvider();
  const isApiOnlyFigma = figmaConnectionMode === 'api';
  
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
      if (!isApiOnlyFigma) {
        try {
          figmaClient = await getMCPClient();
        } catch (mcpError) {
          figmaClient = serviceManager.getService('mcpClient');
        }
      }
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
    try {
    if (!isApiOnlyFigma) {
      figmaClient = await getMCPClient();
    }
  } catch (mcpError) {
    if (!isApiOnlyFigma && figmaConnectionMode === 'desktop') {
      figmaClient = new FigmaMCPClient({
        baseUrl: process.env.FIGMA_DESKTOP_MCP_URL || 'http://127.0.0.1:3845/mcp'
      });
    } else if (!isApiOnlyFigma) {
      throw mcpError;
    }
  }
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
  let mcpConnected = isApiOnlyFigma ? null : false;
  
  // Initialize Screenshot Comparison Service
  let screenshotComparisonService;
  try {
    // Get storage provider for screenshot service
    const { getStorageProvider } = await import('../../config/storage-config.js');
    const storage = getStorageProvider(null); // Screenshots don't need userId for local mode
    screenshotComparisonService = new ScreenshotComparisonService(config, storage);
  } catch (error) {
    console.warn('⚠️ Screenshot comparison service initialization failed:', error.message);
  }

  // Initialize Supabase client (optional - graceful degradation if not configured)
  let supabaseClient = null;
  try {
    supabaseClient = getSupabaseClient(false); // Use public client for server operations
    if (supabaseClient) {
      console.log('✅ Supabase client initialized');
    } else {
      console.log('ℹ️ Supabase not configured - features requiring database will use local storage');
    }
  } catch (error) {
    console.warn('⚠️ Supabase initialization failed:', error.message);
    console.warn('   Continuing without Supabase - features will use local storage');
  }

  // Initialize database and services
  let dbServices = null;
  try {
    dbServices = await initDatabase({ userId: null }); // Will be set per-request if user authenticated
    console.log('✅ Database and services initialized');
  } catch (error) {
    console.warn('⚠️ Database initialization failed:', error.message);
    console.warn('   Continuing without database - some features may be limited');
  }
  
  // Configure enhanced middleware
  configureSecurityMiddleware(app, config);
  
  // Body parsing middleware - MUST come before routes
  // Increased limits to handle large payloads (but multipart/form-data uses multer)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
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
  
  // Authentication middleware (extracts user if present, but doesn't require it)
  try {
    const { extractUser } = await import('../../server/auth-middleware.js');
    app.use(extractUser);
    console.log('✅ Auth middleware registered');
  } catch (error) {
    console.warn('⚠️ Failed to load auth middleware:', error.message);
  }
  
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

  try {
    const exportRoutes = await import('../../routes/exportRoutes.js');
    app.use('/api/export', exportRoutes.default);
    console.log('✅ Export routes registered');
  } catch (error) {
    console.warn('⚠️ Failed to load export routes:', error.message);
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

  /**
   * MCP Proxy endpoint for remote MCP calls
   * Prevents tokens from reaching the browser
   */
  app.post('/api/mcp/proxy', healthLimiter, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required for remote MCP'
        });
      }
      
      const { method, params } = req.body;
      
      if (!method) {
        return res.status(400).json({
          success: false,
          error: 'Method is required'
        });
      }
      
      if (isApiOnlyFigma) {
        return res.status(400).json({
          success: false,
          error: 'MCP is disabled in API-only mode.'
        });
      }

      // Get MCP client with user's token (force remote provider)
      const mcpClient = await getMCPClient({
        userId: req.user.id,
        mode: 'figma'
      });
      
      // Ensure connected
      if (!mcpClient.initialized) {
        await mcpClient.connect();
      }
      
      // Call the MCP method
      let result;
      if (method === 'tools/list') {
        result = await mcpClient.listTools();
      } else if (method === 'tools/call') {
        if (!params?.name) {
          throw new Error('Tool name is required');
        }
        result = await mcpClient.callTool(params.name, params.arguments || {});
      } else {
        // Generic request
        result = await mcpClient.sendRequest({
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params: params || {}
        });
      }
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('MCP proxy error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

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
  const outputPath = getOutputBaseDir();
  app.use('/output', express.static(outputPath));
  app.use('/reports', express.static(path.join(outputPath, 'reports')));
  app.use('/images', express.static(path.join(outputPath, 'images')));
  app.use('/screenshots', express.static(path.join(outputPath, 'screenshots')));
  
  // Serve CSS styles for reports
  const stylesPath = path.join(__dirname, '../../reporting/styles');
  app.use('/styles', express.static(stylesPath));
  
  // Initialize MCP connection on startup (if enabled)
  if (figmaClient) {
    figmaClient.connect().then(connected => {
      mcpConnected = connected;
    }).catch(error => {
      console.warn('⚠️ MCP connection failed:', error.message);
    });
  }

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
        mcp: {
          enabled: !isApiOnlyFigma,
          connected: !!mcpConnected,
          mode: figmaConnectionMode
        },
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
      // Try multiple locations for package.json
      let packageJson;
      const possiblePaths = [
        path.join(process.cwd(), 'package.json'),
        path.join(__dirname, '../../../package.json'),
        path.join(process.resourcesPath || '', 'app/package.json'),
        path.join(process.resourcesPath || '', 'package.json')
      ];
      
      let foundPath = null;
      for (const pkgPath of possiblePaths) {
        try {
          if (fs.existsSync(pkgPath)) {
            packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            foundPath = pkgPath;
            break;
          }
        } catch (e) {
          // Continue to next path
        }
      }
      
      if (!packageJson) {
        // Fallback to hardcoded version if package.json not found
        packageJson = { version: '1.1.0', name: 'figma-web-comparison-tool' };
      }
      
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
          },
          packagePath: foundPath || 'fallback'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get version info',
        details: error.message,
        timestamp: new Date().toISOString()
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
        available: !isApiOnlyFigma && !!figmaClient,
        connected: !!mcpConnected,
        mode: figmaConnectionMode,
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
      } else if (isApiOnlyFigma) {
        mcpStatus.error = 'MCP disabled (using Figma API)';
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
      // Use ReportService if available, otherwise fall back to StorageProvider
      let reports = [];
      if (dbServices) {
        try {
          reports = await dbServices.reports.listReports({
            userId: req.user?.id || null,
            format: req.query.format || null,
            comparisonId: req.query.comparisonId || null
          });
        } catch (serviceError) {
          console.warn('⚠️ ReportService failed, falling back to StorageProvider:', serviceError.message);
          // Fall through to StorageProvider
        }
      }
      
      // Fallback to StorageProvider
      if (reports.length === 0 && !dbServices) {
        const { getStorageProvider } = await import('../../config/storage-config.js');
        const storage = getStorageProvider(req.user?.id);
        
        const filters = {
          userId: req.user?.id,
          format: req.query.format,
          comparisonId: req.query.comparisonId
        };
        
        reports = await storage.listReports(filters);
      }

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
      const { getReportsDir } = await import('../../utils/outputPaths.js');
      const { id } = req.params;
      const reportsPath = getReportsDir();
      
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
   * Auth endpoints
   */
  app.get('/api/auth/me', healthLimiter, async (req, res) => {
    try {
      if (!req.user) {
        return res.json({
          success: false,
          authenticated: false,
          user: null
        });
      }
      
      res.json({
        success: true,
        authenticated: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          createdAt: req.user.created_at
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
   * Design Systems endpoints
   */
  app.get('/api/design-systems', healthLimiter, async (req, res) => {
    try {
      const { getStorageProvider } = await import('../../config/storage-config.js');
      // Use user ID if authenticated, otherwise use local storage
      const storage = getStorageProvider(req.user?.id || null);
      
      const filters = {
        userId: req.user?.id,
        isGlobal: req.query.isGlobal === 'true' ? true : req.query.isGlobal === 'false' ? false : undefined
      };
      
      const systems = await storage.listDesignSystems(filters);
      
      res.json({
        success: true,
        data: systems
      });
    } catch (error) {
      logger.error('Failed to list design systems', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.post('/api/design-systems', healthLimiter, async (req, res) => {
    try {
      // Allow local storage mode (no auth required)
      // Only require auth for global systems or Supabase mode
      if (req.body.isGlobal && !req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required for global design systems'
        });
      }
      
      // Validate required fields
      if (!req.body.name || !req.body.name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Design system name is required'
        });
      }
      
      // Validate tokens if provided
      let tokens = {};
      if (req.body.tokens) {
        if (typeof req.body.tokens === 'string') {
          try {
            tokens = JSON.parse(req.body.tokens);
          } catch (parseError) {
            return res.status(400).json({
              success: false,
              error: `Invalid JSON in tokens: ${parseError.message}`
            });
          }
        } else if (typeof req.body.tokens === 'object') {
          tokens = req.body.tokens;
        } else {
          return res.status(400).json({
            success: false,
            error: 'Tokens must be a valid JSON object'
          });
        }
      }
      
      const { getStorageProvider } = await import('../../config/storage-config.js');
      // Use user ID if authenticated, otherwise use local storage
      const storage = getStorageProvider(req.user?.id || null);
      
      if (!storage) {
        throw new Error('Storage provider not available');
      }
      
      const systemData = {
        name: req.body.name.trim(),
        slug: req.body.slug?.trim(),
        tokens,
        cssUrl: req.body.cssUrl,
        cssText: req.body.cssText,
        figmaFileKey: req.body.figmaFileKey,
        figmaNodeId: req.body.figmaNodeId,
        isGlobal: req.body.isGlobal || false
      };
      
      const saved = await storage.saveDesignSystem(systemData);
      
      res.json({
        success: true,
        data: saved
      });
    } catch (error) {
      logger.error('Failed to create design system', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create design system'
      });
    }
  });

  app.get('/api/design-systems/:id', healthLimiter, async (req, res) => {
    try {
      const { getStorageProvider } = await import('../../config/storage-config.js');
      // Use user ID if authenticated, otherwise use local storage
      const storage = getStorageProvider(req.user?.id || null);
      
      const system = await storage.getDesignSystem(req.params.id);
      
      res.json({
        success: true,
        data: system
      });
    } catch (error) {
      logger.error('Failed to get design system', { error: error.message });
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  });

  app.put('/api/design-systems/:id', healthLimiter, async (req, res) => {
    try {
      const { getStorageProvider } = await import('../../config/storage-config.js');
      // Use user ID if authenticated, otherwise use local storage
      const storage = getStorageProvider(req.user?.id || null);
      
      // Get existing system to preserve ID
      const existing = await storage.getDesignSystem(req.params.id);
      
      // Check if trying to make global without auth
      if (req.body.isGlobal && !req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required for global design systems'
        });
      }
      
      const systemData = {
        id: existing.id,
        name: req.body.name ?? existing.name,
        slug: req.body.slug ?? existing.slug,
        tokens: req.body.tokens ?? existing.tokens,
        cssUrl: req.body.cssUrl ?? existing.cssUrl,
        cssText: req.body.cssText ?? existing.cssText,
        figmaFileKey: req.body.figmaFileKey ?? existing.figmaFileKey,
        figmaNodeId: req.body.figmaNodeId ?? existing.figmaNodeId,
        isGlobal: req.body.isGlobal ?? existing.isGlobal
      };
      
      const updated = await storage.saveDesignSystem(systemData);
      
      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      logger.error('Failed to update design system', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.delete('/api/design-systems/:id', healthLimiter, async (req, res) => {
    try {
      const { getStorageProvider } = await import('../../config/storage-config.js');
      // Use user ID if authenticated, otherwise use local storage
      const storage = getStorageProvider(req.user?.id || null);
      
      const deleted = await storage.deleteDesignSystem(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Design system not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Design system deleted'
      });
    } catch (error) {
      logger.error('Failed to delete design system', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.get('/api/design-systems/:id/css', healthLimiter, async (req, res) => {
    try {
      const { getStorageProvider } = await import('../../config/storage-config.js');
      // Use user ID if authenticated, otherwise use local storage
      const storage = getStorageProvider(req.user?.id || null);
      
      const css = await storage.getDesignSystemCSS(req.params.id);
      
      if (!css) {
        return res.status(404).json({
          success: false,
          error: 'CSS not found for this design system'
        });
      }
      
      // If it's a URL, redirect; otherwise return CSS text
      if (css.startsWith('http')) {
        return res.redirect(css);
      }
      
      res.setHeader('Content-Type', 'text/css');
      res.send(css);
    } catch (error) {
      logger.error('Failed to get design system CSS', { error: error.message });
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Credentials endpoints
   */
  app.get('/api/credentials', healthLimiter, async (req, res) => {
    try {
      // Support both Supabase and local storage
      if (supabaseClient && req.user) {
        // Use Supabase storage
        const { data: credentials, error } = await supabaseClient
          .from('saved_credentials')
          .select('id, name, url, login_url, notes, last_used_at, created_at, updated_at')
          .eq('user_id', req.user.id)
          .order('last_used_at', { ascending: false, nullsFirst: false });
        
        if (error) {
          throw new Error(error.message);
        }
        
        // Map login_url to loginUrl for frontend consistency
        const mappedCredentials = (credentials || []).map(cred => ({
          ...cred,
          loginUrl: cred.login_url
        }));
        
        return res.json({
          success: true,
          data: mappedCredentials
        });
      } else {
        // Use local storage
        const { getStorageProvider } = await import('../../config/storage-config.js');
        const storage = getStorageProvider();
        
        // Check if storage is local mode
        const storageMode = storage.getStorageMode ? storage.getStorageMode() : 'local';
        if (storageMode === 'local') {
          const credentials = await storage.listCredentials();
          return res.json({
            success: true,
            data: credentials || []
          });
        } else {
          return res.status(401).json({
            success: false,
            error: 'Authentication required for Supabase storage'
          });
        }
      }
    } catch (error) {
      logger.error('Failed to list credentials', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.post('/api/credentials', healthLimiter, async (req, res) => {
    try {
      const { name, url, loginUrl, username, password, notes } = req.body;
      
      // Validate required fields
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Credential name is required'
        });
      }
      if (!url || !url.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Credential URL is required'
        });
      }
      if (!username || !username.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        });
      }
      if (!password || !password.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Password is required'
        });
      }
      
      // Support both Supabase and local storage
      if (supabaseClient && req.user) {
        // Use Supabase storage
        const { CredentialManager } = await import('../../services/CredentialEncryption.js');
        const credentialManager = new CredentialManager();
        
        // Prepare credentials for storage
        const prepared = await credentialManager.prepareForStorage(
          { name, url, loginUrl, username, password, notes },
          supabaseClient
        );
        
        // Save to database
        const { data: credential, error } = await supabaseClient
          .from('saved_credentials')
          .insert({
            user_id: req.user.id,
            name: prepared.name,
            url: prepared.url,
            login_url: loginUrl || null,
            username_encrypted: prepared.username_encrypted,
            password_vault_id: prepared.password_vault_id,
            notes: notes || null
          })
          .select()
          .single();
        
        if (error) {
          throw new Error(error.message);
        }
        
        return res.json({
          success: true,
          data: {
            id: credential.id,
            name: credential.name,
            url: credential.url,
            loginUrl: credential.login_url,
            notes: credential.notes,
            last_used_at: credential.last_used_at,
            created_at: credential.created_at,
            updated_at: credential.updated_at
          }
        });
      } else {
        // Use local storage
        const { getStorageProvider } = await import('../../config/storage-config.js');
        const storage = getStorageProvider();
        
        // Check if storage is local mode
        const storageMode = storage.getStorageMode ? storage.getStorageMode() : 'local';
        if (storageMode === 'local') {
          if (!storage) {
            throw new Error('Storage provider not available');
          }
          const saved = await storage.saveCredential(
            { 
              name: name.trim(), 
              url: url.trim(), 
              loginUrl: loginUrl?.trim(), 
              username: username.trim(), 
              password: password.trim(), 
              notes: notes?.trim() 
            },
            {}
          );
          return res.json({
            success: true,
            data: saved
          });
        } else {
          return res.status(401).json({
            success: false,
            error: 'Authentication required for Supabase storage'
          });
        }
      }
    } catch (error) {
      logger.error('Failed to create credential', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create credential'
      });
    }
  });

  app.put('/api/credentials/:id', healthLimiter, async (req, res) => {
    try {
      const credentialId = req.params.id;
      const { name, url, loginUrl, username, password, notes } = req.body;
      
      // Validate required fields if provided
      if (name !== undefined && (!name || !name.trim())) {
        return res.status(400).json({
          success: false,
          error: 'Credential name cannot be empty'
        });
      }
      if (url !== undefined && (!url || !url.trim())) {
        return res.status(400).json({
          success: false,
          error: 'Credential URL cannot be empty'
        });
      }
      
      // Support both Supabase and local storage
      if (supabaseClient && req.user) {
        // Use Supabase storage
        const { CredentialManager } = await import('../../services/CredentialEncryption.js');
        const credentialManager = new CredentialManager();
        
        // Get existing credential
        const { data: existing, error: fetchError } = await supabaseClient
          .from('saved_credentials')
          .select('*')
          .eq('id', credentialId)
          .eq('user_id', req.user.id)
          .single();
        
        if (fetchError || !existing) {
          return res.status(404).json({
            success: false,
            error: 'Credential not found'
          });
        }
        
        // Prepare updated credentials
        let prepared = {};
        if (username || password) {
          // Decrypt existing to get full data
          const decrypted = await credentialManager.retrieveFromStorage(existing, supabaseClient);
          prepared = await credentialManager.prepareForStorage(
            {
              name: name || decrypted.name,
              url: url || decrypted.url,
              loginUrl: loginUrl !== undefined ? loginUrl : (existing.login_url || decrypted.loginUrl),
              username: username || decrypted.username,
              password: password || decrypted.password,
              notes: notes !== undefined ? notes : decrypted.notes
            },
            supabaseClient
          );
        } else {
          // Only update non-sensitive fields
          prepared = {
            name: name || existing.name,
            url: url || existing.url,
            username_encrypted: existing.username_encrypted,
            password_vault_id: existing.password_vault_id
          };
        }
        
        // Update in database
        const updateData = {
          name: prepared.name,
          url: prepared.url,
          username_encrypted: prepared.username_encrypted || existing.username_encrypted,
          password_vault_id: prepared.password_vault_id || existing.password_vault_id,
          notes: notes !== undefined ? notes : existing.notes,
          updated_at: new Date().toISOString()
        };
        
        // Include loginUrl if provided or if updating credentials
        if (loginUrl !== undefined) {
          updateData.login_url = loginUrl || null;
        } else if (prepared.loginUrl !== undefined) {
          updateData.login_url = prepared.loginUrl || null;
        }
        
        const { data: updated, error } = await supabaseClient
          .from('saved_credentials')
          .update(updateData)
          .eq('id', credentialId)
          .eq('user_id', req.user.id)
          .select()
          .single();
        
        if (error) {
          throw new Error(error.message);
        }
        
        return res.json({
          success: true,
          data: {
            id: updated.id,
            name: updated.name,
            url: updated.url,
            loginUrl: updated.login_url,
            notes: updated.notes,
            last_used_at: updated.last_used_at,
            created_at: updated.created_at,
            updated_at: updated.updated_at
          }
        });
      } else {
        // Use local storage
        const { getStorageProvider } = await import('../../config/storage-config.js');
        const storage = getStorageProvider();
        
        // Check if storage is local mode
        const storageMode = storage.getStorageMode ? storage.getStorageMode() : 'local';
        if (storageMode === 'local') {
          // Get existing credential to preserve encrypted values if username/password not provided
          let existing;
          try {
            existing = await storage.getCredential(credentialId);
          } catch (e) {
            return res.status(404).json({
              success: false,
              error: 'Credential not found'
            });
          }
          
          // Update credential (username/password optional - will preserve existing if not provided)
          if (!storage) {
            throw new Error('Storage provider not available');
          }
          const updated = await storage.saveCredential(
            {
              name: name !== undefined ? name.trim() : existing.name,
              url: url !== undefined ? url.trim() : existing.url,
              loginUrl: loginUrl !== undefined ? (loginUrl?.trim() || null) : existing.loginUrl,
              username: username !== undefined ? username : '', // Empty string means preserve existing
              password: password !== undefined ? password : '', // Empty string means preserve existing
              notes: notes !== undefined ? (notes?.trim() || null) : existing.notes
            },
            { id: credentialId }
          );
          
          return res.json({
            success: true,
            data: updated
          });
        } else {
          return res.status(401).json({
            success: false,
            error: 'Authentication required for Supabase storage'
          });
        }
      }
    } catch (error) {
      logger.error('Failed to update credential', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update credential'
      });
    }
  });

  app.delete('/api/credentials/:id', healthLimiter, async (req, res) => {
    try {
      const credentialId = req.params.id;
      
      // Support both Supabase and local storage
      if (supabaseClient && req.user) {
        // Use Supabase storage
        const { error } = await supabaseClient
          .from('saved_credentials')
          .delete()
          .eq('id', credentialId)
          .eq('user_id', req.user.id);
        
        if (error) {
          throw new Error(error.message);
        }
        
        return res.json({
          success: true,
          message: 'Credential deleted'
        });
      } else {
        // Use local storage
        const { getStorageProvider } = await import('../../config/storage-config.js');
        const storage = getStorageProvider();
        
        // Check if storage is local mode
        const storageMode = storage.getStorageMode ? storage.getStorageMode() : 'local';
        if (storageMode === 'local') {
          const deleted = await storage.deleteCredential(credentialId);
          if (!deleted) {
            return res.status(404).json({
              success: false,
              error: 'Credential not found'
            });
          }
          return res.json({
            success: true,
            message: 'Credential deleted'
          });
        } else {
          return res.status(401).json({
            success: false,
            error: 'Authentication required for Supabase storage'
          });
        }
      }
    } catch (error) {
      logger.error('Failed to delete credential', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.get('/api/credentials/:id/decrypt', healthLimiter, async (req, res) => {
    try {
      const credentialId = req.params.id;
      
      // Support both Supabase and local storage
      if (supabaseClient && req.user) {
        // Use Supabase storage
        // Get credential
        const { data: credential, error: fetchError } = await supabaseClient
          .from('saved_credentials')
          .select('*')
          .eq('id', credentialId)
          .eq('user_id', req.user.id)
          .single();
        
        if (fetchError || !credential) {
          return res.status(404).json({
            success: false,
            error: 'Credential not found'
          });
        }
        
        // Decrypt credentials (server-side only)
        const { CredentialManager } = await import('../../services/CredentialEncryption.js');
        const credentialManager = new CredentialManager();
        const decrypted = await credentialManager.retrieveFromStorage(credential, supabaseClient);
        
        // Update last_used_at
        await supabaseClient
          .from('saved_credentials')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', credentialId);
        
        return res.json({
          success: true,
          data: {
            id: credential.id,
            name: credential.name,
            url: decrypted.url,
            loginUrl: credential.login_url || decrypted.loginUrl,
            username: decrypted.username,
            password: decrypted.password
          }
        });
      } else {
        // Use local storage
        const { getStorageProvider } = await import('../../config/storage-config.js');
        const storage = getStorageProvider();
        
        // Check if storage is local mode
        const storageMode = storage.getStorageMode ? storage.getStorageMode() : 'local';
        if (storageMode === 'local') {
          const decrypted = await storage.decryptCredential(credentialId);
          return res.json({
            success: true,
            data: {
              id: decrypted.id,
              name: decrypted.name,
              url: decrypted.url,
              loginUrl: decrypted.loginUrl,
              username: decrypted.username,
              password: decrypted.password
            }
          });
        } else {
          return res.status(401).json({
            success: false,
            error: 'Authentication required for Supabase storage'
          });
        }
      }
    } catch (error) {
      logger.error('Failed to decrypt credential', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
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
          reportPath: reportPath ? `/reports/${reportPath.split('/').pop()}` : null,
          reports: reportPath ? {
            directUrl: `/reports/${reportPath.split('/').pop()}`,
            downloadUrl: `/reports/${reportPath.split('/').pop()}?download=true`,
            hasError: false
          } : null
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
          reportPath: reportPath ? `/reports/${path.basename(reportPath)}` : null,
          reports: reportPath ? {
            directUrl: `/reports/${path.basename(reportPath)}`,
            downloadUrl: `/reports/${path.basename(reportPath)}?download=true`,
            hasError: false
          } : null
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
  
  const freightTigerUrl = webUrl.includes('freighttiger.com');
  const requestedTimeout = req.body.options?.timeout;
  const comparisonTimeout = requestedTimeout 
    || (freightTigerUrl ? 300000 : (config?.timeouts?.webExtraction || 90000));

  const extractionOptions = {
    authentication,
    timeout: comparisonTimeout,
    includeScreenshot: false,
    stabilityTimeout: freightTigerUrl ? 60000 : 5000
  };

  const attemptWebExtraction = async (label = 'primary') => {
    console.log(`🌐 Web extraction attempt (${label}) with timeout ${comparisonTimeout}ms`);
    return unifiedWebExtractor.extractWebData(webUrl, extractionOptions);
  };

  try {
    console.log(`🔧 Using authentication: ${authentication ? 'enabled' : 'disabled'}`);
    webData = await attemptWebExtraction();
  } catch (webError) {
    const message = webError?.message || '';
    const canRetry = /Page was closed before extraction could begin/i.test(message) ||
      /Extraction aborted due to timeout/i.test(message);

    if (canRetry) {
      console.warn(`⚠️ Web extraction aborted early (${message}). Retrying once with fresh session...`);
      // Give the browser pool a brief moment to recycle pages
      await new Promise(resolve => setTimeout(resolve, 1500));
      webData = await attemptWebExtraction('retry');
    } else {
      console.error('❌ Web extraction failed:', message);
      throw webError;
    }
  }

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

      // Generate unique comparison ID for saving reports
      let comparisonId = `cmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`📋 Generated comparison ID: ${comparisonId}`);
      
      // Save comparison to database if services available
      if (dbServices) {
        try {
          const savedComparison = await dbServices.comparisons.createComparison({
            userId: req.user?.id || null,
            figmaUrl,
            webUrl,
            credentialId: req.body.credentialId || null,
            status: 'completed',
            result: comparison,
            durationMs: totalDuration,
            progress: 100
          });
          comparisonId = savedComparison.id;
          console.log(`✅ Comparison saved to database: ${comparisonId}`);
        } catch (dbError) {
          console.warn('⚠️ Failed to save comparison to database:', dbError.message);
        }
      }
      
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
        // Comparison identifier for saving reports
        comparisonId,
        id: comparisonId, // Alias for backwards compatibility
        
        figmaData: {
          ...figmaData,
          // STANDARDIZED FIELDS (preferred)
          componentCount: figmaData?.components?.length || 0, // Standard field name
          
          // Transform typography to include aggregated data for UI
          typography: {
            ...figmaData?.typography, // Keep original array
            fontFamilies: [...new Set((figmaData?.typography || [])
              .map(t => t.fontFamily)
              .filter(f => f && f !== 'Unknown' && f !== 'unknown'))], // Filter out Unknown
            fontSizes: [...new Set((figmaData?.typography || [])
              .map(t => t.fontSize ? `${t.fontSize}px` : null)
              .filter(Boolean))],
            fontWeights: [...new Set((figmaData?.typography || [])
              .map(t => t.fontWeight?.toString())
              .filter(Boolean))]
          },
          
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
        reports: reportPath ? {
          directUrl: `/reports/${reportPath.split('/').pop()}`,
          downloadUrl: `/reports/${reportPath.split('/').pop()}?download=true`,
          hasError: false
        } : null,
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
      // Generate uploadId once per request (first file triggers this)
      if (!req.uploadId) {
        req.uploadId = uuidv4();
      }
      const uploadDir = path.join(process.cwd(), 'output/screenshots/uploads', req.uploadId);
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
      fileSize: 50 * 1024 * 1024, // 50MB limit (increased for high-res screenshots)
      files: 2,
      fieldSize: 50 * 1024 * 1024 // Increase field size limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
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
      console.log('🔵 Screenshot upload request started');
      console.log('  Headers:', req.headers);
      console.log('  Content-Length:', req.headers['content-length']);
      console.log('  Content-Type:', req.headers['content-type']);
      
      // Increase timeout for large file uploads
      req.setTimeout(5 * 60 * 1000); // 5 minutes
      res.setTimeout(5 * 60 * 1000);
      
      upload.fields([
        { name: 'figmaScreenshot', maxCount: 1 },
        { name: 'developedScreenshot', maxCount: 1 }
      ])(req, res, (err) => {
        if (err) {
          console.error('❌ Multer error:', err);
          console.error('  Error code:', err.code);
          console.error('  Error message:', err.message);
          console.error('  Stack:', err.stack);
          
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
              success: false,
              error: 'File too large. Maximum file size is 50MB per screenshot.'
            });
          }
          return res.status(400).json({
            success: false,
            error: 'File upload error: ' + err.message
          });
        }
        console.log('✅ Multer processing complete, files uploaded');
        next();
      });
    },
    async (req, res) => {
      try {
        console.log('📦 Processing uploaded files...');
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

        // Get upload ID from multer storage (already generated in destination callback)
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
      
      // Save screenshot result to database if services available
      if (dbServices && result.id) {
        try {
          await dbServices.screenshots.createScreenshotResult({
            userId: req.user?.id || null,
            uploadId,
            comparisonId: result.id,
            status: result.status || 'completed',
            figmaScreenshotPath: result.figmaScreenshotPath,
            developedScreenshotPath: result.developedScreenshotPath,
            diffImagePath: result.diffImagePath,
            sideBySidePath: result.sideBySidePath,
            metrics: result.metrics,
            discrepancies: result.discrepancies,
            enhancedAnalysis: result.enhancedAnalysis,
            colorPalettes: result.colorPalettes,
            reportPath: result.reportPath,
            settings: comparisonSettings,
            processingTime: result.processingTime
          });
          console.log(`✅ Screenshot result saved to database: ${result.id}`);
        } catch (dbError) {
          console.warn('⚠️ Failed to save screenshot result to database:', dbError.message);
        }
      }
      
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

  /**
   * Save report endpoint
   */
  app.post('/api/reports/save', async (req, res) => {
    try {
      const { comparisonId, reportData, title, format = 'html' } = req.body;
      
      if (!comparisonId) {
        return res.status(400).json({
          success: false,
          error: 'Comparison ID is required'
        });
      }
      
      console.log(`📋 Saving report for comparison: ${comparisonId}`);
      
      // Use ReportService if available, otherwise fall back to StorageProvider
      let reportEntry;
      if (dbServices && reportData) {
        try {
          reportEntry = await dbServices.reports.generateAndSave(comparisonId, reportData, {
            userId: req.user?.id || null,
            title: title || `Comparison Report - ${new Date().toLocaleDateString()}`,
            format
          });
          console.log(`✅ Report saved via service: ${reportEntry.id}`);
        } catch (serviceError) {
          console.warn('⚠️ ReportService failed, falling back to StorageProvider:', serviceError.message);
          // Fall through to StorageProvider
        }
      }
      
      // Fallback to StorageProvider
      if (!reportEntry) {
        const { getStorageProvider } = await import('../../config/storage-config.js');
        const storage = getStorageProvider(req.user?.id);
        
        if (reportData) {
          reportEntry = await storage.saveReport(reportData, {
            comparisonId,
            title: title || `Comparison Report - ${new Date().toLocaleDateString()}`,
            format
          });
        } else {
          // Just create metadata entry (for existing reports)
          reportEntry = {
            id: `report_${Date.now()}`,
            comparisonId,
            title: title || `Comparison Report - ${new Date().toLocaleDateString()}`,
            format,
            url: `/reports/${comparisonId}.html`,
            createdAt: new Date().toISOString()
          };
        }
        console.log(`✅ Report saved via StorageProvider: ${reportEntry.id}`);
      }
      
      res.json({
        success: true,
        report: reportEntry,
        reports: [reportEntry] // For compatibility with frontend
      });
      
    } catch (error) {
      console.error('❌ Error saving report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to save report'
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
   * Note: No rate limiting - this is internal web scraping, not external API calls
   */
  app.post('/api/web/extract-v2',
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
   * Note: No rate limiting - this is internal web scraping, not external API calls
   */
  app.post('/api/web/extract-v3',
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

  // Export routes must be registered before static exports handler
  try {
    const exportRoutes = await import('../../routes/exportRoutes.js');
    app.use('/api/export', exportRoutes.default);
    console.log('✅ Export routes registered');
  } catch (error) {
    console.warn('⚠️ Failed to load export routes:', error.message);
  }

  // Serve exported bundles
  app.use('/exports', express.static(path.join(process.cwd(), 'output', 'exports')));

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

  // Add global error handlers for debugging
  process.on('uncaughtException', (error) => {
    console.error('💥 UNCAUGHT EXCEPTION:', error);
    console.error('  Message:', error.message);
    console.error('  Stack:', error.stack);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 UNHANDLED REJECTION:', reason);
    console.error('  Promise:', promise);
  });
  
  // Start server
  const PORT = config.server.port;
  const server = httpServer.listen(PORT, config.server.host, () => {
    // Write directly to stdout for Electron detection
    process.stdout.write(`Server running on port ${PORT}\n`);
    
    console.log(`🚀 Server running at http://${config.server.host}:${PORT}`);
    console.log(`📱 Frontend available at http://${config.server.host}:${PORT}`);
    console.log(`🔌 MCP Status: ${mcpConnected ? 'Connected' : 'Disconnected'}`);
    console.log(`🔌 WebSocket server ready for connections`);
    console.log(`🔧 Enhanced features: Browser Pool, Security, Rate Limiting`);
    
    // Start periodic status checks
    // Skip local MCP checks in production (Railway/cloud deployments don't have Figma Desktop)
    const allowLocalMCP = process.env.ENABLE_LOCAL_MCP === 'true' || process.env.NODE_ENV !== 'production';
    
    if (allowLocalMCP) {
      setInterval(async () => {
        try {
          const wasConnected = mcpConnected;
          if (figmaClient) {
            mcpConnected = await figmaClient.connect();
            
            if (wasConnected !== mcpConnected) {
              console.log(`🔌 MCP Status changed: ${mcpConnected ? 'Connected' : 'Disconnected'}`);
            }
          } else {
            mcpConnected = null;
          }
        } catch (error) {
          if (mcpConnected) {
            mcpConnected = false;
            console.log('🔌 MCP Status changed: Disconnected');
          }
        }
      }, 30000); // Check every 30 seconds
    } else {
      console.log('ℹ️  Local MCP health checks disabled in production (ENABLE_LOCAL_MCP not set)');
    }
  });

  // Setup signal handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

  return server;
} 
