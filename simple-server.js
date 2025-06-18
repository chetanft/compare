#!/usr/bin/env node

/**
 * SIMPLIFIED DESIGN UAT SERVER
 * Single file, fixed port, minimal complexity
 * No more port issues, no more API errors!
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import http from 'http';
import { Server } from 'socket.io';

// Simple imports - only what we need
import RobustFigmaExtractor from './src/figma/robustFigmaExtractor.js';
import { EnhancedWebExtractor } from './src/scraper/enhancedWebExtractor.js';
import ComparisonEngine from './src/compare/comparisonEngine.js';
import ReportGenerator from './src/report/reportGenerator.js';
import { ComponentCategorizer } from './src/analyze/componentCategorizer.js';
import { FigmaUrlParser } from './src/figma/urlParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// FIXED CONFIGURATION - No more complexity!
const PORT = 3006;
const CONFIG = {
  figma: {
    accessToken: process.env.FIGMA_API_KEY || ''
  },
  puppeteer: {
    headless: true,
    timeout: 30000
  }
};

// Simple Express app with Socket.IO
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

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

// Serve modern frontend
app.use(express.static(path.join(__dirname, 'public/modern')));

// Simple component initialization
let figmaExtractor, webExtractor, comparisonEngine, reportGenerator, componentCategorizer;
let initialized = false;

async function initializeOnce() {
  if (initialized) return;
  
  console.log('🔧 Initializing components...');
  
  try {
    figmaExtractor = new RobustFigmaExtractor(CONFIG);
    webExtractor = new EnhancedWebExtractor(CONFIG.puppeteer);
    comparisonEngine = new ComparisonEngine();
    reportGenerator = new ReportGenerator(CONFIG);
    componentCategorizer = new ComponentCategorizer();
    
    // Only web extractor needs initialization
    await webExtractor.initialize();
    
    initialized = true;
    console.log('✅ All components ready');
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    throw error;
  }
}

// API ROUTES - Simple and consistent

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    components: {
      figmaExtractor: !!figmaExtractor,
      webExtractor: !!webExtractor,
      comparisonEngine: !!comparisonEngine,
      reportGenerator: !!reportGenerator,
      componentCategorizer: !!componentCategorizer
    }
  });
});

// Get Figma data for a comparison
app.get('/api/comparison/:id/figma-data', async (req, res) => {
  try {
    const comparisonId = req.params.id;
    
    // First try to get from active comparisons
    const comparison = global.activeComparisons?.[comparisonId];
    if (comparison?.figmaData) {
      return res.json({
        success: true,
        data: comparison.figmaData
      });
    }
    
    // If not found in active comparisons, try to load from JSON report
    try {
      const jsonPath = path.join(__dirname, 'output', 'reports', `${comparisonId}.json`);
      const jsonContent = await fs.readFile(jsonPath, 'utf8');
      const reportData = JSON.parse(jsonContent);
      
      if (reportData.figmaData) {
        return res.json({
          success: true,
          data: reportData.figmaData
        });
      }
    } catch (fileError) {
      // JSON file doesn't exist or invalid, continue with error response
    }
    
    return res.status(404).json({
      success: false,
      error: 'Comparison not found or no Figma data available'
    });
  } catch (error) {
    console.error('❌ Error getting Figma data:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Web data for a comparison
app.get('/api/comparison/:id/web-data', async (req, res) => {
  try {
    const comparisonId = req.params.id;
    
    // First try to get from active comparisons
    const comparison = global.activeComparisons?.[comparisonId];
    if (comparison?.webData) {
      return res.json({
        success: true,
        data: comparison.webData
      });
    }
    
    // If not found in active comparisons, try to load from JSON report
    try {
      const jsonPath = path.join(__dirname, 'output', 'reports', `${comparisonId}.json`);
      const jsonContent = await fs.readFile(jsonPath, 'utf8');
      const reportData = JSON.parse(jsonContent);
      
      if (reportData.webData) {
        return res.json({
          success: true,
          data: reportData.webData
        });
      }
    } catch (fileError) {
      // JSON file doesn't exist or invalid, continue with error response
    }
    
    return res.status(404).json({
      success: false,
      error: 'Comparison not found or no Web data available'
    });
  } catch (error) {
    console.error('❌ Error getting Web data:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// MAIN COMPARISON ENDPOINT - Fixed method names with progress updates!
app.post('/api/compare', async (req, res) => {
  try {
    const { figmaUrl, webUrl, authentication } = req.body;
    
    if (!figmaUrl || !webUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing figmaUrl or webUrl'
      });
    }
    
    // Ensure components are ready
    await initializeOnce();
    
    // Generate unique comparison ID
    const comparisonId = `comparison-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🔄 Comparing: ${figmaUrl} vs ${webUrl} [${comparisonId}]`);
    
    // Store progress for polling and emit via Socket.IO
    const progressData = {
      id: comparisonId,
      status: 'running',
      progress: 0,
      stage: 'initialization',
      message: 'Starting comparison...',
      timestamp: new Date().toISOString()
    };
    
    // Store in memory for potential polling fallback
    global.activeComparisons = global.activeComparisons || {};
    global.activeComparisons[comparisonId] = progressData;
    
    // Return immediately with comparison ID so frontend can start polling/listening
    res.json({
      success: true,
      comparisonId,
      status: 'started',
      message: 'Comparison started. Use the comparisonId to track progress.',
      pollUrl: `/api/comparison/${comparisonId}/progress`
    });
    
    // Continue with comparison asynchronously
    console.log('🚀 Starting comparison asynchronously...');
    
    const emitProgress = (stage, progress, message, status = 'running') => {
      progressData.status = status;
      progressData.progress = progress;
      progressData.stage = stage;
      progressData.message = message;
      progressData.timestamp = new Date().toISOString();
      progressData.details = {
        currentStep: stage,
        totalSteps: 5,
      };
      
      console.log(`📡 Emitting progress: ${stage} (${progress}%) - ${message}`);
      console.log(`🔌 Connected clients: ${io.engine.clientsCount}`);
      
      // Update stored progress
      global.activeComparisons[comparisonId] = { ...progressData };
      
      // Emit to ALL connected clients (simplified approach)
      io.emit('comparison-progress', progressData);
      
      // Also try emitting to specific room
      io.to(comparisonId).emit('comparison-progress', progressData);
    };
    
    // Start progress tracking
    emitProgress('initialization', 10, 'Starting comparison...', 'running');
    
    // Extract Figma data
    console.log('🎨 Extracting Figma...');
    emitProgress('figma', 20, 'Extracting Figma design data...');
    
    // Parse the Figma URL to extract file key and node ID
    let fileKey, nodeId;
    try {
      const parsedUrl = FigmaUrlParser.parseUrl(figmaUrl);
      fileKey = parsedUrl.fileId;
      nodeId = parsedUrl.nodeId;
      console.log(`📋 Parsed Figma URL - File: ${fileKey}, Node: ${nodeId || 'none'}`);
    } catch (parseError) {
      throw new Error(`Invalid Figma URL: ${parseError.message}`);
    }
    
    const figmaData = await figmaExtractor.getFigmaData(fileKey, nodeId);
    emitProgress('figma', 50, `Extracted ${figmaData.components?.length || 0} Figma components`);
    
    // Store Figma data in comparison
    global.activeComparisons[comparisonId].figmaData = figmaData;
    
    // Extract web data - CONSISTENT METHOD NAME
    console.log('🌐 Extracting web...');
    emitProgress('web', 60, 'Extracting web page elements...');
    const webData = await webExtractor.extractWebData(webUrl, authentication);
    emitProgress('web', 80, `Extracted ${webData.elements?.length || 0} web elements`);
    
    // Store Web data in comparison
    global.activeComparisons[comparisonId].webData = webData;
    
    // Compare
    console.log('🔍 Comparing...');
    emitProgress('comparison', 85, 'Analyzing differences...');
    const comparison = await comparisonEngine.compareDesigns(figmaData, webData);
    emitProgress('comparison', 90, `Found ${comparison.matches?.length || 0} matches and ${comparison.deviations?.length || 0} deviations`);
    
    // Categorize components for modern UI
    console.log('🗂️ Categorizing components...');
    emitProgress('categorization', 92, 'Organizing components by design system...');
    const categorizedData = componentCategorizer.categorizeComponents(figmaData, webData);
    
    // Generate reports with categorized data
    console.log('📊 Generating reports...');
    emitProgress('reports', 95, 'Generating comparison reports...');
    const htmlReport = await reportGenerator.generateReport(comparison, null, {
      filename: `comparison-${Date.now()}.html`,
      figmaData: figmaData,
      webData: webData
    }, categorizedData);
    
    const jsonReport = await reportGenerator.generateJSONReport(comparison, null, {
      filename: `comparison-${Date.now()}.json`,
      figmaData: figmaData,
      webData: webData
    });
    
    emitProgress('complete', 100, 'Comparison completed successfully!', 'completed');
    
    const result = {
      success: true,
      comparisonId,
      summary: {
        figma: {
          componentsExtracted: figmaData.components?.length || 0
        },
        web: {
          elementsExtracted: webData.elements?.length || 0
        },
        comparison: {
          matches: comparison.matches?.length || 0,
          deviations: comparison.deviations?.length || 0
        }
      },
      reports: {
        html: htmlReport,
        json: jsonReport
      }
    };
    
    // Emit completion event
    io.to(comparisonId).emit('comparison-complete', result);
    io.emit('comparison-complete', result); // Fallback
    
    // Clean up stored progress after a delay
    setTimeout(() => {
      if (global.activeComparisons?.[comparisonId]) {
        delete global.activeComparisons[comparisonId];
      }
    }, 60000); // Clean up after 1 minute
    
  } catch (error) {
    console.error('❌ Comparison failed:', error);
    
    const errorResult = {
      success: false,
      error: 'Comparison failed',
      details: error.message
    };
    
    // Update stored progress with error (only if comparisonId exists)
    if (typeof comparisonId !== 'undefined' && global.activeComparisons?.[comparisonId]) {
      global.activeComparisons[comparisonId] = {
        ...global.activeComparisons[comparisonId],
        status: 'error',
        message: error.message
      };
      
      // Emit error event only if comparisonId is defined
      io.to(comparisonId).emit('comparison-error', errorResult);
    }
    
    io.emit('comparison-error', errorResult); // Fallback for all clients
  }
});

// Progress polling endpoint (fallback if Socket.IO fails)
app.get('/api/comparison/:id/progress', (req, res) => {
  const comparisonId = req.params.id;
  const progress = global.activeComparisons?.[comparisonId];
  
  if (progress) {
    res.json(progress);
  } else {
    res.status(404).json({ error: 'Comparison not found' });
  }
});

// Reports
app.get('/api/reports', async (req, res) => {
  try {
    const reportsPath = path.join(__dirname, 'output', 'reports');
    const files = await fs.readdir(reportsPath).catch(() => []);
    
    // Group files by comparison ID and extract metadata
    const reportGroups = new Map();
    
    files
      .filter(file => file.endsWith('.html') || file.endsWith('.json'))
      .forEach(file => {
        // Extract comparison ID and timestamp from filename: comparison-1749439164306.html
        const match = file.match(/comparison-(\d+)\.(html|json)$/);
        if (match) {
          const timestamp = parseInt(match[1]);
          const type = match[2];
          const comparisonId = `comparison-${timestamp}`;
          
          if (!reportGroups.has(comparisonId)) {
            reportGroups.set(comparisonId, {
              id: comparisonId,
              name: `Report ${comparisonId}`,
              createdAt: new Date(timestamp).toISOString(),
              status: 'success',
              htmlPath: null,
              jsonPath: null,
              summary: {
                figma: { componentsExtracted: 0 },
                web: { elementsExtracted: 0 },
                comparison: { totalMatches: 0 }
              }
            });
          }
          
          const report = reportGroups.get(comparisonId);
          if (type === 'html') {
            report.htmlPath = `/output/reports/${file}`;
          } else if (type === 'json') {
            report.jsonPath = `/output/reports/${file}`;
          }
        }
      });
    
    // Convert to array and sort by creation date (newest first)
    const reports = Array.from(reportGroups.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json({ reports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve output files
app.use('/output', express.static(path.join(__dirname, 'output')));

// SPA routing - serve frontend for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/output/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.sendFile(path.join(__dirname, 'public/modern/index.html'));
});

// Socket.IO connection handling with room management
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
  
  // Handle comparison room joining
  socket.on('join-comparison', (comparisonId) => {
    socket.join(comparisonId);
    console.log(`🔗 Client ${socket.id} joined comparison ${comparisonId}`);
  });
  
  socket.on('leave-comparison', (comparisonId) => {
    socket.leave(comparisonId);
    console.log(`🔗 Client ${socket.id} left comparison ${comparisonId}`);
  });
  
  // Handle comparison progress updates
  socket.on('start-comparison', (data) => {
    console.log('🔄 Comparison started for:', data);
    socket.emit('comparison-status', { status: 'started', message: 'Comparison initiated' });
  });
});

// START SERVER - Simple and fixed!
async function startServer() {
  try {
    server.listen(PORT, () => {
      console.log(`🚀 Design UAT Tool running at http://localhost:${PORT}`);
      console.log(`📱 Frontend: http://localhost:${PORT}`);
      console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
      console.log(`🔌 Socket.IO: Enabled for real-time updates`);
      console.log(`✅ Simple architecture - no more port issues!`);
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      if (webExtractor?.close) await webExtractor.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  }
}

// Start immediately
startServer(); 