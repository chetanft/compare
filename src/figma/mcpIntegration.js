/**
 * Enhanced Figma MCP Integration
 * Supports both Official Figma Dev Mode MCP Server and third-party MCP tools
 * Fallback to Figma REST API when MCP is not available
 * NO SIMULATION MODE - Only real data
 */

import mcpBridge from './mcpBridge.js';
import { config, getMCPUrl } from '../config/environment.js';

class FigmaMCPIntegration {
  constructor(configOverride = null) {
    this.config = configOverride || config;
    this.mcpTools = null;
    this.isInitialized = false;
    this.mcpType = null; // 'official', 'third-party', 'api', or null
    
    this._officialMCPAvailable = false;
    this._thirdPartyMCPAvailable = false;
    this._figmaAPIAvailable = false;
  }

  /**
   * Initialize MCP integration with automatic detection
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🔧 Initializing Figma MCP Integration...');

    // Check configuration and available methods
    if (this.config?.mcp?.thirdParty?.enabled) {
      try {
        console.log('🔍 Checking third-party MCP tools availability...');
        const thirdPartyAvailable = await this.checkThirdPartyMCPAvailability();
        
        if (thirdPartyAvailable) {
          console.log('✅ Third-party MCP tools available');
          this.mcpType = 'third-party';
          this._thirdPartyMCPAvailable = true;
          this.isInitialized = true;
          return;
        }
      } catch (error) {
        console.warn(`⚠️ Third-party MCP tools not available: ${error.message}`);
      }
    }

    if (this.config?.mcp?.official?.enabled) {
      try {
        console.log('🔍 Checking official Figma MCP server availability...');
        const officialAvailable = await this.checkOfficialMCPAvailability();
        
        if (officialAvailable) {
          console.log('✅ Official Figma MCP server available');
          this.mcpType = 'official';
          this._officialMCPAvailable = true;
          this.isInitialized = true;
          return;
        }
      } catch (error) {
        console.warn(`⚠️ Official Figma MCP server not available: ${error.message}`);
      }
    }

    // Fallback to Figma API
    if (this.config?.figma?.accessToken || process.env.FIGMA_API_KEY) {
      console.log('🔍 Falling back to Figma API');
      this.mcpType = 'api';
      this._figmaAPIAvailable = true;
      this.isInitialized = true;
      return;
    }

    console.warn('⚠️ No Figma integration methods available');
    this.isInitialized = true;
  }

  /**
   * Check if third-party MCP tools are available
   * @returns {Promise<boolean>}
   */
  async checkThirdPartyMCPAvailability() {
    try {
      console.log('🔍 Checking third-party MCP tools availability...');
      
      // Try to initialize the MCP bridge
      const mcpBridgeAvailable = mcpBridge.isAvailable();
      
      if (!mcpBridgeAvailable) {
        console.log('⚠️ MCP Bridge not available');
        return false;
      }
      
      // Store the MCP tools reference
      this.mcpTools = mcpBridge.getTools();
      
      // Test if the tools are actually functional
      if (typeof this.mcpTools?.getFigmaData !== 'function') {
        console.log('⚠️ MCP tools do not have required methods');
        return false;
      }
      
      console.log('✅ Third-party MCP tools are available');
      return true;
    } catch (error) {
      console.error('❌ Error checking third-party MCP tools:', error);
      return false;
    }
  }

  /**
   * Check if official Figma MCP server is available
   * @returns {Promise<boolean>}
   */
  async checkOfficialMCPAvailability() {
    try {
      console.log('🔍 Checking official Figma MCP server availability...');
      
      const serverUrl = this.config?.mcp?.official?.serverUrl || 'http://127.0.0.1:3845';
      const endpoint = this.config?.mcp?.official?.endpoint || '/sse';
      
      const url = `${serverUrl}${endpoint}`;
      console.log(`🔗 Testing connection to ${url}`);
      
      const response = await fetch(url, { 
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      
      if (!response.ok) {
        console.log(`⚠️ MCP server responded with ${response.status}`);
        return false;
      }
      
      console.log('✅ Official Figma MCP server is available');
      return true;
    } catch (error) {
      console.error('❌ Error checking official Figma MCP server:', error);
      return false;
    }
  }

  /**
   * Get the current MCP integration type
   * @returns {string|null} 'official', 'third-party', 'api', or null
   */
  getMCPType() {
    return this.mcpType;
  }

  /**
   * Check if official Figma MCP is available
   * @returns {boolean}
   */
  isOfficialMCPAvailable() {
    return this._officialMCPAvailable;
  }

  /**
   * Check if third-party MCP tools are available
   * @returns {boolean}
   */
  isThirdPartyMCPAvailable() {
    return this._thirdPartyMCPAvailable;
  }

  /**
   * Check if Figma API is available
   * @returns {boolean}
   */
  isFigmaAPIAvailable() {
    return this._figmaAPIAvailable;
  }

  /**
   * Extract Figma data using the available method
   * @param {string} fileKey - Figma file key
   * @param {string} nodeId - Optional node ID
   * @param {number} depth - Traversal depth
   * @returns {Promise<Object>} Figma data
   */
  async getFigmaData(fileKey, nodeId = null, depth = 5) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.mcpType === 'third-party' && this.mcpTools) {
      try {
        console.log('🔄 Using third-party MCP tools to extract Figma data');
        return await this.mcpTools.getFigmaData(fileKey, nodeId, depth);
      } catch (error) {
        console.error('❌ Third-party MCP extraction failed:', error);
        throw error;
      }
    } else if (this.mcpType === 'official') {
      try {
        console.log('🔄 Using official Figma MCP server to extract Figma data');
        // Implementation for official MCP server would go here
        throw new Error('Official MCP server extraction not implemented yet');
      } catch (error) {
        console.error('❌ Official MCP extraction failed:', error);
        throw error;
      }
    } else if (this.mcpType === 'api') {
      throw new Error('Direct API extraction should be handled by RobustFigmaExtractor');
    } else {
      throw new Error('No Figma integration methods available');
    }
  }

  /**
   * Download Figma images using the available method
   * @param {string} fileKey - Figma file key
   * @param {Array} nodes - Array of node objects
   * @param {string} localPath - Local path to save images
   * @returns {Promise<Object>} Download results
   */
  async downloadFigmaImages(fileKey, nodes, localPath, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.mcpType === 'third-party' && this.mcpTools) {
      try {
        console.log('🔄 Using third-party MCP tools to download Figma images');
        return await this.mcpTools.downloadFigmaImages(fileKey, nodes, localPath, options);
      } catch (error) {
        console.error('❌ Third-party MCP image download failed:', error);
        throw error;
      }
    } else if (this.mcpType === 'official') {
      try {
        console.log('🔄 Using official Figma MCP server to download images');
        // Implementation for official MCP server would go here
        throw new Error('Official MCP server image download not implemented yet');
      } catch (error) {
        console.error('❌ Official MCP image download failed:', error);
        throw error;
      }
    } else if (this.mcpType === 'api') {
      throw new Error('Direct API image download should be handled by RobustFigmaExtractor');
    } else {
      throw new Error('No Figma integration methods available');
    }
  }
}

export default FigmaMCPIntegration; 