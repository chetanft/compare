/**
 * MCP API Routes
 * Exposes Figma MCP functionality via REST API
 */

import express from 'express';
import FigmaMCPClient from '../figma/mcpClient.js';

const router = express.Router();

// MCP client is initialized per request for better reliability

/**
 * GET /api/mcp/status
 * Get MCP connection status
 */
router.get('/status', async (req, res) => {
  try {
    const mcpClient = new FigmaMCPClient();
    
    // Test connection to get current status
    const isConnected = await mcpClient.connect();
    
    res.json({
      success: true,
      status: isConnected ? 'connected' : 'disconnected',
      available: isConnected,
      message: isConnected 
        ? 'Figma Dev Mode MCP Server connected successfully'
        : 'Figma Dev Mode MCP Server not available',
      data: {
        connected: isConnected,
        serverUrl: 'http://127.0.0.1:3845/mcp',
        tools: isConnected ? ['get_code', 'get_metadata', 'get_variable_defs'] : [],
        toolsCount: isConnected ? 3 : 0
      }
    });
  } catch (error) {
    console.error('❌ MCP status error:', error);
    res.json({
      success: false,
      status: 'error',
      available: false,
      message: `MCP connection failed: ${error.message}`,
      error: error.message
    });
  }
});

/**
 * POST /api/mcp/figma/file
 * Get Figma file data
 */
router.post('/figma/file', async (req, res) => {
  try {
    const { fileId, nodeId } = req.body;
    
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'fileId is required'
      });
    }
    
    const mcpClient = new FigmaMCPClient();
    await mcpClient.connect();
    const data = await mcpClient.getFigmaFile(fileId, nodeId);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Figma file error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/mcp/figma/export
 * Export Figma assets
 */
router.post('/figma/export', async (req, res) => {
  try {
    const { fileId, nodeIds, format = 'png', scale = 2 } = req.body;
    
    if (!fileId || !nodeIds || !Array.isArray(nodeIds)) {
      return res.status(400).json({
        success: false,
        error: 'fileId and nodeIds array are required'
      });
    }
    
    const mcpClient = new FigmaMCPClient();
    await mcpClient.connect();
    const data = await mcpClient.exportAssets(fileId, nodeIds, format, scale);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Figma export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/mcp/figma/analyze
 * Analyze Figma components
 */
router.post('/figma/analyze', async (req, res) => {
  try {
    const { fileId } = req.body;
    
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'fileId is required'
      });
    }
    
    const mcpClient = new FigmaMCPClient();
    await mcpClient.connect();
    const data = await mcpClient.analyzeComponents(fileId);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Figma analyze error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/mcp/figma/compare
 * Compare Figma design with web implementation using MCP
 */
router.post('/figma/compare', async (req, res) => {
  try {
    const { fileId, nodeId, webUrl } = req.body;
    
    if (!fileId || !webUrl) {
      return res.status(400).json({
        success: false,
        error: 'fileId and webUrl are required'
      });
    }
    
    const mcpClient = new FigmaMCPClient();
    await mcpClient.connect();
    
    // Get Figma data via MCP
    const figmaData = await mcpClient.getFigmaFile(fileId, nodeId);
    
    // Analyze components via MCP
    const componentAnalysis = await mcpClient.analyzeComponents(fileId);
    
    // TODO: Integrate with existing web extraction and comparison logic
    // For now, return the MCP data
    const result = {
      figma: {
        file: figmaData,
        analysis: componentAnalysis
      },
      web: {
        url: webUrl,
        // TODO: Add web extraction results
      },
      comparison: {
        // TODO: Add comparison results
        status: 'mcp_integration_ready'
      }
    };
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Figma compare error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Note: MCP clients are created per request, so no global cleanup needed
// Each request handler manages its own client lifecycle

export default router;
