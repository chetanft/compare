import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';
import { dirname, join } from 'path';
import { extractNodeIdFromUrl, extractFigmaFileKey } from './dist/utils/urlParser.js';
import { getAppPort, getCorsOrigins, findAvailablePort, DEFAULT_PORT } from './dist/config/ports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import our real implementations
import { FigmaExtractor } from './dist/services/extractors/figma/FigmaExtractor.js';
import FigmaMCPIntegration from './dist/figma/mcpIntegration.js';
import MCPDirectFigmaExtractor from './dist/figma/mcpDirectExtractor.js';
import { RobustFigmaExtractor } from './dist/figma/robustFigmaExtractor.js';
import { WebExtractor } from './dist/scraper/webExtractor.js';
import { EnhancedWebExtractor } from './dist/scraper/enhancedWebExtractor.js';
import { ComparisonService } from './dist/compare/ComparisonService.js';
import ReportGenerator from './dist/report/reportGenerator.js';
import FigmaUrlParser from './dist/figma/urlParser.js';
import EnhancedVisualComparison from './dist/visual/enhancedVisualComparison.js';
import ComponentCategorizer from './dist/analyze/componentCategorizer.js';
import CategorizedReportGenerator from './dist/report/categorizedReportGenerator.js';
import ComparisonAnalyzer from './dist/ai/ComparisonAnalyzer.js';
import { ReportCompressor } from './dist/utils/reportCompressor.js';
import { ErrorCategorizer } from './dist/utils/errorCategorizer.js';
import { WebExtractionService } from './dist/services/WebExtractionService.js';
import { ChunkedReportGenerator } from './dist/report/ChunkedReportGenerator.js';
import { ErrorHandlingService } from './dist/utils/ErrorHandlingService.js';

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Get port from configuration - will be synchronized later
let PORT = process.env.PORT || DEFAULT_PORT;

// Ensure output directories exist
const ensureOutputDirectories = async () => {
  const directories = [
    'output',
    'output/reports',
    'output/images',
    'output/screenshots',
    'output/freighttiger-extraction'
  ];

  for (const dir of directories) {
    const dirPath = path.resolve(__dirname, dir);
    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`✅ Directory exists or was created: ${dirPath}`);
    } catch (error) {
      console.error(`❌ Failed to create directory ${dirPath}:`, error);
    }
  }
};

// Load configuration
let config = {};
try {
  const configData = await fs.readFile('./config.json', 'utf8');
  config = JSON.parse(configData);
  console.log('✅ Configuration loaded');
  
  // Get port from config if available
  if (config.ports && config.ports.server) {
    PORT = config.ports.server;
  }
} catch (error) {
  console.warn('⚠️ Could not load config.json, using defaults');
  config = {
    thresholds: {
      colorDifference: 10,
      sizeDifference: 5,
      spacingDifference: 3,
      fontSizeDifference: 2
    },
    figma: {
      accessToken: ""
    },
    mcp: {
      official: {
        enabled: true
      },
      thirdParty: {
        enabled: false,
        tools: ["mcp_Framelink_Figma_MCP"]
      }
    },
    ports: {
      server: PORT
    }
  };
}

// Override Figma access token with environment variable if available
if (process.env.FIGMA_API_KEY) {
  config.figma.accessToken = process.env.FIGMA_API_KEY;
  console.log('✅ Using Figma API key from environment variable');
} else if (!config.figma.accessToken) {
  console.warn('⚠️ No Figma API key found in environment or config');
}

// Ensure output directories exist before proceeding
await ensureOutputDirectories();

// Serve static files from the frontend dist directory
app.use('/assets', express.static(path.join(__dirname, 'frontend/dist/assets')));
app.use('/assets', express.static(path.join(__dirname, 'frontend/public/assets')));
app.use('/assets', express.static(path.join(__dirname, 'dist/assets')));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// Serve output directories for reports, images, etc.
app.use('/output', express.static(path.join(__dirname, 'output')));
app.use('/reports', express.static(path.join(__dirname, 'output/reports')));
app.use('/images', express.static(path.join(__dirname, 'output/images')));
app.use('/screenshots', express.static(path.join(__dirname, 'output/screenshots')));

// Set proper MIME types for JavaScript modules
app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  } else if (req.path.endsWith('.mjs')) {
    res.setHeader('Content-Type', 'application/javascript');
  } else if (req.path.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css');
  }
  next();
});

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Initialize components
let figmaExtractor = null;
let webExtractor = null;
let enhancedWebExtractor = null;
let comparisonService = null;

async function initializeComponents() {
  console.log('🔧 Initializing components...');
  
  try {
    // Initialize Figma extractor
    console.log('🎨 Initializing Figma extractor...');
    
    // Set up MCP integration first
    console.log('🔧 Setting up MCP integration...');
    const mcpIntegration = new FigmaMCPIntegration(config);
    
    try {
      await mcpIntegration.initialize();
      console.log(`✅ MCP integration initialized (type: ${mcpIntegration.getMCPType() || 'none'})`);
    } catch (mcpError) {
      console.warn(`⚠️ MCP integration failed: ${mcpError.message}`);
      console.log('🔄 Continuing with Figma API fallback...');
    }

    // Initialize the robust Figma extractor with MCP integration
    figmaExtractor = new RobustFigmaExtractor({
      accessToken: config.figma?.accessToken || process.env.FIGMA_API_KEY,
      mcpIntegration
    });
    
    // Initialize web extractor
    console.log('🌐 Initializing web extractor...');
    webExtractor = new EnhancedWebExtractor({
      puppeteerOptions: config.puppeteer || { headless: 'new' }
    });
    
    // Initialize comparison service
    console.log('🔄 Initializing comparison service...');
    comparisonService = new ComparisonService({
      figmaExtractor,
      webExtractor
    });
    
    console.log('✅ All components initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing components:', error);
    return false;
  }
}

// Initialize services
const webExtractionService = new WebExtractionService({
  timeout: 60000,
  maxRetries: 3
});

const reportGenerator = new ChunkedReportGenerator({
  chunkSize: 10,
  maxStringLength: 1000000,
  maxArraySize: 1000
});

