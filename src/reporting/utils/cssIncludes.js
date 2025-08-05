/**
 * CSS Includes Utility
 * Generates CSS links and inline fallbacks for HTML reports
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STYLES_DIR = path.join(__dirname, '../styles');

/**
 * Generate CSS links for external stylesheets
 * @param {string[]} cssFiles - Array of CSS filenames (without .css extension)
 * @param {string} baseUrl - Base URL for CSS files (optional, for served reports)
 * @returns {string} HTML link tags
 */
export function generateCSSLinks(cssFiles = ['base', 'components', 'themes', 'interactive'], baseUrl = '') {
  return cssFiles
    .map(file => {
      const href = baseUrl ? `${baseUrl}/styles/${file}.css` : `./styles/${file}.css`;
      return `<link rel="stylesheet" href="${href}">`;
    })
    .join('\n  ');
}

/**
 * Generate inline CSS for standalone reports
 * @param {string[]} cssFiles - Array of CSS filenames (without .css extension)
 * @returns {Promise<string>} CSS content wrapped in style tags
 */
export async function generateInlineCSS(cssFiles = ['base', 'components', 'themes', 'interactive']) {
  try {
    const cssContents = await Promise.all(
      cssFiles.map(async file => {
        const filePath = path.join(STYLES_DIR, `${file}.css`);
        try {
          return await fs.readFile(filePath, 'utf8');
        } catch (error) {
          console.warn(`Warning: Could not read CSS file ${file}.css, skipping`);
          return '';
        }
      })
    );

    const combinedCSS = cssContents.filter(content => content).join('\n\n');
    
    return `<style>\n${combinedCSS}\n</style>`;
  } catch (error) {
    console.error('Error generating inline CSS:', error);
    return '<style>/* CSS generation failed */</style>';
  }
}

/**
 * Generate CSS includes with fallback strategy
 * @param {Object} options - Configuration options
 * @param {string[]} options.cssFiles - CSS files to include
 * @param {boolean} options.inline - Whether to use inline CSS (for standalone reports)
 * @param {string} options.baseUrl - Base URL for external CSS files
 * @returns {Promise<string>} CSS includes HTML
 */
export async function generateCSSIncludes(options = {}) {
  const {
    cssFiles = ['base', 'components', 'themes', 'interactive'],
    inline = false,
    baseUrl = ''
  } = options;

  if (inline) {
    return await generateInlineCSS(cssFiles);
  } else {
    // For served reports, use external links with inline fallback
    const links = generateCSSLinks(cssFiles, baseUrl);
    const fallbackCSS = await generateInlineCSS(cssFiles);
    
    return `${links}
  <noscript>
    ${fallbackCSS}
  </noscript>`;
  }
}

/**
 * Check if CSS files exist
 * @param {string[]} cssFiles - CSS files to check
 * @returns {Promise<boolean>} True if all files exist
 */
export async function validateCSSFiles(cssFiles = ['base', 'components', 'themes', 'interactive']) {
  try {
    const checks = await Promise.all(
      cssFiles.map(async file => {
        const filePath = path.join(STYLES_DIR, `${file}.css`);
        try {
          await fs.access(filePath);
          return true;
        } catch {
          return false;
        }
      })
    );
    
    return checks.every(exists => exists);
  } catch {
    return false;
  }
} 