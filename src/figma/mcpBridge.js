/**
 * MCP Framelink Bridge
 * Provides access to MCP Framelink Figma tools from Node.js server context
 */

class MCPFramelinkBridge {
  constructor() {
    this.available = false;
    this.tools = {};
    this.initialize();
  }

  initialize() {
    try {
      console.log('🔧 MCPFramelinkBridge: Initializing...');
      
      // In an MCP environment, these tools should be available globally
      // For Node.js server, we'll create proxy functions that can be called via API
      
      this.tools = {
        getFigmaData: this.getFigmaData.bind(this),
        downloadFigmaImages: this.downloadFigmaImages.bind(this)
      };
      
      // Check if we're in a Node.js environment with global object
      if (typeof global !== 'undefined') {
        console.log('🔧 MCPFramelinkBridge: Running in Node.js environment');
        
        // Check if we have access to MCP functions directly
        const hasMCPFunctions = 
          typeof global.mcp_Framelink_Figma_MCP_get_figma_data === 'function' && 
          typeof global.mcp_Framelink_Figma_MCP_download_figma_images === 'function';
        
        console.log(`🔧 MCPFramelinkBridge: Global MCP functions available: ${hasMCPFunctions}`);
        
        if (hasMCPFunctions) {
          this.available = true;
          console.log('✅ MCPFramelinkBridge: Direct MCP functions available in global scope');
        } else {
          console.log('🔧 MCPFramelinkBridge: Using HTTP API proxy for MCP functions');
          this.available = true; // We'll use HTTP API proxy
        }
      } else {
        console.log('🔧 MCPFramelinkBridge: Not running in Node.js environment');
        this.available = false;
      }
      
      console.log(`🔧 MCP Framelink Bridge initialized (available: ${this.available})`);
    } catch (error) {
      console.error('❌ MCP Framelink Bridge initialization failed:', error.message);
      this.available = false;
    }
  }

  /**
   * Get Figma data using MCP Framelink tools via HTTP API
   */
  async getFigmaData(params) {
    try {
      console.log('🔧 MCPFramelinkBridge: Calling MCP server for Figma data...');
      console.log('📊 Params:', JSON.stringify(params, null, 2));
      
      // Check if we have direct access to MCP functions
      if (typeof global !== 'undefined' && typeof global.mcp_Framelink_Figma_MCP_get_figma_data === 'function') {
        console.log('🔧 Using direct global MCP function');
        try {
          const result = await global.mcp_Framelink_Figma_MCP_get_figma_data(params);
          console.log('✅ Direct MCP function call successful');
          return result;
        } catch (directError) {
          console.error('❌ Direct MCP function call failed:', directError);
          console.log('🔄 Falling back to HTTP API');
          // Fall through to HTTP API approach
        }
      }
      
      // Read MCP configuration
      const fs = await import('fs/promises');
      let mcpBaseUrl = 'http://127.0.0.1:3845';
      
      try {
        const mcpConfigContent = await fs.readFile('./mcp.json', 'utf8');
        const mcpConfig = JSON.parse(mcpConfigContent);
        
        if (mcpConfig?.mcp?.servers?.['Figma Dev Mode MCP']?.url) {
          const fullUrl = mcpConfig.mcp.servers['Figma Dev Mode MCP'].url;
          // Extract base URL (remove /sse endpoint for API calls)
          mcpBaseUrl = fullUrl.replace(/\/sse$/, '');
          console.log(`🔧 Using MCP base URL from mcp.json: ${mcpBaseUrl}`);
        }
      } catch (configError) {
        console.log(`⚠️ Could not read mcp.json, using default URL: ${mcpBaseUrl}`);
      }
      
      // Prepare MCP request for get_figma_data
      const mcpRequest = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: "mcp_Framelink_Figma_MCP_get_figma_data",
          arguments: params
        }
      };
      
      // First get a session ID from SSE endpoint
      const sseResponse = await fetch(`${mcpBaseUrl}/sse`);
      const sseText = await sseResponse.text();
      const sessionMatch = sseText.match(/sessionId=([a-f0-9-]+)/);
      
      if (!sessionMatch) {
        throw new Error('Could not get session ID from MCP server');
      }
      
      const sessionId = sessionMatch[1];
      console.log(`🔗 Got session ID: ${sessionId}`);
      console.log(`📤 Sending MCP request to ${mcpBaseUrl}/messages`);
      
