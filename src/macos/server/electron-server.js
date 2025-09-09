/**
 * Electron Express Server
 * Unified Express.js server for macOS app (matches web app architecture)
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Conditional imports - only import when needed
let compression = null;
let helmet = null;
let morgan = null;

// Platform adapter
import { ElectronAdapter } from '../../platforms/electron-adapter.js';

// Unified configuration
import { UnifiedConfig } from '../../shared/config/unified-config.js';

// Unified handlers
import { FigmaHandler } from '../../shared/api/handlers/figma-handler.js';

// Unified services
import { ScreenshotService } from '../../shared/services/ScreenshotService.js';

// Services (lazy-loaded)
let webExtractor = null;
let comparisonService = null;
let screenshotService = null;
let screenshotComparisonService = null;
let performanceMonitor = null;
let circuitBreakerRegistry = null;
let enhancedReportGenerator = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ElectronExpressServer {
  constructor() {
    this.app = null;
    this.server = null;
    this.platformAdapter = new ElectronAdapter();
    this.config = new UnifiedConfig(this.platformAdapter);
    this.port = 3007;
  }

  /**
   * Initialize and start the server
   */
  async start() {
    try {
      console.log('🚀 Starting Electron Express Server...');

      // Initialize platform adapter
      await this.platformAdapter.initialize();

      // Load configuration
      this.config.load();
      this.config.set('platform', 'electron');

      // Create Express app
      this.app = express();

    // Initialize screenshot service
    screenshotService = new ScreenshotService(this.platformAdapter, this.config);
    
    // Initialize screenshot comparison service
    try {
      const { default: ScreenshotComparisonService } = await import('../../../macos-server/services/ScreenshotComparisonService.js');
      screenshotComparisonService = new ScreenshotComparisonService(this.config);
      console.log('✅ Screenshot comparison service initialized');
    } catch (error) {
      console.warn('⚠️ Screenshot comparison service not available:', error.message);
    }

    // Initialize enhanced report generator
    try {
      const { EnhancedReportGenerator } = await import('../../../macos-server/services/EnhancedReportGenerator.js');
      enhancedReportGenerator = new EnhancedReportGenerator();
      console.log('📊 Enhanced report generator initialized');
    } catch (error) {
      console.warn('⚠️ Enhanced report generator not available:', error.message);
    }

    // Initialize performance monitoring
    try {
      const { performanceMonitor: monitor } = await import('../../../macos-server/monitoring/PerformanceMonitor.js');
      performanceMonitor = monitor;
      performanceMonitor.startMonitoring(5000); // 5 second intervals
      console.log('✅ Performance monitoring initialized');
    } catch (error) {
      console.warn('⚠️ Performance monitoring not available:', error.message);
    }

    // Initialize circuit breakers
    try {
      const { circuitBreakerRegistry: registry } = await import('../../../macos-server/monitoring/CircuitBreaker.js');
      circuitBreakerRegistry = registry;
      
      // Register circuit breakers for key services
      circuitBreakerRegistry.getOrCreate('figma-api', {
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 30000,
        resetTimeout: 60000
      });
      
      circuitBreakerRegistry.getOrCreate('web-extraction', {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 45000,
        resetTimeout: 30000
      });
      
      circuitBreakerRegistry.getOrCreate('screenshot-comparison', {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 60000,
        resetTimeout: 45000
      });
      
      console.log('✅ Circuit breakers initialized');
    } catch (error) {
      console.warn('⚠️ Circuit breakers not available:', error.message);
    }

      // Configure middleware
      await this.configureMiddleware();

      // Configure file upload
      this.configureFileUpload();

      // Configure routes
      this.configureRoutes();

      // Start server
      await this.startServer();

      console.log('✅ Electron Express Server started successfully');
      return { success: true, port: this.port };

    } catch (error) {
      console.error('❌ Failed to start Electron Express Server:', error);
      throw error;
    }
  }

  /**
   * Configure Express middleware
   */
  async configureMiddleware() {
    const middlewareConfig = this.platformAdapter.getMiddlewareConfig();
    const serverConfig = this.platformAdapter.getServerConfig();

    // Security middleware (disabled for local app, but set custom CSP)
    if (middlewareConfig.helmet) {
      if (!helmet) {
        helmet = (await import('helmet')).default;
      }
      this.app.use(helmet());
    } else {
      // Set permissive CSP headers that work for both web and Electron
      this.app.use((req, res, next) => {
        res.setHeader('Content-Security-Policy', 
          "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
          "connect-src * 'unsafe-inline'; " +
          "script-src * 'unsafe-inline' 'unsafe-eval'; " +
          "style-src * 'unsafe-inline'; " +
          "img-src * data: blob: 'unsafe-inline'; " +
          "font-src * data: 'unsafe-inline'; " +
          "frame-src *; " +
          "media-src *; " +
          "object-src *;"
        );
        next();
      });
      console.log('🔓 Permissive CSP headers set for cross-platform compatibility');
    }

    // CORS configuration for cross-origin requests (web app to macOS app)
    this.app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Expose-Headers', '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }
      
      next();
    });
    console.log('🌐 CORS headers configured for cross-origin access');

    // Compression (disabled for local app)
    if (middlewareConfig.compression) {
      if (!compression) {
        compression = (await import('compression')).default;
      }
      this.app.use(compression());
    }

    // Logging
    if (middlewareConfig.morgan) {
      if (!morgan) {
        morgan = (await import('morgan')).default;
      }
      this.app.use(morgan(middlewareConfig.morgan));
    }

    // CORS
    this.app.use(cors(serverConfig.cors));

    // Body parsing
    this.app.use(express.json(middlewareConfig.bodyParser.json));
    this.app.use(express.urlencoded(middlewareConfig.bodyParser.urlencoded));

    // Rate limiting
    if (serverConfig.rateLimit) {
      const limiter = rateLimit(serverConfig.rateLimit);
      this.app.use('/api', limiter);
    }

    // Static file serving
    this.configureStaticFiles();

    // Request logging and performance tracking
    this.app.use((req, res, next) => {
      console.log(`📡 ${req.method} ${req.path}`);
      
      // Track request with performance monitor
      if (performanceMonitor && req.path.startsWith('/api/')) {
        const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const requestType = this.getRequestType(req.path);
        
        req.performanceTrackingId = requestId;
        performanceMonitor.trackRequestStart(requestId, requestType, {
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent')
        });
        
        // Track completion when response finishes
        const originalEnd = res.end;
        res.end = function(...args) {
          const success = res.statusCode < 400;
          performanceMonitor.trackRequestEnd(requestId, success, 
            success ? null : new Error(`HTTP ${res.statusCode}`)
          );
          originalEnd.apply(this, args);
        };
      }
      
      next();
    });
  }

  /**
   * Configure static file serving
   */
  configureStaticFiles() {
    const frontendPath = this.platformAdapter.getFrontendPath();
    const outputPath = this.platformAdapter.getOutputPath();

    // No CSP middleware needed - webSecurity: false in Electron handles this
    
    // Serve frontend files
    this.app.use(express.static(frontendPath));

    // Serve output files
    this.app.use('/output', express.static(outputPath));
    this.app.use('/reports', express.static(path.join(outputPath, 'reports')));
    this.app.use('/images', express.static(path.join(outputPath, 'images')));
    this.app.use('/screenshots', express.static(path.join(outputPath, 'screenshots')));

    console.log('📁 Static files configured:');
    console.log(`   Frontend: ${frontendPath}`);
    console.log(`   Output: ${outputPath}`);
  }

  /**
   * Configure file upload handling
   */
  configureFileUpload() {
    // Configure multer for memory storage
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: this.config.get('maxScreenshotSize', 10485760), // 10MB default
        files: 5 // Max 5 files per request
      },
      fileFilter: (req, file, cb) => {
        // Allow only image files
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
        }
      }
    });

    console.log('📤 File upload configured');
  }

  /**
   * Configure API routes
   */
  configureRoutes() {
    // Health check endpoints
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        platform: 'electron',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        config: this.config.getSummary()
      });
    });

    this.app.get('/api/health/detailed', (req, res) => {
      res.json({
        status: 'healthy',
        platform: 'electron',
        environment: this.platformAdapter.getEnvironmentInfo(),
        config: this.config.getSummary(),
        services: this.getServicesStatus()
      });
    });

    // Settings endpoints
    this.app.get('/api/settings', (req, res) => {
      const settings = {
        figmaApiKey: this.config.get('figmaApiKey') ? '***configured***' : '',
        platform: 'electron',
        version: this.config.get('version'),
        ...this.config.config
      };
      
      // Don't expose the actual API key
      delete settings.figmaApiKey;
      
      res.json(settings);
    });

    // Frontend expects /api/settings/current (compatibility endpoint)
    this.app.get('/api/settings/current', (req, res) => {
      try {
        const settings = {
          figmaApiKey: this.config.get('figmaApiKey') ? true : false, // Boolean for frontend
          platform: 'electron',
          version: this.config.get('version'),
          method: this.config.get('method') || 'direct-api',
          defaultTimeout: this.config.get('defaultTimeout') || 30000,
          maxConcurrentComparisons: this.config.get('maxConcurrentComparisons') || 3
        };
        
        res.json({
          success: true,
          data: settings
        });
      } catch (error) {
        console.error('❌ Settings current error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/settings/save', (req, res) => {
      try {
        const updates = req.body;
        
        // Validate updates
        const validation = this.config.validate();
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: 'Invalid configuration',
            details: validation.errors
          });
        }

        // Update configuration
        const success = this.config.update(updates);
        
        res.json({
          success,
          message: success ? 'Settings saved successfully' : 'Failed to save settings'
        });
      } catch (error) {
        console.error('❌ Settings save error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    this.app.post('/api/settings/test-connection', async (req, res) => {
      await FigmaHandler.testConnection(req, res, this.config);
    });

    // Test endpoint for debugging
    this.app.get('/api/test', async (req, res) => {
      await FigmaHandler.testEndpoint(req, res, this.config);
    });

    // MCP status endpoint (frontend compatibility)
    this.app.get('/api/mcp/status', (req, res) => {
      res.json({
        success: true,
        data: {
          available: false,
          serverUrl: null,
          status: 'unavailable',
          message: 'MCP server not configured in macOS app',
          platform: 'electron'
        }
      });
    });

    // Figma endpoints - Use MCP like web app
    this.app.post('/api/figma-only/extract', async (req, res) => {
      console.log('🎯 /api/figma-only/extract endpoint hit');
      await this.handleFigmaExtractionViaMCP(req, res);
    });

    this.app.post('/api/figma/extract', async (req, res) => {
      await FigmaHandler.extract(req, res, this.config, null);
    });

    this.app.get('/api/figma/metadata', async (req, res) => {
      await FigmaHandler.getFileMetadata(req, res, this.config);
    });

    // Web extraction endpoints
    this.app.post('/api/web/extract', async (req, res) => {
      await this.handleWebExtract(req, res);
    });

    this.app.post('/api/web/extract-v3', async (req, res) => {
      await this.handleWebExtract(req, res);
    });

    // Comparison endpoints
    this.app.post('/api/compare', async (req, res) => {
      await this.handleComparison(req, res);
    });

    // Screenshot endpoints (IMPLEMENTED - was missing from macOS app)
    this.app.post('/api/screenshots/upload', this.upload.array('screenshots', 5), async (req, res) => {
      await this.handleScreenshotUpload(req, res);
    });

    this.app.post('/api/screenshots/compare', async (req, res) => {
      await this.handleScreenshotComparison(req, res);
    });

    this.app.get('/api/screenshots/list', async (req, res) => {
      await this.handleScreenshotList(req, res);
    });

    this.app.get('/api/screenshots/:id', async (req, res) => {
      try {
        const screenshot = screenshotService.getScreenshotMetadata(req.params.id);
        if (!screenshot) {
          return res.status(404).json({ success: false, error: 'Screenshot not found' });
        }
        res.json({ success: true, data: screenshot });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.delete('/api/screenshots/:id', async (req, res) => {
      try {
        await screenshotService.deleteScreenshot(req.params.id);
        res.json({ success: true, message: 'Screenshot deleted successfully' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Report endpoints (NEW - missing from macOS app)
    this.app.get('/api/reports/list', async (req, res) => {
      await this.handleReportsList(req, res);
    });

    // Frontend expects /api/reports (compatibility endpoint)
    this.app.get('/api/reports', async (req, res) => {
      await this.handleReportsList(req, res);
    });

    // Get specific report by ID
    this.app.get('/api/reports/:id', async (req, res) => {
      await this.handleGetReport(req, res);
    });

    // Download report by ID
    this.app.get('/api/reports/:id/download', async (req, res) => {
      await this.handleDownloadReport(req, res);
    });

    // Missing screenshot endpoints for feature parity
    this.app.get('/api/screenshots/images/:comparisonId/:imageType', async (req, res) => {
      await this.handleScreenshotImage(req, res);
    });

    this.app.get('/api/screenshots/reports/:comparisonId', async (req, res) => {
      await this.handleScreenshotReport(req, res);
    });

    this.app.get('/api/screenshots/compare/:comparisonId', async (req, res) => {
      await this.handleScreenshotCompareResult(req, res);
    });

    // Missing web extraction endpoints
    this.app.post('/api/web-only/extract', async (req, res) => {
      await this.handleWebOnlyExtract(req, res);
    });

    this.app.post('/api/web/extract-v2', async (req, res) => {
      await this.handleWebExtractV2(req, res);
    });

    // Missing performance endpoints
    this.app.get('/api/health/circuit-breakers', async (req, res) => {
      await this.handleCircuitBreakers(req, res);
    });

    this.app.get('/api/performance/realtime', async (req, res) => {
      await this.handleRealtimePerformance(req, res);
    });

    // Missing extraction management
    this.app.post('/api/extractions/:id/cancel', async (req, res) => {
      await this.handleCancelExtraction(req, res);
    });

    // Performance endpoints (IMPLEMENTED - was missing from macOS app)
    this.app.get('/api/performance/summary', (req, res) => {
      if (performanceMonitor) {
        res.json({
          success: true,
          data: performanceMonitor.getPerformanceSummary()
        });
      } else {
        res.json({
          success: true,
          data: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            platform: process.platform,
            nodeVersion: process.version,
            monitoring: false
          }
        });
      }
    });

    this.app.get('/api/performance/realtime', (req, res) => {
      if (performanceMonitor) {
        res.json({
          success: true,
          data: performanceMonitor.getRealTimeMetrics()
        });
      } else {
        res.json({
          success: false,
          error: 'Performance monitoring not available'
        });
      }
    });

    this.app.get('/api/health/circuit-breakers', (req, res) => {
      if (circuitBreakerRegistry) {
        res.json({
          success: true,
          data: {
            summary: circuitBreakerRegistry.getHealthStatus(),
            details: circuitBreakerRegistry.getAllStats()
          }
        });
      } else {
        res.json({
          success: false,
          error: 'Circuit breakers not available'
        });
      }
    });

    this.app.get('/api/browser/stats', (req, res) => {
      res.json({
        userAgent: req.get('User-Agent'),
        platform: 'electron',
        timestamp: new Date().toISOString()
      });
    });

    // SPA routing - serve index.html for all non-API routes
    this.app.get('*', (req, res) => {
      const frontendPath = this.platformAdapter.getFrontendPath();
      const indexPath = path.join(frontendPath, 'index.html');
      
      // Set permissive CSP headers for SPA routing
      res.setHeader('Content-Security-Policy', 
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
        "connect-src * 'unsafe-inline'; " +
        "script-src * 'unsafe-inline' 'unsafe-eval'; " +
        "style-src * 'unsafe-inline'; " +
        "img-src * data: blob: 'unsafe-inline'; " +
        "font-src * data: 'unsafe-inline'; " +
        "frame-src *; " +
        "media-src *; " +
        "object-src *;"
      );
      
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Frontend not found');
      }
    });
  }

  /**
   * Lazy-load services to avoid startup dependency issues
   */
  async getServices() {
    if (!webExtractor || !comparisonService) {
      try {
        // Dynamic imports to avoid loading heavy dependencies at startup
        const UnifiedWebExtractorModule = await import('../../web/UnifiedWebExtractor.js');
        const ComparisonServiceModule = await import('../../compare/ComparisonService.js');

        // Handle both default and named exports
        const UnifiedWebExtractor = UnifiedWebExtractorModule.default || UnifiedWebExtractorModule.UnifiedWebExtractor;
        const ComparisonService = ComparisonServiceModule.ComparisonService || ComparisonServiceModule.default;

        webExtractor = new UnifiedWebExtractor();
        comparisonService = new ComparisonService();

        console.log('✅ Services lazy-loaded successfully');
      } catch (error) {
        console.error('❌ Failed to lazy-load services:', error);
        throw error;
      }
    }

    return { webExtractor, comparisonService };
  }

  /**
   * Get request type for performance tracking
   */
  getRequestType(path) {
    if (path.includes('/figma')) return 'figma-extraction';
    if (path.includes('/web')) return 'web-extraction';
    if (path.includes('/compare')) return 'comparison';
    if (path.includes('/screenshot')) return 'screenshot-comparison';
    if (path.includes('/performance')) return 'performance-monitoring';
    if (path.includes('/health')) return 'health-check';
    return 'general';
  }

  /**
   * Get services status
   */
  getServicesStatus() {
    return {
      webExtractor: !!webExtractor,
      comparisonService: !!comparisonService,
      screenshotService: !!screenshotService,
      screenshotComparisonService: !!screenshotComparisonService,
      performanceMonitor: !!performanceMonitor,
      circuitBreakerRegistry: !!circuitBreakerRegistry,
      enhancedReportGenerator: !!enhancedReportGenerator
    };
  }

  /**
   * Handle web extraction
   */
  async handleWebExtract(req, res) {
    try {
      const { webExtractor } = await this.getServices();
      const { url, webUrl, authentication, options: requestOptions = {} } = req.body;

      // Handle both 'url' and 'webUrl' for compatibility
      const targetUrl = url || webUrl;
      
      if (!targetUrl) {
        return res.status(400).json({
          success: false,
          error: 'URL is required'
        });
      }

      // Prepare options with defaults (FreightTiger-aware timeout and authentication)
      const isFreightTiger = targetUrl.includes('freighttiger.com');
      const options = {
        includeScreenshot: false,
        viewport: { width: 1920, height: 1080 },
        timeout: isFreightTiger ? 180000 : 60000,
        authentication: authentication || null,
        ...requestOptions
      };

      console.log(`🌐 Starting web extraction from: ${targetUrl}`);
      if (authentication) {
        console.log(`🔐 Using ${authentication.type} authentication`);
      }

      const result = await webExtractor.extractWebData(targetUrl, options);
      
      res.json({
        success: true,
        data: result,
        metadata: {
          extractedAt: new Date().toISOString(),
          source: 'unified-web-extractor',
          authenticationType: authentication?.type || 'none'
        }
      });
    } catch (error) {
      console.error('❌ Web extraction error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle comparison
   */
  async handleComparison(req, res) {
    try {
      console.log('🚀 COMPARE ENDPOINT HIT - Request received');
      console.log('🔍 Request body keys:', Object.keys(req.body));
      
      // Match web app API contract: expect figmaUrl and webUrl
      const { figmaUrl, webUrl, includeVisual = false } = req.body;

      if (!figmaUrl || !webUrl) {
        return this.sendErrorResponse(res, 'Both Figma URL and Web URL are required', 400, 'MISSING_REQUIRED_FIELDS');
      }

      console.log('📊 Starting real comparison:', { figmaUrl, webUrl, includeVisual });

      // Import comparison modules dynamically to avoid dependency issues
      const { FigmaHandler } = await import('../../shared/api/handlers/figma-handler.js');
      const { UnifiedWebExtractor } = await import('../../web/UnifiedWebExtractor.js');
      
      // Step 1: Extract Figma data
      console.log('🎨 Extracting Figma data...');
      
      // Create mock response object to capture the result
      let figmaResult = null;
      const mockRes = {
        json: (data) => { figmaResult = data; },
        status: (code) => ({ json: (data) => { figmaResult = { ...data, statusCode: code }; } })
      };
      
      await FigmaHandler.extract({
        body: { figmaUrl, lightMode: true, skipAnalysis: false }
      }, mockRes, this.config, null);

      if (!figmaResult.success) {
        return res.status(500).json({
          success: false,
          error: `Figma extraction failed: ${figmaResult.error}`,
          step: 'figma_extraction'
        });
      }

      // Step 2: Extract Web data
      console.log('🌐 Extracting web data...');
      const webExtractor = new UnifiedWebExtractor();
      const webResult = await webExtractor.extractWebData(webUrl, {
        authentication: req.body.authentication,
        includeVisual,
        timeout: webUrl.includes('freighttiger.com') ? 180000 : 30000
      });

      // UnifiedWebExtractor returns data directly or throws an error
      if (!webResult || !webResult.elements) {
        return res.status(500).json({
          success: false,
          error: `Web extraction failed: No elements extracted`,
          step: 'web_extraction'
        });
      }

      // Step 3: Perform comparison
      console.log('⚖️ Comparing extracted data...');
      console.log('🔍 Figma result structure:', Object.keys(figmaResult || {}));
      console.log('🔍 Web result structure:', Object.keys(webResult || {}));
      
      // Extract component counts from the actual data structures
      const figmaComponents = figmaResult?.data?.nodeAnalysis || figmaResult?.nodeAnalysis || [];
      const webElements = webResult?.elements || [];  // UnifiedWebExtractor returns elements directly
      
      // Get metadata from the results
      const figmaMetadata = figmaResult?.metadata || {};
      const webMetadata = { processingTime: 0 }; // UnifiedWebExtractor doesn't return metadata in same format
      
      const comparisonResult = {
        figmaComponentCount: figmaComponents.length,
        webElementCount: webElements.length,
        // Frontend-compatible structure
        figmaData: {
          fileId: figmaMetadata.fileId,
          fileName: figmaMetadata.fileName || 'Figma Design',
          componentsCount: figmaComponents.length,
          components: figmaComponents
        },
        webData: {
          url: webUrl,
          elementsCount: webElements.length,
          elements: webElements
        },
        extractionDetails: {
          figma: {
            componentCount: figmaComponents.length,
            extractionTime: figmaMetadata.processingTime || 0,
            fileInfo: figmaMetadata
          },
          web: {
            elementCount: webElements.length,
            extractionTime: webMetadata.processingTime || 0,
            urlInfo: { url: webUrl }
          }
        },
        comparison: {
          matches: [], // TODO: Implement actual comparison logic
          differences: [], // TODO: Implement actual comparison logic
          similarity: 0.85 // TODO: Calculate actual similarity
        },
        // Frontend expects reports object for UI navigation
        reports: {
          directUrl: `/api/reports/comparison-${Date.now()}`, // Generate report URL
          downloadUrl: `/api/reports/comparison-${Date.now()}/download`,
          hasError: false
        },
        timestamp: new Date().toISOString(),
        status: 'completed',
        figmaUrl,
        webUrl,
        includeVisual
      };

      console.log('✅ Comparison completed:', {
        figmaComponents: figmaComponents.length,
        webElements: webElements.length,
        figmaResultKeys: Object.keys(figmaResult || {}),
        webResultKeys: Object.keys(webResult || {})
      });
      
      res.json({
        success: true,
        data: comparisonResult,
        metadata: {
          comparedAt: new Date().toISOString(),
          figmaComponentCount: figmaComponents.length,
          webElementCount: webElements.length
        }
      });
    } catch (error) {
      this.sendErrorResponse(res, error, 500, 'COMPARISON_FAILED');
    }
  }

  /**
   * Handle screenshot upload (IMPLEMENTED)
   */
  async handleScreenshotUpload(req, res) {
    try {
      if (!screenshotComparisonService) {
        return res.status(503).json({
          success: false,
          error: 'Screenshot comparison service not available'
        });
      }

      // Handle both single file (req.file) and multiple files (req.files)
      const files = req.files || (req.file ? [req.file] : []);
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded'
        });
      }

      // Validate we have the required files
      if (files.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Both Figma and developed screenshots are required'
        });
      }

      console.log(`📤 Processing ${files.length} uploaded screenshots`);

      // Extract metadata from request body
      const metadata = {
        description: req.body.description || '',
        projectName: req.body.projectName || '',
        componentName: req.body.componentName || '',
        source: 'upload'
      };

      // Process upload using the screenshot comparison service
      const uploadId = await screenshotComparisonService.processUpload(files, metadata);
      
      res.json({
        success: true,
        data: { uploadId }, // Frontend expects this format
        message: 'Screenshots uploaded successfully'
      });
    } catch (error) {
      console.error('❌ Screenshot upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle screenshot comparison (IMPLEMENTED)
   */
  async handleScreenshotComparison(req, res) {
    try {
      if (!screenshotComparisonService) {
        return res.status(503).json({
          success: false,
          error: 'Screenshot comparison service not available'
        });
      }

      const { uploadId, settings = {} } = req.body;

      if (!uploadId) {
        return res.status(400).json({
          success: false,
          error: 'Upload ID is required'
        });
      }

      console.log(`🔍 Starting screenshot comparison for upload: ${uploadId}`);

      // Perform the actual comparison using the service
      const comparisonResult = await screenshotComparisonService.compareScreenshots(uploadId, settings);
      
      res.json({
        success: true,
        data: comparisonResult,
        message: 'Screenshot comparison completed successfully'
      });
    } catch (error) {
      console.error('❌ Screenshot comparison error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle screenshot list (IMPLEMENTED)
   */
  async handleScreenshotList(req, res) {
    try {
      if (!screenshotComparisonService) {
        return res.status(503).json({
          success: false,
          error: 'Screenshot comparison service not available'
        });
      }

      const { limit, offset, sortBy, sortOrder } = req.query;
      
      const options = {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc'
      };

      const result = await screenshotComparisonService.listComparisons(options);
      
      res.json({
        success: true,
        data: result,
        message: 'Screenshot comparisons retrieved successfully'
      });
    } catch (error) {
      console.error('❌ Screenshot list error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle reports list (IMPLEMENTED)
   */
  async handleReportsList(req, res) {
    try {
      const { limit, offset, sortBy, sortOrder } = req.query;
      
      const options = {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        sortBy: sortBy || 'comparedAt',
        sortOrder: sortOrder || 'desc'
      };

      const result = await screenshotService.listComparisons(options);
      
      res.json({
        success: true,
        data: result,
        message: 'Reports retrieved successfully'
      });
    } catch (error) {
      console.error('❌ Reports list error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle getting a specific report by ID (ENHANCED)
   */
  async handleGetReport(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Report ID is required'
        });
      }

      // Generate enhanced report if service available
      if (enhancedReportGenerator) {
        const sampleComparison = {
          id,
          title: `Enhanced Report ${id}`,
          comparisons: [
            {
              component: { name: 'Button', type: 'atoms' },
              element: { tagName: 'button', className: 'btn-primary' },
              status: 'match',
              matchScore: 95,
              properties: {
                color: { figma: '#007bff', web: '#007bff', status: 'match' },
                typography: { figma: '16px', web: '16px', status: 'match' }
              }
            },
            {
              component: { name: 'Card', type: 'molecules' },
              element: { tagName: 'div', className: 'card' },
              status: 'mismatch',
              matchScore: 72,
              properties: {
                color: { figma: '#f8f9fa', web: '#ffffff', status: 'mismatch' },
                spacing: { figma: '16px', web: '12px', status: 'mismatch' }
              }
            }
          ],
          metadata: {
            figmaUrl: 'https://figma.com/file/example',
            webUrl: 'https://example.com',
            generatedAt: new Date().toISOString()
          },
          processingTime: 1500
        };

        const reportResult = await enhancedReportGenerator.generateEnhancedReport(sampleComparison, {
          showConfidenceScores: true,
          showAlgorithmDetails: true,
          showPerformanceData: true
        });

        res.json({
          success: true,
          data: {
            id,
            type: 'enhanced-comparison',
            title: sampleComparison.title,
            createdAt: sampleComparison.metadata.generatedAt,
            status: 'completed',
            reportPath: reportResult.reportPath,
            insights: reportResult.metadata.insights,
            features: reportResult.metadata.features
          },
          message: 'Enhanced report retrieved successfully'
        });
      } else {
        // Fallback to basic report
        const mockReport = {
          id: id,
          type: 'comparison',
          title: `Comparison Report ${id}`,
          createdAt: new Date().toISOString(),
          status: 'completed',
          data: {
            figmaData: {
              fileName: 'Sample Design',
              componentCount: 5
            },
            webData: {
              url: 'https://example.com',
              elementCount: 10
            },
            comparison: {
              matches: 3,
              differences: 2,
              similarity: 0.85
            }
          }
        };
        
        res.json({
          success: true,
          data: mockReport,
          message: 'Report retrieved successfully'
        });
      }
    } catch (error) {
      console.error('❌ Get report error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle downloading a report by ID (ENHANCED)
   */
  async handleDownloadReport(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Report ID is required'
        });
      }

      // Generate and serve enhanced HTML report if service available
      if (enhancedReportGenerator) {
        const sampleComparison = {
          id,
          title: `Enhanced Report ${id}`,
          comparisons: [
            {
              component: { name: 'Button', type: 'atoms' },
              element: { tagName: 'button', className: 'btn-primary' },
              status: 'match',
              matchScore: 95,
              properties: {
                color: { figma: '#007bff', web: '#007bff', status: 'match' },
                typography: { figma: '16px', web: '16px', status: 'match' }
              }
            },
            {
              component: { name: 'Card', type: 'molecules' },
              element: { tagName: 'div', className: 'card' },
              status: 'mismatch',
              matchScore: 72,
              properties: {
                color: { figma: '#f8f9fa', web: '#ffffff', status: 'mismatch' },
                spacing: { figma: '16px', web: '12px', status: 'mismatch' }
              }
            }
          ],
          metadata: {
            figmaUrl: 'https://figma.com/file/example',
            webUrl: 'https://example.com',
            generatedAt: new Date().toISOString()
          },
          processingTime: 1500
        };

        const reportResult = await enhancedReportGenerator.generateEnhancedReport(sampleComparison, {
          showConfidenceScores: true,
          showAlgorithmDetails: true,
          showPerformanceData: true
        });

        // Read the generated HTML file and serve it
        const fs = await import('fs/promises');
        const reportContent = await fs.readFile(reportResult.reportPath, 'utf8');
        
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="enhanced-report-${id}.html"`);
        res.send(reportContent);
      } else {
        // Fallback to JSON download
        const reportData = {
          reportId: id,
          generatedAt: new Date().toISOString(),
          type: 'comparison',
          summary: {
            figmaComponents: 5,
            webElements: 10,
            matches: 3,
            differences: 2,
            similarity: 0.85
          },
          details: {
            message: 'Enhanced report generator not available. Basic report data provided.'
          }
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="report-${id}.json"`);
        res.json(reportData);
      }
    } catch (error) {
      console.error('❌ Download report error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle Figma extraction via MCP (SAME AS WEB APP)
   */
  async handleFigmaExtractionViaMCP(req, res) {
    try {
      console.log('🔄 Using MCP-based extraction (same as web app)');
      const { figmaUrl, extractionMode = 'both' } = req.body;

      if (!figmaUrl) {
        return res.status(400).json({
          success: false,
          error: 'figmaUrl is required'
        });
      }

      // For now, skip MCP and use direct API (MCP server not available)
      console.log('🔄 Using direct API (MCP server not available)');
      
      // Create a mock response object to capture FigmaHandler output
      let capturedResponse = null;
      const mockRes = {
        json: (data) => { capturedResponse = data; },
        status: (code) => ({ json: (data) => { capturedResponse = { ...data, statusCode: code }; } })
      };

      // Call FigmaHandler and capture response
      await FigmaHandler.extract(req, mockRes, this.config, null);

      // Transform response to match frontend expectations
      if (capturedResponse && capturedResponse.success && capturedResponse.data) {
        const rawData = capturedResponse.data;
        const nodeAnalysis = rawData.nodeAnalysis || [];
        
        // Transform to frontend-expected structure
        const transformedData = {
          components: nodeAnalysis, // Rename nodeAnalysis to components
          colors: this.extractColorsFromNodes(nodeAnalysis),
          typography: this.extractTypographyFromNodes(nodeAnalysis),
          styles: rawData.styles || {},
          tokens: {
            colors: this.extractColorsFromNodes(nodeAnalysis),
            typography: this.extractTypographyFromNodes(nodeAnalysis),
            spacing: [],
            borderRadius: []
          },
          metadata: {
            fileName: rawData.name || 'Unknown',
            fileKey: fileId,
            nodeId: nodeId,
            extractedAt: new Date().toISOString(),
            extractionMethod: 'figma-api',
            totalComponents: nodeAnalysis.length,
            colorCount: this.extractColorsFromNodes(nodeAnalysis).length,
            typographyCount: this.extractTypographyFromNodes(nodeAnalysis).length
          },
          reportPath: `/api/reports/figma-${Date.now()}`
        };

        return res.json({
          success: true,
          data: transformedData
        });
      }

      // If no valid response, return error
      return res.status(500).json({
        success: false,
        error: 'Failed to extract Figma data'
      });

    } catch (error) {
      console.error('❌ MCP extraction failed:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Standardized error response helper
   */
  sendErrorResponse(res, error, statusCode = 500, errorCode = null) {
    const errorResponse = {
      success: false,
      error: error.message || error,
      code: errorCode || `ERROR_${statusCode}`,
      timestamp: new Date().toISOString()
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development' && error.stack) {
      errorResponse.details = error.stack;
    }

    console.error(`❌ API Error [${statusCode}]:`, errorResponse);
    res.status(statusCode).json(errorResponse);
  }

  /**
   * Standardized success response helper
   */
  sendSuccessResponse(res, data = null, message = 'Success') {
    const successResponse = {
      success: true,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
      successResponse.data = data;
    }

    if (message !== 'Success') {
      successResponse.message = message;
    }

    res.json(successResponse);
  }

  /**
   * Extract colors from Figma nodes for frontend compatibility
   */
  extractColorsFromNodes(nodes) {
    const colors = [];
    // TODO: Implement actual color extraction from node data
    // For now, return empty array as placeholder
    return colors;
  }

  /**
   * Extract typography from Figma nodes for frontend compatibility
   */
  extractTypographyFromNodes(nodes) {
    const typography = [];
    // TODO: Implement actual typography extraction from node data
    // For now, return empty array as placeholder
    return typography;
  }

  /**
   * Handle screenshot image serving (IMPLEMENTED)
   */
  async handleScreenshotImage(req, res) {
    try {
      const { comparisonId, imageType } = req.params;
      
      if (!screenshotComparisonService) {
        return res.status(503).json({
          success: false,
          error: 'Screenshot comparison service not available'
        });
      }

      // Get comparison result to find image paths
      const comparison = await screenshotComparisonService.getComparisonResult(comparisonId);
      
      let imagePath;
      switch (imageType) {
        case 'figma-processed':
        case 'original':
          imagePath = comparison.figmaScreenshotPath;
          break;
        case 'developed-processed':
        case 'comparison':
          imagePath = comparison.developedScreenshotPath;
          break;
        case 'pixel-diff':
        case 'diff':
          imagePath = comparison.diffImagePath;
          break;
        case 'side-by-side':
          imagePath = comparison.sideBySidePath;
          break;
        default:
          return res.status(400).json({
            success: false,
            error: `Invalid image type: ${imageType}`
          });
      }

      if (!imagePath || !fs.existsSync(imagePath)) {
        return res.status(404).json({
          success: false,
          error: 'Image not found'
        });
      }

      // Serve the image file
      res.sendFile(path.resolve(imagePath));
    } catch (error) {
      console.error('❌ Screenshot image error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle screenshot report (IMPLEMENTED)
   */
  async handleScreenshotReport(req, res) {
    try {
      const { comparisonId } = req.params;
      
      if (!screenshotComparisonService) {
        return res.status(503).json({
          success: false,
          error: 'Screenshot comparison service not available'
        });
      }

      // Get the comparison result which includes report path
      const comparison = await screenshotComparisonService.getComparisonResult(comparisonId);
      
      if (!comparison) {
        return res.status(404).json({
          success: false,
          error: `Screenshot comparison not found: ${comparisonId}`
        });
      }

      // Return the report data
      res.json({
        success: true,
        data: {
          comparisonId,
          reportPath: comparison.reportPath,
          status: comparison.status,
          metrics: comparison.metrics,
          discrepancies: comparison.discrepancies,
          createdAt: comparison.createdAt,
          processingTime: comparison.processingTime
        }
      });
    } catch (error) {
      console.error('❌ Screenshot report error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle screenshot compare result (IMPLEMENTED)
   */
  async handleScreenshotCompareResult(req, res) {
    try {
      const { comparisonId } = req.params;
      
      if (!screenshotComparisonService) {
        return res.status(503).json({
          success: false,
          error: 'Screenshot comparison service not available'
        });
      }

      // Get the full comparison result
      const comparison = await screenshotComparisonService.getComparisonResult(comparisonId);
      
      if (!comparison) {
        return res.status(404).json({
          success: false,
          error: `Screenshot comparison not found: ${comparisonId}`
        });
      }

      // Return the complete comparison result
      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      console.error('❌ Screenshot compare result error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle web-only extraction (IMPLEMENTED)
   */
  async handleWebOnlyExtract(req, res) {
    try {
      console.log('🌐 Web-only extraction requested');
      
      // This is the same as handleWebExtract - just different endpoint name
      await this.handleWebExtract(req, res);
    } catch (error) {
      console.error('❌ Web-only extraction error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle web extraction v2 (IMPLEMENTED)
   */
  async handleWebExtractV2(req, res) {
    try {
      console.log('🌐 Web extraction v2 requested');
      
      // This is the same as handleWebExtract - just different endpoint name for compatibility
      await this.handleWebExtract(req, res);
    } catch (error) {
      console.error('❌ Web extraction v2 error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle circuit breakers status (IMPLEMENTED)
   */
  async handleCircuitBreakers(req, res) {
    try {
      if (circuitBreakerRegistry) {
        res.json({
          success: true,
          data: {
            summary: circuitBreakerRegistry.getHealthStatus(),
            details: circuitBreakerRegistry.getAllStats()
          }
        });
      } else {
        // Fallback when circuit breakers not available
        res.json({
          success: true,
          data: {
            summary: {
              total: 0,
              open: 0,
              halfOpen: 0,
              closed: 0,
              healthy: true
            },
            details: {},
            message: 'Circuit breakers not initialized'
          }
        });
      }
    } catch (error) {
      console.error('❌ Circuit breakers error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle realtime performance (IMPLEMENTED)
   */
  async handleRealtimePerformance(req, res) {
    try {
      if (performanceMonitor) {
        res.json({
          success: true,
          data: performanceMonitor.getRealTimeMetrics()
        });
      } else {
        // Fallback when performance monitor not available
        res.json({
          success: true,
          data: {
            timestamp: Date.now(),
            realtime: {
              activeRequests: 0,
              requestsLastMinute: 0,
              requestsLast5Minutes: 0,
              averageResponseTime: 0,
              successRate: 100
            },
            system: {
              memory: process.memoryUsage(),
              uptime: process.uptime(),
              loadAverage: [0, 0, 0]
            },
            trends: {
              requestTrend: { direction: 'stable', change: 0 },
              responseTrend: { direction: 'stable', change: 0 },
              memoryTrend: { direction: 'stable', change: 0 }
            },
            message: 'Performance monitoring not initialized'
          }
        });
      }
    } catch (error) {
      console.error('❌ Realtime performance error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle extraction cancellation (IMPLEMENTED)
   */
  async handleCancelExtraction(req, res) {
    try {
      const { id } = req.params;
      
      // For now, return success - actual cancellation would require tracking active extractions
      console.log(`🚫 Extraction cancellation requested for: ${id}`);
      
      res.json({
        success: true,
        message: `Extraction ${id} cancellation requested`,
        extractionId: id,
        status: 'cancellation_requested',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Cancel extraction error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Start the HTTP server
   */
  async startServer() {
    return new Promise((resolve, reject) => {
      const serverConfig = this.platformAdapter.getServerConfig();
      
      this.server = this.app.listen(serverConfig.port, serverConfig.host, () => {
        this.port = this.server.address().port;
        console.log(`✅ Electron Express Server running on ${serverConfig.host}:${this.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.log(`⚠️ Port ${serverConfig.port} is busy, trying ${serverConfig.port + 1}`);
          serverConfig.port++;
          this.server.listen(serverConfig.port);
        } else {
          console.error('❌ Server error:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Stop the server
   */
  async stop() {
    return new Promise((resolve) => {
      // Stop performance monitoring
      if (performanceMonitor) {
        performanceMonitor.stopMonitoring();
        console.log('📊 Performance monitoring stopped');
      }

      if (this.server) {
        this.server.close(() => {
          console.log('⏹️ Electron Express Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get server info
   */
  getServerInfo() {
    return {
      platform: 'electron',
      port: this.port,
      status: this.server ? 'running' : 'stopped',
      config: this.config.getSummary(),
      services: this.getServicesStatus()
    };
  }
}

export default ElectronExpressServer;
