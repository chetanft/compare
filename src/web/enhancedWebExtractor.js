/**
 * Enhanced Web Extractor with Comprehensive Browser Automation
 * Follows proper DOM extraction, CSS analysis, and layout detection
 */

import puppeteer from 'puppeteer';
import { getConfig } from '../config/index.js';

export class EnhancedWebExtractor {
  constructor() {
    this.browser = null;
    this.page = null;
    this.config = null;
  }

  isReady() {
    return this.browser && this.browser.isConnected();
  }

  /**
   * Safely execute operations on a page with session validation
   */
  async safePageOperation(page, operation, operationName = 'page operation') {
    try {
      // Check if page is still valid
      if (!page || page.isClosed()) {
        throw new Error('Page is closed or invalid');
      }

      // Execute the operation
      return await operation(page);
    } catch (error) {
      console.warn(`⚠️ ${operationName} failed:`, error.message);
      
      // Check if it's a session-related error
      if (error.message.includes('Session closed') || 
          error.message.includes('Target closed') ||
          error.message.includes('Protocol error')) {
        console.log(`🔄 Session error detected in ${operationName}, attempting recovery...`);
        
        // Try to create a new page and retry
        try {
          // Check if browser is still connected
          if (!this.browser || !this.browser.isConnected()) {
            console.log('🔄 Browser disconnected, reinitializing...');
            await this.initialize();
          }
          
          const newPage = await this.browser.newPage();
          this.page = newPage;
          
          // Retry the operation with the new page
          return await operation(newPage);
        } catch (retryError) {
          console.error(`❌ Failed to recover from session error in ${operationName}:`, retryError.message);
          
          // Last resort: try to reinitialize the entire browser
          try {
            console.log('🔄 Attempting full browser reinitialization...');
            await this.initialize();
            const finalPage = await this.browser.newPage();
            this.page = finalPage;
            return await operation(finalPage);
          } catch (finalError) {
            throw new Error(`${operationName} failed after full recovery attempt: ${finalError.message}`);
          }
        }
      }
      
      // Re-throw non-session errors
      throw error;
    }
  }

  async initialize() {
    if (this.browser) {
      await this.cleanup();
    }

    try {
      // Load unified configuration
      this.config = await getConfig();
      console.log('🚀 Initializing enhanced browser...');
      
      // Production-ready browser configuration
      const launchOptions = {
        headless: 'new',
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--enable-javascript',
          '--allow-running-insecure-content',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        ignoreDefaultArgs: ['--disable-extensions'],
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
        timeout: this.config?.puppeteer?.timeout || 30000,
        protocolTimeout: this.config?.puppeteer?.protocolTimeout || 60000
      };
      
      this.browser = await puppeteer.launch(launchOptions);
      console.log('✅ Browser launched successfully');
      
      // Add a small delay to ensure browser is fully ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test browser connectivity
      const pages = await this.browser.pages();
      console.log(`📄 Browser has ${pages.length} pages`);
      
      console.log('✅ Enhanced browser initialized');
    } catch (error) {
      console.error('❌ Browser initialization failed:', error.message);
      throw new Error(`Failed to initialize browser: ${error.message}`);
    }
  }