      // Use the correct /messages endpoint with session ID
      const response = await fetch(`${mcpBaseUrl}/messages?sessionId=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mcpRequest)
      });
      
      if (!response.ok) {
        throw new Error(`MCP server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`📥 MCP response received`);
      
      if (result.error) {
        throw new Error(`MCP error: ${result.error.message || result.error}`);
      }
      
      // Handle different response formats
      let figmaData;
      if (result.result && result.result.content) {
        // Standard MCP response format
        if (typeof result.result.content === 'string') {
          figmaData = JSON.parse(result.result.content);
        } else {
          figmaData = result.result.content;
        }
      } else if (result.document) {
        // Direct Figma data response
        figmaData = result;
      } else {
        throw new Error('Invalid MCP response format');
      }
      
      console.log(`✅ Successfully fetched Figma data via MCP server`);
      return figmaData;
      
    } catch (error) {
      console.error('❌ MCPFramelinkBridge getFigmaData error:', error);
      throw error;
    }
  }

  /**
   * Download Figma images using MCP Framelink tools via HTTP API
   */
  async downloadFigmaImages(params) {
    try {
      console.log('🖼️ MCPFramelinkBridge: Calling MCP server for image download...');
      console.log('📊 Params:', JSON.stringify(params, null, 2));
      
      // Read MCP configuration
      const fs = await import('fs/promises');
      let mcpBaseUrl = 'http://127.0.0.1:3845';
      
      try {
        const mcpConfigContent = await fs.readFile('./mcp.json', 'utf8');
        const mcpConfig = JSON.parse(mcpConfigContent);
        
        if (mcpConfig?.mcp?.servers?.['Figma Dev Mode MCP']?.url) {
          const fullUrl = mcpConfig.mcp.servers['Figma Dev Mode MCP'].url;
          mcpBaseUrl = fullUrl.replace(/\/sse$/, '');
        }
      } catch (configError) {
        console.log(`⚠️ Could not read mcp.json, using default URL: ${mcpBaseUrl}`);
      }
      
      // Prepare MCP request for download_figma_images
      const mcpRequest = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: "mcp_Framelink_Figma_MCP_download_figma_images",
          arguments: params
        }
      };
      
      // First get a session ID from SSE endpoint
      const sseResponse = await fetch(`${mcpBaseUrl}/sse`);
      const sseText = await sseResponse.text();
      const sessionMatch = sseText.match(/sessionId=([a-f0-9-]+)/);
      
      if (!sessionMatch) {
        throw new Error('Could not get session ID from MCP server');
      }
      
      const sessionId = sessionMatch[1];
      console.log(`🔗 Got session ID for images: ${sessionId}`);
      console.log(`📤 Sending MCP image download request to ${mcpBaseUrl}/messages`);
      
      // Use the correct /messages endpoint with session ID
      const response = await fetch(`${mcpBaseUrl}/messages?sessionId=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mcpRequest)
      });
      
      if (!response.ok) {
        throw new Error(`MCP server returned ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`📥 MCP image download response received`);
      
      if (result.error) {
        throw new Error(`MCP error: ${result.error.message || result.error}`);
      }
      
      console.log(`✅ Successfully downloaded Figma images via MCP server`);
      return result;
      
    } catch (error) {
      console.error('❌ MCPFramelinkBridge downloadFigmaImages error:', error);
      throw error;
    }
  }

  /**
   * Check if MCP tools are available
   */
  isAvailable() {
    return this.available;
  }

  /**
   * Create global proxy functions for MCP tools
   * This allows the MCP integration to call the tools as if they were global
   */
  setupGlobalProxies() {
    if (typeof global !== 'undefined') {
      // Only set up proxies if they don't already exist
      if (typeof global.mcp_Framelink_Figma_MCP_get_figma_data !== 'function') {
        global.mcp_Framelink_Figma_MCP_get_figma_data = this.getFigmaData.bind(this);
      }
      
      if (typeof global.mcp_Framelink_Figma_MCP_download_figma_images !== 'function') {
        global.mcp_Framelink_Figma_MCP_download_figma_images = this.downloadFigmaImages.bind(this);
      }
      
      console.log('🌐 MCP Framelink global proxies setup');
    } else {
      console.log('⚠️ Cannot set up global proxies - not in Node.js environment');
    }
  }
}

// Create singleton instance
const mcpBridge = new MCPFramelinkBridge();

// Setup global proxies
mcpBridge.setupGlobalProxies();

export default mcpBridge; 