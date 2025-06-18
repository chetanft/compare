import 'dotenv/config';
import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';

// Import our core modules
import RobustFigmaExtractor from '../../src/figma/robustFigmaExtractor.js';
import { WebExtractor } from '../../src/scraper/webExtractor.js';
import EnhancedWebExtractor from '../../src/scraper/enhancedWebExtractor.js';
import ComparisonEngine from '../../src/compare/comparisonEngine.js';
import ReportGenerator from '../../src/report/reportGenerator.js';
import FigmaUrlParser from '../../src/figma/urlParser.js';
import ComponentCategorizer from '../../src/analyze/componentCategorizer.js';
import CategorizedReportGenerator from '../../src/report/categorizedReportGenerator.js';

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
  },
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
};

// Initialize services
let robustFigmaExtractor;
let webExtractor;
let comparisonEngine;
let reportGenerator;
let componentCategorizer;
let categorizedReportGenerator;

// Initialize services with error handling
try {
  robustFigmaExtractor = new RobustFigmaExtractor(config);
  webExtractor = new EnhancedWebExtractor(config.puppeteer);
  comparisonEngine = new ComparisonEngine();
  reportGenerator = new ReportGenerator(config);
  componentCategorizer = new ComponentCategorizer();
  categorizedReportGenerator = new CategorizedReportGenerator();
  console.log('✅ Services initialized for Netlify Functions');
} catch (error) {
  console.error('❌ Error initializing services:', error);
}

// Helper function to extract Figma data
async function extractFigmaData(fileId, nodeId = null) {
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

// Helper function to extract web data
async function extractWebData(url, authentication = null) {
  if (!webExtractor) {
    throw new Error('Web extractor not initialized');
  }
  
  // For serverless, we'll use a simpler approach
  return await webExtractor.extractPageStructure(url, authentication);
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'netlify-functions',
    services: {
      figmaExtractor: !!robustFigmaExtractor,
      webExtractor: !!webExtractor,
      comparisonEngine: !!comparisonEngine
    }
  });
});

app.post('/api/compare', async (req, res) => {
  try {
    const { figmaUrl, webUrl, authentication } = req.body;
    
    if (!figmaUrl || !webUrl) {
      return res.status(400).json({ 
        error: 'Missing required parameters: figmaUrl and webUrl' 
      });
    }

    // Parse Figma URL
    const figmaData = FigmaUrlParser.parseUrl(figmaUrl);
    if (!figmaData.fileId) {
      return res.status(400).json({ 
        error: 'Invalid Figma URL format' 
      });
    }

    // Extract data from both sources
    console.log('🎯 Extracting Figma data...');
    const figmaComponents = await extractFigmaData(figmaData.fileId, figmaData.nodeId);
    
    console.log('🌐 Extracting web data...');
    const webComponents = await extractWebData(webUrl, authentication);

    // Compare the data
    console.log('🔄 Comparing components...');
    const comparison = comparisonEngine.compare(figmaComponents, webComponents);

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
        webUrl,
        extractedAt: new Date().toISOString(),
        extractionMethod: 'Robust Figma Extractor',
        environment: 'netlify-functions'
      }
    });

    res.json({
      success: true,
      report,
      metadata: {
        figmaComponents: figmaComponents.components?.length || 0,
        webComponents: webComponents.components?.length || 0,
        comparisons: comparison.components?.length || 0,
        categorizedComponents: categorizedComponents?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Comparison failed:', error);
    res.status(500).json({ 
      error: 'Comparison failed', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

app.post('/api/web/extract', async (req, res) => {
  try {
    const { url, authentication } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'Missing required parameter: url' 
      });
    }

    const result = await extractWebData(url, authentication);
    
    res.json({
      success: true,
      data: result,
      metadata: {
        components: result.components?.length || 0,
        extractionMethod: 'Enhanced Web Extractor'
      }
    });

  } catch (error) {
    console.error('❌ Web extraction failed:', error);
    res.status(500).json({ 
      error: 'Web extraction failed', 
      details: error.message 
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /api/health',
      'POST /api/compare',
      'POST /api/figma/extract',
      'POST /api/web/extract'
    ]
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// Export handler for Netlify Functions
export const handler = serverless(app); 