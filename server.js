import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';

// Import our real implementations
import FigmaExtractor from './src/figma/extractor.js';
import FigmaMCPIntegration from './src/figma/mcpIntegration.js';
import MCPDirectFigmaExtractor from './src/figma/mcpDirectExtractor.js';
import { WebExtractor } from './src/scraper/webExtractor.js';
import EnhancedWebExtractor from './src/scraper/enhancedWebExtractor.js';
import ComparisonEngine from './src/compare/comparisonEngine.js';
import ReportGenerator from './src/report/reportGenerator.js';
import { FigmaUrlParser } from './src/figma/urlParser.js';
import EnhancedVisualComparison from './src/visual/enhancedVisualComparison.js';
import ComponentCategorizer from './src/analyze/componentCategorizer.js';
import CategorizedReportGenerator from './src/report/categorizedReportGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com', 'https://www.yourdomain.com'] // Replace with actual domains
      : ['http://localhost:3006', 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST']
  }
});
import { getAppPort } from './src/config/ports.js';
const port = getAppPort();

// Load configuration
let config = {};
try {
  const configData = await fs.readFile('./config.json', 'utf8');
  config = JSON.parse(configData);
  console.log('✅ Configuration loaded');
} catch (error) {
  console.warn('⚠️ Could not load config.json, using defaults');
  config = {
    thresholds: {
      colorDifference: 10,
      sizeDifference: 5,
      spacingDifference: 3,
      fontSizeDifference: 2
    }
  };
}

// CORS configuration - more secure for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com', 'https://www.yourdomain.com'] // Replace with actual domains
    : ['http://localhost:3006', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}

app.use(cors(corsOptions))

// Security headers
app.use((req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By')
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // CSP for production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://api.figma.com; " +
      "font-src 'self' data:;"
    )
  }
  
  next()
})

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', limiter)

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Initialize extractors and engines
let figmaExtractor = new FigmaExtractor(config);
let mcpDirectExtractor = null;

// Try to initialize MCP Direct Extractor
try {
  mcpDirectExtractor = new MCPDirectFigmaExtractor(config);
  console.log('✅ MCP Direct Figma Extractor initialized');
} catch (error) {
  console.warn('⚠️ MCP Direct Figma Extractor not available:', error.message);
}

// Note: MCP tools work in assistant environment but not directly in Node.js server
// The current Figma extractor already uses MCP integration successfully

const webExtractor = new WebExtractor(config);
const enhancedWebExtractor = new EnhancedWebExtractor(config);
const comparisonEngine = new ComparisonEngine();
const reportGenerator = new ReportGenerator(config);
const componentCategorizer = new ComponentCategorizer();
const categorizedReportGenerator = new CategorizedReportGenerator();

// Test EnhancedVisualComparison initialization
try {
  const testVisual = new EnhancedVisualComparison(config);
  console.log('✅ EnhancedVisualComparison can be instantiated successfully');
} catch (error) {
  console.error('❌ EnhancedVisualComparison instantiation failed:', error);
}

// Helper function to choose the best available Figma extractor
function getOptimalFigmaExtractor() {
  // The standard Figma extractor already has MCP integration built-in
  // MCP Direct Extractor requires MCP tools in the same process context
  console.log('📐 Using Figma Extractor (with MCP integration)');
  return figmaExtractor;
}

// Helper function to choose the best available web extractor
function getOptimalWebExtractor() {
  // Use Enhanced Web Extractor for better component analysis
  console.log('🚀 Using Enhanced Web Extractor');
  return enhancedWebExtractor;
}

// Helper function to extract Figma data with the optimal extractor
async function extractFigmaData(fileId, nodeId = null) {
  const extractor = getOptimalFigmaExtractor();
  
  if (extractor === mcpDirectExtractor) {
    // Use MCP Direct Extractor
    const result = await extractor.extractComponents(fileId, nodeId);
    
    // Transform to match expected format
    return {
      fileId: fileId,
      nodeId: nodeId,
      components: result.components,
      metadata: result.metadata,
      extractionMethod: 'MCP Framelink',
      extractedAt: result.metadata.extractedAt
    };
  } else {
    // Use standard Figma Extractor
    return await extractor.extractDesignData(fileId, nodeId);
  }
}

