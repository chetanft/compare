import 'dotenv/config';
import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';

// Import lightweight modules (no Puppeteer dependencies)
// Note: We'll load these dynamically to avoid import issues in serverless environment
let RobustFigmaExtractor, ComparisonEngine, ReportGenerator, FigmaUrlParser, ComponentCategorizer, CategorizedReportGenerator;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Load configuration from environment variables
const config = {
  thresholds: {
    colorDifference: parseInt(process.env.COLOR_DIFFERENCE_THRESHOLD) || 10,
    sizeDifference: parseInt(process.env.SIZE_DIFFERENCE_THRESHOLD) || 5,
    spacingDifference: parseInt(process.env.SPACING_DIFFERENCE_THRESHOLD) || 3,
    fontSizeDifference: parseInt(process.env.FONT_SIZE_DIFFERENCE_THRESHOLD) || 2
  },
  figma: {
    accessToken: process.env.FIGMA_API_KEY || ""
  }
};

// Initialize services (lightweight version with dynamic imports)
let robustFigmaExtractor;
let comparisonEngine;
let reportGenerator;
let componentCategorizer;
let categorizedReportGenerator;
let servicesInitialized = false;

// Dynamic initialization function
async function initializeServices() {
  if (servicesInitialized) return;
  
  try {
    // Dynamic imports to avoid build-time dependency issues
    const modules = await Promise.all([
      import('../../src/figma/robustFigmaExtractor.js'),
      import('../../src/compare/comparisonEngine.js'),
      import('../../src/report/reportGenerator.js'),
      import('../../src/figma/urlParser.js'),
      import('../../src/analyze/componentCategorizer.js'),
      import('../../src/report/categorizedReportGenerator.js')
    ]);

    RobustFigmaExtractor = modules[0].default;
    ComparisonEngine = modules[1].default;
    ReportGenerator = modules[2].default;
    FigmaUrlParser = modules[3].default;
    ComponentCategorizer = modules[4].default;
    CategorizedReportGenerator = modules[5].default;

    robustFigmaExtractor = new RobustFigmaExtractor(config);
    comparisonEngine = new ComparisonEngine();
    reportGenerator = new ReportGenerator(config);
    componentCategorizer = new ComponentCategorizer();
    categorizedReportGenerator = new CategorizedReportGenerator();
    
    servicesInitialized = true;
    console.log('✅ Lightweight services initialized for Netlify Functions');
  } catch (error) {
    console.error('❌ Error initializing services:', error);
    throw error;
  }
}

// Helper function to extract Figma data
async function extractFigmaData(fileId, nodeId = null) {
  await initializeServices();
  
  if (!robustFigmaExtractor) {
    throw new Error('Figma extractor not initialized');
  }
  
  const result = await robustFigmaExtractor.getFigmaData(fileId, nodeId);
  return {
    fileId: fileId,
    nodeId: nodeId,
    components: result.components,
    metadata: result.metadata,
    extractionMethod: 'Robust Figma Extractor',
    extractedAt: result.metadata.extractedAt,
    ...result
  };
}

// API Routes
app.get('/api/health', async (req, res) => {
  try {
    await initializeServices();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: 'netlify-functions-lightweight',
      services: {
        figmaExtractor: !!robustFigmaExtractor,
        webExtractor: false, // Disabled in lightweight version
        comparisonEngine: !!comparisonEngine
      },
      note: 'This is the lightweight version without web scraping capabilities'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Failed to initialize services',
      details: error.message
    });
  }
});

app.post('/api/figma/extract', async (req, res) => {
  try {
    const { url, fileId, nodeId } = req.body;
    
    let extractFileId = fileId;
    let extractNodeId = nodeId;
    
    if (url && !fileId) {
      const figmaData = FigmaUrlParser.parseUrl(url);
      extractFileId = figmaData.fileId;
      extractNodeId = figmaData.nodeId;
    }
    
    if (!extractFileId) {
      return res.status(400).json({ 
        error: 'Missing fileId or valid Figma URL' 
      });
    }

    const result = await extractFigmaData(extractFileId, extractNodeId);
    
    res.json({
      success: true,
      data: result,
      metadata: {
        components: result.components?.length || 0,
        extractionMethod: result.extractionMethod
      }
    });

  } catch (error) {
    console.error('❌ Figma extraction failed:', error);
    res.status(500).json({ 
      error: 'Figma extraction failed', 
      details: error.message 
    });
  }
});

