/**
 * MCP Test Connection Routes
 * Separate endpoint for testing MCP connections
 */

import express from 'express';
import fetch from 'node-fetch';
import FigmaMCPClient from '../figma/mcpClient.js';

const router = express.Router();

/**
 * POST /api/mcp/test-connection
 * Test MCP connection based on method
 */
router.post('/test-connection', async (req, res) => {
  try {
    const { method, serverUrl, endpoint, environment } = req.body;
    
    console.log('🔍 Testing MCP connection:', { method, serverUrl, endpoint });
    
    switch (method) {
      case 'mcp_server':
        return await testMCPServer(req, res);
        
      case 'direct_api':
        return await testDirectAPI(req, res);
        
      case 'mcp_tools':
        return await testMCPTools(req, res);
        
      case 'none':
        return res.json({
          success: false,
          error: 'No connection method selected'
        });
        
      default:
        return res.json({
          success: false,
          error: `Unknown connection method: ${method}`
        });
    }
  } catch (error) {
    console.error('❌ MCP test connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test Figma Dev Mode MCP Server connection
 */
async function testMCPServer(req, res) {
  try {
    console.log('🔍 Testing Figma Dev Mode MCP Server connection...');
    
    // Use our MCP client to test the connection
    const mcpClient = new FigmaMCPClient();
    
    const connected = await mcpClient.connect();
    
    if (connected) {
      return res.json({
        success: true,
        message: 'Figma Dev Mode MCP Server connected successfully! Ready to extract design data.',
        data: {
          connected: true,
          serverUrl: 'http://127.0.0.1:3845/mcp',
          availableTools: ['get_code', 'get_metadata', 'get_variable_defs'],
          toolsCount: 3,
          note: 'Connection established. You can now use Figma MCP tools for enhanced design extraction.'
        }
      });
    } else {
      throw new Error('Failed to establish MCP session');
    }
  } catch (error) {
    console.error('❌ Figma Dev Mode MCP Server test failed:', error);
    
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      return res.json({
        success: false,
        error: 'Figma Dev Mode MCP Server not running. Please:\n1. Open Figma Desktop app\n2. Go to Figma menu > Preferences\n3. Enable "Enable local MCP Server"\n4. The server should run at http://127.0.0.1:3845/mcp'
      });
    }
    
    return res.json({
      success: false,
      error: `Figma Dev Mode MCP Server connection failed: ${error.message}`
    });
  }
}

/**
 * Test Direct Figma API connection
 */
async function testDirectAPI(req, res) {
  try {
    const { figmaPersonalAccessToken } = req.body;
    
    if (!figmaPersonalAccessToken) {
      return res.json({
        success: false,
        error: 'Figma API token is required for direct API connection'
      });
    }
    
    // Test Figma API directly
    const response = await fetch('https://api.figma.com/v1/me', {
      headers: {
        'X-Figma-Token': figmaPersonalAccessToken
      }
    });
    
    if (!response.ok) {
      return res.json({
        success: false,
        error: `Figma API error: ${response.status} ${response.statusText}`
      });
    }
    
    const userData = await response.json();
    
    return res.json({
      success: true,
      message: `Direct Figma API connected successfully as ${userData.handle}`,
      data: {
        connected: true,
        user: userData
      }
    });
  } catch (error) {
    console.error('❌ Direct API test failed:', error);
    return res.json({
      success: false,
      error: `Direct API connection failed: ${error.message}`
    });
  }
}

/**
 * Test MCP Tools connection
 */
async function testMCPTools(req, res) {
  try {
    const { serverUrl, endpoint } = req.body;
    
    if (!serverUrl) {
      return res.json({
        success: false,
        error: 'MCP server URL is required for MCP tools connection'
      });
    }
    
    // Test connection to external MCP server
    const testUrl = `${serverUrl}${endpoint || '/health'}`;
    const response = await fetch(testUrl, {
      method: 'GET',
      timeout: 5000
    });
    
    if (!response.ok) {
      return res.json({
        success: false,
        error: `MCP tools server error: ${response.status} ${response.statusText}`
      });
    }
    
    return res.json({
      success: true,
      message: `MCP tools server connected successfully at ${testUrl}`,
      data: {
        connected: true,
        serverUrl: testUrl
      }
    });
  } catch (error) {
    console.error('❌ MCP tools test failed:', error);
    return res.json({
      success: false,
      error: `MCP tools connection failed: ${error.message}`
    });
  }
}

export default router;