// Helper function to extract web data with the optimal extractor
async function extractWebData(url, authentication = null) {
  const extractor = getOptimalWebExtractor();
  return await extractor.extractWebData(url, authentication);
}

// Initialize components
async function initializeComponents() {
  try {
    await figmaExtractor.initialize();
    await webExtractor.initialize();
    await enhancedWebExtractor.initialize();
    
    // Test MCP Direct Extractor if available
    if (mcpDirectExtractor) {
      try {
        const testResult = await mcpDirectExtractor.testMCPConnection();
        if (testResult.success) {
          console.log('✅ MCP Framelink connection verified');
        } else {
          console.warn('⚠️ MCP Framelink connection test failed:', testResult.error);
          mcpDirectExtractor = null; // Disable if connection test fails
        }
      } catch (error) {
        console.warn('⚠️ MCP Framelink test failed:', error.message);
        mcpDirectExtractor = null; // Disable if test fails
      }
    }
    
    console.log('✅ All components initialized');
  } catch (error) {
    console.error('❌ Failed to initialize components:', error);
  }
}

// Initialize on startup
initializeComponents();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
  
  // Handle comparison progress updates
  socket.on('join-comparison', (comparisonId) => {
    socket.join(`comparison-${comparisonId}`);
    console.log(`🔌 Client ${socket.id} joined comparison ${comparisonId}`);
  });
});

// Helper function to emit progress updates
function emitProgress(comparisonId, progress) {
  io.to(`comparison-${comparisonId}`).emit('progress', progress);
}