app.post('/api/compare/figma-only', async (req, res) => {
  try {
    await initializeServices();
    
    const { figmaUrl, webData } = req.body;
    
    if (!figmaUrl || !webData) {
      return res.status(400).json({ 
        error: 'Missing required parameters: figmaUrl and webData' 
      });
    }

    // Parse Figma URL
    const figmaData = FigmaUrlParser.parseUrl(figmaUrl);
    if (!figmaData.fileId) {
      return res.status(400).json({ 
        error: 'Invalid Figma URL format' 
      });
    }

    // Extract Figma data
    console.log('🎯 Extracting Figma data...');
    const figmaComponents = await extractFigmaData(figmaData.fileId, figmaData.nodeId);

    // Compare with provided web data
    console.log('🔄 Comparing components...');
    const comparison = comparisonEngine.compare(figmaComponents, webData);

    // Categorize components
    console.log('📊 Categorizing components...');
    const categorizedComponents = componentCategorizer.categorize(comparison.components);

    // Generate report
    console.log('📋 Generating report...');
    const report = await categorizedReportGenerator.generateReport({
      ...comparison,
      components: categorizedComponents,
      metadata: {
        figmaUrl,
        webData: 'provided',
        extractedAt: new Date().toISOString(),
        extractionMethod: 'Robust Figma Extractor',
        environment: 'netlify-functions-lightweight'
      }
    });

    res.json({
      success: true,
      report,
      metadata: {
        figmaComponents: figmaComponents.components?.length || 0,
        webComponents: webData.components?.length || 0,
        comparisons: comparison.components?.length || 0,
        categorizedComponents: categorizedComponents?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Comparison failed:', error);
    res.status(500).json({ 
      error: 'Comparison failed', 
      details: error.message 
    });
  }
});

app.post('/api/figma/download-images', async (req, res) => {
  try {
    await initializeServices();
    
    const { fileId, nodes } = req.body;
    
    if (!fileId || !nodes || !Array.isArray(nodes)) {
      return res.status(400).json({ 
        error: 'Missing required parameters: fileId and nodes array' 
      });
    }

    if (!robustFigmaExtractor) {
      throw new Error('Figma extractor not initialized');
    }

    // Use the robust extractor's download capabilities
    const result = await robustFigmaExtractor.downloadFigmaImages(fileId, nodes, '/tmp');
    
    res.json({
      success: true,
      data: result,
      metadata: {
        downloadedImages: result.downloadedImages?.length || 0,
        totalSize: result.totalSize || 0
      }
    });

  } catch (error) {
    console.error('❌ Image download failed:', error);
    res.status(500).json({ 
      error: 'Image download failed', 
      details: error.message 
    });
  }
});

// Info endpoint about limitations
app.get('/api/info', (req, res) => {
  res.json({
    version: 'lightweight',
    capabilities: {
      figmaExtraction: true,
      webScraping: false,
      imageDownload: true,
      comparison: true,
      reporting: true
    },
    limitations: [
      'Web scraping disabled (no Puppeteer)',
      'Use external service for web data extraction',
      'Image downloads saved to temporary storage only'
    ],
    endpoints: [
      'GET /api/health',
      'GET /api/info',
      'POST /api/figma/extract',
      'POST /api/figma/download-images',
      'POST /api/compare/figma-only'
    ],
    recommendation: 'For full web scraping, use a dedicated service or VPS deployment'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/info',
      'POST /api/figma/extract',
      'POST /api/figma/download-images',
      'POST /api/compare/figma-only'
    ]
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: error.message
  });
});

// Export handler for Netlify Functions
export const handler = serverless(app); 