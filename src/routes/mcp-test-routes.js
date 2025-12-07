/**
 * MCP Test Connection Routes
 * Separate endpoint for testing MCP connections
 */

import express from 'express';
import fetch from 'node-fetch';
import FigmaMCPClient from '../figma/mcpClient.js';
import { RemoteMCPClient } from '../figma/RemoteMCPClient.js';

const router = express.Router();

/**
 * POST /api/mcp/test-connection
 * Test MCP connection based on method
 */
router.post('/test-connection', async (req, res) => {
  try {
    const { method, serverUrl, endpoint } = req.body;
    
    console.log('🔍 Testing MCP connection:', { method, serverUrl, endpoint, body: req.body });
    
    // Normalize method value (handle case variations and aliases)
    const normalizedMethod = method ? String(method).toLowerCase().trim() : null;
    
    console.log('🔍 Normalized method:', normalizedMethod);
    
    switch (normalizedMethod) {
      case 'mcp_server':
      case 'desktop':
      case 'figma-desktop':
      case 'local':
        console.log('✅ Routing to testMCPServer');
        return await testMCPServer(req, res);
        
      case 'direct_api':
      case 'api':
      case 'figma-api':
        console.log('✅ Routing to testDirectAPI');
        return await testDirectAPI(req, res);
        
      case 'mcp_server_remote':
      case 'figma':
      case 'figma-cloud':
      case 'cloud':
      case 'remote':
        console.log('✅ Routing to testRemoteMCP');
        return await testRemoteMCP(req, res);
        
      default:
        console.error('❌ Unknown method:', { original: method, normalized: normalizedMethod, type: typeof method });
        return res.json({
          success: false,
          error: `Unknown connection method: ${method || 'undefined'}. Supported methods: api, desktop, figma.`
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
 * Test Figma Remote MCP connection
 */
async function testRemoteMCP(req, res) {
  try {
    const { figmaPersonalAccessToken } = req.body;
    const token = figmaPersonalAccessToken || process.env.FIGMA_API_KEY || process.env.FIGMA_TOKEN;

    if (!token) {
      return res.json({
        success: false,
        error: 'Figma API token is required for remote MCP connection'
      });
    }

    const remoteClient = new RemoteMCPClient({
      remoteUrl: process.env.FIGMA_MCP_URL || 'https://mcp.figma.com/mcp',
      figmaToken: token
    });

    const connected = await remoteClient.connect();

    if (connected) {
      return res.json({
        success: true,
        message: 'Figma Hosted MCP connected successfully!',
        data: {
          connected: true,
          remoteUrl: remoteClient.baseUrl
        }
      });
    }

    throw new Error('Failed to establish remote MCP session');
  } catch (error) {
    console.error('❌ Remote MCP test failed:', error);
    return res.json({
      success: false,
      error: `Remote MCP connection failed: ${error.message}`
    });
  }
}

export default router;