const errorHandler = new ErrorHandlingService();

// Add report memory management
const reportCache = new Map();
const REPORT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Function to clean up expired reports
function cleanupExpiredReports() {
  const now = Date.now();
  for (const [reportId, reportData] of reportCache.entries()) {
    if (now > reportData.expiresAt) {
      console.log(`🧹 Cleaning up expired report: ${reportId}`);
      reportCache.delete(reportId);
    }
  }
}

// Schedule cleanup every hour
setInterval(cleanupExpiredReports, 60 * 60 * 1000);

// Main comparison endpoint with improved error handling
app.post('/api/compare', async (req, res) => {
  try {
    const { figmaUrl, webUrl, nodeId, authentication, includeVisual } = req.body;

    console.log(`${new Date().toISOString()} - POST /api/compare`);
    console.log('🚀 Received extraction request:', {
      ...req.body,
      authentication: authentication ? {
        ...authentication,
        password: '***'
      } : undefined
    });

    if (!figmaUrl || !webUrl) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required parameters',
          code: 'MISSING_PARAMS'
        }
      });
    }

    // Extract Figma file key
    const figmaFileKeyMatch = figmaUrl.match(/\/file\/([a-zA-Z0-9]+)/);
    if (!figmaFileKeyMatch) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid Figma URL format',
          code: 'INVALID_FIGMA_URL'
        }
      });
    }

    const figmaFileKey = figmaFileKeyMatch[1];

    try {
      // Extract Figma data
      console.log('🎯 Extracting Figma data:', figmaFileKey);
      let figmaData;
      try {
        figmaData = await figmaExtractor.extract(figmaFileKey, nodeId, { depth: 5 });
        console.log('✅ Successfully extracted Figma data');
      } catch (figmaError) {
        console.error('❌ Figma extraction error:', figmaError);
        throw {
          message: `Failed to extract Figma data: ${figmaError.message}`,
          code: 'FIGMA_EXTRACTION_ERROR',
          originalError: figmaError
        };
      }

      // Create a simplified version of figma data to avoid large responses
      const limitedFigmaData = {
        id: figmaData.id,
        name: figmaData.name,
        lastModified: figmaData.lastModified,
        components: figmaData.components?.slice(0, 100) || [],
        styles: figmaData.styles?.slice(0, 100) || [],
        tokens: figmaData.tokens || {},
        metadata: figmaData.metadata || {}
      };

      // Extract web data
      let webData = null;
      let webError = null;

      try {
        console.log('🌐 Enhanced extraction from:', webUrl);
        webData = await webExtractor.extract(webUrl, { 
          authentication, 
          selector: req.body.webSelector
        });
        console.log('✅ Successfully extracted web data');
      } catch (webExtractError) {
        console.error('❌ Enhanced extraction failed:', webExtractError);
        webError = {
          message: webExtractError.message || 'Web extraction failed',
          code: 'WEB_EXTRACTION_ERROR',
          originalError: webExtractError
        };
        // Continue with partial data - don't throw here
      }

      // Generate a timestamp for the report
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');

      // Prepare response data - Note: Comparison is disabled as requested
      const responseData = {
        success: true,
        data: {
          figmaData: limitedFigmaData,
          webData: webData || null,
          comparisonDisabled: true, // Flag to indicate comparison is disabled
          metadata: {
            timestamp,
            figmaUrl,
            webUrl,
            nodeId,
            comparisonStatus: 'disabled', // Explicitly mark as disabled
            note: 'Comparison feature is disabled in this version. Only extraction data is available.',
            figmaStats: {
              totalComponents: figmaData.components?.length || 0,
              totalStyles: figmaData.styles?.length || 0,
              totalTokens: {
                colors: figmaData.tokens?.colors?.length || 0,
                typography: figmaData.tokens?.typography?.length || 0,
                spacing: figmaData.tokens?.spacing?.length || 0,
                borderRadius: figmaData.tokens?.borderRadius?.length || 0,
                shadows: figmaData.tokens?.shadows?.length || 0
              }
            },
            webExtractionError: webError ? webError.message : null,
            webExtracted: webData !== null
          }
        }
      };

      // Generate HTML report content
      let htmlContent;
      try {
        htmlContent = generateBasicHtmlReport(responseData.data);
        console.log('✅ Successfully generated HTML report');
      } catch (reportError) {
        console.error('❌ Error generating HTML report:', reportError);
        
        // Generate a simplified error report instead
        htmlContent = generateErrorReport({
          timestamp,
          figmaUrl,
          webUrl,
          error: `Failed to generate report: ${reportError.message}`,
          figmaData: limitedFigmaData,
          webData: webData
        });
        
        responseData.data.reportError = {
          message: `Failed to generate report: ${reportError.message}`,
          code: 'REPORT_GENERATION_ERROR'
        };
      }

      // Create a route to serve this report directly
      const reportId = `report-${timestamp}`;
      
      // Store the HTML content in memory with expiration
      reportCache.set(reportId, {
        htmlContent,
        createdAt: Date.now(),
        expiresAt: Date.now() + REPORT_TTL,
        hasError: responseData.data.reportError !== undefined
      });
      
      console.log(`📊 Report ${reportId} cached in memory (expires in 24h)`);
      
      // Create dynamic routes for serving the report
      app.get(`/direct-report/${reportId}`, (_, directRes) => {
        const cachedReport = reportCache.get(reportId);
        
        if (cachedReport) {
          // Update last accessed time to extend TTL
          cachedReport.expiresAt = Date.now() + REPORT_TTL;
          reportCache.set(reportId, cachedReport);
          
          directRes.setHeader('Content-Type', 'text/html');
          directRes.send(cachedReport.htmlContent);
        } else {
          directRes.status(404).send(`
            <html>
              <head><title>Report Not Found</title></head>
              <body style="font-family: system-ui; text-align: center; padding: 50px;">
                <h1>Report Not Found</h1>
                <p>This report has expired or been removed. Please generate a new report.</p>
                <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Return to Home</a>
              </body>
            </html>
          `);
        }
      });

      // Add download endpoint for the report
      app.get(`/download-report/${reportId}`, (_, downloadRes) => {
        const cachedReport = reportCache.get(reportId);
        
        if (cachedReport) {
          // Update last accessed time to extend TTL
          cachedReport.expiresAt = Date.now() + REPORT_TTL;
          reportCache.set(reportId, cachedReport);
          
          downloadRes.setHeader('Content-Type', 'text/html');
          downloadRes.setHeader('Content-Disposition', `attachment; filename="comparison-${timestamp}.html"`);
          downloadRes.send(cachedReport.htmlContent);
        } else {
          downloadRes.status(404).send('Report not found or expired');
        }
      });

      // Add direct report URL to the response
        responseData.data.reports = {
        directUrl: `/direct-report/${reportId}`,
        downloadUrl: `/download-report/${reportId}`,
        expiresIn: '24 hours',
        hasError: responseData.data.reportError !== undefined
      };

      // Send response in chunks if needed
      const jsonString = JSON.stringify(responseData);
      if (jsonString.length > 1000000) { // If response is larger than ~1MB
        res.setHeader('Transfer-Encoding', 'chunked');
        res.write(jsonString);
        res.end();
      } else {
        res.json(responseData);
      }

    } catch (error) {
      console.error('❌ Extraction failed:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Unknown error occurred',
          code: error.code || 'EXTRACTION_ERROR',
          stage: error.stage || 'unknown'
        }
      });
    }
  } catch (error) {
    console.error('❌ Server error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'SERVER_ERROR',
        stage: 'server'
      }
    });
  }
});

