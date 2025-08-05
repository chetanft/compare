/**
 * Figma URL Parser
 * Extracts file ID and node ID from Figma URLs
 */

export class FigmaUrlParser {
  /**
   * Parse a Figma URL to extract file ID and node ID
   * @param {string} url - The Figma URL
   * @returns {Object} - Object containing fileId, nodeId, and other metadata
   */
  static parseUrl(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided');
    }

    // Normalize the URL
    const normalizedUrl = url.trim();
    
    // Check if it's a valid Figma URL
    if (!this.isFigmaUrl(normalizedUrl)) {
      throw new Error('Invalid Figma URL. Must be a figma.com URL.');
    }

    try {
      const urlObj = new URL(normalizedUrl);
      const pathname = urlObj.pathname;
      const searchParams = urlObj.searchParams;

      // Extract file ID from pathname
      const fileId = this.extractFileId(pathname);
      
      // Extract node ID from query parameters
      const nodeId = this.extractNodeId(searchParams);
      
      // Extract additional metadata
      const metadata = this.extractMetadata(pathname, searchParams);

      return {
        fileId,
        nodeId,
        ...metadata,
        originalUrl: url
      };
    } catch (error) {
      throw new Error(`Failed to parse Figma URL: ${error.message}`);
    }
  }

  /**
   * Check if URL is a valid Figma URL
   * @param {string} url - URL to check
   * @returns {boolean}
   */
  static isFigmaUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'www.figma.com' || urlObj.hostname === 'figma.com';
    } catch {
      return false;
    }
  }

  /**
   * Extract file ID from pathname
   * @param {string} pathname - URL pathname
   * @returns {string|null}
   */
  static extractFileId(pathname) {
    // Supported patterns:
    // /file/{fileId}/{fileName}
    // /design/{fileId}/{fileName}
    // /proto/{fileId}/{fileName}
    
    const patterns = [
      /^\/file\/([a-zA-Z0-9]+)/,
      /^\/design\/([a-zA-Z0-9]+)/,
      /^\/proto\/([a-zA-Z0-9]+)/
    ];

    for (const pattern of patterns) {
      const match = pathname.match(pattern);
      if (match) {
        return match[1];
      }
    }

    throw new Error('Could not extract file ID from URL. Make sure it\'s a valid Figma file URL.');
  }

  /**
   * Extract node ID from search parameters
   * @param {URLSearchParams} searchParams - URL search parameters
   * @returns {string|null}
   */
  static extractNodeId(searchParams) {
    // Check for node-id parameter
    const nodeId = searchParams.get('node-id');
    
    if (nodeId) {
      // Node IDs can be in format "123:456" or "123-456" or just "123"
      // Normalize to "123:456" format
      return nodeId.replace('-', ':');
    }

    // Check for legacy formats
    const legacyNodeId = searchParams.get('node_id') || searchParams.get('nodeId');
    if (legacyNodeId) {
      return legacyNodeId.replace('-', ':');
    }

    return null;
  }

  /**
   * Extract additional metadata from URL
   * @param {string} pathname - URL pathname
   * @param {URLSearchParams} searchParams - URL search parameters
   * @returns {Object}
   */
  static extractMetadata(pathname, searchParams) {
    const metadata = {};

    // Extract file name from pathname
    const pathParts = pathname.split('/');
    if (pathParts.length >= 4) {
      metadata.fileName = decodeURIComponent(pathParts[3]);
    }

    // Extract URL type
    if (pathname.startsWith('/file/')) {
      metadata.urlType = 'file';
    } else if (pathname.startsWith('/design/')) {
      metadata.urlType = 'design';
    } else if (pathname.startsWith('/proto/')) {
      metadata.urlType = 'prototype';
    }

    // Extract view mode
    const mode = searchParams.get('mode');
    if (mode) {
      metadata.mode = mode;
    }

    // Extract viewport information
    const viewport = searchParams.get('viewport');
    if (viewport) {
      const coords = viewport.split(',').map(Number);
      if (coords.length >= 2) {
        metadata.viewport = {
          x: coords[0],
          y: coords[1],
          zoom: coords[2] || 1
        };
      }
    }

    // Extract page ID
    const pageId = searchParams.get('page-id');
    if (pageId) {
      metadata.pageId = pageId;
    }

    // Extract scaling information
    const scaling = searchParams.get('scaling');
    if (scaling) {
      metadata.scaling = scaling;
    }

    return metadata;
  }

  /**
   * Validate extracted data
   * @param {Object} parsedData - Parsed URL data
   * @returns {Object} - Validated data
   */
  static validateParsedData(parsedData) {
    const { fileId, nodeId } = parsedData;

    // Validate file ID
    if (!fileId || typeof fileId !== 'string' || fileId.length < 10) {
      throw new Error('Invalid or missing file ID in Figma URL');
    }

    // Validate node ID format if present
    if (nodeId && !/^\d+:\d+$/.test(nodeId)) {
      throw new Error('Invalid node ID format. Expected format: "123:456"');
    }

    return parsedData;
  }

  /**
   * Get Figma API URL from parsed data
   * @param {Object} parsedData - Parsed URL data
   * @returns {string} - Figma API URL
   */
  static getApiUrl(parsedData) {
    const { fileId, nodeId } = parsedData;
    let apiUrl = `https://api.figma.com/v1/files/${fileId}`;
    
    if (nodeId) {
      apiUrl += `/nodes?ids=${nodeId}`;
    }
    
    return apiUrl;
  }

  /**
   * Parse multiple Figma URLs
   * @param {string[]} urls - Array of Figma URLs
   * @returns {Object[]} - Array of parsed URL data
   */
  static parseMultipleUrls(urls) {
    if (!Array.isArray(urls)) {
      throw new Error('URLs must be provided as an array');
    }

    const results = [];
    const errors = [];

    urls.forEach((url, index) => {
      try {
        const parsed = this.parseUrl(url);
        results.push({ index, ...parsed });
      } catch (error) {
        errors.push({ index, url, error: error.message });
      }
    });

    return { results, errors };
  }

  /**
   * Create a new Figma URL with updated parameters
   * @param {string} baseUrl - Original Figma URL
   * @param {Object} updates - Updates to apply
   * @returns {string} - Updated URL
   */
  static updateUrl(baseUrl, updates = {}) {
    try {
      const parsed = this.parseUrl(baseUrl);
      const urlObj = new URL(baseUrl);

      // Update node ID if provided
      if (updates.nodeId !== undefined) {
        if (updates.nodeId) {
          urlObj.searchParams.set('node-id', updates.nodeId);
        } else {
          urlObj.searchParams.delete('node-id');
        }
      }

      // Update other parameters
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'nodeId' && value !== undefined) {
          if (value) {
            urlObj.searchParams.set(key, value);
          } else {
            urlObj.searchParams.delete(key);
          }
        }
      });

      return urlObj.toString();
    } catch (error) {
      throw new Error(`Failed to update URL: ${error.message}`);
    }
  }
}