// Favicon route to prevent 404s
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Main comparison endpoint
app.post('/api/compare', async (req, res) => {
  try {
    const { figmaUrl, webUrl, authentication, includeVisual = false } = req.body;
    
    // Validate inputs
    if (!figmaUrl || !webUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        details: 'Both figmaUrl and webUrl are required'
      });
    }

    // Set up SSE for progress updates
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendProgress = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Extract Figma data with progress updates
    sendProgress({ stage: 'figma_extraction', progress: 0 });
    const figmaData = await figmaExtractor.extract(figmaUrl);
    sendProgress({ stage: 'figma_extraction', progress: 100, components: figmaData.components.length });

    // Extract web data with progress updates
    sendProgress({ stage: 'web_extraction', progress: 0 });
    const webData = await webExtractor.extract(webUrl, { authentication });
    sendProgress({ stage: 'web_extraction', progress: 100, elements: webData.elements.length });

    // Run comparison with progress updates
    const comparison = await comparisonEngine.compareDesigns(figmaData, webData, {
      onProgress: (progress) => {
        sendProgress({ stage: 'comparison', ...progress });
      }
    });

    // Generate reports with progress updates
    const reports = await reportGenerator.generateReports(comparison, {
      onProgress: (progress) => {
        sendProgress({ stage: 'report_generation', ...progress });
      }
    });

    // Send final success response
    const response = {
      success: true,
      summary: {
        figma: {
          fileId: figmaData.fileId,
          fileName: figmaData.fileName,
          componentsExtracted: figmaData.components.length
        },
        web: {
          url: webData.url,
          elementsExtracted: webData.elements.length,
          authenticationUsed: authentication?.type || 'none'
        },
        comparison: {
          componentsAnalyzed: comparison.comparisons.length,
          totalDeviations: comparison.summary.totalDeviations,
          totalMatches: comparison.summary.totalMatches
        }
      },
      reports,
      metadata: {
        timestamp: new Date().toISOString(),
        toolVersion: '1.0.0',
        comparisonId: `comparison_${Date.now()}`
      }
    };

    sendProgress({ stage: 'complete', ...response });
    res.end();

  } catch (error) {
    console.error('❌ Comparison failed:', error);
    
    const errorResponse = {
      stage: 'error',
      success: false,
      error: 'Comparison failed',
      details: error.message || 'An unexpected error occurred',
      errorType: error.name || 'unknown'
    };

    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    res.end();
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check real connection status
    const officialMCPAvailable = await FigmaMCPIntegration.checkOfficialMCPAvailability();
    const thirdPartyMCPAvailable = FigmaMCPIntegration.checkThirdPartyMCPAvailability();
    const figmaAPIAvailable = FigmaMCPIntegration.checkFigmaAPIAvailability(config);
    
    const mcpType = figmaExtractor?.mcpIntegration?.getMCPType();
    
    // Determine overall status
    let status = 'healthy';
    let figmaConnectionStatus = 'none';
    let figmaConnectionMessage = '';
    
    if (mcpType === 'official') {
      figmaConnectionStatus = 'official-mcp';
      figmaConnectionMessage = 'Connected to Official Figma Dev Mode MCP Server';
    } else if (mcpType === 'third-party') {
      figmaConnectionStatus = 'third-party-mcp';
      figmaConnectionMessage = 'Connected to Third-party MCP Figma tools';
    } else if (mcpType === 'api') {
      figmaConnectionStatus = 'figma-api';
      figmaConnectionMessage = 'Connected to Figma REST API';
    } else {
      status = 'requires_setup';
      figmaConnectionStatus = 'none';
      figmaConnectionMessage = 'No Figma connection configured - setup required';
    }

    const health = {
      status: status,
      timestamp: new Date().toISOString(),
      figma: {
        connectionType: figmaConnectionStatus,
        message: figmaConnectionMessage,
        availableOptions: {
          officialMCP: officialMCPAvailable,
          thirdPartyMCP: thirdPartyMCPAvailable,
          figmaAPI: figmaAPIAvailable
        }
      },
      components: {
        figmaExtractor: figmaExtractor ? 'initialized' : 'not initialized',
        webExtractor: webExtractor ? 'initialized' : 'not initialized',
        comparisonEngine: comparisonEngine ? 'initialized' : 'not initialized',
        reportGenerator: reportGenerator ? 'initialized' : 'not initialized'
      },
      setupInstructions: status === 'requires_setup' ? {
        step1: 'Choose one Figma connection method:',
        options: [
          !figmaAPIAvailable ? {
            type: 'Figma REST API (Recommended)',
            instructions: [
              '1. Go to https://www.figma.com/developers/api#access-tokens',
              '2. Generate a personal access token',
              '3. Add it to config.json: {"figma": {"accessToken": "YOUR_TOKEN"}}'
            ]
          } : null,
          !officialMCPAvailable ? {
            type: 'Official Figma Dev Mode MCP Server',
            instructions: [
              '1. Download official Figma MCP server',
              '2. Start it on http://127.0.0.1:3845',
              '3. Restart this tool'
            ]
          } : null,
          !thirdPartyMCPAvailable ? {
            type: 'Third-party MCP Tools',
            instructions: [
              '1. Install MCP Figma tools',
              '2. Ensure mcp_Framelink_Figma_MCP_get_figma_data is available',
              '3. Restart this tool'
            ]
          } : null
        ].filter(Boolean)
      } : undefined,
      config: {
        loaded: Object.keys(config).length > 0,
        hasAccessToken: !!config?.figma?.accessToken,
        thresholds: config.thresholds
      }
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      message: 'Failed to check system health'
    });
  }
});

// Parse Figma URL endpoint
app.post('/api/parse-figma-url', (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        error: 'URL is required'
      });
    }

    const parsedData = FigmaUrlParser.parseUrl(url);
    res.json({
      success: true,
      data: parsedData
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
});