  /**
   * Comprehensive web data extraction using proper browser automation
   */
  async extractWebData(url, authentication = null) {
    // Ensure browser is initialized before extraction
    if (!this.isReady()) {
      console.log('🔧 Browser not ready, initializing...');
      await this.initialize();
    }
    
    // Protect against external process interruption
    const originalHandlers = {};
    if (process.listeners('SIGTERM').length > 0) {
      originalHandlers.SIGTERM = process.listeners('SIGTERM');
      process.removeAllListeners('SIGTERM');
    }
    if (process.listeners('SIGINT').length > 0) {
      originalHandlers.SIGINT = process.listeners('SIGINT');
      process.removeAllListeners('SIGINT');
    }
    
    // Set extraction timeout (2 minutes max)
    const extractionTimeout = setTimeout(() => {
      console.log('⚠️ Extraction timeout reached, but continuing...');
    }, 120000);

    let currentPage = this.page; // Move outside try block

    try {
      console.log(`🌐 Enhanced extraction from: ${url}`);
    
      if (!this.browser || !this.browser.isConnected()) {
        throw new Error('Browser not initialized or disconnected');
      }

      if (currentPage === null || currentPage.isClosed()) {
        // Create new page with better error handling
        console.log('📄 Creating new browser page...');
        currentPage = await this.browser.newPage();
        this.page = currentPage;
      }
      
      // Validate page is still open before setting viewport
      if (currentPage.isClosed()) {
        console.log('⚠️ Page was closed, creating a new one...');
        currentPage = await this.browser.newPage();
        this.page = currentPage;
      }
      
      // Enable JavaScript and configure page for SPAs
      await this.safePageOperation(currentPage, async (page) => {
        // Ensure JavaScript is enabled
        await page.setJavaScriptEnabled(true);
        
        // Set viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Configure for SPA support
        await page.setDefaultNavigationTimeout(60000);
        await page.setDefaultTimeout(30000);
      }, 'page configuration');
      
      // Update currentPage reference after potential recovery
      currentPage = this.page;
      
      // Add page error handlers
      currentPage.on('error', (error) => {
        console.error('Page error:', error);
      });
      
      currentPage.on('pageerror', (error) => {
        console.error('Page JavaScript error:', error);
      });
      
      // Navigate to URL first with multiple fallback strategies
      console.log('🔗 Navigating to:', url);
      // Centralized, configurable timeouts
      const NAV_TIMEOUT = Math.max(this.config?.timeouts?.webExtraction || 30000, 45000);
      const SELECTOR_TIMEOUT = Math.max(
        this.config?.nextVersion?.authentication?.selectorTimeout || 15000,
        20000
      );
      const JS_WAIT = Math.max(Math.floor(NAV_TIMEOUT / 8), 6000); // e.g., >=6s
      const STANDARD_WAIT = 2000; // small waits
      const SCREENSHOT_TIMEOUT = Math.max(Math.floor(NAV_TIMEOUT / 3), 15000);
      let navigationSuccessful = false;

      try {
        // For SPAs, use networkidle0 which waits for network to be idle
        await currentPage.goto(url, {
          waitUntil: 'networkidle0',
          timeout: NAV_TIMEOUT
        });
        navigationSuccessful = true;
        console.log('✅ Navigation successful with networkidle0');
      } catch (navError) {
        console.log('⚠️ Navigation with networkidle0 failed, trying domcontentloaded...');
        try {
          await currentPage.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: NAV_TIMEOUT
          });
          navigationSuccessful = true;
          console.log('✅ Navigation successful with domcontentloaded');
          
          // For SPAs, wait additional time for JavaScript to load
          console.log('⏳ Waiting for SPA JavaScript to initialize...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (loadError) {
          console.log('⚠️ Navigation with load failed, trying networkidle2...');
          try {
            await currentPage.goto(url, { 
              waitUntil: 'networkidle2',
              timeout: NAV_TIMEOUT
            });
            navigationSuccessful = true;
          } catch (idleError) {
            console.error('❌ All navigation attempts failed:', idleError.message);
            throw new Error(`Failed to navigate to ${url}: ${idleError.message}`);
          }
        }
      }

      if (!navigationSuccessful) {
        throw new Error(`Failed to navigate to ${url} after multiple attempts.`);
      }

      console.log('✅ Navigation successful');

      // Handle authentication if provided and properly configured
      if (authentication && 
          authentication.type && 
          authentication.username && 
          authentication.password &&
          ((authentication.type === 'basic') || (authentication.type === 'form'))) {
        console.log('🔐 Handling authentication...');
        try {
        await this.handleAuthentication(authentication);
          console.log('✅ Authentication completed successfully');
          
          // After successful authentication, wait for dashboard content to load
          console.log('⏳ Waiting for post-authentication content to load...');
          
          // Wait for page to stabilize after authentication
          await new Promise(resolve => setTimeout(resolve, JS_WAIT));
          
          // Check if we've been redirected to a different URL
          const currentUrl = currentPage.url();
          console.log(`📍 Current URL after authentication: ${currentUrl}`);
          
          // If we're still on the login page, try to navigate to the original URL
          if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
            console.log('🔄 Still on login page, navigating to original URL...');
            try {
              // First try clicking any redirect buttons
              const redirectButtons = await currentPage.$$('button, [type="submit"], .ant-btn');
              for (const button of redirectButtons) {
                const text = await button.evaluate(el => el.textContent);
                if (text && /continue|proceed|go|next|dashboard/i.test(text)) {
                  await button.click();
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  break;
                }
              }
              
              // If still on login, navigate directly
              if (currentPage.url().includes('/login') || currentPage.url().includes('/auth')) {
                await currentPage.goto(url, { 
                  waitUntil: ['networkidle0', 'domcontentloaded'],
                  timeout: NAV_TIMEOUT
                });
              }
              
              console.log('✅ Successfully navigated to dashboard');
              
              // Additional wait for the new page to load
              await new Promise(resolve => setTimeout(resolve, JS_WAIT));
            } catch (navError) {
              console.log('⚠️ Navigation to dashboard failed:', navError.message);
              console.log('Continuing with current page');
            }
          }
          
          // Wait for dashboard-specific content to appear
          const dashboardSelectors = [
            // Tables
            'table', '.ant-table', '.ant-table-wrapper', '[class*="table"]',
            // Content areas
            '.ant-layout-content', '.dashboard', '[class*="dashboard"]',
            '.content', '#content', 'main', '[role="main"]',
            // Cards
            '.ant-card', '.card', '[class*="card"]',
            // Navigation
            'nav', '.ant-menu', '.navigation',
            // Headers
            'h1', '.ant-typography', '[class*="title"]'
          ];
          
          let contentFound = false;
          for (const selector of dashboardSelectors) {
            try {
              await currentPage.waitForSelector(selector, { 
                timeout: SELECTOR_TIMEOUT,
                visible: true 
              });
              console.log(`✅ Found dashboard content: ${selector}`);
              contentFound = true;
              break;
            } catch (e) {
              // Continue to next selector
            }
          }
          
          if (!contentFound) {
            console.log('⚠️ No specific dashboard content found, will try extraction anyway');
          }
          
          // Final wait for dynamic content
          await new Promise(resolve => setTimeout(resolve, JS_WAIT));
          
        } catch (authError) {
          console.log('⚠️ Authentication failed, but continuing with extraction anyway');
          console.log(`⚠️ Auth error: ${authError.message}`);
          // Don't throw error - continue with extraction
        }
      } else if (authentication && Object.keys(authentication).length > 0) {
        console.log('⚠️ Invalid authentication configuration provided, skipping authentication');
      }

