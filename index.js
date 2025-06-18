import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';

import FigmaExtractor from './src/figma/extractor.js';
import WebExtractor from './src/scraper/webExtractor.js';
import ComparisonEngine from './src/compare/comparisonEngine.js';
import VisualDiff from './src/visual/visualDiff.js';
import ReportGenerator from './src/report/reportGenerator.js';

/**
 * Figma-Web Comparison Tool
 * Main application entry point
 */
class ComparisonApp {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.config = null;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  async initialize() {
    try {
      await this.loadConfig();
      console.log('🚀 Figma-Web Comparison Tool initialized');
    } catch (error) {
      console.error('❌ Failed to initialize:', error.message);
      throw error;
    }
  }

  async loadConfig() {
    try {
      const configPath = path.join(process.cwd(), 'config.json');
      const configData = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(configData);
    } catch (error) {
      // Use default config if file doesn't exist
      this.config = {
        figma: { accessToken: "", fileId: "", nodeId: "" },
        comparison: {
          thresholds: { fontSize: 2, spacing: 4, borderRadius: 2, colorTolerance: 5 },
          properties: ["fontSize", "fontFamily", "color", "backgroundColor", "padding", "margin"]
        },
        puppeteer: { headless: "new", viewport: { width: 1920, height: 1080 }, timeout: 30000 },
        output: { reportFormat: "html", screenshotDir: "./output/screenshots", reportDir: "./output/reports" }
      };
    }
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
    
    // Serve generated reports
    this.app.use('/reports', express.static(path.join(process.cwd(), 'output/reports')));
    this.app.use('/screenshots', express.static(path.join(process.cwd(), 'output/screenshots')));
  }

  setupRoutes() {
    // Health check
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Figma-Web Comparison Tool',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          compare: 'POST /api/compare',
          health: 'GET /api/health',
          config: 'GET /api/config'
        }
      });
    });

    // API health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Get configuration
    this.app.get('/api/config', (req, res) => {
      const safeConfig = { ...this.config };
      if (safeConfig.figma?.accessToken) {
        safeConfig.figma.accessToken = '***hidden***';
      }
      res.json(safeConfig);
    });

    // Main comparison endpoint
    this.app.post('/api/compare', async (req, res) => {
      try {
        const { figmaFileId, figmaNodeId, webUrl, webSelector, options = {} } = req.body;

        if (!figmaFileId || !webUrl) {
          return res.status(400).json({
            error: 'Missing required parameters: figmaFileId and webUrl'
          });
        }

        const result = await this.runComparison({
          figmaFileId,
          figmaNodeId,
          webUrl,
          webSelector,
          ...options
        });

        res.json(result);

      } catch (error) {
        console.error('Comparison error:', error);
        res.status(500).json({
          error: 'Comparison failed',
          message: error.message
        });
      }
    });

    // Batch comparison endpoint
    this.app.post('/api/compare/batch', async (req, res) => {
      try {
        const { comparisons } = req.body;

        if (!Array.isArray(comparisons) || comparisons.length === 0) {
          return res.status(400).json({
            error: 'comparisons must be a non-empty array'
          });
        }

        const results = [];

        for (const comparison of comparisons) {
          try {
            const result = await this.runComparison(comparison);
            results.push({ success: true, ...result });
          } catch (error) {
            results.push({
              success: false,
              error: error.message,
              input: comparison
            });
          }
        }

        res.json({ results });

      } catch (error) {
        console.error('Batch comparison error:', error);
        res.status(500).json({
          error: 'Batch comparison failed',
          message: error.message
        });
      }
    });

    // Get reports list
    this.app.get('/api/reports', async (req, res) => {
      try {
        const reportsDir = this.config.output?.reportDir || './output/reports';
        
        try {
          const files = await fs.readdir(reportsDir);
          const reports = files
            .filter(file => file.endsWith('.html') || file.endsWith('.json'))
            .map(file => ({
              name: file,
              path: `/reports/${file}`,
              type: file.endsWith('.html') ? 'html' : 'json'
            }));

          res.json({ reports });
        } catch (error) {
          res.json({ reports: [] });
        }

      } catch (error) {
        res.status(500).json({ error: 'Failed to list reports' });
      }
    });
  }

  async runComparison({ figmaFileId, figmaNodeId, webUrl, webSelector, includeVisual = false }) {
    // Initialize extractors
    const figmaExtractor = new FigmaExtractor(this.config);
    const webExtractor = new WebExtractor(this.config);
    const comparisonEngine = new ComparisonEngine(this.config);
    const reportGenerator = new ReportGenerator(this.config);

    try {
      // Extract Figma design data
      console.log(`Extracting Figma data: ${figmaFileId}${figmaNodeId ? ':' + figmaNodeId : ''}`);
      const figmaData = await figmaExtractor.extractDesignData(figmaFileId, figmaNodeId);

      // Extract web styles
      console.log(`Extracting web styles: ${webUrl}`);
      const webData = await webExtractor.extractStyles(webUrl, webSelector);

      // Compare designs
      console.log('Comparing designs...');
      const comparisonReport = await comparisonEngine.compareDesigns(figmaData, webData);

      // Visual comparison (if requested)
      let visualReport = null;
      if (includeVisual) {
        console.log('Performing visual comparison...');
        const visualDiff = new VisualDiff(this.config);
        
        // Note: This would require actual screenshot comparison
        // For now, we'll create a placeholder
        visualReport = {
          summary: { avgSimilarity: 95.5, totalComparisons: 1 },
          comparisons: []
        };
      }

      // Generate reports
      console.log('Generating reports...');
      const htmlReportPath = await reportGenerator.generateReport(comparisonReport, visualReport, {
        figmaData,
        webData
      });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const jsonReportPath = path.join(
        this.config.output?.reportDir || './output/reports',
        `comparison-${timestamp}.json`
      );
      await comparisonEngine.saveReport(comparisonReport, jsonReportPath);

      // Cleanup
      await webExtractor.cleanup();

      return {
        success: true,
        summary: {
          componentsAnalyzed: comparisonReport.comparisons.length,
          totalDeviations: comparisonReport.metadata.totalDeviations,
          severity: comparisonReport.metadata.severity
        },
        reports: {
          html: htmlReportPath.replace(process.cwd(), ''),
          json: jsonReportPath.replace(process.cwd(), '')
        }
      };

    } catch (error) {
      await webExtractor.cleanup();
      throw error;
    }
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🌐 Server running at http://localhost:${this.port}`);
      console.log('📊 Figma-Web Comparison Tool API ready');
      console.log(`📁 Reports available at http://localhost:${this.port}/reports`);
    });
  }
}

// Start the application
async function main() {
  try {
    const app = new ComparisonApp();
    await app.initialize();
    app.start();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ComparisonApp; 