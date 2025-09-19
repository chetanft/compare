/**
 * Unified Figma Data Adapter
 * Orchestrates different data adapters and provides a single interface
 */

import { FigmaAPIAdapter } from './FigmaAPIAdapter.js';
import { MCPXMLAdapter } from './MCPXMLAdapter.js';
import { FramelinkMCPAdapter } from './FramelinkMCPAdapter.js';

export class FigmaDataAdapter {
  constructor() {
    this.adapters = new Map([
      ['figma-api', new FigmaAPIAdapter()],
      ['figma-mcp', new MCPXMLAdapter()],
      ['framelink-mcp', new FramelinkMCPAdapter()]
    ]);
  }

  /**
   * Normalize data from any source to standardized format
   * @param {any} rawData - Raw data from extraction source
   * @param {string} sourceFormat - Source format identifier
   * @param {Object} context - Additional context (url, fileId, nodeId, etc.)
   * @returns {StandardizedFigmaData}
   */
  normalize(rawData, sourceFormat, context = {}) {
    const adapter = this.adapters.get(sourceFormat);
    
    if (!adapter) {
      throw new Error(`Unsupported source format: ${sourceFormat}`);
    }

    if (!adapter.validate(rawData)) {
      throw new Error(`Invalid data structure for format: ${sourceFormat}`);
    }

    try {
      return adapter.transform(rawData, context);
    } catch (error) {
      throw new Error(`Data transformation failed for ${sourceFormat}: ${error.message}`);
    }
  }

  /**
   * Auto-detect data format and normalize
   * @param {any} rawData - Raw data from extraction source
   * @param {Object} context - Additional context
   * @returns {StandardizedFigmaData}
   */
  autoNormalize(rawData, context = {}) {
    // Try to detect format based on data structure
    const detectedFormat = this.detectFormat(rawData);
    
    if (detectedFormat) {
      return this.normalize(rawData, detectedFormat, context);
    }

    throw new Error('Could not auto-detect data format');
  }

  /**
   * Detect data format based on structure
   * @param {any} rawData - Raw data to analyze
   * @returns {string|null}
   */
  detectFormat(rawData) {
    // Check for MCP XML format
    if (rawData && rawData.content && typeof rawData.content === 'string' && rawData.content.includes('<canvas')) {
      return 'figma-mcp';
    }

    // Check for Framelink MCP format
    if (rawData && typeof rawData === 'object') {
      if (rawData.metadata && (rawData.document || rawData.nodes)) {
        return 'framelink-mcp';
      }
      
      // Check for Figma API format
      if (rawData.document || rawData.nodes || (rawData.name && rawData.lastModified)) {
        return 'figma-api';
      }
    }

    return null;
  }

  /**
   * Get available adapter formats
   * @returns {string[]}
   */
  getSupportedFormats() {
    return Array.from(this.adapters.keys());
  }

  /**
   * Validate data for specific format
   * @param {any} rawData - Raw data to validate
   * @param {string} sourceFormat - Source format identifier
   * @returns {boolean}
   */
  validate(rawData, sourceFormat) {
    const adapter = this.adapters.get(sourceFormat);
    return adapter ? adapter.validate(rawData) : false;
  }

  /**
   * Get adapter instance for format
   * @param {string} sourceFormat - Source format identifier
   * @returns {BaseDataAdapter|null}
   */
  getAdapter(sourceFormat) {
    return this.adapters.get(sourceFormat) || null;
  }
}

// Export singleton instance
export const figmaDataAdapter = new FigmaDataAdapter();

// Export individual adapters for direct use
export { FigmaAPIAdapter, MCPXMLAdapter, FramelinkMCPAdapter };