// Test Figma extraction endpoint
app.post('/api/test/figma', async (req, res) => {
  try {
    const { figmaUrl, figmaFileId, nodeId } = req.body;
    
    let fileId = figmaFileId;
    let parsedNodeId = nodeId;

    if (figmaUrl) {
      const parsedData = FigmaUrlParser.parseUrl(figmaUrl);
      fileId = parsedData.fileId;
      parsedNodeId = parsedData.nodeId || nodeId;
    }

    if (!fileId) {
      return res.status(400).json({
        error: 'Missing Figma file ID or URL'
      });
    }

    const figmaData = await extractFigmaData(fileId, parsedNodeId);
    
    res.json({
      success: true,
      data: figmaData
    });
  } catch (error) {
    console.error('Figma test error:', error);
    res.status(500).json({
      error: 'Figma extraction failed',
      message: error.message
    });
  }
});

// Test web extraction endpoint
app.post('/api/test/web', async (req, res) => {
  try {
    const { webUrl, authentication } = req.body;

    if (!webUrl) {
      return res.status(400).json({
        error: 'Missing web URL'
      });
    }

    const webData = await extractWebData(webUrl, authentication);
    
    res.json({
      success: true,
      data: webData
    });
  } catch (error) {
    console.error('Web test error:', error);
    res.status(500).json({
      error: 'Web extraction failed',
      message: error.message
    });
  }
});

// Test visual comparison endpoint
app.post('/api/test/visual', async (req, res) => {
  try {
    const { figmaUrl, figmaFileId, webUrl, nodeId } = req.body;
    
    if (!figmaUrl && !figmaFileId) {
      return res.status(400).json({
        error: 'Missing Figma file ID or URL for visual test'
      });
    }
    
    if (!webUrl) {
      return res.status(400).json({
        error: 'Missing web URL for visual test'
      });
    }
    
    console.log('🧪 Testing visual comparison endpoint...');
    
    // Parse Figma URL if provided
    let fileId = figmaFileId;
    let parsedNodeId = nodeId;
    
    if (figmaUrl) {
      const parsedData = FigmaUrlParser.parseUrl(figmaUrl);
      fileId = parsedData.fileId;
      parsedNodeId = parsedData.nodeId || nodeId;
    }
    
    // Extract real data from provided sources
    const figmaData = await extractFigmaData(fileId, parsedNodeId);
    const webData = await extractWebData(webUrl);
    
    console.log('📐 Real Figma data extracted');
    console.log('🌐 Real Web data extracted');
    
    // Test visual comparison
    const enhancedVisual = new EnhancedVisualComparison(config);
    console.log('✅ EnhancedVisualComparison instantiated');
    
    const visualResults = await enhancedVisual.performVisualComparison(
      figmaData, 
      webData, 
      webExtractor, 
      figmaExtractor
    );
    
    console.log('🎨 Visual comparison completed');
    
    res.json({
      success: true,
      visualResults: visualResults,
      figmaData: figmaData,
      webData: webData
    });
  } catch (error) {
    console.error('❌ Visual test error:', error);
    res.status(500).json({
      error: 'Visual comparison test failed',
      message: error.message,
      setup: error.message.includes('No Figma access method') ? 
        'Please configure Figma access in config.json or setup MCP tools' : undefined
    });
  }
});

// Serve reports
app.use('/reports', express.static(path.join(__dirname, 'output', 'reports')));

// Serve images
app.use('/images', express.static(path.join(__dirname, 'output', 'images')));

// Serve screenshots (for side-by-side comparisons)
app.use('/screenshots', express.static(path.join(__dirname, 'output', 'screenshots')));

// Handle screenshots directory listing (when no specific file requested)
app.get('/screenshots/', async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const screenshotsPath = path.join(__dirname, 'output', 'screenshots');
    const files = await fs.readdir(screenshotsPath);
    const imageFiles = files.filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file));
    
    res.json({
      success: true,
      files: imageFiles,
      count: imageFiles.length
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'Screenshots directory not found or empty'
    });
  }
});

