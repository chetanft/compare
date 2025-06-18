/**
 * Extract node ID from Figma URL
 * @param {string} url - Figma URL
 * @returns {string|null} - Extracted node ID or null
 */
export function extractNodeIdFromUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // Handle both old and new Figma URL formats
    const nodeIdParam = urlObj.searchParams.get('node-id');
    if (nodeIdParam) {
      // Convert hyphen to colon for Figma API format
      return nodeIdParam.replace('-', ':');
    }

    // Old format: extract from pathname
    const matches = urlObj.pathname.match(/node-id=([^&]+)/);
    if (matches && matches[1]) {
      return matches[1].replace('-', ':');
    }

    return null;
  } catch (error) {
    console.error('Error parsing Figma URL:', error);
    return null;
  }
}

/**
 * Extract file key from Figma URL
 * @param {string} url - Figma URL
 * @returns {string|null} - Extracted file key or null
 */
export function extractFigmaFileKey(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Find the file key in the URL path
    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i] === 'file' || pathParts[i] === 'design') {
        return pathParts[i + 1];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting Figma file key:', error);
    return null;
  }
} 