// Helper functions for common use cases
export const figmaUrlUtils = {
  /**
   * Quick parse - just get file ID and node ID
   * @param {string} url - Figma URL
   * @returns {Object} - {fileId, nodeId}
   */
  quickParse: (url) => {
    const parsed = FigmaUrlParser.parseUrl(url);
    return {
      fileId: parsed.fileId,
      nodeId: parsed.nodeId
    };
  },

  /**
   * Check if URL has a specific node
   * @param {string} url - Figma URL
   * @returns {boolean}
   */
  hasNode: (url) => {
    try {
      const parsed = FigmaUrlParser.parseUrl(url);
      return !!parsed.nodeId;
    } catch {
      return false;
    }
  },

  /**
   * Get file ID from URL
   * @param {string} url - Figma URL
   * @returns {string}
   */
  getFileId: (url) => {
    const parsed = FigmaUrlParser.parseUrl(url);
    return parsed.fileId;
  },

  /**
   * Get node ID from URL
   * @param {string} url - Figma URL
   * @returns {string|null}
   */
  getNodeId: (url) => {
    const parsed = FigmaUrlParser.parseUrl(url);
    return parsed.nodeId;
  }
};

// Export default
export default FigmaUrlParser;

/**
 * Simple function to parse a Figma URL and extract fileId and nodeId
 * @param {string} url - Figma URL to parse
 * @returns {Object} - Object containing fileId and nodeId
 */
export function parseFigmaUrl(url) {
  try {
    if (!url || typeof url !== 'string') {
      return { fileId: null, nodeId: null };
    }

    const patterns = [
      /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/,
      /figma\.com\/proto\/([a-zA-Z0-9]+)/
    ];
    
    let fileId = null;
    
    // Extract file ID from URL
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        fileId = match[1];
        break;
      }
    }
    
    // Extract node ID from URL
    let nodeId = null;
    const nodeIdMatch = url.match(/[?&]node-id=([^&]+)/);
    if (nodeIdMatch) {
      // Convert hyphen to colon for Figma API format if needed
      nodeId = nodeIdMatch[1].includes('-') ? 
        nodeIdMatch[1].replace('-', ':') : 
        nodeIdMatch[1];
    }
    
    return { fileId, nodeId };
  } catch (error) {
    console.error('Error parsing Figma URL:', error);
    return { fileId: null, nodeId: null };
  }
} 