// Reports endpoint
app.get('/api/reports', async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const reportsPath = path.join(__dirname, 'output', 'reports');
    
    // Create reports directory if it doesn't exist
    await fs.mkdir(reportsPath, { recursive: true });
    
    const files = await fs.readdir(reportsPath);
    const reports = [];
    
    // Group HTML and JSON files by timestamp
    const reportGroups = {};
    
    for (const file of files) {
      if (file.startsWith('comparison-') && (file.endsWith('.html') || file.endsWith('.json'))) {
        const timestamp = file.replace('comparison-', '').replace(/\.(html|json)$/, '');
        if (!reportGroups[timestamp]) {
          reportGroups[timestamp] = {};
        }
        
        const type = file.endsWith('.html') ? 'html' : 'json';
        reportGroups[timestamp][type] = `/output/reports/${file}`;
        reportGroups[timestamp].timestamp = timestamp;
        
        // Get file stats for creation date
        try {
          const stats = await fs.stat(path.join(reportsPath, file));
          reportGroups[timestamp].created = stats.mtime;
        } catch (statError) {
          reportGroups[timestamp].created = new Date();
        }
      }
    }
    
    // Convert to array and sort by creation date (newest first)
    const sortedReports = Object.values(reportGroups)
      .filter(report => report.html || report.json) // Only include complete reports
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({
      success: true,
      reports: sortedReports,
      count: sortedReports.length
    });
    
  } catch (error) {
    console.error('Error loading reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load reports'
    });
  }
});

// Serve report files
app.use('/output', express.static(path.join(__dirname, 'output')));

// Settings endpoints
app.get('/api/settings/current', async (req, res) => {
  try {
    const fs = await import('fs/promises');
    
    // Load current configuration
    let currentSettings = {
      method: 'none',
      figmaApi: {
        hasToken: false
      },
      mcpServer: {
        url: 'http://localhost:3845',
        endpoint: '/sse'
      },
      mcpTools: {
        environment: 'auto',
        available: FigmaMCPIntegration.checkThirdPartyMCPAvailability()
      }
    };

    // Check if Figma API token is configured
    if (config?.figma?.accessToken) {
      currentSettings.method = 'api';
      currentSettings.figmaApi.hasToken = true;
    }

    // Check if MCP configuration exists
    try {
      const mcpConfigContent = await fs.readFile('./mcp.json', 'utf8');
      const mcpConfig = JSON.parse(mcpConfigContent);
      
      if (mcpConfig?.mcp?.servers?.['Figma Dev Mode MCP']?.url) {
        const mcpUrl = mcpConfig.mcp.servers['Figma Dev Mode MCP'].url;
        const urlParts = mcpUrl.split('/');
        const endpoint = '/' + urlParts.slice(3).join('/');
        const serverUrl = urlParts.slice(0, 3).join('/');
        
        currentSettings.mcpServer.url = serverUrl;
        currentSettings.mcpServer.endpoint = endpoint;
        
        if (currentSettings.method === 'none') {
          currentSettings.method = 'mcp-server';
        }
      }
    } catch (mcpError) {
      // MCP config file doesn't exist or is invalid, use defaults
    }

    // Detect current connection type from figma extractor
    if (figmaExtractor && figmaExtractor.mcpIntegration) {
      const mcpType = figmaExtractor.mcpIntegration.getMCPType();
      if (mcpType) {
        currentSettings.method = mcpType === 'third-party' ? 'mcp-tools' : 
                                 mcpType === 'official' ? 'mcp-server' : 
                                 mcpType === 'api' ? 'api' : currentSettings.method;
      }
    }

    res.json({
      success: true,
      settings: currentSettings
    });

  } catch (error) {
    console.error('Error loading current settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load current settings'
    });
  }
});