// Function to generate a basic HTML report
function generateBasicHtmlReport(data) {
  const { figmaData, webData, metadata } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Extraction Report - ${metadata.timestamp}</title>
      <style>
        :root {
          --primary-color: #6366f1;
          --primary-dark: #4f46e5;
          --primary-light: #e0e7ff;
          --success-color: #10b981;
          --warning-color: #f59e0b;
          --danger-color: #ef4444;
          --gray-50: #f9fafb;
          --gray-100: #f3f4f6;
          --gray-200: #e5e7eb;
          --gray-300: #d1d5db;
          --gray-400: #9ca3af;
          --gray-500: #6b7280;
          --gray-600: #4b5563;
          --gray-700: #374151;
          --gray-800: #1f2937;
          --gray-900: #111827;
        }
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body { 
          font-family: system-ui, -apple-system, sans-serif; 
          line-height: 1.5; 
          color: var(--gray-800); 
          background-color: var(--gray-50);
        }
        
        .container { 
          max-width: 1200px; 
          margin: 0 auto; 
          padding: 2rem; 
        }
        
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 2rem; 
          border-radius: 0.5rem; 
          margin-bottom: 2rem; 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .header-content { 
          flex: 1; 
        }
        
        .header-actions { 
          display: flex; 
          gap: 1rem; 
        }
        
        .btn { 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          padding: 0.5rem 1rem; 
          border-radius: 0.375rem; 
          font-weight: 500; 
          cursor: pointer; 
          transition: all 0.2s; 
          text-decoration: none;
          border: none;
          font-size: 0.875rem;
        }
        
        .btn-primary { 
          background-color: white; 
          color: var(--primary-color);
        }
        
        .btn-primary:hover { 
          background-color: var(--gray-50);
          transform: translateY(-1px);
        }
        
        .btn-secondary {
          background-color: transparent;
          color: white;
          border: 1px solid white;
        }
        
        .btn-secondary:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
        
        .section { 
          background: white; 
          border-radius: 0.5rem; 
          padding: 1.5rem; 
          margin-bottom: 1.5rem; 
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        h1, h2, h3 { 
          margin-top: 0;
          color: var(--gray-900);
        }
        
        h1 {
          font-size: 1.875rem;
          line-height: 2.25rem;
        }
        
        h2 {
          font-size: 1.5rem;
          line-height: 2rem;
          margin-bottom: 1rem;
        }
        
        h3 {
          font-size: 1.25rem;
          line-height: 1.75rem;
          margin-bottom: 0.75rem;
        }
        
        .grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
          gap: 1rem; 
        }
        
        .card { 
          border: 1px solid var(--gray-200); 
          border-radius: 0.5rem; 
          padding: 1rem;
          transition: all 0.2s;
        }
        
        .card:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border-color: var(--gray-300);
        }
        
        pre { 
          background: var(--gray-100); 
          padding: 1rem; 
          border-radius: 0.25rem; 
          overflow: auto;
          font-size: 0.875rem;
        }
        
        .tabs { 
          display: flex; 
          border-bottom: 1px solid var(--gray-200); 
          margin-bottom: 1rem; 
        }
        
        .tab { 
          padding: 0.75rem 1.25rem; 
          cursor: pointer;
          border-bottom: 2px solid transparent;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .tab:hover {
          color: var(--primary-color);
        }
        
        .tab.active { 
          border-bottom: 2px solid var(--primary-color); 
          color: var(--primary-color);
        }
        
        .tab-content { 
          display: none; 
        }
        
        .tab-content.active { 
          display: block; 
        }
        
        .search-container {
          margin-bottom: 1.5rem;
          display: flex;
          gap: 1rem;
        }
        
        .search-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid var(--gray-300);
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }
        
        .search-input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        .filter-container {
          margin-bottom: 1.5rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .filter-tag {
          padding: 0.25rem 0.75rem;
          background-color: var(--gray-100);
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .filter-tag:hover {
          background-color: var(--gray-200);
        }
        
        .filter-tag.active {
          background-color: var(--primary-light);
          color: var(--primary-dark);
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        
        .stat-card {
          background-color: white;
          border-radius: 0.5rem;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          text-align: center;
        }
        
        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary-color);
          margin-bottom: 0.5rem;
        }
        
        .stat-label {
          font-size: 0.875rem;
          color: var(--gray-500);
        }
        
        .color-swatch {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          display: inline-block;
          margin-right: 8px;
          vertical-align: middle;
          border: 1px solid var(--gray-200);
        }
        
        .hidden {
          display: none !important;
        }
        
        .pagination {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1.5rem;
        }
        
        .page-btn {
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--gray-300);
          border-radius: 0.375rem;
          background-color: white;
          cursor: pointer;
        }
        
        .page-btn.active {
          background-color: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }
        
        .page-btn:hover:not(.active) {
          background-color: var(--gray-100);
        }
        
        .component-list {
          margin-top: 1rem;
        }
        
        .element-type-tag {
          font-size: 0.75rem;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          background-color: var(--gray-100);
          color: var(--gray-700);
          margin-left: 0.5rem;
        }
        
        @media (max-width: 768px) {
          .header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .header-actions {
            margin-top: 1rem;
          }
          
          .grid {
            grid-template-columns: 1fr;
          }
          
          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-content">
          <h1>Extraction Report</h1>
          <p>Generated: ${new Date(metadata.timestamp).toLocaleString()}</p>
          </div>
          <div class="header-actions">
            <button id="downloadBtn" class="btn btn-primary" onclick="downloadReport()">
              Download Report
            </button>
            <button id="printBtn" class="btn btn-secondary" onclick="window.print()">
              Print Report
            </button>
          </div>
        </div>
        
        <!-- Stats Overview -->
        <div class="section">
          <h2>Overview</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${figmaData.components?.length || 0}</div>
              <div class="stat-label">Figma Components</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${webData?.elements?.length || 0}</div>
              <div class="stat-label">Web Elements</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${figmaData.tokens?.colors?.length || 0}</div>
              <div class="stat-label">Design Colors</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${figmaData.tokens?.typography?.length || 0}</div>
              <div class="stat-label">Typography Styles</div>
            </div>
          </div>
        </div>
        
        <!-- Main Content Tabs -->
        <div class="section">
          <div class="tabs">
            <div class="tab active" onclick="showTab('figma')">Figma Data</div>
            <div class="tab" onclick="showTab('web')">Web Data</div>
            <div class="tab" onclick="showTab('tokens')">Design Tokens</div>
          </div>
          
          <!-- Figma Data Tab -->
          <div id="figma-content" class="tab-content active">
            <div class="search-container">
              <input type="text" id="figma-search" class="search-input" placeholder="Search components..." onkeyup="searchComponents('figma')">
            </div>
            
            <div class="filter-container">
              <span class="filter-tag active" data-filter="all" onclick="filterComponents('figma', 'all')">All</span>
              ${Array.from(new Set(figmaData.components?.map(c => c.type) || [])).slice(0, 10).map(type => 
                `<span class="filter-tag" data-filter="${type}" onclick="filterComponents('figma', '${type}')">${type}</span>`
              ).join('')}
            </div>
            
            <h3>Components (${figmaData.components?.length || 0})</h3>
            <div class="component-list">
              <div id="figma-components" class="grid">
                ${figmaData.components?.slice(0, 20).map((comp, index) => `
                  <div class="card figma-component" data-type="${comp.type || 'unknown'}" data-name="${comp.name || ''}">
                  <h4>${comp.name || 'Unnamed Component'}</h4>
                    <p>Type: <span class="element-type-tag">${comp.type || 'Unknown'}</span></p>
                  ${comp.id ? `<p>ID: ${comp.id}</p>` : ''}
                </div>
              `).join('') || 'No components found'}
            </div>
              
              <div class="pagination" id="figma-pagination">
                ${generatePaginationButtons(figmaData.components?.length || 0, 20, 1, 'figma')}
              </div>
            </div>
          </div>
          
          <!-- Web Data Tab -->
          <div id="web-content" class="tab-content">
            <div class="search-container">
              <input type="text" id="web-search" class="search-input" placeholder="Search elements..." onkeyup="searchComponents('web')">
            </div>
            
            <div class="filter-container">
              <span class="filter-tag active" data-filter="all" onclick="filterComponents('web', 'all')">All</span>
              ${Array.from(new Set(webData?.elements?.map(e => e.type || e.tagName) || [])).slice(0, 10).map(type => 
                `<span class="filter-tag" data-filter="${type}" onclick="filterComponents('web', '${type}')">${type}</span>`
              ).join('')}
            </div>
            
            <h3>Elements (${webData?.elements?.length || 0})</h3>
            <div class="component-list">
              <div id="web-components" class="grid">
                ${webData?.elements?.slice(0, 20).map((elem, index) => `
                  <div class="card web-component" data-type="${elem.type || elem.tagName || 'unknown'}" data-name="${elem.name || elem.tagName || ''}">
                  <h4>${elem.name || elem.tagName || 'Element'}</h4>
                    <p>Type: <span class="element-type-tag">${elem.type || elem.tagName || 'Unknown'}</span></p>
                  ${elem.selector ? `<p>Selector: ${elem.selector}</p>` : ''}
                    ${elem.styles ? `
                      <div class="element-styles">
                        ${elem.styles.color ? `<p>Color: <span class="color-swatch" style="background-color: ${elem.styles.color}"></span>${elem.styles.color}</p>` : ''}
                        ${elem.styles.backgroundColor ? `<p>Background: <span class="color-swatch" style="background-color: ${elem.styles.backgroundColor}"></span>${elem.styles.backgroundColor}</p>` : ''}
                        ${elem.styles.fontSize ? `<p>Font Size: ${elem.styles.fontSize}</p>` : ''}
                      </div>
                    ` : ''}
                </div>
              `).join('') || 'No elements found or web extraction failed'}
            </div>
              
              <div class="pagination" id="web-pagination">
                ${generatePaginationButtons(webData?.elements?.length || 0, 20, 1, 'web')}
              </div>
            </div>
          </div>
          
          <!-- Design Tokens Tab -->
          <div id="tokens-content" class="tab-content">
            <div class="tabs">
              <div class="tab active" onclick="showTokenTab('colors')">Colors</div>
              <div class="tab" onclick="showTokenTab('typography')">Typography</div>
              <div class="tab" onclick="showTokenTab('spacing')">Spacing</div>
              <div class="tab" onclick="showTokenTab('borderRadius')">Border Radius</div>
            </div>
            
            <div id="colors-content" class="token-tab-content active">
              <h3>Colors (${figmaData.tokens?.colors?.length || 0})</h3>
              <div class="grid">
                ${figmaData.tokens?.colors?.map(color => `
                  <div class="card">
                    <div style="display: flex; align-items: center;">
                      <span class="color-swatch" style="background-color: ${color.value}; width: 40px; height: 40px;"></span>
                      <div style="margin-left: 12px;">
                        <h4>${color.name}</h4>
                        <p>${color.value}</p>
                      </div>
                    </div>
                  </div>
                `).join('') || 'No colors defined'}
              </div>
            </div>
            
            <div id="typography-content" class="token-tab-content" style="display: none;">
              <h3>Typography (${figmaData.tokens?.typography?.length || 0})</h3>
              <div class="grid">
                ${figmaData.tokens?.typography?.map(type => `
                  <div class="card">
                    <h4>${type.name}</h4>
                    <p>Font: ${type.fontFamily || 'Not specified'}</p>
                    <p>Size: ${type.fontSize || 'Not specified'}</p>
                    <p>Weight: ${type.fontWeight || 'Not specified'}</p>
                    <p style="font-family: ${type.fontFamily || 'inherit'}; font-size: ${type.fontSize || 'inherit'}; font-weight: ${type.fontWeight || 'inherit'};">
                      The quick brown fox jumps over the lazy dog
                    </p>
                  </div>
                `).join('') || 'No typography styles defined'}
              </div>
            </div>
            
            <div id="spacing-content" class="token-tab-content" style="display: none;">
              <h3>Spacing (${figmaData.tokens?.spacing?.length || 0})</h3>
              <div class="grid">
                ${figmaData.tokens?.spacing?.map(space => `
                  <div class="card">
                    <h4>${space.name}</h4>
                    <p>Value: ${space.value}px</p>
                    <div style="height: ${space.value}px; background-color: var(--primary-light); margin-top: 8px;"></div>
                  </div>
                `).join('') || 'No spacing tokens defined'}
              </div>
            </div>
            
            <div id="borderRadius-content" class="token-tab-content" style="display: none;">
              <h3>Border Radius (${figmaData.tokens?.borderRadius?.length || 0})</h3>
              <div class="grid">
                ${figmaData.tokens?.borderRadius?.map(radius => `
                  <div class="card">
                    <h4>${radius.name}</h4>
                    <p>Value: ${radius.value}px</p>
                    <div style="height: 60px; width: 60px; background-color: var(--primary-light); margin-top: 8px; border-radius: ${radius.value}px;"></div>
                  </div>
                `).join('') || 'No border radius tokens defined'}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        // Helper function to generate pagination buttons
        function generatePaginationButtons(totalItems, itemsPerPage, currentPage, prefix) {
          const totalPages = Math.ceil(totalItems / itemsPerPage);
          if (totalPages <= 1) return '';
          
          let html = '';
          for (let i = 1; i <= totalPages; i++) {
            html += '<button class="page-btn ' + (i === currentPage ? 'active' : '') + '" onclick="changePage(\'' + prefix + '\', ' + i + ')">' + i + '</button>';
          }
          return html;
        }
      
        // Tab switching
        function showTab(tabName) {
          // Hide all tab contents
          const tabContents = document.querySelectorAll('.tab-content');
          tabContents.forEach(content => {
            content.classList.remove('active');
          });
          
          // Remove active class from all tabs
          const tabs = document.querySelectorAll('.tabs > .tab');
          tabs.forEach(tab => {
            tab.classList.remove('active');
          });
          
          // Show selected tab content
          document.getElementById(tabName + '-content').classList.add('active');
          
          // Activate the clicked tab
          document.querySelector('.tab[onclick="showTab(\\'' + tabName + '\\')"]').classList.add('active');
        }
        
        // Token tab switching
        function showTokenTab(tabName) {
          // Hide all token tab contents
          const tabContents = document.querySelectorAll('.token-tab-content');
          tabContents.forEach(content => {
            content.style.display = 'none';
          });
          
          // Remove active class from all token tabs
          const tabs = document.querySelectorAll('#tokens-content .tabs > .tab');
          tabs.forEach(tab => {
            tab.classList.remove('active');
          });
          
          // Show selected token tab content
          document.getElementById(tabName + '-content').style.display = 'block';
          
          // Activate the clicked tab
          document.querySelector('.tab[onclick="showTokenTab(\\'' + tabName + '\\')"]').classList.add('active');
        }
        
        // Search functionality
        function searchComponents(type) {
          const searchInput = document.getElementById(type + '-search').value.toLowerCase();
          const components = document.querySelectorAll('.' + type + '-component');
          
          components.forEach(component => {
            const name = component.dataset.name.toLowerCase();
            const componentType = component.dataset.type.toLowerCase();
            
            if (name.includes(searchInput) || componentType.includes(searchInput)) {
              component.classList.remove('hidden');
            } else {
              component.classList.add('hidden');
            }
          });
        }
        
        // Filter functionality
        function filterComponents(type, filter) {
          // Update active filter
          const filterTags = document.querySelectorAll('#' + type + '-content .filter-tag');
          filterTags.forEach(tag => {
            if (tag.dataset.filter === filter) {
              tag.classList.add('active');
            } else {
              tag.classList.remove('active');
            }
          });
          
          // Apply filter
          const components = document.querySelectorAll('.' + type + '-component');
          components.forEach(component => {
            if (filter === 'all' || component.dataset.type === filter) {
              component.classList.remove('hidden');
            } else {
              component.classList.add('hidden');
            }
          });
        }
        
        // Pagination
        function changePage(prefix, pageNum) {
          const itemsPerPage = 20;
          const components = document.querySelectorAll('.' + prefix + '-component');
          
          // Hide all components
          components.forEach(component => {
            component.classList.add('hidden');
          });
          
          // Show only components for the current page
          const startIdx = (pageNum - 1) * itemsPerPage;
          const endIdx = startIdx + itemsPerPage;
          
          let visibleCount = 0;
          components.forEach((component, idx) => {
            if (idx >= startIdx && idx < endIdx) {
              component.classList.remove('hidden');
              visibleCount++;
            }
          });
          
          // Update pagination buttons
          const paginationContainer = document.getElementById(prefix + '-pagination');
          paginationContainer.innerHTML = generatePaginationButtons(components.length, itemsPerPage, pageNum, prefix);
        }
        
        // Download report
        function downloadReport() {
          // Create a blob from the HTML content
          const htmlContent = document.documentElement.outerHTML;
          const blob = new Blob([htmlContent], { type: 'text/html' });
          
          // Create a download link
          const downloadLink = document.createElement('a');
          downloadLink.href = URL.createObjectURL(blob);
          downloadLink.download = 'comparison-report-${metadata.timestamp}.html';
          
          // Trigger the download
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
      </script>
    </body>
    </html>
  `;
}

// Function to generate an error report when the main report generation fails
function generateErrorReport(data) {
  const { timestamp, figmaUrl, webUrl, error, figmaData, webData } = data;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error Report - ${timestamp}</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 0; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .header { background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%); color: white; padding: 2rem; border-radius: 0.5rem; margin-bottom: 2rem; }
        .section { background: white; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        h1, h2, h3 { margin-top: 0; }
        .error-box { background-color: #fee2e2; border: 1px solid #fca5a5; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; }
        .error-message { color: #b91c1c; font-weight: 500; }
        pre { background: #f5f5f5; padding: 1rem; border-radius: 0.25rem; overflow: auto; }
        .btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 500; cursor: pointer; transition: all 0.2s; text-decoration: none; }
        .btn-primary { background-color: #2563eb; color: white; }
        .btn-primary:hover { background-color: #1d4ed8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Report Generation Error</h1>
          <p>Generated: ${new Date(timestamp).toLocaleString()}</p>
        </div>
        
        <div class="section">
          <div class="error-box">
            <h3>Error Details</h3>
            <p class="error-message">${error}</p>
          </div>
          
          <h2>Request Information</h2>
          <p><strong>Figma URL:</strong> ${figmaUrl}</p>
          <p><strong>Web URL:</strong> ${webUrl}</p>
          
          <h3>Data Extracted</h3>
          <p>Figma Components: ${figmaData?.components?.length || 0}</p>
          <p>Web Elements: ${webData?.elements?.length || 0}</p>
          
          <div style="margin-top: 2rem;">
            <button onclick="window.location.href='/'" class="btn btn-primary">Return to Home</button>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Frontend routing - modern UI only
app.get('/', async (req, res) => {
  // Always serve modern UI
  const modernPath = path.join(__dirname, 'public/modern/index.html');
  try {
    await fs.access(modernPath);
    res.sendFile(modernPath);
  } catch (error) {
    res.status(500).json({
      error: 'Modern UI not built',
      message: 'Please run "cd frontend && npm run build" to build the frontend'
    });
  }
});

// SPA routing for modern UI - specific routes (MUST be before catch-all)
app.get('/new-comparison', (req, res) => {
  const indexPath = path.resolve(__dirname, 'public/modern/index.html');
  console.log(`📱 Serving modern UI for ${req.path} from ${indexPath}`);
  res.sendFile(indexPath);
});

app.get('/settings', (req, res) => {
  const indexPath = path.resolve(__dirname, 'public/modern/index.html');
  console.log(`📱 Serving modern UI for ${req.path} from ${indexPath}`);
  res.sendFile(indexPath);
});

// Handle /reports route - serve modern UI for HTML requests, continue for API requests
app.get('/reports', (req, res, next) => {
  // If it's a request for the reports page (not the API), serve the modern UI
  if (req.headers.accept?.includes('text/html')) {
    const indexPath = path.resolve(__dirname, 'public/modern/index.html');
    console.log(`📱 Serving modern UI for ${req.path} from ${indexPath}`);
    res.sendFile(indexPath);
  } else {
    next();
  }
});

// Static file serving - modern UI only
app.use('/modern/assets', express.static(path.join(__dirname, 'public/modern/assets')));
app.use('/assets', express.static(path.join(__dirname, 'public/modern/assets')));
app.get('/vite.svg', (req, res) => {
  // Return a 204 No Content for missing favicon to prevent errors
  res.status(204).end();
});

// SPA routing for modern UI - catch all modern routes (AFTER static files)
app.get('/modern/*', (req, res, next) => {
  // Skip assets and other static files
  if (req.path.startsWith('/modern/assets/') || 
      req.path.includes('.js') || 
      req.path.includes('.css') || 
      req.path.includes('.svg') || 
      req.path.includes('.png') || 
      req.path.includes('.jpg') || 
      req.path.includes('.ico')) {
    return next();
  }
  
  const indexPath = path.resolve(__dirname, 'public/modern/index.html');
  console.log(`📱 Serving modern UI for ${req.path} from ${indexPath}`);
  res.sendFile(indexPath);
});

// Handle modern UI routes (SPA routing) - catch-all for other routes (AFTER static files)
app.get('*', (req, res, next) => {
  // If it's an API route, continue to next handler
  if (req.path.startsWith('/api/') || req.path.startsWith('/output/') || req.path.startsWith('/reports/') || req.path.startsWith('/images/') || req.path.startsWith('/screenshots/')) {
    return next();
  }
  
  // If it's a file request (has extension), continue to next handler
  if (req.path.includes('.')) {
    return next();
  }
  
  // Serve modern UI for all other routes
  const modernPath = path.join(__dirname, 'public/modern/index.html');
  res.sendFile(modernPath);
});

// Favicon route to prevent 404s
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// API Routes - Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    serverInfo: {
      figmaExtractor: figmaExtractor ? 'initialized' : 'not initialized',
      webExtractor: webExtractor ? 'initialized' : 'not initialized',
      comparisonService: comparisonService ? 'initialized' : 'not initialized'
    }
  });
});

// API Routes - Reports
app.get('/api/reports', async (req, res) => {
  try {
    const reportsPath = path.join(__dirname, 'output', 'reports');
    
    try {
      await fs.mkdir(reportsPath, { recursive: true });
    } catch (e) {}
    
    const files = await fs.readdir(reportsPath);
    
    // Group HTML and JSON files by timestamp
    const reportGroups = {};
    
    for (const file of files) {
      if (file.startsWith('comparison-') && (file.endsWith('.html') || file.endsWith('.json'))) {
        const timestamp = file.replace('comparison-', '').replace(/\.(html|json)$/, '');
        if (!reportGroups[timestamp]) {
          reportGroups[timestamp] = {
            id: timestamp,
            name: `Report ${timestamp}`,
            status: 'success',
            createdAt: new Date().toISOString()
          };
        }
        
        const type = file.endsWith('.html') ? 'html' : 'json';
        reportGroups[timestamp][`${type}Path`] = `/output/reports/${file}`;
        
        // Get file stats for creation date
        try {
          const stats = await fs.stat(path.join(reportsPath, file));
          reportGroups[timestamp].createdAt = stats.mtime.toISOString();
        } catch (statError) {
          // Keep default date if stats fail
        }
      }
    }
    
    // Convert to array and sort by creation date (newest first)
    const reports = Object.values(reportGroups)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
      success: true,
      reports: reports,
      count: reports.length
    });
    
  } catch (error) {
    console.error('Error loading reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load reports'
    });
  }
});

// AI Analysis endpoint
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { comparisonData, options = {} } = req.body;
    
    if (!comparisonData) {
      return res.status(400).json({
        error: 'Missing comparison data',
        message: 'Comparison data is required for AI analysis'
      });
    }

    const analysis = await comparisonAnalyzer.analyzeComparison(comparisonData);
    
    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('AI Analysis error:', error);
    res.status(500).json({
      error: 'AI analysis failed',
      message: error.message
    });
  }
});

// Smart Suggestions endpoint
app.post('/api/ai/suggestions', async (req, res) => {
  try {
    const { comparisonData, userHistory = [], preferences = {} } = req.body;
    
    // Generate contextual suggestions based on comparison data and user history
    const suggestions = await comparisonAnalyzer.generateSmartSuggestions({
      comparisonData,
      userHistory,
      preferences
    });
    
    res.json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    console.error('Smart Suggestions error:', error);
    res.status(500).json({
      error: 'Failed to generate suggestions',
      message: error.message
    });
  }
});

// All other existing API endpoints (keeping them unchanged)
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

// Test endpoints
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

// Settings endpoints (keeping existing functionality)
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

    // Check MCP configuration from config.json
    if (config?.mcp?.official?.enabled) {
      currentSettings.method = 'mcp-server';
      currentSettings.mcpServer.url = config.mcp.official.serverUrl || 'http://localhost:3845';
      currentSettings.mcpServer.endpoint = config.mcp.official.endpoint || '/sse';
    } else if (config?.mcp?.thirdParty?.enabled) {
      currentSettings.method = 'mcp-tools';
      currentSettings.mcpTools.environment = config.mcp.thirdParty.environment || 'auto';
    }

    // Check if MCP configuration file exists
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
    const { method, serverUrl, endpoint, environment, figmaPersonalAccessToken } = req.body;
    
    if (!method) {
      return res.status(400).json({
        success: false,
        error: 'Connection method is required'
      });
    }

    let testResult = {};

    if (method === 'api') {
      // Use figmaPersonalAccessToken instead of accessToken
      const accessToken = figmaPersonalAccessToken || config.figma.accessToken;
      
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Access token is required for Figma API'
        });
      }

      // Basic validation of token format
      if (!accessToken.startsWith('figd_')) {
        return res.json({
          success: false,
          error: 'Invalid Figma API token format',
          message: 'Figma API tokens must start with "figd_"'
        });
      }

      try {
        console.log('Testing Figma API connection...');
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
        } else {
          const errorData = await response.text();
          console.error('Figma API error:', response.status, errorData);
          
          let errorMessage = `Figma API returned ${response.status} ${response.statusText}`;
          let userMessage = 'Please check your access token and try again.';
          
          if (response.status === 403) {
            errorMessage = 'Figma API returned 403 Forbidden';
            userMessage = 'Your token may be invalid or missing required permissions (file_read, file_content).';
          } else if (response.status === 429) {
            errorMessage = 'Figma API rate limit exceeded';
            userMessage = 'Too many requests. Please wait a few minutes and try again.';
          }
          
          testResult = {
            success: false,
            error: errorMessage,
            message: userMessage
          };
        }
      } catch (error) {
        console.error('Figma API connection error:', error);
        testResult = {
          success: false,
          error: `Cannot connect to Figma API: ${error.message}`,
          message: 'Please check your internet connection and access token.'
        };
      }

    } else if (method === 'mcp-server') {
      const testUrl = `${serverUrl || 'http://localhost:3845'}${endpoint || '/sse'}`;
      
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        );

        const controller = new AbortController();
        const response = await Promise.race([
          fetch(testUrl, { method: 'GET', signal: controller.signal }),
          timeoutPromise
        ]);
        
        controller.abort();
        
        if (response.ok) {
          testResult = {
            success: true,
            message: `MCP server is accessible at ${testUrl}`,
            details: `Status: ${response.status} ${response.statusText}`,
            connectionType: 'mcp-server'
          };
        } else {
          testResult = {
            success: false,
            error: `MCP server returned ${response.status} ${response.statusText}`,
            message: `Please check that the Figma Desktop App MCP server is enabled and running.`
          };
        }
      } catch (error) {
        testResult = {
          success: false,
          error: `Cannot connect to MCP server: ${error.message}`,
          message: `Please ensure the Figma Desktop App is running with MCP server enabled.`
        };
      }

    } else if (method === 'mcp-tools') {
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
    const { method, figmaPersonalAccessToken, mcpServerUrl, mcpEndpoint, mcpToolsEnvironment } = req.body;
    
    if (!method) {
      return res.status(400).json({
        success: false,
        error: 'Connection method is required'
      });
    }

    if (method === 'api') {
      if (!figmaPersonalAccessToken && !config.figma.accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Access token is required for Figma API'
        });
      }
      
      if (figmaPersonalAccessToken) {
        config.figma.accessToken = figmaPersonalAccessToken;
      }
      
    } else if (method === 'mcp-server') {
      config.mcp = config.mcp || {};
      config.mcp.official = {
        serverUrl: mcpServerUrl || 'http://localhost:3845',
        endpoint: mcpEndpoint || '/sse',
        enabled: true
      };
      
    } else if (method === 'mcp-tools') {
      config.mcp = config.mcp || {};
      config.mcp.thirdParty = {
        environment: mcpToolsEnvironment || 'auto',
        enabled: true
      };
    }

    const fs = await import('fs/promises');
    await fs.writeFile('./config.json', JSON.stringify(config, null, 2));

    if (method === 'mcp-server') {
      try {
        const mcpConfig = {
          "chat.mcp.discovery.enabled": true,
          "mcp": {
            "servers": {
              "Figma Dev Mode MCP": {
                "type": mcpEndpoint?.startsWith('/sse') ? "sse" : "http",
                "url": `${mcpServerUrl}${mcpEndpoint || '/sse'}`
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

    try {
      // RobustFigmaExtractor doesn't have reinitialize method, create a new instance
      figmaExtractor = new RobustFigmaExtractor(config);
      
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

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('join-comparison', (comparisonId) => {
    socket.join(`comparison-${comparisonId}`);
    console.log(`📊 Client ${socket.id} joined comparison ${comparisonId}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Add socket.io instance to app for use in routes
app.set('io', io);

// Start server
const startServer = async () => {
  try {
    // Find an available port starting with the requested one
    const requestedPort = PORT;
    const port = await findAvailablePort(requestedPort);
    
    if (port !== requestedPort) {
      console.log(`⚠️ Requested port ${requestedPort} is in use, using port ${port} instead`);
    }
    
    // Synchronize port across all configurations
    await syncPortAcrossConfigs(port);
    PORT = port;
    
    // Initialize components
    await initializeComponents();
    
    // Start listening
    server.listen(PORT, () => {
      console.log(`🌐 Figma-Web Comparison Tool running at http://localhost:${PORT}`);
      console.log(`🚀 Modern UI: http://localhost:${PORT}`);
      console.log(`🔧 Dedicated port: ${PORT}`);
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      // Close HTTP server first to stop accepting new connections
      try {
        await new Promise((resolve) => {
          server.close(() => {
            console.log('✅ HTTP server closed');
            resolve();
          });
        });
      } catch (error) {
        console.error('❌ Error closing HTTP server:', error);
      }
      
      // Clean up components
      console.log('🧹 Cleaning up components...');
      
      const cleanupStatus = {
        server: true,
        webExtractor: false,
        figmaExtractor: false,
        comparisonService: false
      };
      
      try {
        // Attempt to clean up web extractor
        if (webExtractor && typeof webExtractor.cleanup === 'function') {
          await Promise.race([
            webExtractor.cleanup(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
          ]);
          cleanupStatus.webExtractor = true;
        }
      } catch (error) {
        console.error('❌ Error cleaning up web extractor:', error);
      }
      
      try {
        // Attempt to clean up Figma extractor
        if (figmaExtractor && typeof figmaExtractor.cleanup === 'function') {
          await Promise.race([
            figmaExtractor.cleanup(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
          cleanupStatus.figmaExtractor = true;
        }
      } catch (error) {
        console.error('❌ Error cleaning up Figma extractor:', error);
      }
      
      try {
        // Attempt to clean up comparison service
        if (comparisonService && typeof comparisonService.cleanup === 'function') {
          await Promise.race([
            comparisonService.cleanup(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
          cleanupStatus.comparisonService = true;
        }
      } catch (error) {
        console.error('❌ Error cleaning up comparison service:', error);
      }
      
      console.log('\n📊 Cleanup Status:', cleanupStatus);
      
      // Give a bit more time for any remaining cleanup
      // Increased from 5 seconds to 15 seconds to allow more time for cleanup
      setTimeout(() => {
        console.warn('⚠️ Forcing exit after timeout');
        process.exit(1);
      }, 15000);
    };
    
    // Handle different shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart
    
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('❌ Uncaught Exception:', error);
      await gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      await gracefulShutdown('unhandledRejection');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// MCP availability check endpoint
app.get('/api/mcp/status', async (req, res) => {
  try {
    const mcpStatus = {
      officialMCP: false,
      thirdPartyMCP: false,
      figmaAPI: false,
      activeMethod: 'none'
    };
    
    // Check official MCP
    try {
      const officialMCPAvailable = await FigmaMCPIntegration.checkOfficialMCPAvailability();
      mcpStatus.officialMCP = officialMCPAvailable;
    } catch (error) {
      console.warn('⚠️ Error checking official MCP:', error.message);
    }
    
    // Check third-party MCP
    try {
      const thirdPartyMCPAvailable = FigmaMCPIntegration.checkThirdPartyMCPAvailability();
      mcpStatus.thirdPartyMCP = thirdPartyMCPAvailable;
    } catch (error) {
      console.warn('⚠️ Error checking third-party MCP:', error.message);
    }
    
    // Check Figma API
    mcpStatus.figmaAPI = !!config.figma?.accessToken || !!process.env.FIGMA_ACCESS_TOKEN;
    
    // Get active method
    if (figmaExtractor && figmaExtractor.mcpIntegration) {
      mcpStatus.activeMethod = figmaExtractor.mcpIntegration.getMCPType() || 'none';
    }
    
    res.json(mcpStatus);
  } catch (error) {
    console.error('❌ Error getting MCP status:', error);
    res.status(500).json({ error: 'Failed to get MCP status', message: error.message });
  }
});

// MCP test endpoint
app.post('/api/figma/test', async (req, res) => {
  try {
    const { fileKey, nodeId } = req.body;
    
    if (!fileKey) {
      return res.status(400).json({
        success: false,
        message: 'fileKey is required'
      });
    }
    
    const mcpIntegration = new FigmaMCPIntegration(config);
    await mcpIntegration.initialize();
    
    const result = await mcpIntegration.getFigmaData(fileKey, nodeId);
    
    res.json({
      success: true,
      mcpType: mcpIntegration.getMCPType(),
      data: result
    });
  } catch (error) {
    console.error('Error testing Figma MCP:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Unknown error'
    });
  }
});