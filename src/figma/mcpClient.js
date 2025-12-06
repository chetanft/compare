/**
 * Working Figma Dev Mode MCP Client
 * Uses the exact pattern that successfully works with the Figma MCP server
 * Based on successful debugging - uses session headers for all requests
 */

class FigmaMCPClient {
  constructor(options = {}) {
    this.messageId = 0;
    this.sessionId = null;
    this.initialized = false;
    this.baseUrl = options.baseUrl || process.env.FIGMA_DESKTOP_MCP_URL || 'http://127.0.0.1:3845/mcp';
  }

  /**
   * Connect using the working pattern (session-based)
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
      
      // Step 3: List available tools
      try {
        const tools = await this.listTools();
        console.log('📋 Available MCP tools:', tools?.tools?.map(t => t.name) || []);
      } catch (toolsError) {
        console.warn('⚠️ Could not list tools:', toolsError.message);
      }

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
   * Send MCP notification (no response expected)
   */
  async sendMCPNotification(notification) {
    try {
      console.log(`🔔 Sending MCP notification: ${notification.method}`);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify(notification)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️ Notification response: HTTP ${response.status} - ${errorText}`);
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
   * Parse Server-Sent Events response format
   */
  parseSSEResponse(responseText) {
    try {
      // Look for "data: " lines in SSE format
      const lines = responseText.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6); // Remove "data: " prefix
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
   * Call a tool on the MCP server
   */
  async callTool(toolName, args = {}) {
    if (!this.initialized) {
      await this.connect();
    }

    try {
      console.log(`🔧 Calling MCP tool: ${toolName}`, args);
      
      const result = await this.sendRequest({
        jsonrpc: "2.0",
        id: ++this.messageId,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args
        }
      });
      
      console.log(`✅ Tool ${toolName} completed successfully`);
      return result;
      
    } catch (error) {
      console.error(`❌ Tool ${toolName} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get code from current Figma selection
   */
  async getCode(nodeId = null) {
    try {
      console.log('📝 Getting code from current Figma selection...');
      
      // The official server works with current selection, not specific node IDs
      const result = await this.callTool('get_code', nodeId ? { node_id: nodeId } : {});
      return result;
    } catch (error) {
      console.error('❌ Failed to get code:', error);
      throw error;
    }
  }

  /**
   * Get metadata from current Figma selection
   */
  async getMetadata(nodeId = null) {
    try {
      console.log('📊 Getting metadata from current Figma selection...');
      
      const result = await this.callTool('get_metadata', nodeId ? { node_id: nodeId } : {});
      return result;
    } catch (error) {
      console.error('❌ Failed to get metadata:', error);
      throw error;
    }
  }

  /**
   * Get variable definitions from current Figma selection
   */
  async getVariableDefs(nodeId = null) {
    try {
      console.log('🎨 Getting variable definitions from current Figma selection...');
      
      const result = await this.callTool('get_variable_defs', nodeId ? { node_id: nodeId } : {});
      return result;
    } catch (error) {
      console.error('❌ Failed to get variable definitions:', error);
      throw error;
    }
  }

  /**
   * Get Code Connect map from current Figma selection
   */
  async getCodeConnectMap(nodeId = null) {
    try {
      console.log('🔗 Getting Code Connect map from current Figma selection...');
      
      const result = await this.callTool('get_code_connect_map', nodeId ? { node_id: nodeId } : {});
      return result;
    } catch (error) {
      console.error('❌ Failed to get Code Connect map:', error);
      throw error;
    }
  }

  /**
   * Get image from current Figma selection
   */
  async getImage(nodeId = null, options = {}) {
    try {
      console.log('🖼️ Getting image from current Figma selection...');
      
      const args = nodeId ? { node_id: nodeId, ...options } : options;
      const result = await this.callTool('get_image', args);
      return result;
    } catch (error) {
      console.error('❌ Failed to get image:', error);
      throw error;
    }
  }

  /**
   * Create design system rules from current Figma selection
   */
  async createDesignSystemRules(nodeId = null) {
    try {
      console.log('📐 Creating design system rules from current Figma selection...');
      
      const result = await this.callTool('create_design_system_rules', nodeId ? { node_id: nodeId } : {});
      return result;
    } catch (error) {
      console.error('❌ Failed to create design system rules:', error);
      throw error;
    }
  }

  /**
   * Extract comprehensive Figma data using the MCP server
   * This method works with the current selection in Figma Desktop
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

      console.log(`🎯 Extracting Figma data using MCP server for file: ${fileId}${nodeId ? `, node: ${nodeId}` : ''}`);
      console.log('📋 Note: Make sure you have the target frame/component selected in Figma Desktop');

      // Connect to MCP server
      if (!this.initialized) {
        await this.connect();
      }

      // Extract data using MCP tools (run in parallel for efficiency)
      const [metadataResult, codeResult, variablesResult] = await Promise.allSettled([
        this.getMetadata(nodeId),
        this.getCode(nodeId),
        this.getVariableDefs(nodeId)
      ]);

      // Process results
      const metadata = metadataResult.status === 'fulfilled' ? metadataResult.value : null;
      const code = codeResult.status === 'fulfilled' ? codeResult.value : null;
      const variables = variablesResult.status === 'fulfilled' ? variablesResult.value : null;
      
      // Return raw MCP data for UnifiedFigmaExtractor to process with proper data adapters
      const extractedData = {
        fileId,
        nodeId,
        figmaUrl,
        extractedAt: new Date().toISOString(),
        extractionMethod: 'figma-mcp',
        // Raw MCP response for data adapters
        rawMCPData: {
          metadata,
          code,
          variables
        },
        // Keep original structure for backward compatibility
        metadata,
        code,
        variables
      };

      console.log(`✅ Successfully extracted raw Figma data via MCP for processing`);
      return extractedData;

    } catch (error) {
      console.error('❌ MCP extraction failed:', error);
      
      // Fallback to Figma API if MCP fails
      return this.fallbackToFigmaAPI(figmaUrl, error);
    }
  }

  /**
   * Fallback to Figma API when MCP extraction fails
   */
  async fallbackToFigmaAPI(figmaUrl, mcpError) {
    try {
      console.log('🔄 MCP failed, attempting Figma API fallback...');
      
      const fileId = this.parseFileId(figmaUrl);
      const nodeId = this.parseNodeId(figmaUrl);
      
      // Try to use Framelink MCP if available
      if (typeof globalThis.mcp_Framelink_Figma_MCP_get_figma_data === 'function') {
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
      }

      // Final fallback with error information
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

    } catch (fallbackError) {
      console.error('❌ All extraction methods failed:', fallbackError);
      throw new Error(`Both MCP and fallback extraction failed: ${mcpError.message} | ${fallbackError.message}`);
    }
  }

  /**
   * Transform MCP data to components format (Legacy - now handled by data adapters)
   * @deprecated Use UnifiedFigmaExtractor with data adapters instead
   */
  transformMCPToComponents(metadata, code, variables) {
    // This method is deprecated and should not be used
    // The proper data transformation is now handled by the data adapters
    console.warn('⚠️ transformMCPToComponents is deprecated. Use UnifiedFigmaExtractor with data adapters instead.');
    
    // Return minimal fallback for backward compatibility
    return [{
      id: 'legacy-component',
      name: 'Legacy MCP Component',
      type: 'DEPRECATED',
      properties: {
        message: 'This component was created by deprecated transformation logic',
        extractionMethod: 'MCP-legacy',
        recommendation: 'Use UnifiedFigmaExtractor for proper data transformation'
      }
    }];
  }

  /**
   * Extract colors from MCP data (Legacy - now handled by data adapters)
   * @deprecated Use MCPXMLAdapter for proper color extraction
   */
  extractColorsFromMCP(metadata, code) {
    console.warn('⚠️ extractColorsFromMCP is deprecated. Use MCPXMLAdapter for proper color extraction.');
    return [];
  }

  /**
   * Extract typography from MCP data (Legacy - now handled by data adapters)
   * @deprecated Use MCPXMLAdapter for proper typography extraction
   */
  extractTypographyFromMCP(metadata, code) {
    console.warn('⚠️ extractTypographyFromMCP is deprecated. Use MCPXMLAdapter for proper typography extraction.');
    return [];
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
    if (match) {
      const nodeId = decodeURIComponent(match[1]);
      // Convert hyphen format (5607-29953) to colon format (5607:29953) for Figma API
      return nodeId.replace('-', ':');
    }
    return null;
  }
}

export default FigmaMCPClient;