app.post('/api/settings/test-connection', async (req, res) => {
  try {
    const { method, accessToken, serverUrl, endpoint, environment } = req.body;
    
    if (!method) {
      return res.status(400).json({
        success: false,
        error: 'Connection method is required'
      });
    }

    let testResult = {};

    if (method === 'api') {
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Access token is required for Figma API'
        });
      }

      // Test Figma API connection
      try {
        // First try /me endpoint for full token validation
        let response = await fetch('https://api.figma.com/v1/me', {
          headers: {
            'X-Figma-Token': accessToken
          }
        });

        if (response.ok) {
          const userData = await response.json();
          testResult = {
            success: true,
            message: `Connected to Figma API successfully as ${userData.email}`,
            details: `Account: ${userData.handle || userData.email}`,
            connectionType: 'figma-api'
          };
        } else if (response.status === 403) {
          // Token may not have current_user:read scope, check if error mentions valid scopes
          const errorBody = await response.text();
          console.log('⚠️ Token lacks current_user:read scope, checking error details...');
          console.log('API response:', errorBody);
          
          // If the error mentions file_content:read, the token is valid for file access
          if (errorBody.includes('file_content:read') || errorBody.includes('file_dev_resources:read')) {
            testResult = {
              success: true,
              message: `Figma API token is valid for file access`,
              details: `Token has file_content:read scope but lacks current_user:read. This is sufficient for design comparisons.`,
              connectionType: 'figma-api'
            };
          } else {
            testResult = {
              success: false,
              error: `Figma API error: Token may lack required scopes`,
              message: 'Token needs file_content:read and file_dev_resources:read scopes for design comparisons.'
            };
          }
        } else if (response.status === 401) {
          testResult = {
            success: false,
            error: 'Invalid Figma access token. Please check your token and try again.'
          };
        } else {
          testResult = {
            success: false,
            error: `Figma API error: ${response.status} ${response.statusText}`
          };
        }
      } catch (error) {
        testResult = {
          success: false,
          error: `Network error: ${error.message}`
        };
      }

    } else if (method === 'mcp-server') {
      const testUrl = `${serverUrl}${endpoint || '/sse'}`;
      
      try {
        console.log(`🔍 Testing MCP server connection to: ${testUrl}`);
        console.log(`📋 Will update mcp.json with this configuration if successful`);
        
        // Create a promise that rejects after timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout (5s)')), 5000);
        });
        
        // Race between fetch and timeout
        // SSE endpoints don't support HEAD requests, use GET with immediate abort
        const controller = new AbortController();
        const response = await Promise.race([
          fetch(testUrl, { method: 'GET', signal: controller.signal }),
          timeoutPromise
        ]);
        
        // Immediately abort the request since we just want to check availability
        controller.abort();
        
        console.log(`📡 MCP server response: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          testResult = {
            success: true,
            message: `MCP server is accessible at ${testUrl}`,
            details: `Status: ${response.status} ${response.statusText}. Configuration will be saved to mcp.json when you click Save Settings.`,
            connectionType: 'mcp-server'
          };
        } else {
          testResult = {
            success: false,
            error: `MCP server returned ${response.status} ${response.statusText}`,
            message: `Please check that the Figma Desktop App MCP server is enabled and running. The /sse endpoint should be available.`
          };
        }
      } catch (error) {
        console.log(`❌ MCP server connection failed: ${error.message}`);
        testResult = {
          success: false,
          error: `Cannot connect to MCP server: ${error.message}`,
          message: `Please ensure the Figma Desktop App is running with MCP server enabled.`
        };
      }

    } else if (method === 'mcp-tools') {
      // Check if MCP tools are available in the environment
      const mcpAvailable = FigmaMCPIntegration.checkThirdPartyMCPAvailability();
      
      if (mcpAvailable) {
        testResult = {
          success: true,
          message: 'MCP Figma tools are available in your environment',
          details: 'Tools detected and ready to use',
          connectionType: 'mcp-tools'
        };
      } else {
        testResult = {
          success: false,
          error: 'MCP Figma tools are not available in this environment'
        };
      }

    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid connection method'
      });
    }

    res.json(testResult);

  } catch (error) {
    console.error('Settings test error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during connection test'
    });
  }
});

app.post('/api/settings/save', async (req, res) => {
  try {
    const { method, accessToken, serverUrl, endpoint, environment } = req.body;
    
    if (!method) {
      return res.status(400).json({
        success: false,
        error: 'Connection method is required'
      });
    }

    // Update config based on method
    if (method === 'api') {
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Access token is required for Figma API'
        });
      }
      
      config.figma.accessToken = accessToken;
      
    } else if (method === 'mcp-server') {
      config.mcp = config.mcp || {};
      config.mcp.official = {
        serverUrl: serverUrl || 'http://localhost:3845',
        endpoint: endpoint || '/sse',
        enabled: true
      };
      
    } else if (method === 'mcp-tools') {
      config.mcp = config.mcp || {};
      config.mcp.thirdParty = {
        environment: environment || 'auto',
        enabled: true
      };
    }

    // Save config to file
    const fs = await import('fs/promises');
    await fs.writeFile('./config.json', JSON.stringify(config, null, 2));

    // Update MCP configuration file if MCP server method is selected
    if (method === 'mcp-server') {
      try {
        const mcpConfig = {
          "chat.mcp.discovery.enabled": true,
          "mcp": {
            "servers": {
              "Figma Dev Mode MCP": {
                "type": endpoint?.startsWith('/sse') ? "sse" : "http",
                "url": `${serverUrl}${endpoint || '/sse'}`
              }
            }
          },
          "chat.agent.enabled": true
        };
        
        await fs.writeFile('./mcp.json', JSON.stringify(mcpConfig, null, 2));
        console.log('✅ MCP configuration file updated');
      } catch (mcpError) {
        console.warn('⚠️ Failed to update MCP configuration file:', mcpError.message);
      }
    }

    // Reinitialize components with new config
    try {
      // Reinitialize the existing extractor with new config
      await figmaExtractor.reinitialize(config);
      
      console.log(`✅ Settings saved and applied: ${method} connection`);
      
      res.json({
        success: true,
        message: 'Settings saved successfully',
        connectionType: method
      });
      
    } catch (initError) {
      console.error('Failed to reinitialize with new settings:', initError);
      res.status(500).json({
        success: false,
        error: `Settings saved but failed to initialize: ${initError.message}`
      });
    }

  } catch (error) {
    console.error('Settings save error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save settings'
    });
  }
});

// SPA routing for modern UI - catch all routes that don't match API or static files
app.get('/modern/*', (req, res) => {
  const indexPath = path.resolve(__dirname, 'public', 'modern', 'index.html');
  console.log(`📱 Serving modern UI for ${req.path} from ${indexPath}`);
  res.sendFile(indexPath);
});

// Handle root-level routes that should go to modern UI
app.get('/new-comparison', (req, res) => {
  const indexPath = path.resolve(__dirname, 'public', 'modern', 'index.html');
  console.log(`📱 Serving modern UI for ${req.path} from ${indexPath}`);
  res.sendFile(indexPath);
});

app.get('/reports', (req, res, next) => {
  // If it's a request for the reports page (not the API), serve the modern UI
  if (req.query.modern === 'true' || req.headers.accept?.includes('text/html')) {
    const indexPath = path.resolve(__dirname, 'public', 'modern', 'index.html');
    console.log(`📱 Serving modern UI for ${req.path} from ${indexPath}`);
    res.sendFile(indexPath);
  } else {
    next();
  }
});

app.get('/settings', (req, res) => {
  const indexPath = path.resolve(__dirname, 'public', 'modern', 'index.html');
  console.log(`📱 Serving modern UI for ${req.path} from ${indexPath}`);
  res.sendFile(indexPath);
});

// Function to find available port
async function findAvailablePort(startPort) {
  const net = await import('net');
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

// Start server with port detection
const startServer = async () => {
  try {
    const availablePort = await findAvailablePort(port);
    httpServer.listen(availablePort, () => {
      console.log(`🌐 Figma-Web Comparison Tool running at http://localhost:${availablePort}`);
      console.log(`📊 Open http://localhost:${availablePort} in your browser`);
  console.log(`🔧 Using real implementations with MCP integration`);
      console.log(`🔌 Socket.IO enabled for real-time updates`);
      if (availablePort !== port) {
        console.log(`⚠️ Note: Requested port ${port} was busy, using port ${availablePort} instead`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 