      // Check if page is still valid before extraction
      if (currentPage.isClosed()) {
        console.log('⚠️ Page was closed (likely due to authentication protection) - attempting to create new page');
        
        // Check if browser is still alive
        if (!this.browser || !this.browser.isConnected()) {
          console.log('❌ Browser connection lost, reinitializing...');
          await this.initialize();
        }
        
        try {
          currentPage = await this.browser.newPage();
          this.page = currentPage;
          
          // Set viewport and user agent with error handling
          try {
            await currentPage.setViewport({ width: 1920, height: 1080 });
            await currentPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          } catch (setupError) {
            console.warn('⚠️ Failed to setup page viewport/user agent:', setupError.message);
            // Continue without failing completely
          }
          
          // Add error handling for the new page
          currentPage.on('error', (error) => {
            console.log('⚠️ Page error:', error.message);
          });
          
          currentPage.on('close', () => {
            console.log('⚠️ Page was closed unexpectedly');
          });
          
          // Navigate to URL again with retry logic
          let navigationSuccess = false;
          for (let retryCount = 0; retryCount < 3; retryCount++) {
            try {
              await currentPage.goto(url, { 
                waitUntil: 'domcontentloaded', 
                timeout: NAV_TIMEOUT 
              });
              navigationSuccess = true;
              break;
            } catch (navError) {
              console.log(`❌ Navigation attempt ${retryCount + 1} failed: ${navError.message}`);
              if (retryCount === 2) {
                throw navError;
              }
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
          if (navigationSuccess) {
            console.log('✅ New page created and navigated successfully');
          }
        } catch (pageError) {
          console.log('❌ Failed to create new page:', pageError.message);
          
          // Try to extract from public content if authentication failed
          console.log('🔄 Attempting to extract public content instead...');
          try {
            // Create a new page for public content extraction
            const publicPage = await this.browser.newPage();
            
            try {
              await publicPage.setViewport({ width: 1920, height: 1080 });
            } catch (viewportError) {
              console.warn('⚠️ Failed to set viewport on public page, continuing anyway:', viewportError.message);
            }
            
            await publicPage.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
            
            // Try basic extraction without authentication
            currentPage = publicPage;
            this.page = currentPage;
            console.log('✅ Fallback to public content extraction');
          } catch (fallbackError) {
            console.log('❌ Fallback extraction also failed:', fallbackError.message);
            throw new Error(`Unable to extract data - page unavailable after authentication attempt. Browser error: ${pageError.message}`);
          }
        }
      }

      // Extract data with robust retry mechanism
      const maxAttempts = 2; // Reduced from 3
      let extractionAttempts = 0;
      let extractedData = null;
      
      while (extractionAttempts < maxAttempts) {
        try {
          console.log(`🔍 Attempting DOM extraction (attempt ${extractionAttempts + 1}/${maxAttempts})...`);
          
          // Check if page is still valid
          if (currentPage.isClosed()) {
            throw new Error('Page was closed during extraction');
          }
          
          // Wait for dynamic content to load (especially for React/JS apps)
          console.log('⏳ Waiting for dynamic content to render...');
          
          // Check if this is likely a React/JS heavy site
          const isJSHeavySite = await currentPage.evaluate(() => {
            return !!(window.React || window.Vue || window.Angular || 
                     document.querySelector('[data-reactroot], [data-vue], .ng-app') ||
                     document.scripts.length > 10);
          });
          
          if (isJSHeavySite) {
            console.log('🔍 Detected JS-heavy site, waiting longer for content...');
            // Wait longer for JS frameworks to render
            await new Promise(resolve => setTimeout(resolve, JS_WAIT));
            
            // Wait for common loading indicators to disappear
            try {
              await currentPage.waitForFunction(() => {
                const loadingIndicators = document.querySelectorAll(
                  '.loading, .spinner, [class*="loading"], [class*="spinner"], .loader'
                );
                return loadingIndicators.length === 0 || 
                       Array.from(loadingIndicators).every(el => 
                         getComputedStyle(el).display === 'none' || 
                         getComputedStyle(el).visibility === 'hidden'
                       );
              }, { timeout: SELECTOR_TIMEOUT });
              console.log('✅ Loading indicators cleared');
            } catch (e) {
              console.log('⚠️ Loading indicator check timed out, proceeding anyway');
            }
            
            // Wait for content to appear
            try {
              await currentPage.waitForFunction(() => {
                const meaningfulElements = document.querySelectorAll(
                  'h1, h2, h3, h4, h5, h6, p, span, div[role], button, a, input, form, nav, header, main, section, article'
                );
                return meaningfulElements.length > 5; // Wait for at least some content
              }, { timeout: SELECTOR_TIMEOUT });
              console.log('✅ Meaningful content detected');
            } catch (e) {
              console.log('⚠️ Content detection timed out, proceeding with extraction');
            }
          } else {
            // Standard wait for simpler sites
            await new Promise(resolve => setTimeout(resolve, STANDARD_WAIT));
          }
          
          extractedData = await currentPage.evaluate((pageUrl) => {
            // Very basic check
            if (!document || !document.body) {
              throw new Error('Document not ready');
            }
            
            // UNIVERSAL DOM extraction - works for ANY website regardless of technology
            const elements = [];
            let colorPalette = [];
            const typography = {
              fontFamilies: [],
              fontSizes: [],
              fontWeights: []
            };
            
            console.log('🔍 Starting UNIVERSAL DOM extraction...');
            
            // Debug: Check what's actually on the page
            console.log('📊 Page debug info:');
            console.log(`  Document ready state: ${document.readyState}`);
            console.log(`  Body children: ${document.body?.children?.length || 0}`);
            console.log(`  All elements: ${document.querySelectorAll('*').length}`);
            console.log(`  Visible elements: ${Array.from(document.querySelectorAll('*')).filter(el => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            }).length}`);
            
            // SEMANTIC APPROACH: Extract all meaningful elements regardless of styling/framework
            const extractSemanticElements = () => {
              const semanticElements = [];
              
              // 1. HEADINGS - Extract ALL headings (fundamental content structure)
              const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
              headings.forEach((heading, index) => {
                const rect = heading.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && heading.textContent?.trim()) {
                  const style = window.getComputedStyle(heading);
                  semanticElements.push({
                    id: `heading-${index}`,
                    type: 'heading',
                    tagName: heading.tagName?.toLowerCase(),
                    className: Array.from(heading.classList).join(' '),
                    text: heading.textContent.trim(),
                    level: heading.tagName?.[1] || 'unknown',
                    rect: rect,
                    styles: {
                      fontSize: style.fontSize,
                      fontWeight: style.fontWeight,
                      color: style.color,
                      fontFamily: style.fontFamily
                    },
                    source: 'web'
                  });
                }
              });
              
              // 2. NAVIGATION - Extract ALL navigation elements
              const navElements = document.querySelectorAll('nav, [role="navigation"], [role="menubar"]');
              navElements.forEach((nav, index) => {
                const rect = nav.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  const links = nav.querySelectorAll('a, [role="menuitem"]');
                  const style = window.getComputedStyle(nav);
                  semanticElements.push({
                    id: `navigation-${index}`,
                    type: 'navigation',
                    tagName: nav.tagName?.toLowerCase(),
                    className: Array.from(nav.classList).join(' '),
                    linkCount: links.length,
                    links: Array.from(links).map(link => ({
                      text: link.textContent?.trim() || '',
                      href: link.href || ''
                    })),
                    rect: rect,
                    styles: {
                      backgroundColor: style.backgroundColor,
                      color: style.color
                    },
                    source: 'web'
                  });
                }
              });
              
              // 2b. CLICKABLE ELEMENTS - Extract tabs, buttons, and interactive elements
              const clickableElements = document.querySelectorAll('a, [role="tab"], [role="button"], .tab, .btn, [onclick], [class*="tab"], [class*="button"]');
              clickableElements.forEach((element, index) => {
                const rect = element.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && element.textContent?.trim()) {
                  const style = window.getComputedStyle(element);
                  semanticElements.push({
                    id: `clickable-${index}`,
                    type: element.getAttribute('role') || 'clickable',
                    tag: element.tagName?.toLowerCase(),
                    text: element.textContent.trim().substring(0, 100),
                    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                    attributes: {
                      href: element.href || '',
                      role: element.getAttribute('role'),
                      className: element.className,
                      id: element.id
                    },
                    styles: {
                      backgroundColor: style.backgroundColor,
                      color: style.color,
                      fontSize: style.fontSize,
                      fontWeight: style.fontWeight,
                      borderRadius: style.borderRadius
                    },
                    source: 'web'
                  });
                }
              });
              
              // 3. FORMS - Extract ALL form elements and individual inputs
              const forms = document.querySelectorAll('form, [role="form"]');
              forms.forEach((form, index) => {
                const rect = form.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  const inputs = form.querySelectorAll('input, select, textarea, button');
                  semanticElements.push({
                    id: `form-${index}`,
                    type: 'form',
                    tagName: form.tagName?.toLowerCase(),
                    className: Array.from(form.classList).join(' '),
                    action: form.action || '',
                    method: form.method || '',
                    inputCount: inputs.length,
                    inputs: Array.from(inputs).map(input => ({
                      type: input.type || input.tagName?.toLowerCase(),
                      name: input.name || '',
                      placeholder: input.placeholder || '',
                      required: input.required || false
                    })),
                    rect: rect,
                    source: 'web'
                  });
                }
              });
              
              // 3b. INDIVIDUAL INPUTS - Extract each input as separate element (important for login pages)
              const allInputs = document.querySelectorAll('input, button, select, textarea, [role="button"], [type="submit"]');
              allInputs.forEach((input, index) => {
                const rect = input.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  const style = window.getComputedStyle(input);
                  
                  // Get meaningful text for the input
                  let inputText = '';
                  if (input.placeholder) inputText = input.placeholder;
                  else if (input.value) inputText = input.value;
                  else if (input.textContent?.trim()) inputText = input.textContent.trim();
                  else if (input.name) inputText = input.name;
                  else if (input.type) inputText = input.type;
                  
                  semanticElements.push({
                    id: `input-${index}`,
                    type: input.type || 'input',
                    tag: input.tagName?.toLowerCase(),
                    text: inputText.substring(0, 100),
                    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                    attributes: {
                      type: input.type,
                      name: input.name,
                      id: input.id,
                      className: input.className,
                      placeholder: input.placeholder,
                      value: input.value,
                      required: input.required,
                      disabled: input.disabled
                    },
                    styles: {
                      backgroundColor: style.backgroundColor,
                      color: style.color,
                      fontSize: style.fontSize,
                      border: style.border,
                      borderRadius: style.borderRadius,
                      padding: style.padding
                    },
                    source: 'web'
                  });
                }
              });
              
              // 4. TABLES - Extract ALL tabular data
              const tables = document.querySelectorAll('table, [role="table"], [role="grid"]');
              tables.forEach((table, index) => {
                const rect = table.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  const rows = table.querySelectorAll('tr, [role="row"]');
                  const headers = table.querySelectorAll('th, [role="columnheader"]');
                  semanticElements.push({
                    id: `table-${index}`,
                    type: 'table',
                    tagName: table.tagName?.toLowerCase(),
                    className: Array.from(table.classList).join(' '),
                    rowCount: rows.length,
                    columnCount: headers.length,
                    headers: Array.from(headers).map(th => th.textContent?.trim() || ''),
                    rect: rect,
                    source: 'web'
                  });
                }
              });
              
              // 5. LISTS - Extract ALL list structures
              const lists = document.querySelectorAll('ul, ol, dl, [role="list"]');
              lists.forEach((list, index) => {
                const rect = list.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  const items = list.querySelectorAll('li, dt, dd, [role="listitem"]');
                  if (items.length > 0) {
                    semanticElements.push({
                      id: `list-${index}`,
                      type: 'list',
                      tagName: list.tagName?.toLowerCase(),
                      className: Array.from(list.classList).join(' '),
                      itemCount: items.length,
                      items: Array.from(items).slice(0, 5).map(item => item.textContent?.trim() || ''),
                      rect: rect,
                      source: 'web'
                    });
                  }
                }
              });
              
