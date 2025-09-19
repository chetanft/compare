/**
 * Persistent Figma MCP Client
 * Uses a single persistent connection for all MCP operations
 * This approach maintains session state as expected by the MCP protocol
 */

import { EventSource } from 'eventsource';

class PersistentFigmaMCPClient {
  constructor() {
    this.messageId = 0;
    this.initialized = false;
    this.eventSource = null;
    this.pendingRequests = new Map();
    this.baseUrl = 'http://127.0.0.1:3845/mcp';
  }

  /**
   * Connect using persistent SSE connection
   */
  async connect() {
    return new Promise((resolve, reject) => {
      console.log('🔄 Establishing persistent SSE connection...');
      
      // Create persistent SSE connection
      this.eventSource = new EventSource(this.baseUrl);
      
      this.eventSource.onopen = async () => {
        console.log('✅ SSE Connection established');
        try {
          await this.initialize();
          resolve(true);
        } catch (error) {
          reject(error);
        }
      };

      this.eventSource.onmessage = (event) => {
        this.handleServerMessage(event.data);
      };

      this.eventSource.onerror = (error) => {
        console.error('❌ SSE Connection error:', error);
        reject(error);
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.initialized) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Initialize MCP session through persistent connection
   */
  async initialize() {
    const initRequest = {
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
          name: "figma-analyzer-persistent",
          version: "1.0.0"
        }
      }
    };

    console.log('📋 Sending initialization through persistent connection...');
    
    // Send initialization through the persistent connection
    const initResult = await this.sendPersistentRequest(initRequest);
    console.log('✅ Initialization result:', initResult);

    // Send initialized notification
    console.log('📋 Sending initialized notification...');
    await this.sendNotification({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {}
    });

    this.initialized = true;
    console.log('✅ Persistent MCP session established');
    return initResult;
  }

  /**
   * Send request through persistent connection and wait for response
   */
  async sendPersistentRequest(request) {
    return new Promise((resolve, reject) => {
      // Store the pending request
      this.pendingRequests.set(request.id, { resolve, reject });

      // Send via the persistent connection channel
      this.postToServer(request).catch(error => {
        this.pendingRequests.delete(request.id);
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.pendingRequests.delete(request.id);
          reject(new Error(`Request timeout for ${request.method}`));
        }
      }, 30000);
    });
  }

  /**
   * Post request to server while maintaining persistent connection
   */
  async postToServer(request) {
    try {
      console.log(`🔧 Sending persistent request: ${request.method}`);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle both JSON and SSE responses
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('text/event-stream')) {
        // SSE response - will be handled by onmessage
        const responseText = await response.text();
        this.parseSSEResponse(responseText);
      } else {
        // Direct JSON response
        const result = await response.json();
        this.handleServerResponse(result);
      }

    } catch (error) {
      console.error(`❌ Persistent request failed (${request.method}):`, error);
      throw error;
    }
  }

  /**
   * Parse SSE response and handle the message
   */
  parseSSEResponse(responseText) {
    try {
      const lines = responseText.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6);
          const message = JSON.parse(jsonStr);
          this.handleServerResponse(message);
        }
      }
    } catch (parseError) {
      console.error('❌ Failed to parse SSE response:', parseError);
    }
  }

  /**
   * Handle incoming server messages
   */
  handleServerMessage(data) {
    try {
      console.log('📨 Received server message:', data);
      const message = JSON.parse(data);
      this.handleServerResponse(message);
    } catch (error) {
      console.error('❌ Failed to parse server message:', error);
    }
  }

  /**
   * Handle server response and resolve pending requests
   */
  handleServerResponse(response) {
    console.log('📨 Processing server response:', response);
    
    if (response.id && this.pendingRequests.has(response.id)) {
      const { resolve, reject } = this.pendingRequests.get(response.id);
      this.pendingRequests.delete(response.id);

      if (response.error) {
        reject(new Error(response.error.message));
      } else {
        resolve(response.result);
      }
    } else if (response.method) {
      // Handle server notifications/events
      console.log('📢 Server notification:', response.method);
    }
  }

  /**
   * Call tool through persistent connection
   */
  async callTool(name, args = {}) {
    if (!this.initialized) {
      throw new Error('Client not initialized');
    }

    const request = {
      jsonrpc: "2.0",
      id: ++this.messageId,
      method: "tools/call",
      params: {
        name,
        arguments: args
      }
    };

    console.log(`🔧 Calling tool through persistent connection: ${name}`, args);
    return await this.sendPersistentRequest(request);
  }

  /**
   * Send notification (no response expected)
   */
  async sendNotification(notification) {
    try {
      console.log(`🔔 Sending notification: ${notification.method}`);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify(notification)
      });

      if (!response.ok) {
        console.warn(`⚠️ Notification response: HTTP ${response.status}`);
      } else {
        // Consume the response but don't expect meaningful data
        await response.text();
      }

    } catch (error) {
      console.warn(`⚠️ Notification failed (${notification.method}):`, error.message);
      // Don't throw for notifications
    }
  }

  /**
   * List available tools
   */
  async listTools() {
    if (!this.initialized) {
      await this.connect();
    }

    return await this.sendPersistentRequest({
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
   * Disconnect and cleanup
   */
  disconnect() {
    console.log('🔄 Disconnecting persistent connection...');
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // Reject all pending requests
    for (const [id, { reject }] of this.pendingRequests) {
      reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
    
    this.initialized = false;
    console.log('✅ Persistent connection closed');
  }
}

export default PersistentFigmaMCPClient;
