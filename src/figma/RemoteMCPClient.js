/**
 * Remote Figma MCP Client
 * HTTPS-based MCP connector for SaaS deployments
 * Connects to Figma's remote MCP service (https://mcp.figma.com/mcp)
 */

export class RemoteMCPClient {
  constructor(config = {}) {
    this.messageId = 0;
    this.sessionId = null;
    this.initialized = false;
    this.baseUrl = config.remoteUrl || 'https://mcp.figma.com/mcp';
    this.token = config.figmaToken; // Figma Personal Access Token
    this.config = config;
  }

  /**
   * Connect to remote MCP service
   */
  async connect() {
    try {
      console.log('🔄 Connecting to remote Figma MCP...');
      
      if (!this.token) {
        throw new Error('Figma token required for remote MCP connection');
      }
      
      // Step 1: Initialize with authentication
      const initResponse = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: ++this.messageId,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
              resources: { subscribe: true }
            },
            clientInfo: {
              name: "figma-comparison-tool",
              version: "1.0.0"
            }
          }
        })
      });

      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        throw new Error(`Initialize failed: ${initResponse.status} - ${errorText}`);
      }

      // Get session ID from headers
      this.sessionId = initResponse.headers.get('mcp-session-id');
      if (!this.sessionId) {
        // Some implementations may not use session IDs for stateless HTTPS
        this.sessionId = `remote_${Date.now()}`;
      }

      console.log('🔑 Remote MCP session established');

      // Consume the initialize response
      await initResponse.text();

      // Step 2: Send initialized notification
      try {
        const notifyResponse = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'Authorization': `Bearer ${this.token}`,
            ...(this.sessionId && { 'mcp-session-id': this.sessionId })
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "notifications/initialized",
            params: {}
          })
        });
        
        if (notifyResponse.ok) {
          await notifyResponse.text();
          console.log('✅ Initialized notification sent');
        }
      } catch (notifyError) {
        console.log('⚠️ Initialized notification failed, but continuing...', notifyError.message);
      }

      this.initialized = true;
      console.log('✅ Remote MCP client connected successfully');
      
      // Step 3: List available tools
      try {
        const tools = await this.listTools();
        console.log('📋 Available remote MCP tools:', tools?.tools?.map(t => t.name) || []);
      } catch (toolsError) {
        console.warn('⚠️ Could not list tools:', toolsError.message);
      }

      return true;

    } catch (error) {
      console.error('❌ Remote connection failed:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Send request with authentication
   */
  async sendRequest(request) {
    if (!this.initialized) {
      await this.connect();
    }

    try {
      console.log(`🔧 Sending remote request: ${request.method}`);
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${this.token}`
      };
      
      // Add session ID if available
      if (this.sessionId) {
        headers['mcp-session-id'] = this.sessionId;
      }
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Parse SSE response
      const responseText = await response.text();
      const result = this.parseSSEResponse(responseText);

      if (result.error) {
        throw new Error(`MCP Error: ${result.error.message}`);
      }

      console.log(`✅ Remote request ${request.method} successful`);
      return result.result;

    } catch (error) {
      console.error(`❌ Remote request ${request.method} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Parse SSE (Server-Sent Events) response
   */
  parseSSEResponse(text) {
    // Handle JSON response (non-SSE)
    if (text.trim().startsWith('{')) {
      try {
        return JSON.parse(text);
      } catch (e) {
        // Fall through to SSE parsing
      }
    }

    // Parse SSE format
    const lines = text.split('\n');
    let result = null;

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          if (data.id !== undefined) {
            result = data;
          }
        } catch (e) {
          // Continue parsing
        }
      }
    }

    if (!result) {
      // Fallback: try to parse entire text as JSON
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error('Failed to parse MCP response');
      }
    }

    return result;
  }

  /**
   * List available tools
   */
  async listTools() {
    const result = await this.sendRequest({
      jsonrpc: "2.0",
      id: ++this.messageId,
      method: "tools/list",
      params: {}
    });
    return result;
  }

  /**
   * Call a tool
   */
  async callTool(toolName, args = {}) {
    const result = await this.sendRequest({
      jsonrpc: "2.0",
      id: ++this.messageId,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args
      }
    });
    return result;
  }

  /**
   * Get Figma file data
   */
  async getFigmaFile(fileKey, nodeId = null) {
    const args = { fileKey };
    if (nodeId) {
      args.nodeId = nodeId;
    }
    return await this.callTool('get_figma_data', args);
  }

  /**
   * Disconnect
   */
  async disconnect() {
    this.initialized = false;
    this.sessionId = null;
    console.log('🔌 Remote MCP client disconnected');
  }
}
