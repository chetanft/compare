/**
 * Session-Aware Figma MCP Client
 * Uses session headers to maintain state between requests
 * This approach tries to maintain session through HTTP headers
 */

class SessionAwareMCPClient {
  constructor() {
    this.messageId = 0;
    this.sessionId = null;
    this.initialized = false;
    this.baseUrl = 'http://127.0.0.1:3845/mcp';
    this.serverInfo = null;
  }

  /**
   * Connect and establish session
   */
  async connect() {
    try {
      console.log('🔄 Connecting with session-aware approach...');
      
      // Step 1: Initialize and capture session info
      const initResult = await this.sendRequest({
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
            name: "figma-analyzer-session",
            version: "1.0.0"
          }
        }
      });

      console.log('✅ Initialize result:', initResult);
      this.serverInfo = initResult;

      // Use the actual session ID from the server response headers (most important!)
      // Don't generate our own session ID - use what the server gives us

      console.log('🔑 Session established:', this.sessionId);

      // Step 2: Send initialized notification with session
      await this.sendNotification({
        jsonrpc: "2.0",
        method: "notifications/initialized",
        params: {}
      });

      this.initialized = true;
      console.log('✅ Session-aware MCP client connected');
      return true;

    } catch (error) {
      console.error('❌ Session-aware connection failed:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Send request with session headers
   */
  async sendRequest(request, isNotification = false) {
    try {
      console.log(`🔧 Sending ${isNotification ? 'notification' : 'request'}: ${request.method}`);
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
      };

      // Add session headers if available (this is the critical part!)
      if (this.sessionId) {
        headers['mcp-session-id'] = this.sessionId;  // This is the key header that works!
        headers['X-MCP-Session-ID'] = this.sessionId;
        headers['MCP-Session-ID'] = this.sessionId;
        headers['Session-ID'] = this.sessionId;
      }

      // Add server info if available
      if (this.serverInfo?.serverInfo?.name) {
        headers['X-MCP-Server'] = this.serverInfo.serverInfo.name;
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      // Handle response format
      const contentType = response.headers.get('content-type');
      let result;

      if (contentType?.includes('text/event-stream')) {
        // Parse SSE format
        const responseText = await response.text();
        result = this.parseSSEResponse(responseText);
      } else {
        // Direct JSON response
        result = await response.json();
      }

      // Capture session ID from server response headers (this is critical!)
      const serverSessionId = response.headers.get('mcp-session-id') || 
                              response.headers.get('x-mcp-session-id') ||
                              response.headers.get('session-id');
      
      if (serverSessionId) {
        console.log('🔑 Server provided session ID:', serverSessionId);
        this.sessionId = serverSessionId;
      } else if (!this.sessionId) {
        console.log('⚠️ No session ID from server, this may cause issues');
      }

      if (result.error) {
        throw new Error(`MCP Error: ${result.error.message}`);
      }

      return result.result || result;

    } catch (error) {
      console.error(`❌ Session request failed (${request.method}):`, error.message);
      throw error;
    }
  }

  /**
   * Send notification (no response expected)
   */
  async sendNotification(notification) {
    try {
      await this.sendRequest(notification, true);
      console.log(`✅ Notification sent: ${notification.method}`);
    } catch (error) {
      console.warn(`⚠️ Notification failed (${notification.method}):`, error.message);
      // Don't throw for notifications
    }
  }

  /**
   * Parse SSE response format
   */
  parseSSEResponse(responseText) {
    try {
      const lines = responseText.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6);
          return JSON.parse(jsonStr);
        }
      }
      
      // If no SSE format, try parsing as direct JSON
      return JSON.parse(responseText);
      
    } catch (parseError) {
      console.error('❌ Failed to parse response:', responseText);
      throw new Error(`Invalid response format: ${parseError.message}`);
    }
  }

  /**
   * Call tool with session management
   */
  async callTool(name, args = {}) {
    if (!this.initialized) {
      throw new Error('Client not initialized');
    }

    console.log(`🔧 Calling tool with session: ${name}`, args);

    return await this.sendRequest({
      jsonrpc: "2.0",
      id: ++this.messageId,
      method: "tools/call",
      params: {
        name,
        arguments: args
      }
    });
  }

  /**
   * List available tools
   */
  async listTools() {
    if (!this.initialized) {
      await this.connect();
    }

    return await this.sendRequest({
      jsonrpc: "2.0",
      id: ++this.messageId,
      method: "tools/list"
    });
  }

  /**
   * Get code from current Figma selection
   */
  async getCode(nodeId = null) {
    return await this.callTool('get_code', nodeId ? { node_id: nodeId } : {});
  }

  /**
   * Get metadata from current Figma selection
   */
  async getMetadata(nodeId = null) {
    return await this.callTool('get_metadata', nodeId ? { node_id: nodeId } : {});
  }

  /**
   * Get variable definitions from current Figma selection
   */
  async getVariableDefs(nodeId = null) {
    return await this.callTool('get_variable_defs', nodeId ? { node_id: nodeId } : {});
  }

  /**
   * Reset session
   */
  reset() {
    this.sessionId = null;
    this.initialized = false;
    this.serverInfo = null;
    console.log('🔄 Session reset');
  }
}

export default SessionAwareMCPClient;
