/**
 * URL Parser Utilities
 * Handles parsing of Figma URLs and other URL-related operations
 */

/**
 * Parse Figma URL to extract file ID and node ID
 * @param {string} url - Figma URL
 * @returns {Object} Parsed URL data
 */
export function parseFigmaUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL provided');
  }

  try {
    const urlObj = new URL(url);
    
    // Check if it's a Figma URL
    if (!urlObj.hostname.includes('figma.com')) {
      throw new Error('Not a valid Figma URL');
    }

    // Extract file ID from path
    const pathParts = urlObj.pathname.split('/');
    const fileIndex = pathParts.findIndex(part => part === 'file' || part === 'design');
    
    if (fileIndex === -1 || fileIndex + 1 >= pathParts.length) {
      throw new Error('Could not extract file ID from URL');
    }

    const fileId = pathParts[fileIndex + 1];
    
    // Extract node ID from URL parameters or hash
    let nodeId = null;
    
    // Check URL parameters
    const nodeIdParam = urlObj.searchParams.get('node-id');
    if (nodeIdParam) {
      // Figma web often encodes colon as '-' in node-id. Normalize to ':' for API.
      nodeId = nodeIdParam.includes(':') ? nodeIdParam : nodeIdParam.replace(/-/g, ':');
    }
    
    // Check hash fragment
    if (!nodeId && urlObj.hash) {
      const hashMatch = urlObj.hash.match(/node-id=([^&]+)/);
      if (hashMatch) {
        nodeId = hashMatch[1];
      }
    }

    return {
      fileId,
      nodeId,
      originalUrl: url,
      isValid: true
    };

  } catch (error) {
    throw new Error(`Failed to parse Figma URL: ${error.message}`);
  }
}

/**
 * Validate if URL is accessible
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL appears valid
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
