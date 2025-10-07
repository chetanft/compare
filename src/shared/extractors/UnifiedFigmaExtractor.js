/**
 * Unified Figma Extractor
 * Single interface for extracting Figma data from multiple sources
 */

import { figmaDataAdapter } from '../data-adapters/FigmaDataAdapter.js';

export class UnifiedFigmaExtractor {
  constructor(config = {}) {
    this.config = config;
    this.extractionMethods = [
      {
        name: 'figma-mcp',
        extract: this.extractViaMCP.bind(this),
        priority: 1,
        description: 'Figma Dev Mode MCP Server'
      },
      {
        name: 'framelink-mcp',
        extract: this.extractViaFramelink.bind(this),
        priority: 2,
        description: 'Framelink MCP Tools'
      },
      {
        name: 'figma-api',
        extract: this.extractViaAPI.bind(this),
        priority: 3,
        description: 'Direct Figma REST API'
      }
    ];
  }

  /**
   * Extract Figma data using best available method
   * @param {string} figmaUrl - Figma URL
   * @param {Object} options - Extraction options
   * @returns {Promise<StandardizedFigmaData>}
   */
  async extract(figmaUrl, options = {}) {
    const { 
      preferredMethod = null,
      fallbackEnabled = true,
      timeout = 30000 
    } = options;

    const extractionErrors = [];
    let methods = [...this.extractionMethods];

    // If preferred method specified, try it first
    if (preferredMethod) {
      const preferred = methods.find(m => m.name === preferredMethod);
      if (preferred) {
        methods = [preferred, ...methods.filter(m => m.name !== preferredMethod)];
      }
    }

    // Sort by priority (lower number = higher priority)
    methods.sort((a, b) => a.priority - b.priority);

    for (const method of methods) {
      try {
        console.log(`🔄 Attempting extraction via ${method.name} (${method.description})`);
        
        const rawData = await this.executeWithTimeout(
          method.extract(figmaUrl, options),
          timeout,
          `${method.name} extraction timeout`
        );

        if (rawData) {
          const standardizedData = figmaDataAdapter.normalize(
            rawData,
            method.name,
            { figmaUrl, ...options }
          );

          console.log(`✅ Extraction successful via ${method.name}:`, {
            components: standardizedData.components.length,
            colors: standardizedData.colors.length,
            typography: standardizedData.typography.length
          });

          // Return proper API response format
          return {
            success: true,
            data: standardizedData
          };
        }
      } catch (error) {
        const errorMessage = `${method.name} extraction failed: ${error.message}`;
        console.warn(`⚠️ ${errorMessage}`);
        extractionErrors.push({ method: method.name, error: errorMessage });

        if (!fallbackEnabled) {
          throw new Error(errorMessage);
        }
      }
    }

    // If all methods failed
    const errorSummary = extractionErrors.map(e => `${e.method}: ${e.error}`).join('; ');
    return {
      success: false,
      error: `All extraction methods failed. Errors: ${errorSummary}`,
      data: null
    };
  }

  /**
   * Extract via Figma Dev Mode MCP
   * @param {string} figmaUrl - Figma URL
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>}
   */
  async extractViaMCP(figmaUrl, options = {}) {
    // Import MCP client dynamically to avoid circular dependencies
    const FigmaMCPClient = (await import('../../figma/mcpClient.js')).default;
    
    const mcpClient = new FigmaMCPClient();
    
    // Try to connect
    const isConnected = await mcpClient.connect();
    if (!isConnected) {
      throw new Error('Cannot connect to Figma Dev Mode MCP server');
    }

    // Extract data - let MCP client handle nodeId parsing from URL
    const mcpData = await mcpClient.extractFigmaData(figmaUrl);
    
    if (!mcpData || !mcpData.metadata) {
      throw new Error('MCP extraction returned no data');
    }

    return mcpData; // Return the full MCP data structure for adapter processing
  }

