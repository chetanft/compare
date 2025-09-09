/**
 * Figma URL Parser
 * Robust parsing and validation of Figma URLs
 */

export interface ParsedFigmaUrl {
  fileKey: string;
  nodeId: string | null;
  fileName?: string;
  originalUrl: string;
}

/**
 * Parse and validate a Figma URL
 */
export function parseFigmaUrl(url: string): ParsedFigmaUrl {
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required and must be a string');
  }

  // Clean up the URL
  const cleanUrl = url.trim();
  
  if (!cleanUrl.includes('figma.com')) {
    throw new Error('URL must be a Figma URL (figma.com)');
  }

  try {
    const urlObj = new URL(cleanUrl);
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    // Extract file key from path
    // Patterns: /file/KEY/NAME or /design/KEY/NAME
    const pathMatch = pathname.match(/\/(file|design)\/([a-zA-Z0-9]+)/);
    
    if (!pathMatch) {
      throw new Error('Could not extract file key from Figma URL');
    }

    const fileKey = pathMatch[2];
    
    if (!fileKey || fileKey.length < 10) {
      throw new Error('Invalid Figma file key');
    }

    // Extract node ID from URL parameters or hash
    let nodeId: string | null = null;
    
    // Check URL parameters
    if (searchParams.has('node-id')) {
      nodeId = searchParams.get('node-id');
    }
    
    // Check hash fragment
    if (!nodeId && urlObj.hash) {
      const hashMatch = urlObj.hash.match(/node-id=([^&]+)/);
      if (hashMatch) {
        nodeId = hashMatch[1];
      }
    }

    // Extract file name from path
    let fileName: string | undefined;
    const nameMatch = pathname.match(/\/[a-zA-Z0-9]+\/(.+)$/);
    if (nameMatch) {
      fileName = decodeURIComponent(nameMatch[1]).replace(/-/g, ' ');
    }

    return {
      fileKey,
      nodeId,
      fileName,
      originalUrl: cleanUrl
    };
  } catch (error: any) {
    if (error.message.includes('Invalid URL')) {
      throw new Error('Invalid URL format');
    }
    throw error;
  }
}

/**
 * Validate if a string looks like a Figma URL
 */
export function isValidFigmaUrl(url: string): boolean {
  try {
    parseFigmaUrl(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract just the file key from a Figma URL
 */
export function extractFileKey(url: string): string {
  const parsed = parseFigmaUrl(url);
  return parsed.fileKey;
}

/**
 * Extract just the node ID from a Figma URL
 */
export function extractNodeId(url: string): string | null {
  const parsed = parseFigmaUrl(url);
  return parsed.nodeId;
}

/**
 * Create a clean Figma URL from components
 */
export function buildFigmaUrl(fileKey: string, fileName?: string, nodeId?: string): string {
  let url = `https://www.figma.com/design/${fileKey}`;
  
  if (fileName) {
    const cleanName = fileName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    url += `/${cleanName}`;
  } else {
    url += '/Untitled';
  }
  
  if (nodeId) {
    url += `?node-id=${nodeId}`;
  }
  
  return url;
}
