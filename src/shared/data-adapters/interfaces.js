/**
 * Standardized Data Interfaces
 * Common data structures regardless of extraction source
 */

/**
 * @typedef {Object} StandardizedComponent
 * @property {string} id - Unique component identifier
 * @property {string} name - Component name
 * @property {string} type - Component type (FRAME, INSTANCE, TEXT, COMPONENT, etc.)
 * @property {Object} properties - Component-specific properties
 * @property {Object} [metadata] - Additional metadata
 * @property {StandardizedComponent[]} [children] - Child components
 */

/**
 * @typedef {Object} StandardizedColor
 * @property {string} id - Unique color identifier
 * @property {string} name - Color name
 * @property {string} value - Color value (hex, rgb, etc.)
 * @property {string} type - Color type (fill, stroke, background, etc.)
 * @property {string} source - Source of extraction
 */

/**
 * @typedef {Object} StandardizedTypography
 * @property {string} id - Unique typography identifier
 * @property {string} name - Typography name
 * @property {string} fontFamily - Font family
 * @property {number} fontSize - Font size
 * @property {number} fontWeight - Font weight
 * @property {string} [text] - Text content if applicable
 * @property {string} source - Source of extraction
 */

/**
 * @typedef {Object} StandardizedFigmaData
 * @property {string} fileId - Figma file identifier
 * @property {string} [nodeId] - Specific node identifier
 * @property {string} figmaUrl - Original Figma URL
 * @property {string} extractionMethod - Method used for extraction
 * @property {string} extractedAt - ISO timestamp
 * @property {Object} metadata - Extraction metadata
 * @property {string} metadata.fileName - File name
 * @property {number} metadata.componentCount - Number of components
 * @property {number} metadata.colorCount - Number of colors
 * @property {number} metadata.typographyCount - Number of typography elements
 * @property {StandardizedComponent[]} components - Extracted components
 * @property {StandardizedColor[]} colors - Extracted colors
 * @property {StandardizedTypography[]} typography - Extracted typography
 * @property {Object} [rawData] - Original raw data for debugging
 */

/**
 * Base class for data adapters
 */
export class BaseDataAdapter {
  constructor(sourceType) {
    this.sourceType = sourceType;
  }

  /**
   * Transform raw data to standardized format
   * @param {any} rawData - Raw data from extraction source
   * @param {Object} context - Additional context (url, fileId, nodeId, etc.)
   * @returns {StandardizedFigmaData}
   */
  transform(rawData, context = {}) {
    throw new Error('transform() must be implemented by subclass');
  }

  /**
   * Validate raw data structure
   * @param {any} rawData - Raw data to validate
   * @returns {boolean}
   */
  validate(rawData) {
    return rawData != null;
  }

  /**
   * Extract basic metadata from context
   * @param {Object} context - Context object
   * @returns {Object}
   */
  extractBaseMetadata(context) {
    return {
      fileId: context.fileId || this.parseFileId(context.figmaUrl) || 'unknown',
      nodeId: context.nodeId || this.parseNodeId(context.figmaUrl) || null,
      figmaUrl: context.figmaUrl || '',
      extractedAt: new Date().toISOString(),
      extractionMethod: this.sourceType
    };
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
}
