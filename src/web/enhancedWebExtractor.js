/**
 * Enhanced Web Extractor with Comprehensive Browser Automation
 * Follows proper DOM extraction, CSS analysis, and layout detection
 */

import puppeteer from 'puppeteer';

export class EnhancedWebExtractor {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  isReady() {
    return this.browser && this.browser.isConnected();
  }

  async initialize() {
    if (this.browser) {
      await this.cleanup();
    }

    try {
      console.log('🚀 Initializing enhanced browser...');
      
      // Production-ready browser configuration
      const launchOptions = {
        headless: 'new',
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=VizDisplayCompositor',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        ignoreDefaultArgs: ['--disable-extensions'],
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
        timeout: 30000,
        protocolTimeout: 60000
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

      if (currentPage === null) {
        // Create new page with better error handling
        currentPage = await this.browser.newPage();
        this.page = currentPage;
      }
      
      // Set viewport and user agent
      await currentPage.setViewport({ width: 1920, height: 1080 });
      await currentPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Add page error handlers
      currentPage.on('error', (error) => {
        console.error('Page error:', error);
      });
      
      currentPage.on('pageerror', (error) => {
        console.error('Page JavaScript error:', error);
      });
      
      // Navigate to URL first with multiple fallback strategies
      console.log('🔗 Navigating to:', url);
      let navigationSuccessful = false;

      try {
        await currentPage.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        navigationSuccessful = true;
      } catch (navError) {
        console.log('⚠️ Navigation with domcontentloaded failed, trying basic navigation...');
        try {
          await currentPage.goto(url, {
            waitUntil: 'load',
            timeout: 10000
          });
          navigationSuccessful = true;
        } catch (loadError) {
          console.log('⚠️ Navigation with load failed, trying networkidle2...');
          try {
      await currentPage.goto(url, { 
              waitUntil: 'networkidle2',
              timeout: 10000
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
          await new Promise(resolve => setTimeout(resolve, 3000));
          
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
                  timeout: 30000
                });
              }
              
              console.log('✅ Successfully navigated to dashboard');
              
              // Additional wait for the new page to load
              await new Promise(resolve => setTimeout(resolve, 3000));
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
                timeout: 5000,
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
          await new Promise(resolve => setTimeout(resolve, 3000));
          
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
        try {
          currentPage = await this.browser.newPage();
          this.page = currentPage;
          
          // Set viewport and user agent
          await currentPage.setViewport({ width: 1920, height: 1080 });
          await currentPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          
          // Navigate to URL again
          await currentPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          console.log('✅ New page created and navigated successfully');
        } catch (pageError) {
          console.log('❌ Failed to create new page:', pageError.message);
          throw new Error('Unable to extract data - page unavailable after authentication attempt');
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
          
          // Reduced stability check (was 1000ms)
          await new Promise(resolve => setTimeout(resolve, 500));
          
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
              
              // 3. FORMS - Extract ALL form elements
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
                setTimeout(() => reject(new Error('Screenshot timeout')), 5000)
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
            await new Promise(resolve => setTimeout(resolve, 500)); // Reduced wait time
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
        await this.page.waitForSelector('body', { timeout: 10000 });
        
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
            new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
          ]);
          console.log('✅ DOM readiness check completed');
        } catch (e) {
          console.log('⚠️ DOM readiness check timed out, proceeding anyway...');
        }
        
        // Additional wait for any dynamic content/JavaScript to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Wait for any form elements to appear
        try {
          await this.page.waitForSelector('form, input', { timeout: 5000 });
          console.log('✅ Form elements detected on page');
        } catch (e) {
          console.log('⚠️ No form elements found initially, continuing anyway...');
        }
        
        // Additional wait to ensure all form elements are rendered
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
            await this.page.waitForSelector(selector, { timeout: 2000 });
            
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
            await this.page.waitForSelector(selector, { timeout: 2000 });
            
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
            // Handle form submission with navigation properly
            await Promise.race([
              // Case 1: Form submits and redirects (most common)
              Promise.all([
                this.page.waitForNavigation({ 
                  waitUntil: 'networkidle0', 
                  timeout: 30000 
                }),
                this.page.evaluate(() => {
                  const forms = document.querySelectorAll('form');
                  if (forms.length > 0) {
                    forms[0].submit();
                    return true;
                  }
                  
                  // Try submit button if no form
                  const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], .submit-btn, .login-btn');
                  if (submitBtn) {
                    submitBtn.click();
                    return true;
                  }
                  return false;
                })
              ]),
              // Case 2: SPA form that doesn't redirect but shows dashboard content
              this.page.waitForSelector('.dashboard, [class*="dashboard"], main, .ant-layout-content, .content', { 
                timeout: 30000,
                visible: true 
              })
            ]);
            
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
              await new Promise(resolve => setTimeout(resolve, 5000));
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