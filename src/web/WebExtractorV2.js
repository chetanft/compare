/**
 * Enhanced Web Extractor V2
 * Uses browser pool, proper error handling, and modular architecture
 */

import { getBrowserPool } from '../browser/BrowserPool.js';
import { loadConfig } from '../config/index.js';

export class WebExtractorV2 {
  constructor() {
    this.browserPool = getBrowserPool();
    this.config = null;
    this.activeExtractions = new Map(); // extractionId -> { pageId, controller }
  }

  async initialize() {
    if (!this.config) {
      this.config = await loadConfig();
    }
  }

  /**
   * Extract web data with improved architecture
   */
  async extractWebData(url, options = {}) {
    await this.initialize();
    
    const extractionId = this.generateExtractionId();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, options.timeout || this.config.timeouts.webExtraction);

    try {
      // Validate URL
      this.validateUrl(url);
      
      // Create managed page
      const { page, pageId } = await this.browserPool.createPage({
        width: options.viewport?.width,
        height: options.viewport?.height,
        userAgent: options.userAgent
      });

      // Track extraction
      this.activeExtractions.set(extractionId, { pageId, controller });

      // Set up abort handling
      const abortPromise = new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('Extraction aborted due to timeout'));
        });
      });

      // Navigate with proper error handling
      await Promise.race([
        this.navigateToPage(page, url, options),
        abortPromise
      ]);

      // Handle authentication if provided
      if (options.authentication) {
        await Promise.race([
          this.handleAuthentication(page, options.authentication),
          abortPromise
        ]);
      }

      // Extract data
      const extractionResult = await Promise.race([
        this.performExtraction(page, url, options),
        abortPromise
      ]);

      // Capture screenshot if requested
      let screenshot = null;
      if (options.includeScreenshot !== false) {
        try {
          screenshot = await this.captureScreenshot(page, options.screenshot);
        } catch (screenshotError) {
          console.warn('Screenshot capture failed:', screenshotError.message);
        }
      }

      return {
        url,
        extractedAt: new Date().toISOString(),
        screenshot,
        ...extractionResult
      };

    } catch (error) {
      throw new Error(`Web extraction failed: ${error.message}`);
    } finally {
      clearTimeout(timeoutId);
      await this.cleanup(extractionId);
    }
  }

  /**
   * Validate URL for security
   */
  validateUrl(url) {
    try {
      const parsed = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are allowed');
      }

      // Check for private/localhost IPs if security restrictions are enabled
      if (this.config.security.allowedHosts.length > 0) {
        const hostname = parsed.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        const isPrivateIP = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(hostname);
        
        if (isLocalhost || isPrivateIP) {
          const isAllowed = this.config.security.allowedHosts.some(allowed => 
            hostname.includes(allowed)
          );
          if (!isAllowed) {
            throw new Error('URL not in allowed hosts list');
          }
        }
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Invalid URL format');
      }
      throw error;
    }
  }

  /**
   * Navigate to page with retry logic
   */
  async navigateToPage(page, url, options) {
    const maxRetries = 3;
    const baseTimeout = Math.max(this.config?.timeouts?.webExtraction || 30000, 45000);
    const strategies = [
      { waitUntil: 'domcontentloaded', timeout: baseTimeout },
      { waitUntil: 'load', timeout: baseTimeout },
      { waitUntil: 'networkidle2', timeout: baseTimeout }
    ];

    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      const strategy = strategies[i] || strategies[strategies.length - 1];
      
      try {
        await page.goto(url, strategy);
        return; // Success
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries - 1) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw new Error(`Navigation failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Handle authentication (simplified version)
   */
  async handleAuthentication(page, auth) {
    if (!auth || !auth.type) {
      return;
    }

    if (auth.type === 'form' && auth.username && auth.password) {
      // Wait for form elements
      await page.waitForSelector('input[type="password"], input[name*="password"]', {
        timeout: Math.max(this.config?.nextVersion?.authentication?.selectorTimeout || 15000, 20000)
      });

      // Fill credentials
      const usernameSelectors = [
        'input[type="email"]',
        'input[type="text"]',
        'input[name*="username"]',
        'input[name*="user"]',
        'input[name*="email"]'
      ];

      for (const selector of usernameSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          await page.type(selector, auth.username);
          break;
        } catch (e) {
          // Try next selector
        }
      }

      // Fill password
      await page.type('input[type="password"]', auth.password);

      // Submit form
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Login")',
        'button:contains("Sign in")'
      ];

      for (const selector of submitSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          await page.click(selector);
          break;
        } catch (e) {
          // Try next selector
        }
      }

      // Wait for navigation
      try {
        await page.waitForNavigation({ 
          waitUntil: 'networkidle0', 
          timeout: Math.max(this.config?.timeouts?.webExtraction || 30000, 45000) 
        });
      } catch (e) {
        // Navigation might not happen if form is submitted via AJAX
      }
    }
  }

  /**
   * Perform DOM extraction (streamlined version)
   */
  async performExtraction(page, url, options) {
    // Wait for page to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    const extraction = await page.evaluate((pageUrl) => {
      const elements = [];
      const colorPalette = new Set();
      const typography = {
        fontFamilies: new Set(),
        fontSizes: new Set(),
        fontWeights: new Set()
      };

      // COMPREHENSIVE EXTRACTION: Extract all meaningful content
      
      // 1. SEMANTIC ELEMENTS - Extract by HTML semantics
      const semanticSelectors = [
        'h1, h2, h3, h4, h5, h6',                    // Headings
        'p',                                         // Paragraphs
        'article, section, main, aside',             // Content areas
        'nav, [role="navigation"]',                  // Navigation
        'header, [role="banner"]',                   // Headers
        'footer, [role="contentinfo"]',              // Footers
        'button, [role="button"]',                   // Buttons
        'a[href]',                                   // Links
        'form',                                      // Forms
        'input, textarea, select',                   // Form inputs
        'table, [role="table"]',                     // Tables
        'ul, ol, dl',                               // Lists
        'img, [role="img"]',                        // Images
        'div[class*="content"], div[class*="text"]', // Content divs
        '[role="main"], [role="article"]'           // ARIA main content
      ];

      semanticSelectors.forEach((selector, selectorIndex) => {
        try {
          const nodeList = document.querySelectorAll(selector);
          nodeList.forEach((element, elemIndex) => {
            if (elements.length >= 1000) return; // Increased limit

            const rect = element.getBoundingClientRect();
            if (rect.width > 5 && rect.height > 5) { // Lower threshold
              const styles = window.getComputedStyle(element);
              
              // Skip invisible elements
              if (styles.display === 'none' || styles.visibility === 'hidden' || 
                  parseFloat(styles.opacity) < 0.1) {
                return;
              }

              // Extract colors
              if (styles.color && styles.color !== 'rgba(0, 0, 0, 0)') {
                colorPalette.add(styles.color);
              }
              if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                colorPalette.add(styles.backgroundColor);
              }

              // Extract typography
              if (styles.fontFamily) {
                typography.fontFamilies.add(styles.fontFamily.split(',')[0].trim());
              }
              if (styles.fontSize) {
                typography.fontSizes.add(styles.fontSize);
              }
              if (styles.fontWeight) {
                typography.fontWeights.add(styles.fontWeight);
              }

              // Get text content
              const textContent = element.textContent?.trim() || '';
              
              // Only include elements with meaningful content or visual significance
              const hasText = textContent.length > 0;
              const hasBackground = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
              const hasBorder = styles.borderWidth !== '0px';
              const isLarge = rect.width * rect.height > 100;
              const isImage = element.tagName.toLowerCase() === 'img';
              const isInteractive = ['button', 'a', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase());
              
              if (hasText || hasBackground || hasBorder || isLarge || isImage || isInteractive) {
                elements.push({
                  id: `element-${selectorIndex}-${elemIndex}`,
                  type: element.tagName.toLowerCase(),
                  text: textContent.slice(0, 200),
                  className: element.className || '',
                  rect: {
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                  },
                  styles: {
                    color: styles.color,
                    backgroundColor: styles.backgroundColor,
                    fontSize: styles.fontSize,
                    fontFamily: styles.fontFamily,
                    fontWeight: styles.fontWeight
                  },
                  attributes: {
                    href: element.href || '',
                    alt: element.alt || '',
                    src: element.src || '',
                    role: element.getAttribute('role') || ''
                  },
                  source: 'web'
                });
              }
            }
          });
        } catch (error) {
          console.warn(`Error processing selector ${selector}:`, error);
        }
      });

      // 2. VISUAL ELEMENTS - Extract visually significant elements
      const allElements = document.querySelectorAll('*');
      let visualCount = 0;
      allElements.forEach((element, index) => {
        if (elements.length >= 1000 || visualCount >= 200) return;

        const rect = element.getBoundingClientRect();
        const styles = window.getComputedStyle(element);
        
        // Check for visual significance
        const isVisuallySignificant = (
          rect.width * rect.height > 1000 ||               // Large area
          parseFloat(styles.fontSize) > 18 ||              // Large text
          styles.fontWeight === 'bold' || parseInt(styles.fontWeight) >= 600 ||  // Bold text
          styles.backgroundColor !== 'rgba(0, 0, 0, 0)' || // Has background
          styles.borderWidth !== '0px' ||                  // Has border
          styles.boxShadow !== 'none'                      // Has shadow
        );

        if (isVisuallySignificant && 
            rect.width > 10 && rect.height > 10 &&
            styles.display !== 'none' && 
            styles.visibility !== 'hidden' &&
            parseFloat(styles.opacity) > 0.1) {
          
          // Check if this element is already captured by semantic selectors
          const alreadyCaptured = elements.some(el => 
            Math.abs(el.rect.x - rect.x) < 5 && 
            Math.abs(el.rect.y - rect.y) < 5 &&
            Math.abs(el.rect.width - rect.width) < 5 &&
            Math.abs(el.rect.height - rect.height) < 5
          );

          if (!alreadyCaptured) {
            elements.push({
              id: `visual-${index}`,
              type: element.tagName.toLowerCase(),
              text: element.textContent?.trim().slice(0, 100) || '',
              className: element.className || '',
              rect: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              },
              styles: {
                color: styles.color,
                backgroundColor: styles.backgroundColor,
                fontSize: styles.fontSize,
                fontFamily: styles.fontFamily,
                fontWeight: styles.fontWeight,
                boxShadow: styles.boxShadow,
                borderRadius: styles.borderRadius
              },
              source: 'web-visual'
            });
            visualCount++;
          }
        }
      });

      return {
        elements,
        colorPalette: Array.from(colorPalette).slice(0, 50),
        typography: {
          fontFamilies: Array.from(typography.fontFamilies).slice(0, 20),
          fontSizes: Array.from(typography.fontSizes).slice(0, 20),
          fontWeights: Array.from(typography.fontWeights).slice(0, 10)
        },
        metadata: {
          title: document.title,
          url: pageUrl,
          elementCount: elements.length
        }
      };
    }, url);

    return extraction;
  }

  /**
   * Capture screenshot
   */
  async captureScreenshot(page, options = {}) {
    try {
      const screenshot = await page.screenshot({
        type: options.type || 'png',
        quality: options.quality || 80,
        fullPage: options.fullPage !== false,
        encoding: 'base64'
      });
      
      return {
        data: screenshot,
        type: options.type || 'png',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Screenshot capture failed:', error.message);
      return null;
    }
  }

  /**
   * Generate extraction ID
   */
  generateExtractionId() {
    return `extraction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup extraction resources
   */
  async cleanup(extractionId) {
    const extraction = this.activeExtractions.get(extractionId);
    if (extraction) {
      const { pageId, controller } = extraction;
      
      // Abort if still running
      if (!controller.signal.aborted) {
        controller.abort();
      }
      
      // Close page
      await this.browserPool.closePage(pageId);
      
      // Remove from active extractions
      this.activeExtractions.delete(extractionId);
    }
  }

  /**
   * Get active extractions count
   */
  getActiveExtractions() {
    return this.activeExtractions.size;
  }

  /**
   * Cancel specific extraction
   */
  async cancelExtraction(extractionId) {
    const extraction = this.activeExtractions.get(extractionId);
    if (extraction) {
      extraction.controller.abort();
      await this.cleanup(extractionId);
    }
  }

  /**
   * Cancel all active extractions
   */
  async cancelAllExtractions() {
    const extractionIds = Array.from(this.activeExtractions.keys());
    await Promise.allSettled(
      extractionIds.map(id => this.cancelExtraction(id))
    );
  }
}

export default WebExtractorV2; 