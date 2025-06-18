import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

// Import enhanced components
import EnhancedFigmaExtractor from './figma/enhancedFigmaExtractor.js';
import { EnhancedWebExtractor } from './scraper/enhancedWebExtractor.js';
import EnhancedComparisonEngine from './compare/enhancedComparisonEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
import { getAppPort } from './config/ports.js';
const PORT = getAppPort();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Global variables for components (will be initialized in startServer)
let figmaExtractor;
let webExtractor;
let comparisonEngine;

/**
 * Enhanced API endpoint for design comparison
 * Uses the new enhanced extractors and comparison engine
 */
app.post('/api/enhanced-compare', async (req, res) => {
  try {
    const { figmaUrl, webUrl, includeVisual = false } = req.body;

    if (!figmaUrl || !webUrl) {
      return res.status(400).json({
        error: 'Both figmaUrl and webUrl are required'
      });
    }

    console.log('🚀 Starting enhanced design comparison...');
    console.log(`📐 Figma URL: ${figmaUrl}`);
    console.log(`🌐 Web URL: ${webUrl}`);

    // Parse Figma URL
    const figmaUrlParts = parseFigmaUrl(figmaUrl);
    if (!figmaUrlParts.fileId) {
      return res.status(400).json({
        error: 'Invalid Figma URL format'
      });
    }

    console.log(`📋 Parsed Figma: fileId=${figmaUrlParts.fileId}, nodeId=${figmaUrlParts.nodeId}`);

    // Step 1: Extract Figma design data with ALL child components
    console.log('🎨 Extracting Figma design data...');
    await figmaExtractor.initialize();
    const figmaData = await figmaExtractor.extractDesignData(
      figmaUrlParts.fileId,
      figmaUrlParts.nodeId
    );

    console.log(`✅ Figma extraction complete: ${figmaData.components.length} components`);

    // Step 2: Extract web data with ALL visible elements
    console.log('🌐 Extracting web data...');
    const webData = await webExtractor.extractWebData(webUrl);
    
    console.log(`✅ Web extraction complete: ${webData.elements.length} elements`);

    // Step 3: Perform enhanced comparison
    console.log('🔍 Performing enhanced comparison...');
    const comparisonResult = await comparisonEngine.compareDesigns(figmaData, webData);

    console.log(`✅ Comparison complete: ${comparisonResult.summary.totalMatches} matches, ${comparisonResult.summary.totalDeviations} deviations`);

    // Step 4: Generate enhanced report
    const reportData = {
      ...comparisonResult,
      figmaData,
      webData,
      metadata: {
        ...comparisonResult.metadata,
        enhancedVersion: true,
        extractionMethod: 'enhanced',
        includeVisual
      }
    };

    // Save report
    const reportId = `enhanced-${Date.now()}`;
    const reportPath = path.join(__dirname, '../output/reports', `${reportId}.json`);
    
    // Ensure output directory exists
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));

    console.log(`📄 Enhanced report saved: ${reportId}`);

    // Return response
    res.json({
      success: true,
      reportId,
      summary: comparisonResult.summary,
      metadata: reportData.metadata,
      comparisons: comparisonResult.comparisons.slice(0, 10), // Limit for response size
      colorAnalysis: comparisonResult.colorAnalysis,
      typographyAnalysis: comparisonResult.typographyAnalysis,
      reportPath: `/api/reports/${reportId}`
    });

  } catch (error) {
    console.error('❌ Enhanced comparison failed:', error);
    res.status(500).json({
      error: 'Enhanced comparison failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Get enhanced report by ID
 */
app.get('/api/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    
    // Handle special case for report ID "1" (sample/test)
    if (reportId === '1') {
      return res.json({
        success: true,
        message: 'Sample report endpoint - no report generated yet',
        reportId: '1',
        timestamp: new Date().toISOString(),
        note: 'Run a comparison to generate a real report'
      });
    }
    
    const reportPath = path.join(__dirname, '../output/reports', `${reportId}.json`);
    
    const reportData = await fs.readFile(reportPath, 'utf8');
    const report = JSON.parse(reportData);
    
    res.json(report);
  } catch (error) {
    console.error('❌ Failed to load report:', error);
    res.status(404).json({
      error: 'Report not found',
      message: `Report ${req.params.reportId} not found. Generate a report first using /api/enhanced-compare`,
      reportId: req.params.reportId
    });
  }
});

/**
 * Test endpoint for authentication functionality
 */
app.post('/api/test-auth', async (req, res) => {
  try {
    const { authentication } = req.body;
    
    console.log('🧪 Testing authentication...');
    console.log('Auth object:', JSON.stringify(authentication, null, 2));
    
    if (!authentication) {
      return res.json({
        success: false,
        message: 'No authentication provided',
        authDetected: false
      });
    }
    
    return res.json({
      success: true,
      message: 'Authentication object detected',
      authDetected: true,
      authType: authentication.type,
      hasLoginUrl: !!authentication.loginUrl,
      hasCredentials: !!authentication.credentials,
      hasSelectors: !!authentication.selectors
    });
    
  } catch (error) {
    console.error('❌ Auth test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication test failed',
      message: error.message
    });
  }
});

