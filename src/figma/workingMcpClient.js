/**
 * Working Figma MCP Client
 * Based on the successful debug results - uses the exact pattern that works
 */

class WorkingFigmaMCPClient {
  constructor() {
    this.messageId = 0;
    this.sessionId = null;
    this.initialized = false;
    this.baseUrl = 'http://127.0.0.1:3845/mcp';
  }

  /**
   * Connect using the exact pattern that worked in debug
   */
  async connect() {
    try {
      console.log('🔄 Connecting using working pattern...');
      
      // Step 1: Initialize and get session ID
      const initResponse = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
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
        throw new Error(`Initialize failed: ${initResponse.status}`);
      }

      // Get session ID from headers (this is critical!)
      this.sessionId = initResponse.headers.get('mcp-session-id');
      if (!this.sessionId) {
        throw new Error('No session ID received from server');
      }

      console.log('🔑 Got session ID:', this.sessionId);

      // Consume the initialize response
      await initResponse.text();

      // Step 2: Send initialized notification (optional but good practice)
      try {
        const notifyResponse = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'mcp-session-id': this.sessionId
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "notifications/initialized",
            params: {}
          })
        });
        
        if (notifyResponse.ok) {
          await notifyResponse.text(); // Consume response
          console.log('✅ Initialized notification sent');
        } else {
          console.log('⚠️ Initialized notification failed, but continuing...');
        }
      } catch (notifyError) {
        console.log('⚠️ Notification failed, but continuing...', notifyError.message);
      }

      this.initialized = true;
      console.log('✅ Working MCP client connected successfully');
      return true;

    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Send request with session header (the pattern that works!)
   */
  async sendRequest(request) {
    if (!this.sessionId) {
      throw new Error('No session ID - not connected');
    }

    try {
      console.log(`🔧 Sending request: ${request.method}`);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'mcp-session-id': this.sessionId  // This is the key!
        },
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

      console.log(`✅ Request ${request.method} successful`);
      return result.result;

    } catch (error) {
      console.error(`❌ Request ${request.method} failed:`, error.message);
      throw error;
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
      
      // Fallback to direct JSON parsing
      return JSON.parse(responseText);
      
    } catch (parseError) {
      console.error('❌ Failed to parse response:', responseText);
      throw new Error(`Invalid response format: ${parseError.message}`);
    }
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
   * Call a tool
   */
  async callTool(toolName, args = {}) {
    if (!this.initialized) {
      await this.connect();
    }

    console.log(`🔧 Calling tool: ${toolName}`, args);

    return await this.sendRequest({
      jsonrpc: "2.0",
      id: ++this.messageId,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args
      }
    });
  }

  /**
   * Get code from current Figma selection
   */
  async getCode(nodeId = null) {
    console.log('📝 Getting code from current Figma selection...');
    return await this.callTool('get_code', nodeId ? { node_id: nodeId } : {});
  }

  /**
   * Get metadata from current Figma selection
   */
  async getMetadata(nodeId = null) {
    console.log('📊 Getting metadata from current Figma selection...');
    return await this.callTool('get_metadata', nodeId ? { node_id: nodeId } : {});
  }

  /**
   * Get variable definitions from current Figma selection
   */
  async getVariableDefs(nodeId = null) {
    console.log('🎨 Getting variable definitions from current Figma selection...');
    return await this.callTool('get_variable_defs', nodeId ? { node_id: nodeId } : {});
  }

  /**
   * Extract comprehensive Figma data
   */
  async extractFigmaData(figmaUrl) {
    try {
      if (!figmaUrl) {
        throw new Error('Figma URL is required');
      }

      const fileId = this.parseFileId(figmaUrl);
      const nodeId = this.parseNodeId(figmaUrl);

      if (!fileId) {
        throw new Error('Invalid Figma URL: Could not extract file ID');
      }

      console.log(`🎯 Extracting Figma data for file: ${fileId}${nodeId ? `, node: ${nodeId}` : ''}`);
      console.log('📋 Note: Make sure you have the target frame/component selected in Figma Desktop');

      // Connect if not already connected
      if (!this.initialized) {
        await this.connect();
      }

      // Extract data using MCP tools (parallel for efficiency)
      const [metadataResult, codeResult, variablesResult] = await Promise.allSettled([
        this.getMetadata(nodeId),
        this.getCode(nodeId),
        this.getVariableDefs(nodeId)
      ]);

      // Process results
      const extractedData = {
        fileId,
        nodeId,
        figmaUrl,
        extractedAt: new Date().toISOString(),
        extractionMethod: 'Figma Dev Mode MCP (Working)',
        metadata: metadataResult.status === 'fulfilled' ? metadataResult.value : null,
        code: codeResult.status === 'fulfilled' ? codeResult.value : null,
        variables: variablesResult.status === 'fulfilled' ? variablesResult.value : null,
        components: this.transformMCPToComponents(
          metadataResult.status === 'fulfilled' ? metadataResult.value : null,
          codeResult.status === 'fulfilled' ? codeResult.value : null,
          variablesResult.status === 'fulfilled' ? variablesResult.value : null
        ),
        figmaData: {
          metadata: metadataResult.status === 'fulfilled' ? metadataResult.value : null,
          code: codeResult.status === 'fulfilled' ? codeResult.value : null,
          variables: variablesResult.status === 'fulfilled' ? variablesResult.value : null,
          errors: {
            metadata: metadataResult.status === 'rejected' ? metadataResult.reason?.message : null,
            code: codeResult.status === 'rejected' ? codeResult.reason?.message : null,
            variables: variablesResult.status === 'rejected' ? variablesResult.reason?.message : null
          }
        }
      };

      console.log(`✅ Successfully extracted Figma data via MCP: ${extractedData.components?.length || 0} components`);
      return extractedData;

    } catch (error) {
      console.error('❌ MCP extraction failed:', error);
      
      // Fallback to other methods
      return this.fallbackExtraction(figmaUrl, error);
    }
  }

  /**
   * Fallback extraction when MCP fails
   */
  async fallbackExtraction(figmaUrl, mcpError) {
    const fileId = this.parseFileId(figmaUrl);
    const nodeId = this.parseNodeId(figmaUrl);
    
    // Try Framelink MCP if available
    if (typeof globalThis.mcp_Framelink_Figma_MCP_get_figma_data === 'function') {
      try {
        console.log('🔄 Using Framelink MCP as fallback...');
        
        const figmaData = await globalThis.mcp_Framelink_Figma_MCP_get_figma_data({
          fileKey: fileId,
          nodeId: nodeId
        });

        return {
          fileId,
          nodeId,
          figmaUrl,
          extractedAt: new Date().toISOString(),
          extractionMethod: 'Framelink MCP (Fallback)',
          metadata: figmaData,
          code: null,
          variables: null,
          components: this.transformFramelinkToComponents(figmaData),
          figmaData: figmaData
        };
      } catch (framelinkError) {
        console.warn('⚠️ Framelink MCP also failed:', framelinkError.message);
      }
    }

    // Final fallback with error info
    return {
      fileId,
      nodeId,
      figmaUrl,
      extractedAt: new Date().toISOString(),
      extractionMethod: 'Fallback (MCP Failed)',
      metadata: {
        error: 'MCP extraction failed',
        mcpError: mcpError.message,
        instructions: [
          '1. Ensure Figma Desktop is running',
          '2. Open the target Figma file',
          '3. Select the frame/component you want to extract',
          '4. Make sure Dev Mode is enabled in Figma',
          '5. Verify the MCP server is running on port 3845'
        ]
      },
      code: null,
      variables: null,
      components: [{
        id: 'mcp-error',
        name: 'MCP Extraction Failed',
        type: 'ERROR',
        properties: {
          error: mcpError.message,
          solution: 'Check Figma Desktop setup and try again'
        }
      }],
      figmaData: {
        error: 'MCP extraction failed',
        mcpError: mcpError.message
      }
    };
  }

  /**
   * Transform MCP data to components format
   */
  transformMCPToComponents(metadata, code, variables) {
    const components = [];

    if (metadata?.content) {
      try {
        const metadataContent = typeof metadata.content === 'string' ? 
          JSON.parse(metadata.content) : metadata.content;

        if (metadataContent.children) {
          metadataContent.children.forEach((child, index) => {
            components.push({
              id: child.id || `component-${index}`,
              name: child.name || `Component ${index + 1}`,
              type: child.type || 'COMPONENT',
              properties: {
                ...child,
                extractionMethod: 'MCP'
              }
            });
          });
        } else {
          components.push({
            id: metadataContent.id || 'main-component',
            name: metadataContent.name || 'Main Component',
            type: metadataContent.type || 'COMPONENT',
            properties: {
              ...metadataContent,
              extractionMethod: 'MCP'
            }
          });
        }
      } catch (parseError) {
        console.warn('⚠️ Could not parse metadata content:', parseError);
        components.push({
          id: 'raw-metadata',
          name: 'Raw Metadata',
          type: 'RAW',
          properties: {
            content: metadata.content,
            extractionMethod: 'MCP'
          }
        });
      }
    }

    return components.length > 0 ? components : [{
      id: 'empty-selection',
      name: 'No Selection',
      type: 'INFO',
      properties: {
        message: 'No components found in current selection',
        extractionMethod: 'MCP'
      }
    }];
  }

  /**
   * Transform Framelink data to components format
   */
  transformFramelinkToComponents(figmaData) {
    const components = [];

    if (figmaData?.document?.children) {
      figmaData.document.children.forEach((child, index) => {
        components.push({
          id: child.id || `framelink-${index}`,
          name: child.name || `Component ${index + 1}`,
          type: child.type || 'COMPONENT',
          properties: {
            ...child,
            extractionMethod: 'Framelink'
          }
        });
      });
    }

    return components.length > 0 ? components : [{
      id: 'framelink-empty',
      name: 'No Components',
      type: 'INFO',
      properties: {
        message: 'No components found via Framelink',
        extractionMethod: 'Framelink'
      }
    }];
  }

  /**
   * Parse Figma file ID from URL
   */
  parseFileId(url) {
    const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  /**
   * Parse Figma node ID from URL
   */
  parseNodeId(url) {
    const match = url.match(/node-id=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
}

export default WorkingFigmaMCPClient;
