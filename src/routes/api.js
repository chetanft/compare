import express from 'express';
import { FigmaExtractor } from '../services/extractors/figma/FigmaExtractor';
import { WebExtractor } from '../services/extractors/web/WebExtractor';
import { ComparisonEngine } from '../services/comparison/ComparisonEngine';
import { ExtractorError } from '../services/extractors/base/BaseExtractor';
import { ComparisonError } from '../services/comparison/ComparisonEngine';
import path from 'path';
import fs from 'fs';
import { config } from '../config/environment.js';
import FigmaMCPIntegration from '../figma/mcpIntegration.js';

const router = express.Router();

// Initialize extractors and comparison engine
const figmaExtractor = new FigmaExtractor();
const webExtractor = new WebExtractor();
const comparisonEngine = new ComparisonEngine();

// Extract Figma data
router.get('/figma/extract', async (req, res) => {
  try {
    const { figmaUrl } = req.query;
    
    if (!figmaUrl || typeof figmaUrl !== 'string') {
      throw new ExtractorError('INVALID_FIGMA_URL');
    }

    await figmaExtractor.initialize({ 
      figmaUrl,
      validateBeforeExtract: true 
    });
    
    const data = await figmaExtractor.extract();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Figma extraction error:', error);
    
    if (error instanceof ExtractorError) {
      const statusCode = error.code === 'DETACHED_FRAME' ? 422 : 400;
      res.status(statusCode).json({ 
        success: false, 
        error: error.code,
        message: error.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  } finally {
    await figmaExtractor.cleanup();
  }
});

// Extract Web data
router.get('/web/extract', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      throw new ExtractorError('INVALID_URL');
    }

    await webExtractor.initialize({ 
      targetUrl: url,
      validateBeforeExtract: true 
    });
    
    const data = await webExtractor.extract();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Web extraction error:', error);
    
    if (error instanceof ExtractorError) {
      res.status(400).json({ 
        success: false, 
        error: error.code,
        message: error.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  } finally {
    await webExtractor.cleanup();
  }
});

// Compare data
router.post('/compare', async (req, res) => {
  try {
    const { figmaUrl, webUrl, includeVisual = false } = req.body;
    
    if (!figmaUrl || !webUrl) {
      throw new ComparisonError('MISSING_URLS');
    }

    // Extract both in parallel
    const [figmaData, webData] = await Promise.all([
      (async () => {
        await figmaExtractor.initialize({ figmaUrl, validateBeforeExtract: true });
        return figmaExtractor.extract();
      })(),
      (async () => {
        await webExtractor.initialize({ targetUrl: webUrl, validateBeforeExtract: true });
        return webExtractor.extract();
      })()
    ]);

    const result = await comparisonEngine.compare(figmaData, webData, { includeVisual });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Comparison error:', error);
    
    if (error instanceof ExtractorError) {
      res.status(400).json({ 
        success: false, 
        error: error.code,
        message: error.message,
        details: error.originalError?.message
      });
    } else if (error instanceof ComparisonError) {
      res.status(400).json({ 
        success: false, 
        error: error.code,
        message: error.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  } finally {
    await Promise.all([
      figmaExtractor.cleanup(),
      webExtractor.cleanup()
    ]);
  }
});

// Get extractor status
router.get('/status/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let status;

    switch (type) {
      case 'figma':
        status = await figmaExtractor.getStatus();
        break;
      case 'web':
        status = await webExtractor.getStatus();
        break;
      default:
        throw new Error('INVALID_EXTRACTOR_TYPE');
    }

    res.json({ success: true, status });
  } catch (error) {
    console.error('Status check error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: 'STATUS_CHECK_FAILED',
      message: error instanceof Error ? error.message : 'Status check failed' 
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  const serverInfo = {
    figmaExtractor: 'initialized',
    webExtractor: 'initialized',
    comparisonService: 'initialized'
  };

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    serverInfo
  });
});

// MCP status endpoint
router.get('/mcp/status', async (req, res) => {
  try {
    const mcpIntegration = new FigmaMCPIntegration(config);
    await mcpIntegration.initialize();
    
    const status = {
      officialMCP: mcpIntegration.isOfficialMCPAvailable(),
      thirdPartyMCP: mcpIntegration.isThirdPartyMCPAvailable(),
      figmaAPI: mcpIntegration.isFigmaAPIAvailable(),
      activeMethod: mcpIntegration.getMCPType() || 'none'
    };
    
    res.json(status);
  } catch (error) {
    console.error('Error getting MCP status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      officialMCP: false,
      thirdPartyMCP: false,
      figmaAPI: false,
      activeMethod: 'none',
      error: errorMessage
    });
  }
});

// MCP test endpoint
router.post('/figma/test', async (req, res) => {
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

export default router; 