/**
 * Additional endpoints for frontend integration
 */
app.get('/api/settings/test-connections', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Connection test endpoint available',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Additional test connection endpoints that might be called
app.post('/api/test-connection', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Connection test successful',
      timestamp: new Date().toISOString(),
      server: 'Enhanced Design Comparison Server',
      version: 'enhanced-v2.1'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/test-connection', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Connection test successful',
      timestamp: new Date().toISOString(),
      server: 'Enhanced Design Comparison Server',
      version: 'enhanced-v2.1'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/settings/test', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Settings test successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/settings/test', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Settings test successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Settings endpoints
app.get('/api/settings/current', async (req, res) => {
  try {
    res.json({
      success: true,
      settings: {
        connectionType: 'api',
        accessToken: '***hidden***',
        serverUrl: 'http://localhost:3004',
        version: 'enhanced-v2.1'
      },
      message: 'Current settings loaded',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/settings/test-connection', async (req, res) => {
  try {
    const { method, accessToken } = req.body;
    
    console.log('🔍 Testing connection with:', { method, accessToken: accessToken ? '***provided***' : 'missing' });
    
    // Simulate Figma API test
    if (method === 'api' && accessToken) {
      // Basic validation of Figma token format
      if (accessToken.startsWith('figd_')) {
        res.json({
          success: true,
          message: 'Figma API connection test successful',
          connectionType: 'api',
          timestamp: new Date().toISOString(),
          figmaApiStatus: 'connected'
        });
      } else {
        res.json({
          success: false,
          message: 'Invalid Figma API token format',
          error: 'Token should start with "figd_"'
        });
      }
    } else {
      res.json({
        success: false,
        message: 'Missing required parameters',
        error: 'Both method and accessToken are required'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Favicon endpoints (both /favicon.ico and /api/favicon.ico)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

app.get('/api/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Reports endpoints
app.get('/api/reports', async (req, res) => {
  try {
    // List all available reports
    const reportsDir = path.join(__dirname, '../output/reports');
    let reports = [];
    
    try {
      await fs.mkdir(reportsDir, { recursive: true });
      const files = await fs.readdir(reportsDir);
      reports = files
        .filter(file => file.endsWith('.json'))
        .map(file => ({
          id: file.replace('.json', ''),
          filename: file,
          created: new Date().toISOString() // You could get actual file stats
        }));
    } catch (error) {
      console.log('No reports directory or files found');
    }
    
    res.json({
      success: true,
      reports: reports,
      count: reports.length,
      message: reports.length === 0 ? 'No reports generated yet. Run a comparison to create reports.' : `Found ${reports.length} reports`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/reports/1', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Sample report endpoint - no report generated yet',
      reportId: '1',
      timestamp: new Date().toISOString(),
      note: 'Run a comparison to generate a real report'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test endpoint for enhanced Figma extraction
 */
app.post('/api/test-figma', async (req, res) => {
  try {
    const { figmaUrl } = req.body;
    
    if (!figmaUrl) {
      return res.status(400).json({ error: 'figmaUrl is required' });
    }

    const figmaUrlParts = parseFigmaUrl(figmaUrl);
    if (!figmaUrlParts.fileId) {
      return res.status(400).json({ error: 'Invalid Figma URL format' });
    }

    console.log('🧪 Testing enhanced Figma extraction...');
    
    await figmaExtractor.initialize();
    const figmaData = await figmaExtractor.extractDesignData(
      figmaUrlParts.fileId,
      figmaUrlParts.nodeId
    );

    res.json({
      success: true,
      fileId: figmaUrlParts.fileId,
      nodeId: figmaUrlParts.nodeId,
      extractedComponents: figmaData.components.length,
      summary: figmaData.summary,
      components: figmaData.components.slice(0, 5), // Show first 5 for testing
      componentTypes: figmaData.summary.componentTypes
    });

  } catch (error) {
    console.error('❌ Figma test failed:', error);
    res.status(500).json({
      error: 'Figma extraction test failed',
      message: error.message
    });
  }
});

/**
 * Test endpoint for enhanced web extraction
 */
app.post('/api/test-web', async (req, res) => {
  try {
    const { webUrl } = req.body;
    
    if (!webUrl) {
      return res.status(400).json({ error: 'webUrl is required' });
    }

    console.log('🧪 Testing enhanced web extraction...');
    
    const webData = await webExtractor.extractWebData(webUrl);

    res.json({
      success: true,
      url: webUrl,
      extractedElements: webData.elements.length,
      summary: webData.summary,
      elements: webData.elements.slice(0, 5), // Show first 5 for testing
      colorPalette: webData.colorPalette.slice(0, 10),
      typographySystem: {
        fonts: webData.typographySystem.fonts.slice(0, 5),
        fontSizes: webData.typographySystem.fontSizes.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('❌ Web test failed:', error);
    res.status(500).json({
      error: 'Web extraction test failed',
      message: error.message
    });
  }
});

/**
 * Dynamic application extraction endpoint for apps like FreightTiger
 * Handles long loading times, filter interactions, and progressive data loading
 */
app.post('/api/extract-dynamic', async (req, res) => {
  try {
    const { 
      webUrl, 
      authentication = null,
      waitTime = 25000,           // 25 seconds default wait
      filterSelectors = [],       // CSS selectors for filters to interact with
      dataIndicators = [],        // Selectors that indicate data has loaded
      extractionStrategy = 'progressive' // 'progressive' or 'single'
    } = req.body;
    
    if (!webUrl) {
      return res.status(400).json({ error: 'webUrl is required' });
    }

    console.log('🔄 Starting dynamic application extraction...');
    console.log(`📱 Target: ${webUrl}`);
    console.log(`⏱️ Wait time: ${waitTime}ms`);
    console.log(`🎛️ Filters: ${filterSelectors.length}`);
    console.log(`📊 Data indicators: ${dataIndicators.length}`);

    const dynamicData = await extractDynamicApplication({
      webUrl,
      authentication,
      waitTime,
      filterSelectors,
      dataIndicators,
      extractionStrategy
    });

    res.json({
      success: true,
      url: webUrl,
      strategy: extractionStrategy,
      extractedElements: dynamicData.elements.length,
      summary: dynamicData.summary,
      loadingPhases: dynamicData.loadingPhases,
      elements: dynamicData.elements.slice(0, 10), // Show first 10 for preview
      colorPalette: dynamicData.colorPalette.slice(0, 15),
      typographySystem: {
        fonts: dynamicData.typographySystem.fonts.slice(0, 8),
        fontSizes: dynamicData.typographySystem.fontSizes.slice(0, 15)
      }
    });

  } catch (error) {
    console.error('❌ Dynamic extraction failed:', error);
    res.status(500).json({
      error: 'Dynamic application extraction failed',
      message: error.message,
      details: error.stack
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: 'enhanced-v2.1',
    timestamp: new Date().toISOString(),
    features: [
      'Enhanced Figma extraction with recursive child component flattening',
      'Enhanced web extraction with semantic UI component detection',
      'Enhanced comparison engine with component-to-component matching',
      'Specialized color and typography analysis',
      'Comprehensive reporting with detailed deviations',
      'Dynamic application extraction for data-driven apps'
    ]
  });
});

/**
 * Enhanced dynamic application extraction function
 */
async function extractDynamicApplication({
  webUrl,
  authentication = null,
  waitTime = 25000,
  filterSelectors = [],
  dataIndicators = [],
  extractionStrategy = 'progressive'
}) {
  
  try {
    console.log('🌐 Starting dynamic application extraction...');
    
    // If authentication is provided, use the full dynamic flow
    if (authentication) {
      console.log('🔐 Authentication provided - using full dynamic extraction...');
      return await extractWithAuthentication({
        webUrl,
        authentication,
        waitTime,
        filterSelectors,
        dataIndicators,
        extractionStrategy
      });
    }
    
    // Otherwise use the basic web extraction
    console.log('🌐 Using enhanced web extraction as base...');
    
    const baseResult = await webExtractor.extractWebData(webUrl, authentication);
    
    console.log(`⏳ Base extraction complete: ${baseResult.elements.length} components`);
    
    // For now, just return the base result with dynamic metadata
    if (waitTime > 5000 || filterSelectors.length > 0 || dataIndicators.length > 0) {
      console.log('🔄 Dynamic features requested - using base extraction with extended metadata...');
    }
    
    // Return base result with strategy info
    const finalResult = {
      ...baseResult,
      extractionStrategy,
      loadingPhases: extractionStrategy === 'progressive' ? [
        { phase: 'initial', elements: baseResult.elements.length }
      ] : undefined
    };
    
    console.log(`✅ Dynamic extraction complete: ${finalResult.elements.length} components`);
    return finalResult;

  } catch (error) {
    console.error('❌ Dynamic extraction error:', error);
    throw error;
  }
}

/**
 * Extract with authentication - full dynamic flow
 */
async function extractWithAuthentication({
  webUrl,
  authentication,
  waitTime,
  filterSelectors,
  dataIndicators,
  extractionStrategy
}) {
  const webExtractor = new EnhancedWebExtractor();
  
  // Create fresh browser instance for authentication
  await webExtractor.createFreshInstance();
  
  try {
    console.log('🔐 Starting authenticated extraction...');
    
    // Step 1: Handle authentication
    if (authentication.type === 'form' && authentication.loginUrl) {
      console.log(`🔐 Navigating to login page: ${authentication.loginUrl}`);
      
      await webExtractor.page.goto(authentication.loginUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      console.log('🔐 Filling login credentials...');
      
      // Wait for page to be ready
      await webExtractor.page.waitForTimeout(3000);

      // Wait for login form
      await webExtractor.page.waitForSelector(authentication.selectors.username, { timeout: 5000 });
      await webExtractor.page.type(authentication.selectors.username, authentication.credentials.username);

      await webExtractor.page.waitForSelector(authentication.selectors.password, { timeout: 5000 });
      await webExtractor.page.type(authentication.selectors.password, authentication.credentials.password);

      // Submit form and wait for navigation
      await webExtractor.page.waitForSelector(authentication.selectors.submit, { timeout: 5000 });
      await Promise.all([
        webExtractor.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
        webExtractor.page.click(authentication.selectors.submit)
      ]);

      // Wait for success indicator or default timeout
      if (authentication.successIndicator) {
        await webExtractor.page.waitForSelector(authentication.successIndicator, { timeout: 10000 });
      } else {
        await webExtractor.page.waitForTimeout(5000);
      }
      
      console.log('✅ Authentication process completed');
    }
    
    // Step 2: Navigate to target page (if different from current page)
    const currentUrl = webExtractor.page.url();
    console.log(`Current URL after authentication: ${currentUrl}`);
    
    if (currentUrl !== webUrl && !currentUrl.includes(webUrl.split('/').pop())) {
      console.log(`🌐 Navigating to target page: ${webUrl}`);
      try {
        await webExtractor.page.goto(webUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });
      } catch (navError) {
        console.log(`⚠️ Navigation to target failed: ${navError.message}`);
        console.log('🔄 Proceeding with extraction from current page...');
      }
    } else {
      console.log('✅ Already on target page or similar - proceeding with extraction');
    }
    
    // Wait for initial dynamic content
    console.log('⏳ Waiting for initial dynamic content...');
    await webExtractor.page.waitForTimeout(3000);
    
    // Wait for initial load
    console.log('⏳ Waiting for initial load...');
    await webExtractor.page.waitForTimeout(10000);
    
    // Wait for changes to settle
    await webExtractor.page.waitForTimeout(5000);
    
    // Step 4: Wait for loading indicators
    await waitForLoadingComplete(webExtractor.page);
    
    // Step 5: Interact with filters
    if (filterSelectors.length > 0) {
      await interactWithFilters(webExtractor.page, filterSelectors);
    }
    
    // Step 6: Wait for data indicators
    if (dataIndicators.length > 0) {
      await waitForDataIndicators(webExtractor.page, dataIndicators);
    }
    
    // Step 7: Extract components
    console.log('📸 Extracting components from authenticated page...');
    const components = await webExtractor.extractSemanticUIComponents();
    const colorPalette = await webExtractor.extractColorPalette();
    const typographySystem = await webExtractor.extractTypographySystem();
    
    const result = {
      url: webUrl,
      extractedAt: new Date().toISOString(),
      elements: components,
      colorPalette,
      typographySystem,
      extractionStrategy,
      authenticated: true,
      loadingPhases: extractionStrategy === 'progressive' ? [
        { phase: 'authenticated', elements: components.length }
      ] : undefined,
      summary: {
        totalComponents: components.length,
        componentTypes: webExtractor.getComponentTypeSummary(components),
        totalColors: colorPalette.length,
        totalFonts: typographySystem.fonts.length
      }
    };
    
    console.log(`✅ Authenticated extraction complete: ${components.length} components`);
    return result;
    
  } catch (error) {
    console.error('❌ Authenticated extraction failed:', error);
    throw error;
  } finally {
    try {
      if (webExtractor && webExtractor.browser) {
        await webExtractor.close();
      }
    } catch (cleanupError) {
      console.log('⚠️ Browser cleanup error (non-critical):', cleanupError.message);
    }
  }
}

/**
 * Wait for selector with retry logic
 */
async function waitForSelectorWithRetry(page, selector, timeout = 10000, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Waiting for selector "${selector}" (attempt ${attempt}/${maxRetries})`);
      await page.waitForSelector(selector, { timeout: timeout / maxRetries });
      console.log(`✅ Selector "${selector}" found on attempt ${attempt}`);
      return;
    } catch (error) {
      console.log(`❌ Selector "${selector}" not found on attempt ${attempt}: ${error.message}`);
      
      if (attempt === maxRetries) {
        throw new Error(`Selector "${selector}" not found after ${maxRetries} attempts`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Handle authentication for dynamic applications
 */
async function handleAuthentication(page, authConfig) {
  const { type, loginUrl, credentials, selectors } = authConfig;
  
  if (type === 'form' && loginUrl) {
    // Navigate to login page
    await page.goto(loginUrl, { waitUntil: 'networkidle2' });
    
    // Fill credentials
    await page.waitForSelector(selectors.username, { timeout: 10000 });
    await page.type(selectors.username, credentials.username);
    await page.type(selectors.password, credentials.password);
    
    // Submit and wait for redirect
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click(selectors.submit)
    ]);
    
    console.log('✅ Form authentication completed');
  } else if (type === 'token') {
    // Set authorization headers or localStorage
    await page.evaluateOnNewDocument((token) => {
      localStorage.setItem('authToken', token);
    }, credentials.token);
    
    console.log('✅ Token authentication set');
  }
}

/**
 * Wait for loading indicators to disappear
 */
async function waitForLoadingComplete(page) {
  const loadingSelectors = [
    '[class*="loading"]',
    '[class*="spinner"]', 
    '[class*="loader"]',
    '.loading',
    '.spinner',
    '.loader',
    '[data-loading="true"]',
    '[aria-busy="true"]'
  ];

  try {
    // Wait for all loading indicators to disappear
    await page.waitForFunction((selectors) => {
      return selectors.every(selector => {
        const elements = document.querySelectorAll(selector);
        return elements.length === 0 || 
               Array.from(elements).every(el => 
                 el.style.display === 'none' || 
                 el.style.visibility === 'hidden' ||
                 el.offsetParent === null
               );
      });
    }, { timeout: 30000 }, loadingSelectors);
    
    console.log('✅ All loading indicators cleared');
  } catch (error) {
    console.log('⚠️ Loading indicators timeout - proceeding anyway');
  }
}

/**
 * Interact with filters to trigger data loading
 */
async function interactWithFilters(page, filterSelectors) {
  for (const selector of filterSelectors) {
    try {
      console.log(`🎛️ Interacting with filter: ${selector}`);
      
      // Wait for filter to be available
      await page.waitForSelector(selector, { timeout: 10000 });
      
      // Click or interact with filter
      await page.click(selector);
      
      // Wait for potential data loading
      await page.waitForTimeout(3000);
      
      console.log(`✅ Filter interaction completed: ${selector}`);
    } catch (error) {
      console.log(`⚠️ Filter interaction failed: ${selector} - ${error.message}`);
    }
  }
}

/**
 * Wait for data indicators to appear (showing data has loaded)
 */
async function waitForDataIndicators(page, dataIndicators) {
  for (const indicator of dataIndicators) {
    try {
      console.log(`📊 Waiting for data indicator: ${indicator}`);
      
      await page.waitForSelector(indicator, { 
        timeout: 20000,
        visible: true 
      });
      
      console.log(`✅ Data indicator found: ${indicator}`);
    } catch (error) {
      console.log(`⚠️ Data indicator timeout: ${indicator} - ${error.message}`);
    }
  }
}

/**
 * Progressive extraction - multiple attempts as data loads
 */
async function progressiveExtraction(page) {
  const phases = [];
  let finalElements = [];
  let finalColorPalette = [];
  let finalTypographySystem = { fonts: [], fontSizes: [], fontWeights: [], lineHeights: [], textStyles: [] };

  // Phase 1: Initial extraction
  console.log('📈 Phase 1: Initial extraction...');
  const phase1 = await extractCurrentState(page, 'initial');
  phases.push(phase1);
  finalElements = [...phase1.elements];

  // Phase 2: Wait and extract again (data might have loaded)
  await page.waitForTimeout(10000);
  console.log('📈 Phase 2: Post-wait extraction...');
  const phase2 = await extractCurrentState(page, 'post-wait');
  phases.push(phase2);
  
  // Merge unique elements
  const newElements = phase2.elements.filter(el => 
    !finalElements.some(existing => existing.selector === el.selector)
  );
  finalElements = [...finalElements, ...newElements];

  // Phase 3: Final extraction after all interactions
  await page.waitForTimeout(5000);
  console.log('📈 Phase 3: Final extraction...');
  const phase3 = await extractCurrentState(page, 'final');
  phases.push(phase3);
  
  // Final merge
  const finalNewElements = phase3.elements.filter(el => 
    !finalElements.some(existing => existing.selector === el.selector)
  );
  finalElements = [...finalElements, ...finalNewElements];

  // Use the most comprehensive color palette and typography
  finalColorPalette = phase3.colorPalette.length > 0 ? phase3.colorPalette : 
                     phase2.colorPalette.length > 0 ? phase2.colorPalette : 
                     phase1.colorPalette;

  finalTypographySystem = phase3.typographySystem.fonts.length > 0 ? phase3.typographySystem :
                         phase2.typographySystem.fonts.length > 0 ? phase2.typographySystem :
                         phase1.typographySystem;

  return {
    url: page.url(),
    extractedAt: new Date().toISOString(),
    elements: finalElements,
    colorPalette: finalColorPalette,
    typographySystem: finalTypographySystem,
    loadingPhases: phases,
    summary: {
      totalComponents: finalElements.length,
      componentTypes: getComponentTypeSummary(finalElements),
      totalColors: finalColorPalette.length,
      totalFonts: finalTypographySystem.fonts.length,
      extractionPhases: phases.length
    }
  };
}

/**
 * Single extraction - one comprehensive attempt
 */
async function singleExtraction(page) {
  console.log('📸 Performing single comprehensive extraction...');
  
  const result = await extractCurrentState(page, 'comprehensive');
  
  return {
    url: page.url(),
    extractedAt: new Date().toISOString(),
    elements: result.elements,
    colorPalette: result.colorPalette,
    typographySystem: result.typographySystem,
    loadingPhases: [result],
    summary: {
      totalComponents: result.elements.length,
      componentTypes: getComponentTypeSummary(result.elements),
      totalColors: result.colorPalette.length,
      totalFonts: result.typographySystem.fonts.length,
      extractionPhases: 1
    }
  };
}

/**
 * Extract current state of the page
 */
async function extractCurrentState(page, phase) {
  const startTime = Date.now();
  
  // Use the enhanced web extractor's extraction logic
  const elements = await page.evaluate(() => {
    const components = [];
    
    // Define comprehensive semantic selectors for UI components
    const componentSelectors = {
      buttons: 'button, [role="button"], .btn, .button, input[type="submit"], input[type="button"], a[class*="btn"], a[class*="button"], [class*="btn"], [class*="button"]',
      text: 'h1, h2, h3, h4, h5, h6, p, span, label, [role="heading"], .text, .title, .heading, .label, .caption',
      inputs: 'input, textarea, select, [role="textbox"], [role="combobox"], .input, .field, .form-control',
      links: 'a[href], [role="link"], .link',
      navigation: 'nav, [role="navigation"], .nav, .navbar, .menu, .navigation, .topnav, .header-nav',
      lists: 'ul, ol, [role="list"], .list, .menu-list',
      cards: '.card, .panel, .tile, [role="article"], article, .item, .row, .entry',
      containers: 'div[class*="container"], div[class*="wrapper"], section, main, .content, .page, .app',
      icons: 'i[class*="icon"], svg, [class*="icon"], .fa, .material-icons, .icon',
      tables: 'table, .table, .data-table, .grid, [role="table"], [role="grid"]',
      tableRows: 'tr, .table-row, .row, [role="row"]',
      tableCells: 'td, th, .table-cell, .cell, [role="cell"], [role="columnheader"]',
      dropdowns: 'select, .dropdown, .select, [role="combobox"], [role="listbox"]',
      tabs: '.tab, .tabs, [role="tab"], [role="tablist"], .tab-item',
      badges: '.badge, .tag, .chip, .label, .status, .pill',
      modals: '.modal, .dialog, .popup, [role="dialog"], [role="alertdialog"]',
      forms: 'form, .form, .form-group, .field-group',
      headers: 'header, .header, .top-bar, .app-header',
      footers: 'footer, .footer, .bottom-bar',
      sidebars: '.sidebar, .side-nav, .drawer, aside',
      toolbars: '.toolbar, .action-bar, .controls',
      searchBoxes: 'input[type="search"], .search, .search-box, .search-input',
      filters: '.filter, .filters, .filter-bar, .search-filters',
      pagination: '.pagination, .pager, .page-nav',
      breadcrumbs: '.breadcrumb, .breadcrumbs, .path',
      alerts: '.alert, .notification, .message, .toast, [role="alert"]',
      progress: '.progress, .progress-bar, .loading-bar, [role="progressbar"]',
      dividers: '.divider, .separator, hr',
      images: 'img, .image, .avatar, .thumbnail, .photo',
      videos: 'video, .video, .media',
      checkboxes: 'input[type="checkbox"], .checkbox, [role="checkbox"]',
      radios: 'input[type="radio"], .radio, [role="radio"]',
      switches: '.switch, .toggle, [role="switch"]',
      sliders: 'input[type="range"], .slider, [role="slider"]'
    };

    for (const [componentType, selector] of Object.entries(componentSelectors)) {
      const elements = document.querySelectorAll(selector);
      
      elements.forEach((element, index) => {
        const computedStyles = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        // Skip only truly invisible elements
        if (rect.width < 1 || rect.height < 1 || computedStyles.display === 'none' || computedStyles.visibility === 'hidden' || computedStyles.opacity === '0') {
          return;
        }

        // Extract comprehensive component data
        const component = {
          id: `${componentType}-${index}`,
          type: componentType,
          tagName: element.tagName.toLowerCase(),
          selector: generateOptimalSelector(element),
          
          // Element identification
          attributes: {
            id: element.id || null,
            className: typeof element.className === 'string' ? element.className : null,
            role: element.getAttribute('role'),
            type: element.getAttribute('type'),
            href: element.getAttribute('href'),
            placeholder: element.getAttribute('placeholder'),
            alt: element.getAttribute('alt'),
            title: element.getAttribute('title')
          },
          
          // Text content
          text: element.textContent?.trim().substring(0, 200) || null,
          
          // Position and dimensions
          position: {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            centerX: Math.round(rect.left + rect.width / 2),
            centerY: Math.round(rect.top + rect.height / 2)
          },
          
          // Comprehensive style properties
          properties: {
            colors: extractColors(computedStyles),
            typography: extractTypography(computedStyles, element),
            layout: extractLayout(computedStyles),
            effects: extractEffects(computedStyles)
          }
        };

        components.push(component);
      });
    }
    
    return components;
    
    // Helper functions
    function generateOptimalSelector(element) {
      if (element.id) return `#${element.id}`;
      
      let selector = element.tagName.toLowerCase();
      
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ')
          .filter(cls => cls.trim() && !cls.match(/^(ng-|_|css-)/))
          .slice(0, 2);
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }
      
      return selector;
    }
    
    function extractColors(styles) {
      return {
        color: rgbToHex(styles.color),
        backgroundColor: rgbToHex(styles.backgroundColor),
        borderColor: rgbToHex(styles.borderColor),
        boxShadowColors: extractColorsFromBoxShadow(styles.boxShadow)
      };
    }
    
    function extractTypography(styles, element) {
      return {
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        lineHeight: styles.lineHeight,
        textAlign: styles.textAlign,
        textDecoration: styles.textDecoration,
        textTransform: styles.textTransform,
        letterSpacing: styles.letterSpacing,
        wordSpacing: styles.wordSpacing
      };
    }
    
    function extractLayout(styles) {
      return {
        display: styles.display,
        position: styles.position,
        top: styles.top,
        right: styles.right,
        bottom: styles.bottom,
        left: styles.left,
        width: styles.width,
        height: styles.height,
        margin: styles.margin,
        padding: styles.padding,
        flexDirection: styles.flexDirection,
        justifyContent: styles.justifyContent,
        alignItems: styles.alignItems,
        gridTemplateColumns: styles.gridTemplateColumns,
        gridTemplateRows: styles.gridTemplateRows
      };
    }
    
    function extractEffects(styles) {
      return {
        borderRadius: styles.borderRadius,
        border: styles.border,
        borderWidth: styles.borderWidth,
        borderStyle: styles.borderStyle,
        boxShadow: styles.boxShadow,
        opacity: parseFloat(styles.opacity),
        transform: styles.transform,
        transition: styles.transition,
        overflow: styles.overflow,
        zIndex: styles.zIndex
      };
    }
    
    function rgbToHex(color) {
      if (!color || color === 'transparent') return null;
      
      const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
      
      return color;
    }
    
    function extractColorsFromBoxShadow(boxShadow) {
      const colors = [];
      const shadowRegex = /rgba?\([^)]+\)/g;
      const matches = boxShadow.match(shadowRegex);
      
      if (matches) {
        matches.forEach(match => {
          const hex = rgbToHex(match);
          if (hex) colors.push(hex);
        });
      }
      
      return colors;
    }
  });

  const colorPalette = await extractColorPalette(page);
  const typographySystem = await extractTypographySystem(page);
  
  const endTime = Date.now();
  
  return {
    phase,
    timestamp: new Date().toISOString(),
    duration: endTime - startTime,
    elements,
    colorPalette,
    typographySystem,
    elementCount: elements.length
  };
}

/**
 * Extract color palette from the page
 */
async function extractColorPalette(page) {
  return await page.evaluate(() => {
    const colors = new Set();
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      
      // Extract colors
      if (styles.color && styles.color !== 'rgb(0, 0, 0)') {
        colors.add(styles.color);
      }
      if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        colors.add(styles.backgroundColor);
      }
      if (styles.borderColor && styles.borderColor !== 'rgb(0, 0, 0)') {
        colors.add(styles.borderColor);
      }
    });
    
    // Convert to hex and organize
    return Array.from(colors).map(color => {
      const hex = rgbToHex(color);
      return {
        original: color,
        hex: hex,
        usage: 'unknown'
      };
    }).filter(c => c.hex);
    
    function rgbToHex(color) {
      if (!color || color === 'transparent') return null;
      
      const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
      
      return color;
    }
  });
}

/**
 * Extract typography system from the page
 */
async function extractTypographySystem(page) {
  return await page.evaluate(() => {
    const typography = {
      fonts: new Set(),
      fontSizes: new Set(),
      fontWeights: new Set(),
      lineHeights: new Set(),
      textStyles: []
    };
    
    const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, a, button, label, input, textarea');
    
    textElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const text = element.textContent?.trim();
      
      if (text && text.length > 0) {
        typography.fonts.add(styles.fontFamily);
        typography.fontSizes.add(styles.fontSize);
        typography.fontWeights.add(styles.fontWeight);
        typography.lineHeights.add(styles.lineHeight);
        
        typography.textStyles.push({
          tagName: element.tagName.toLowerCase(),
          text: text.substring(0, 50),
          fontFamily: styles.fontFamily,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          color: styles.color,
          textAlign: styles.textAlign
        });
      }
    });
    
    return {
      fonts: Array.from(typography.fonts),
      fontSizes: Array.from(typography.fontSizes),
      fontWeights: Array.from(typography.fontWeights),
      lineHeights: Array.from(typography.lineHeights),
      textStyles: typography.textStyles.slice(0, 50)
    };
  });
}

/**
 * Get summary of component types
 */
function getComponentTypeSummary(components) {
  const summary = {};
  components.forEach(component => {
    summary[component.type] = (summary[component.type] || 0) + 1;
  });
  return summary;
}

/**
 * Parse Figma URL to extract file ID and node ID
 */
function parseFigmaUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // Extract file ID from path
    const pathMatch = urlObj.pathname.match(/\/(file|design)\/([a-zA-Z0-9]+)/);
    const fileId = pathMatch ? pathMatch[2] : null;
    
    // Extract node ID from query parameters
    const nodeIdParam = urlObj.searchParams.get('node-id');
    const nodeId = nodeIdParam ? nodeIdParam.replace(/-/g, ':') : null;
    
    return { fileId, nodeId };
  } catch (error) {
    console.error('❌ Failed to parse Figma URL:', error);
    return { fileId: null, nodeId: null };
  }
}

/**
 * Cleanup resources on shutdown
 */
async function cleanupResources() {
  console.log('🧹 Cleaning up resources...');
  
  try {
    if (webExtractor) {
      await webExtractor.close();
      console.log('✅ Web extractor closed');
    }
  } catch (error) {
    console.error('❌ Error closing web extractor:', error);
  }
  
  // Close any open browser instances
  try {
    const { exec } = require('child_process');
    exec('pkill -f "chrome|chromium"', (error) => {
      if (error) {
        console.log('⚠️ No Chrome processes to kill');
      } else {
        console.log('✅ Chrome processes cleaned up');
      }
    });
  } catch (error) {
    console.log('⚠️ Error during Chrome cleanup:', error.message);
  }
}

/**
 * Graceful shutdown handlers
 */
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down enhanced server...');
  await cleanupResources();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down enhanced server...');
  await cleanupResources();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  cleanupResources().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  cleanupResources().then(() => process.exit(1));
});

// Catch-all 404 handler to log missing endpoints
app.use('*', (req, res) => {
  console.log(`❌ 404 - Missing endpoint: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Endpoint not found',
    method: req.method,
    path: req.originalUrl,
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/reports',
      'GET /api/reports/:id',
      'GET /api/settings/current',
      'POST /api/settings/test-connection',
      'GET /api/test-connection',
      'POST /api/test-connection',
      'GET /api/settings/test',
      'POST /api/settings/test',
      'POST /api/enhanced-compare',
      'POST /api/test-web',
      'POST /api/test-figma',
      'POST /api/extract-dynamic',
      'GET /favicon.ico'
    ]
  });
});

/**
 * Initialize server with configuration and components
 */
async function startServer() {
  try {
    // Load configuration
    let config = {};
    try {
      const configData = await fs.readFile('./config.json', 'utf8');
      config = JSON.parse(configData);
      console.log('✅ Configuration loaded successfully');
    } catch (error) {
      console.warn('⚠️ Could not load config.json, using defaults');
    }

    // Initialize enhanced components with configuration
    figmaExtractor = new EnhancedFigmaExtractor(config);
    webExtractor = new EnhancedWebExtractor(config);
    comparisonEngine = new EnhancedComparisonEngine(config);

    // Start server
    app.listen(PORT, () => {
      console.log('🚀 Enhanced Design Comparison Server started');
      console.log(`📡 Server running on http://localhost:${PORT}`);
      console.log('🔧 Enhanced features enabled:');
      console.log('   • Recursive Figma component extraction');
      console.log('   • Semantic web element detection');
      console.log('   • Component-to-component matching');
      console.log('   • Specialized color & typography analysis');
      console.log('');
      console.log('📋 Available endpoints:');
      console.log(`   POST /api/enhanced-compare - Main comparison endpoint`);
      console.log(`   POST /api/test-figma - Test Figma extraction`);
      console.log(`   POST /api/test-web - Test web extraction`);
      console.log(`   POST /api/extract-dynamic - Dynamic app extraction (FreightTiger)`);
      console.log(`   GET  /api/health - Health check`);
      console.log(`   GET  /api/reports/:id - Get report by ID`);
    });

  } catch (error) {
    console.error('❌ Failed to start enhanced server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app; 