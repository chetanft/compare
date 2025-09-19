/**
 * Figma MCP Client for Web App
 * Connects to Figma's official Dev Mode MCP Server
 */

import fetch from 'node-fetch';

export class FigmaMCPClient {
  constructor() {
    this.baseUrl = 'http://127.0.0.1:3845';
    this.connected = false;
  }

  /**
   * Connect to Figma's official Dev Mode MCP server
   * According to Figma docs: runs at http://127.0.0.1:3845/mcp
   */
  async connect() {
    try {
      // Test connection to Figma's Dev Mode MCP Server
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream'
        },
        timeout: 5000
      });

      if (response.ok) {
        this.connected = true;
        console.log('✅ Connected to Figma Dev Mode MCP Server');
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to connect to Figma Dev Mode MCP Server:', error.message);
      this.connected = false;
      return false;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect() {
    this.connected = false;
    console.log('🔌 Disconnected from Figma Dev Mode MCP Server');
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Call Figma Dev Mode MCP Server tool
   */
  async callTool(toolName, args = {}) {
    if (!this.connected) {
      throw new Error('MCP client not connected to Figma Dev Mode server');
    }

    try {
      const response = await fetch(`${this.baseUrl}/tools/${toolName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(args),
        timeout: 30000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Error calling MCP tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Get code from Figma selection (Figma's get_code tool)
   */
  async getCode(nodeId = null) {
    return await this.callTool('get_code', { nodeId });
  }

  /**
   * Get metadata from Figma selection (Figma's get_metadata tool)
   */
  async getMetadata(nodeId = null) {
    return await this.callTool('get_metadata', { nodeId });
  }

  /**
   * Get variable definitions (Figma's get_variable_defs tool)
   */
  async getVariableDefinitions(nodeId = null) {
    return await this.callTool('get_variable_defs', { nodeId });
  }

  /**
   * List available tools from Figma Dev Mode MCP Server
   */
  async listTools() {
    if (!this.connected) {
      throw new Error('MCP client not connected');
    }

    try {
      const response = await fetch(`${this.baseUrl}/tools`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.tools || [];
    } catch (error) {
      console.error('❌ Error listing tools:', error);
      return [];
    }
  }
}

// Singleton instance
let mcpClientInstance = null;

/**
 * Get or create MCP client instance
 */
export function getMCPClient() {
  if (!mcpClientInstance) {
    mcpClientInstance = new FigmaMCPClient();
  }
  return mcpClientInstance;
}

export default FigmaMCPClient;
