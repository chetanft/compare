import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mime from 'mime-types';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define base directories for static content
const STATIC_DIRS = {
  reports: path.join(__dirname, '../../output/reports'),
  images: path.join(__dirname, '../../output/images'),
  screenshots: path.join(__dirname, '../../output/screenshots')
};

// Cache control settings
const CACHE_SETTINGS = {
  reports: 'public, max-age=60', // 1 minute for reports
  images: 'public, max-age=86400', // 24 hours for images
  screenshots: 'public, max-age=3600' // 1 hour for screenshots
};

/**
 * Netlify Function to serve static files from output directories
 */
export async function handler(event, context) {
  try {
    // Get the path from the event
    const requestPath = event.path.replace(/^\/\.netlify\/functions\/static\/?/, '');
    
    if (!requestPath) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No file path specified' })
      };
    }
    
    // Determine which directory to use based on the path
    let baseDir = null;
    let cacheControl = 'no-cache';
    
    if (requestPath.startsWith('reports/')) {
      baseDir = STATIC_DIRS.reports;
      cacheControl = CACHE_SETTINGS.reports;
    } else if (requestPath.startsWith('images/')) {
      baseDir = STATIC_DIRS.images;
      cacheControl = CACHE_SETTINGS.images;
    } else if (requestPath.startsWith('screenshots/')) {
      baseDir = STATIC_DIRS.screenshots;
      cacheControl = CACHE_SETTINGS.screenshots;
    } else {
      // Try to infer the directory from the file extension
      if (requestPath.endsWith('.html') || requestPath.endsWith('.json')) {
        baseDir = STATIC_DIRS.reports;
        cacheControl = CACHE_SETTINGS.reports;
      } else if (requestPath.endsWith('.png') || requestPath.endsWith('.jpg') || 
                requestPath.endsWith('.svg') || requestPath.endsWith('.webp')) {
        baseDir = STATIC_DIRS.images;
        cacheControl = CACHE_SETTINGS.images;
      } else {
        // Default to reports directory
        baseDir = STATIC_DIRS.reports;
        cacheControl = CACHE_SETTINGS.reports;
      }
    }
    
    // Construct the full file path
    const filePath = path.join(baseDir, path.basename(requestPath));
    
    // Security check: Prevent path traversal attacks
    if (!filePath.startsWith(baseDir)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Access denied' })
      };
    }
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error(`File not found: ${filePath}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: 'File not found',
          path: requestPath
        })
      };
    }
    
    // Read the file
    const fileContent = await fs.readFile(filePath);
    
    // Determine content type
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    
    // Return the file
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl
      },
      body: contentType.startsWith('text/') || contentType === 'application/json'
        ? fileContent.toString('utf-8')
        : fileContent.toString('base64'),
      isBase64Encoded: !contentType.startsWith('text/') && contentType !== 'application/json'
    };
  } catch (error) {
    console.error('Error serving static file:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error serving file',
        message: error.message
      })
    };
  }
} 