  /**
   * Extract via Framelink MCP
   * @param {string} figmaUrl - Figma URL
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>}
   */
  async extractViaFramelink(figmaUrl, options = {}) {
    // Check if Framelink MCP tools are available
    if (typeof globalThis.mcp_Framelink_Figma_MCP_get_figma_data !== 'function') {
      throw new Error('Framelink MCP tools not available');
    }

    const fileId = this.parseFileId(figmaUrl);
    const nodeId = options.nodeId || this.parseNodeId(figmaUrl);

    if (!fileId) {
      throw new Error('Cannot extract file ID from Figma URL');
    }

    const framelinkData = await globalThis.mcp_Framelink_Figma_MCP_get_figma_data({
      fileKey: fileId,
      nodeId: nodeId || undefined
    });

    if (!framelinkData) {
      throw new Error('Framelink MCP extraction returned no data');
    }

    return framelinkData;
  }

  /**
   * Extract via direct Figma API
   * @param {string} figmaUrl - Figma URL
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>}
   */
  async extractViaAPI(figmaUrl, options = {}) {
    const fileId = this.parseFileId(figmaUrl);
    const nodeId = options.nodeId || this.parseNodeId(figmaUrl);

    if (!fileId) {
      throw new Error('Cannot extract file ID from Figma URL');
    }

    // Get API key from config or options
    const apiKey = options.apiKey || 
                   this.config.get?.('figmaApiKey') || 
                   process.env.FIGMA_API_KEY;

    if (!apiKey) {
      throw new Error('Figma API key not available');
    }

    // Construct API URL
    let apiUrl = `https://api.figma.com/v1/files/${fileId}`;
    if (nodeId) {
      apiUrl += `/nodes?ids=${encodeURIComponent(nodeId)}`;
    }

    console.log(`📡 Making Figma API request to: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'X-Figma-Token': apiKey
      },
      signal: AbortSignal.timeout(options.timeout || 30000)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Figma API error: ${errorData.err || response.statusText}`);
    }

    const figmaData = await response.json();
    
    if (!figmaData) {
      throw new Error('Figma API returned no data');
    }

    return figmaData;
  }

  /**
   * Execute promise with timeout
   * @param {Promise} promise - Promise to execute
   * @param {number} timeout - Timeout in milliseconds
   * @param {string} timeoutMessage - Error message for timeout
   * @returns {Promise}
   */
  async executeWithTimeout(promise, timeout, timeoutMessage) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(timeoutMessage)), timeout);
      })
    ]);
  }

  /**
   * Parse file ID from Figma URL
   * @param {string} url - Figma URL
   * @returns {string|null}
   */
  parseFileId(url) {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/(?:file|design)\/([a-zA-Z0-9]+)/);
      return pathMatch ? pathMatch[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Parse node ID from Figma URL
   * @param {string} url - Figma URL
   * @returns {string|null}
   */
  parseNodeId(url) {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      let nodeId = urlObj.searchParams.get('node-id');
      if (nodeId) {
        nodeId = decodeURIComponent(nodeId);
        // Convert hyphen format (5607-29953) to colon format (5607:29953) for Figma API
        return nodeId.replace('-', ':');
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get available extraction methods
   * @returns {Array}
   */
  getAvailableMethods() {
    return this.extractionMethods.map(method => ({
      name: method.name,
      description: method.description,
      priority: method.priority
    }));
  }

  /**
   * Test connectivity for all extraction methods
   * @returns {Promise<Object>}
   */
  async testConnectivity() {
    const results = {};

    for (const method of this.extractionMethods) {
      try {
        switch (method.name) {
          case 'figma-mcp':
            const FigmaMCPClient = (await import('../../figma/mcpClient.js')).default;
            const mcpClient = new FigmaMCPClient();
            results[method.name] = await mcpClient.connect();
            break;

          case 'framelink-mcp':
            results[method.name] = typeof globalThis.mcp_Framelink_Figma_MCP_get_figma_data === 'function';
            break;

          case 'figma-api':
            const apiKey = this.config.get?.('figmaApiKey') || process.env.FIGMA_API_KEY;
            results[method.name] = !!apiKey;
            break;

          default:
            results[method.name] = false;
        }
      } catch (error) {
        results[method.name] = false;
      }
    }

    return results;
  }
}