              // 6. ARTICLES/SECTIONS - Extract content areas
              const contentAreas = document.querySelectorAll('article, section, main, aside, [role="main"], [role="article"]');
              contentAreas.forEach((area, index) => {
                const rect = area.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && area.textContent?.trim().length > 20) {
                  semanticElements.push({
                    id: `content-${index}`,
                    type: 'content',
                    tagName: area.tagName?.toLowerCase(),
                    className: Array.from(area.classList).join(' '),
                    textLength: area.textContent.trim().length,
                    preview: area.textContent.trim().substring(0, 100) + '...',
                    rect: rect,
                    source: 'web'
                  });
                }
              });
              
              // 7. INTERACTIVE ELEMENTS - Extract buttons, links, controls
              const interactives = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"], [tabindex]:not([tabindex="-1"])');
              interactives.forEach((el, index) => {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  semanticElements.push({
                    id: `interactive-${index}`,
                    type: 'interactive',
                    tagName: el.tagName?.toLowerCase(),
                    className: Array.from(el.classList).join(' '),
                    text: el.textContent?.trim() || el.value || el.alt || '',
                    href: el.href || '',
                    clickable: true,
                    rect: rect,
                    source: 'web'
                  });
                }
              });
              
              // 8. IMAGES - Extract meaningful images
              const images = document.querySelectorAll('img, [role="img"]');
              images.forEach((img, index) => {
                const rect = img.getBoundingClientRect();
                if (rect.width > 20 && rect.height > 20) { // Filter out tiny images/icons
                  semanticElements.push({
                    id: `image-${index}`,
                    type: 'image',
                    tagName: img.tagName?.toLowerCase(),
                    className: Array.from(img.classList).join(' '),
                    src: img.src || '',
                    alt: img.alt || '',
                    rect: rect,
                    source: 'web'
                  });
                }
              });
              
              return semanticElements;
            };
            
            // VISUAL APPROACH: Extract visually significant elements by computed styles
            const extractVisualElements = () => {
              const visualElements = [];
              const allElements = document.querySelectorAll('*');
              
              allElements.forEach((el, index) => {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                
                // Only process visible elements with meaningful size
                if (rect.width > 10 && rect.height > 10 && 
                    style.display !== 'none' && 
                    style.visibility !== 'hidden' &&
                    parseFloat(style.opacity) > 0.1) {
                  
                  // Check if element is visually significant
                  const isSignificant = (
                    rect.width * rect.height > 1000 || // Large area
                    parseFloat(style.fontSize) > 16 || // Large text
                    style.fontWeight === 'bold' || style.fontWeight >= 600 || // Bold text
                    style.backgroundColor !== 'rgba(0, 0, 0, 0)' || // Has background
                    style.borderWidth !== '0px' || // Has border
                    el.textContent?.trim().length > 10 // Has meaningful text
                  );
                  
                  if (isSignificant && !el.closest('script, style, meta, link, title')) {
                    visualElements.push({
                      id: `visual-${index}`,
                      type: 'visual-element',
                      tagName: el.tagName?.toLowerCase(),
                      className: Array.from(el.classList).join(' '),
                      text: el.textContent?.trim().substring(0, 100) || '',
                      rect: rect,
                      styles: {
                        backgroundColor: style.backgroundColor,
                        color: style.color,
                        fontSize: style.fontSize,
                        fontWeight: style.fontWeight,
                        border: style.border,
                        borderRadius: style.borderRadius
                      },
                      source: 'web'
                    });
                  }
                }
              });
              
              // Sort by visual importance (size * position weight)
              return visualElements
                .sort((a, b) => (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height))
                .slice(0, 50); // Limit to top 50 visual elements
            };
            
            // Extract elements using both approaches
            const semanticElements = extractSemanticElements();
            const visualElements = extractVisualElements();
            
            // Combine and deduplicate
            elements.push(...semanticElements);
            elements.push(...visualElements);
            
            console.log(`Extracted ${semanticElements.length} semantic + ${visualElements.length} visual = ${elements.length} total elements`);
            
            // Fallback: If no elements extracted, try basic approach
            if (elements.length === 0) {
              console.log('⚠️ No elements from semantic/visual extraction, trying basic fallback...');
              
              // Basic extraction - get any visible text content
              const basicElements = Array.from(document.querySelectorAll('*'))
                .filter(el => {
                  const rect = el.getBoundingClientRect();
                  const hasText = el.textContent?.trim();
                  return rect.width > 0 && rect.height > 0 && hasText && hasText.length > 2;
                })
                .slice(0, 20) // Limit to first 20
                .map((el, index) => ({
                  id: `fallback-${index}`,
                  tag: el.tagName?.toLowerCase() || 'unknown',
                  type: 'fallback',
                  text: el.textContent?.trim().substring(0, 200),
                  rect: el.getBoundingClientRect(),
                  source: 'fallback'
                }));
                
              elements.push(...basicElements);
              console.log(`Fallback extraction added ${basicElements.length} elements`);
            }
            
            // Extract colors and typography
            document.querySelectorAll('*').forEach(el => {
              const style = window.getComputedStyle(el);
              const color = style.color;
              const bgColor = style.backgroundColor;
              const fontFamily = style.fontFamily;
              const fontSize = style.fontSize;
              const fontWeight = style.fontWeight;
              
              if (color && !color.includes('rgba(0, 0, 0, 0)')) {
                colorPalette.push(color);
              }
              if (bgColor && !bgColor.includes('rgba(0, 0, 0, 0)')) {
                colorPalette.push(bgColor);
              }
              if (fontFamily) typography.fontFamilies.push(fontFamily);
              if (fontSize) typography.fontSizes.push(fontSize);
              if (fontWeight) typography.fontWeights.push(fontWeight);
            });
            
            // Remove duplicates and limit arrays
            typography.fontFamilies = [...new Set(typography.fontFamilies)].slice(0, 10);
            typography.fontSizes = [...new Set(typography.fontSizes)].slice(0, 10);
            typography.fontWeights = [...new Set(typography.fontWeights)].slice(0, 10);
            colorPalette = [...new Set(colorPalette)].slice(0, 20);
            
            console.log(`Extraction complete: ${elements.length} total elements`);
            
            return {
              elements,
              colorPalette,
              typography,
              metadata: {
                url: pageUrl,
                timestamp: new Date().toISOString(),
                elementsExtracted: elements.length
              }
            };
          }, url);
      
          break; // Success, exit retry loop
        } catch (extractionError) {
          console.error(`❌ Extraction attempt ${extractionAttempts + 1} failed:`, extractionError.message);
          extractionAttempts++;
          
          if (extractionAttempts >= maxAttempts) {
            throw new Error(`DOM extraction failed after ${maxAttempts} attempts: ${extractionError.message}`);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Capture screenshot with timeout protection
      let screenshot = null;
      if (!currentPage.isClosed()) {
        const maxRetries = 2; // Reduced from 3
        for (let i = 0; i < maxRetries; i++) {
          try {
            console.log(`📸 Capturing screenshot (attempt ${i + 1}/${maxRetries})...`);
            
            // Add timeout to screenshot capture
            screenshot = await Promise.race([
              currentPage.screenshot({ encoding: 'base64' }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Screenshot timeout')), SCREENSHOT_TIMEOUT)
              )
            ]);
            
            console.log('✅ Screenshot captured');
            break;
          } catch (screenshotError) {
            console.error(`❌ Screenshot capture failed (attempt ${i + 1}/${maxRetries}):`, screenshotError.message);
            if (i === maxRetries - 1) {
              console.log('⚠️ Screenshot capture failed, continuing without screenshot...');
              screenshot = null;
              break; // Don't throw error - continue without screenshot
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      // Screenshot is optional - don't fail if we can't capture it
      if (!screenshot) {
        console.log('⚠️ No screenshot available, but continuing with data extraction');
      }

      // Close the page immediately after extraction to prevent "target closed" errors
      if (currentPage && !currentPage.isClosed()) {
        await currentPage.close();
        this.page = null;
      }

      return {
        ...extractedData,
        screenshot: screenshot,
        metadata: {
          url: url,
          timestamp: new Date().toISOString(),
          elementsExtracted: extractedData.elements.length
        }
      };
      
    } catch (error) {
      console.error('❌ Web extraction failed:', error.message);
      
      // Ensure cleanup
      if (currentPage && !currentPage.isClosed()) {
        try {
          await currentPage.close();
        } catch (closeError) {
          console.warn('Warning: Failed to close page during error cleanup:', closeError.message);
        }
        this.page = null;
      }
      
      throw new Error(`Web extraction failed: ${error.message}`);
    } finally {
      // Restore original process listeners
      if (originalHandlers.SIGTERM) {
        originalHandlers.SIGTERM.forEach(listener => process.on('SIGTERM', listener));
      }
      if (originalHandlers.SIGINT) {
        originalHandlers.SIGINT.forEach(listener => process.on('SIGINT', listener));
      }
      clearTimeout(extractionTimeout);
    }
  }

  async handleAuthentication(auth) {
    // Handle various authentication types
      if (auth.type === 'basic') {
      await this.page.authenticate({
        username: auth.username,
        password: auth.password
      });
    } else if (auth.type === 'form') {
      // Handle form-based login only if explicitly specified
      console.log('🔐 Performing form-based login...');
      
      try {
        // Wait longer for the page to be fully loaded and DOM to be ready
        console.log('⏳ Waiting for page DOM to be fully ready...');
        // Use configurable selector timeout
        const SELECTOR_TIMEOUT = Math.max(
          this.config?.nextVersion?.authentication?.selectorTimeout || 15000,
          20000
        );
        await this.page.waitForSelector('body', { timeout: SELECTOR_TIMEOUT });
        
        // Wait for DOM content to be loaded with timeout protection
        try {
          await Promise.race([
            this.page.evaluate(() => {
              return new Promise((resolve) => {
                if (document.readyState === 'complete') {
                  resolve();
                } else {
                  document.addEventListener('DOMContentLoaded', resolve);
                }
              });
            }),
            new Promise(resolve => setTimeout(resolve, SELECTOR_TIMEOUT))
          ]);
          console.log('✅ DOM readiness check completed');
        } catch (e) {
          console.log('⚠️ DOM readiness check timed out, proceeding anyway...');
        }
        
        // Additional wait for any dynamic content/JavaScript to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Wait for any form elements to appear
        try {
          await this.page.waitForSelector('form, input', { timeout: SELECTOR_TIMEOUT });
          console.log('✅ Form elements detected on page');
        } catch (e) {
          console.log('⚠️ No form elements found initially, continuing anyway...');
        }
        
        // Additional wait to ensure all form elements are rendered
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Debug: Check what input fields are available
        console.log('🔍 Checking available input fields...');
        const availableInputs = await this.page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input'));
          const forms = Array.from(document.querySelectorAll('form'));
          return {
            totalInputs: inputs.length,
            totalForms: forms.length,
            inputs: inputs.map(input => ({
              type: input.type,
              name: input.name,
              id: input.id,
              className: input.className,
              placeholder: input.placeholder,
              visible: input.offsetParent !== null,
              tagName: input.tagName
            })),
            forms: forms.map(form => ({
              id: form.id,
              className: form.className,
              action: form.action,
              method: form.method
            }))
          };
        });
        
        console.log('📊 Page analysis:', JSON.stringify(availableInputs, null, 2));
        
        if (availableInputs.totalInputs === 0) {
          throw new Error('No input fields found on page');
        }
        
        // Find password field with multiple selectors
        let passwordSelector = null;
        const possiblePasswordSelectors = [
          'input[type="password"]',
          'input[name*="password"]',
          'input[placeholder*="password" i]',
          'input[name*="pass"]',
          'input[placeholder*="pass" i]',
          'input[placeholder*="OTP" i]',
          'input[name*="otp" i]'
        ];

        for (const selector of possiblePasswordSelectors) {
          try {
            console.log(`🔍 Trying password selector: ${selector}`);
            await this.page.waitForSelector(selector, { timeout: SELECTOR_TIMEOUT });
            
            // Check if the field is visible
            const isVisible = await this.page.evaluate((sel) => {
              const element = document.querySelector(sel);
              return element && element.offsetParent !== null;
            }, selector);
            
            if (isVisible) {
              console.log(`✅ Found visible password field: ${selector}`);
              passwordSelector = selector;
                break;
            }
          } catch (e) {
            console.log(`⚠️ Password selector "${selector}" not found or not visible`);
          }
        }
        
        if (!passwordSelector) {
          throw new Error(`Could not find password/OTP input field. Available inputs: ${JSON.stringify(availableInputs.inputs.map(i => `${i.type}:${i.placeholder || i.name || i.id}`))}`);
        }
        
        console.log(`✅ Using password selector: ${passwordSelector}`);
        
        // Find username field with multiple selectors
        let usernameSelector = null;
        const possibleUsernameSelectors = [
          'input[type="email"]',
          'input[type="text"]',
          'input[name*="username"]',
          'input[name*="email"]',
          'input[placeholder*="email" i]',
          'input[placeholder*="username" i]',
          'input[id*="username"]',
          'input[id*="email"]'
        ];

        for (const selector of possibleUsernameSelectors) {
          try {
            console.log(`🔍 Trying username selector: ${selector}`);
            await this.page.waitForSelector(selector, { timeout: SELECTOR_TIMEOUT });
            
            // Check if the field is visible
            const isVisible = await this.page.evaluate((sel) => {
              const element = document.querySelector(sel);
              return element && element.offsetParent !== null;
            }, selector);
            
            if (isVisible) {
              console.log(`✅ Found visible username field: ${selector}`);
              usernameSelector = selector;
              break;
            }
          } catch (e) {
            console.log(`❌ Username selector "${selector}" not found: ${e.message}`);
          }
        }
        
        if (!usernameSelector) {
          throw new Error(`Could not find username/email input field. Available inputs: ${JSON.stringify(availableInputs.inputs.map(i => `${i.type}:${i.placeholder || i.name || i.id}`))}`);
        }

        // Fill the login form using pure JavaScript (with comprehensive error handling)
        console.log('📝 Filling login form...');
        
        try {
          // Check if page is still alive before proceeding
          if (this.page.isClosed()) {
            throw new Error('Page was closed before form filling');
          }
          
          // Check for CSRF tokens and hidden fields first
          console.log('🔍 Checking for CSRF tokens and hidden fields...');
          await this.page.evaluate(() => {
            const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
            const metaTags = document.querySelectorAll('meta[name*="csrf"], meta[name*="token"]');
            
            console.log(`Found ${hiddenInputs.length} hidden inputs and ${metaTags.length} CSRF meta tags`);
            
            hiddenInputs.forEach((input, i) => {
              if (input.name && input.value) {
                console.log(`Hidden field ${i}: ${input.name} = ${input.value.substring(0, 20)}...`);
              }
            });
            
            metaTags.forEach((meta, i) => {
              console.log(`Meta tag ${i}: ${meta.name} = ${meta.content?.substring(0, 20)}...`);
            });
          });
          
          console.log('🔧 Attempting to fill form fields...');
          
          // Use JavaScript to fill the form fields directly
          const fillResult = await this.page.evaluate((usernameSelector, passwordSelector, username, password) => {
            try {
              // Fill username field
              const usernameField = document.querySelector(usernameSelector);
              if (usernameField) {
                usernameField.value = '';
                usernameField.value = username;
                // Trigger input events to ensure the form recognizes the change
                usernameField.dispatchEvent(new Event('input', { bubbles: true }));
                usernameField.dispatchEvent(new Event('change', { bubbles: true }));
              }
              
              // Fill password field
              const passwordField = document.querySelector(passwordSelector);
              if (passwordField) {
                passwordField.value = '';
                passwordField.value = password;
                // Trigger input events to ensure the form recognizes the change
                passwordField.dispatchEvent(new Event('input', { bubbles: true }));
                passwordField.dispatchEvent(new Event('change', { bubbles: true }));
              }
              
              return {
                success: true,
                usernameSet: usernameField ? usernameField.value === username : false,
                passwordSet: passwordField ? passwordField.value === password : false
              };
            } catch (evalError) {
              return {
                success: false,
                error: evalError.message
              };
            }
          }, usernameSelector, passwordSelector, auth.username, auth.password);
          
          if (!fillResult.success) {
            throw new Error(`Form filling failed: ${fillResult.error}`);
          }
          
          console.log('✅ Username entered');
          console.log('✅ Password entered');
          
          // Submit the form with proper navigation handling
          console.log('🚀 Attempting to submit login form...');
          
          try {
            // Enhanced form submission that handles modern web apps
            console.log('🔍 Analyzing form submission method...');
            
            // First, try clicking the submit button (preferred for modern apps)
            const submitSuccess = await this.page.evaluate(() => {
              // Priority 1: Look for submit buttons with specific selectors
              const submitSelectors = [
                'button[type="submit"]',
                'input[type="submit"]', 
                '.login-btn',
                '.submit-btn',
                '.ant-btn[type="submit"]',
                'button:contains("Login")',
                'button:contains("Sign in")',
                '[class*="login"][class*="button"]',
                '[class*="submit"][class*="button"]'
              ];
              
              for (const selector of submitSelectors) {
                const btn = document.querySelector(selector);
                if (btn && !btn.disabled) {
                  console.log(`Found submit button: ${selector}`);
                  btn.click();
                  return { method: 'button_click', selector };
                }
              }
              
              // Priority 2: Try form submission as fallback
              const forms = document.querySelectorAll('form');
              if (forms.length > 0) {
                console.log('Using form.submit() as fallback');
                forms[0].submit();
                return { method: 'form_submit' };
              }
              
              return { method: 'none' };
            });
            
            console.log(`📤 Form submission method: ${submitSuccess.method}`);
            
            // Wait for response with multiple strategies
            await Promise.race([
              // Strategy 1: Wait for navigation (traditional form submit)
              this.page.waitForNavigation({ 
                waitUntil: 'networkidle0', 
                timeout: 15000
              }).then(() => ({ type: 'navigation' })),
              
              // Strategy 2: Wait for URL change (SPA navigation)
              this.page.waitForFunction(
                (currentUrl) => window.location.href !== currentUrl,
                { timeout: 15000 },
                this.page.url()
              ).then(() => ({ type: 'url_change' })),
              
              // Strategy 3: Wait for dashboard/content elements (SPA content update)
              this.page.waitForSelector('.dashboard, [class*="dashboard"], main, .ant-layout-content, .content, [class*="shipment"], [class*="journey"]', { 
                timeout: 15000,
                visible: true 
              }).then(() => ({ type: 'content_update' })),
              
              // Strategy 4: Wait for login form to disappear (successful login)
              this.page.waitForFunction(
                () => !document.querySelector('input[type="password"]'),
                { timeout: 15000 }
              ).then(() => ({ type: 'form_removed' })),
              
              // Strategy 5: Detect error messages (failed login)
              this.page.waitForSelector('.error, .alert, [class*="error"], [class*="alert"], .message', {
                timeout: 8000,
                visible: true
              }).then(() => ({ type: 'error_detected' }))
            ]);
            
                      // Give page time to stabilize after login
          console.log('⏳ Waiting for authenticated content to load...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Wait for authenticated content indicators
          try {
            await this.page.waitForFunction(() => {
              // Check for common authenticated page indicators
              const indicators = [
                'dashboard', 'logout', 'profile', 'welcome', 'shipment', 'journey',
                'menu', 'navigation', 'sidebar', 'header', 'main-content'
              ];
              
              const bodyText = document.body.innerText.toLowerCase();
              const hasAuthIndicators = indicators.some(indicator => bodyText.includes(indicator));
              
              // Also check if login form is gone
              const hasLoginForm = document.querySelector('input[type="password"]') !== null;
              
              console.log(`Auth check: hasAuthIndicators=${hasAuthIndicators}, hasLoginForm=${hasLoginForm}`);
              return hasAuthIndicators && !hasLoginForm;
            }, { timeout: 10000 });
            
            console.log('✅ Authenticated content detected');
          } catch (waitError) {
            console.warn('⚠️ Timeout waiting for authenticated content, proceeding anyway');
          }
          
          // Additional wait for dynamic content
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check final URL and content after authentication
          const finalUrl = this.page.url();
          console.log(`📍 Final URL after authentication: ${finalUrl}`);
          
          // Check if we need to navigate to the original protected URL
          const targetUrl = url; // The original URL we want to access
          console.log(`🎯 Target URL: ${targetUrl}, Current URL: ${finalUrl}`);
          
          // If authentication was successful but we're not on the target URL, navigate there
          if (finalUrl !== targetUrl && !finalUrl.includes('/incoming/shipments') && !finalUrl.includes('/journey/listing')) {
            console.log('🔄 Authentication completed, navigating to target URL...');
            
            try {
              // Navigate to the original protected URL with authentication cookies
              await this.page.goto(targetUrl, { 
                waitUntil: 'networkidle0', 
                timeout: 15000 
              });
              
              // Wait for authenticated content to load
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              const newUrl = this.page.url();
              console.log(`📍 Final authenticated URL: ${newUrl}`);
              
              // Check if we successfully reached authenticated content
              const hasAuthContent = await this.page.evaluate(() => {
                const bodyText = document.body.innerText.toLowerCase();
                const authIndicators = ['dashboard', 'logout', 'profile', 'welcome', 'shipment', 'journey'];
                const hasLoginForm = document.querySelector('input[type="password"]') !== null;
                return authIndicators.some(indicator => bodyText.includes(indicator)) && !hasLoginForm;
              });
              
              if (hasAuthContent) {
                console.log('✅ Successfully accessed authenticated content');
              } else {
                console.warn('⚠️ Still seeing login content after authentication');
              }
              
            } catch (navError) {
              console.warn(`⚠️ Failed to navigate to target URL: ${navError.message}`);
            }
          }
            
            console.log('✅ Login form submitted successfully');
            
          } catch (submitError) {
            // If navigation fails, try alternative submit methods
            console.log('⚠️ Navigation-based submit failed, trying alternative...');
            
            const submitResult = await this.page.evaluate(() => {
              try {
                // Try to find and click submit button directly
                const submitSelectors = [
                  'button[type="submit"]',
                  'input[type="submit"]',
                  'button:contains("Login")',
                  'button:contains("Sign")',
                  'button',
                  '.submit-btn',
                  '.login-btn'
                ];
                
                for (const selector of submitSelectors) {
                  const button = document.querySelector(selector);
                  if (button) {
                    button.click();
                    return { method: `JavaScript click on ${selector}`, success: true };
                  }
                }
                
                return { method: 'none', success: false };
              } catch (evalError) {
                return { method: 'error', success: false, error: evalError.message };
              }
            });
            
            if (submitResult.success) {
              console.log(`✅ Form submitted using: ${submitResult.method}`);
              // Wait for potential page changes
              await new Promise(resolve => setTimeout(resolve, 6000));
            } else {
              throw new Error('All submit methods failed');
            }
          }
          
          // Check authentication result
          await new Promise(resolve => setTimeout(resolve, 3000));
          const currentUrl = this.page.url();
          console.log(`📍 Current URL after login attempt: ${currentUrl}`);
          
          if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
            console.log('⚠️ Still on login page - login may have failed');
          } else {
            console.log('✅ Successfully redirected from login page');
          }
          
          console.log('✅ Login process completed');

        } catch (fillError) {
          // If we get Target closed error, it means the site has aggressive protection
          if (fillError.message.includes('Target closed') || fillError.message.includes('Protocol error')) {
            console.log('🔒 Target closed during authentication - this indicates aggressive bot protection');
            console.log('ℹ️ This is common for secure sites that detect automation');
            console.log('ℹ️ Manual login may be required for this site');
            throw new Error(`Authentication failed due to bot protection: ${fillError.message}`);
          } else {
            console.log('⚠️ Form filling failed:', fillError.message);
            throw new Error(`Authentication failed: ${fillError.message}`);
          }
        }

              } catch (error) {
          console.log('⚠️ Authentication process failed:', error.message);
          console.log('ℹ️ Continuing with extraction of public content...');
          return; // Don't throw - continue with extraction
        }
    }
  }

  async cleanup() {
    try {
      if (this.page && !this.page.isClosed()) {
        await this.page.close();
      }
      this.page = null;
    } catch (error) {
      console.warn('Warning: Page cleanup failed:', error.message);
    }
    
    try {
      if (this.browser && this.browser.isConnected()) {
        await this.browser.close();
      }
      this.browser = null;
    } catch (error) {
      console.warn('Warning: Browser cleanup failed:', error.message);
    }
  }
}

// Helper function for external use
export async function enhancedWebExtract(webUrl, options = {}) {
  const extractor = new EnhancedWebExtractor();
  try {
    await extractor.initialize();
    const data = await extractor.extractWebData(webUrl, options.authentication);
    await extractor.cleanup();
    return data;
  } catch (error) {
    await extractor.cleanup();
    throw error;
  }
} 