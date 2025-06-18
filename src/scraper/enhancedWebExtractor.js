import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
import { ErrorCategorizer } from '../utils/errorCategorizer.js';
import { BrowserManager } from '../utils/browserManager.js';

/**
 * Enhanced Web Extractor
 * Extracts comprehensive component data from web pages to match Figma component detail level
 */
export class EnhancedWebExtractor {
  constructor(config = {}) {
    this.config = {
      headless: "new",
      timeout: 60000,
      viewport: { width: 1200, height: 800 },
      maxComponents: 2000,
      includeInvisible: false,
      componentFilters: {
        minWidth: 10,
        minHeight: 10,
        excludeTags: ['script', 'style', 'meta', 'title', 'head', 'noscript'],
        excludeClasses: ['sr-only', 'visually-hidden', 'hidden']
      },
      ...config
    };

    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize browser with enhanced settings
   */
  async initialize() {
    try {
      // Close existing browser if any
      if (this.browser) {
        try {
          await BrowserManager.closeBrowserSafely(this.browser);
        } catch (error) {
          console.warn('⚠️ Error closing existing browser:', error.message);
        }
        this.browser = null;
        this.page = null;
      }

      console.log('🔍 Checking browser environment...');
      const browserInfo = await BrowserManager.getBrowserInfo();
      console.log(`📊 Current browser processes: ${browserInfo.runningProcesses}`);
      
      if (!browserInfo.isClean) {
        console.log('🧹 Cleaning up orphaned browser processes...');
        await BrowserManager.cleanupOrphanedProcesses();
      }

      console.log('🚀 Launching browser (attempt 1/3)...');
      
      // Try launching browser with multiple attempts
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          
          this.browser = await puppeteer.launch({
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-web-security',
              '--disable-features=VizDisplayCompositor',
              '--disable-dev-shm-usage',
              '--use-mock-keychain',
              '--single-process',
              '--no-zygote',
              '--disable-background-timer-throttling',
              '--disable-backgrounding-occluded-windows',
              '--disable-renderer-backgrounding'
            ],
            ignoreHTTPSErrors: true,
            timeout: 30000
          });
          
          // Wait for browser to be fully ready
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Test browser with a simple page
          const pages = await this.browser.pages();
          const testPage = pages.length > 0 ? pages[0] : await this.browser.newPage();
          
          await testPage.goto('about:blank');
          
          console.log(`✅ Browser launched successfully with ${pages.length} pages`);
          break;
        } catch (error) {
          console.error(`❌ Browser launch attempt ${attempts}/${maxAttempts} failed:`, error.message);
          
          // Clean up failed browser instance
          if (this.browser) {
            try {
              await this.browser.close();
            } catch (closeError) {
              // Ignore close errors
            }
            this.browser = null;
          }
          
          if (attempts >= maxAttempts) {
            throw new Error(`Failed to launch browser after ${maxAttempts} attempts: ${error.message}`);
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
          console.log(`🚀 Launching browser (attempt ${attempts + 1}/${maxAttempts})...`);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Initialization error:', error);
      throw error;
    }
  }

  /**
   * Extract web data with frame management and error handling
   */
  async extractWebData(url, authentication = null) {
    let page = null;
    try {
      console.log(`🌐 Enhanced extraction from: ${url}`);
      
      // Ensure browser is initialized and ready
      if (!this.browser || this.browser.process()?.killed) {
        console.log('🔄 Browser not ready, initializing...');
        await this.initialize();
      }

      // Create new page for each extraction
      page = await this.browser.newPage();
      await page.setViewport(this.config.viewport);
      await page.setDefaultTimeout(this.config.timeout);
      await page.setUserAgent(this.config.userAgent);

      // Handle frame detachment
      page.on('framedetached', frame => {
        console.log(`🔄 Frame detached: ${frame.url()}`);
      });

      // Handle frame navigation
      page.on('framenavigated', frame => {
        console.log(`🔄 Frame navigated: ${frame.url()}`);
      });

      // Set up authentication if provided
      if (authentication) {
        await this.handleAuthentication(page, authentication);
      }

      // Navigate with retries and wait for network idle
      await this.navigateWithRetries(page, url);

      // Wait for page to be ready
      await page.waitForFunction(() => document.readyState === 'complete');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Additional wait for dynamic content

      // Extract data from main frame
      const mainFrame = page.mainFrame();
      if (!mainFrame) {
        throw new Error('Main frame not found');
      }

      // Extract elements
      const elements = await this.extractElements(mainFrame);
      
      // Extract semantic data
      const semanticElements = await this.extractSemanticElements(mainFrame);

      console.log('✅ Enhanced extraction complete:', elements.length, 'components,', semanticElements.length, 'semantic elements');

      return {
        components: elements,
        semanticElements,
        metadata: {
          url,
          timestamp: new Date().toISOString(),
          extractorVersion: '2.0.0'
        }
      };
    } catch (error) {
      console.error('❌ Enhanced extraction failed:', error);
      throw error;
    } finally {
      if (page && !page.isClosed()) {
        await page.close();
      }
    }
  }

  /**
   * Navigate to URL with retries
   */
  async navigateWithRetries(page, url, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await page.goto(url, {
          waitUntil: ['domcontentloaded', 'networkidle0'],
          timeout: this.config.timeout
        });
        return;
      } catch (error) {
        console.error(`❌ Navigation attempt ${attempt}/${maxRetries} failed:`, error);
        if (attempt === maxRetries) throw error;
        await page.evaluate(ms => new Promise(resolve => setTimeout(resolve, ms)), 1000 * attempt); // Exponential backoff
      }
    }
  }

  /**
   * Extract elements from frame
   */
  async extractElements(frame) {
    try {
      return await frame.evaluate(() => {
        const elements = [];
        const walk = (node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const style = window.getComputedStyle(node);
            elements.push({
              tag: node.tagName.toLowerCase(),
              id: node.id,
              classes: Array.from(node.classList),
              text: node.textContent?.trim(),
              rect: node.getBoundingClientRect().toJSON(),
              styles: {
                color: style.color,
                backgroundColor: style.backgroundColor,
                fontSize: style.fontSize,
                fontFamily: style.fontFamily,
                padding: style.padding,
                margin: style.margin,
                border: style.border,
                borderRadius: style.borderRadius,
                boxShadow: style.boxShadow
              }
            });
          }
          for (const child of node.childNodes) walk(child);
        };
        walk(document.body);
        return elements;
      });
    } catch (error) {
      console.error('❌ Element extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract semantic elements from frame
   */
  async extractSemanticElements(frame) {
    try {
      return await frame.evaluate(() => {
        const semanticElements = [];
        const selectors = [
          'header', 'nav', 'main', 'article', 'section', 'aside', 'footer',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'button', 'a[href]', 'input', 'select', 'textarea'
        ];
        
        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => {
            semanticElements.push({
              type: el.tagName.toLowerCase(),
              role: el.getAttribute('role'),
              text: el.textContent?.trim(),
              rect: el.getBoundingClientRect().toJSON()
            });
          });
        });
        
        return semanticElements;
      });
    } catch (error) {
      console.error('❌ Semantic element extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract all meaningful components from the page
   */
  async extractComponents() {
    return await this.page.evaluate((config) => {
      const components = [];
      const processedElements = new Set();

      function isElementVisible(element) {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          rect.width >= config.componentFilters.minWidth &&
          rect.height >= config.componentFilters.minHeight
        );
      }

      function isElementMeaningful(element) {
        const tagName = element.tagName.toLowerCase();
        
        // Exclude unwanted tags
        if (config.componentFilters.excludeTags.includes(tagName)) {
          return false;
        }

        // Exclude hidden classes
        const classList = Array.from(element.classList);
        if (classList.some(cls => config.componentFilters.excludeClasses.includes(cls))) {
          return false;
        }

        // Include elements with meaningful content or semantic value
        return (
          element.textContent?.trim().length > 0 ||
          element.children.length > 0 ||
          ['img', 'button', 'input', 'select', 'textarea', 'a', 'form'].includes(tagName) ||
          element.style.backgroundImage ||
          window.getComputedStyle(element).backgroundImage !== 'none'
        );
      }

      function getElementSelector(element) {
        // Generate comprehensive selector
        if (element.id) {
          return `#${element.id}`;
        }

        const classNames = Array.from(element.classList).slice(0, 3);
        if (classNames.length > 0) {
          return `${element.tagName.toLowerCase()}.${classNames.join('.')}`;
        }

        // Generate path-based selector as fallback
        const path = [];
        let current = element;
        while (current && current.tagName) {
          let selector = current.tagName.toLowerCase();
          if (current.id) {
            selector += `#${current.id}`;
            path.unshift(selector);
            break;
          }
          if (current.className) {
            const classes = Array.from(current.classList).slice(0, 2);
            if (classes.length > 0) {
              selector += `.${classes.join('.')}`;
            }
          }
          path.unshift(selector);
          current = current.parentElement;
          if (path.length > 5) break; // Limit depth
        }
        return path.join(' > ');
      }

      function extractDetailedStyles(element) {
        const computed = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return {
          // Typography
          typography: {
            fontFamily: computed.fontFamily,
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight,
            fontStyle: computed.fontStyle,
            lineHeight: computed.lineHeight,
            letterSpacing: computed.letterSpacing,
            textAlign: computed.textAlign,
            textDecoration: computed.textDecoration,
            textTransform: computed.textTransform,
            color: computed.color,
            whiteSpace: computed.whiteSpace,
            wordSpacing: computed.wordSpacing
          },

          // Layout & Positioning
          layout: {
            display: computed.display,
            position: computed.position,
            top: computed.top,
            right: computed.right,
            bottom: computed.bottom,
            left: computed.left,
            zIndex: computed.zIndex,
            float: computed.float,
            clear: computed.clear,
            overflow: computed.overflow,
            overflowX: computed.overflowX,
            overflowY: computed.overflowY,
            visibility: computed.visibility
          },

          // Dimensions
          dimensions: {
            width: computed.width,
            height: computed.height,
            minWidth: computed.minWidth,
            maxWidth: computed.maxWidth,
            minHeight: computed.minHeight,
            maxHeight: computed.maxHeight,
            boxSizing: computed.boxSizing
          },

          // Spacing
          spacing: {
            margin: computed.margin,
            marginTop: computed.marginTop,
            marginRight: computed.marginRight,
            marginBottom: computed.marginBottom,
            marginLeft: computed.marginLeft,
            padding: computed.padding,
            paddingTop: computed.paddingTop,
            paddingRight: computed.paddingRight,
            paddingBottom: computed.paddingBottom,
            paddingLeft: computed.paddingLeft
          },

          // Background & Colors
          background: {
            backgroundColor: computed.backgroundColor,
            backgroundImage: computed.backgroundImage,
            backgroundSize: computed.backgroundSize,
            backgroundPosition: computed.backgroundPosition,
            backgroundRepeat: computed.backgroundRepeat,
            backgroundAttachment: computed.backgroundAttachment,
            backgroundClip: computed.backgroundClip,
            backgroundOrigin: computed.backgroundOrigin
          },

          // Border & Outline
          border: {
            border: computed.border,
            borderWidth: computed.borderWidth,
            borderStyle: computed.borderStyle,
            borderColor: computed.borderColor,
            borderRadius: computed.borderRadius,
            borderTopLeftRadius: computed.borderTopLeftRadius,
            borderTopRightRadius: computed.borderTopRightRadius,
            borderBottomLeftRadius: computed.borderBottomLeftRadius,
            borderBottomRightRadius: computed.borderBottomRightRadius,
            outline: computed.outline,
            outlineWidth: computed.outlineWidth,
            outlineStyle: computed.outlineStyle,
            outlineColor: computed.outlineColor
          },

          // Effects & Transforms
          effects: {
            opacity: computed.opacity,
            boxShadow: computed.boxShadow,
            textShadow: computed.textShadow,
            filter: computed.filter,
            transform: computed.transform,
            transformOrigin: computed.transformOrigin,
            transition: computed.transition,
            animation: computed.animation
          },

          // Flexbox
          flexbox: {
            flexDirection: computed.flexDirection,
            flexWrap: computed.flexWrap,
            justifyContent: computed.justifyContent,
            alignItems: computed.alignItems,
            alignContent: computed.alignContent,
            flex: computed.flex,
            flexGrow: computed.flexGrow,
            flexShrink: computed.flexShrink,
            flexBasis: computed.flexBasis,
            alignSelf: computed.alignSelf,
            gap: computed.gap,
            rowGap: computed.rowGap,
            columnGap: computed.columnGap
          },

          // Grid
          grid: {
            gridTemplateColumns: computed.gridTemplateColumns,
            gridTemplateRows: computed.gridTemplateRows,
            gridTemplateAreas: computed.gridTemplateAreas,
            gridArea: computed.gridArea,
            gridColumn: computed.gridColumn,
            gridRow: computed.gridRow,
            gridGap: computed.gridGap,
            gridRowGap: computed.gridRowGap,
            gridColumnGap: computed.gridColumnGap,
            justifyItems: computed.justifyItems,
            alignItems: computed.alignItems,
            placeSelf: computed.placeSelf,
            justifySelf: computed.justifySelf
          },

          // Interaction
          interaction: {
            cursor: computed.cursor,
            pointerEvents: computed.pointerEvents,
            userSelect: computed.userSelect,
            resize: computed.resize
          }
        };
      }

      function getComponentType(element) {
        const tagName = element.tagName.toLowerCase();
        const className = (element.className && typeof element.className === 'string') 
          ? element.className.toLowerCase() 
          : '';
        const role = element.getAttribute('role');

        // Semantic HTML elements
        if (['button', 'input', 'select', 'textarea', 'form'].includes(tagName)) {
          return 'form-control';
        }
        if (['nav', 'aside', 'section', 'article', 'header', 'footer', 'main'].includes(tagName)) {
          return 'semantic-section';
        }
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          return 'heading';
        }
        if (tagName === 'img') {
          return 'image';
        }
        if (tagName === 'a') {
          return 'link';
        }

        // Role-based detection
        if (role) {
          return `role-${role}`;
        }

        // Class-based detection
        if (className.includes('btn') || className.includes('button')) {
          return 'button';
        }
        if (className.includes('card') || className.includes('panel')) {
          return 'card';
        }
        if (className.includes('modal') || className.includes('dialog')) {
          return 'modal';
        }
        if (className.includes('nav') || className.includes('menu')) {
          return 'navigation';
        }
        if (className.includes('form')) {
          return 'form';
        }
        if (className.includes('table') || tagName === 'table') {
          return 'table';
        }
        if (className.includes('list') || ['ul', 'ol', 'dl'].includes(tagName)) {
          return 'list';
        }

        return 'generic';
      }

      // Find all meaningful elements
      const allElements = document.querySelectorAll('*');
      
      for (let i = 0; i < allElements.length && components.length < config.maxComponents; i++) {
        const element = allElements[i];
        
        if (processedElements.has(element) || 
            !isElementMeaningful(element) || 
            (!config.includeInvisible && !isElementVisible(element))) {
          continue;
        }

        const rect = element.getBoundingClientRect();
        const styles = extractDetailedStyles(element);
        const componentType = getComponentType(element);

        // Extract flat styles for compatibility with comparison engine
        const flatStyles = {
          // Typography from nested structure
          fontFamily: styles.typography.fontFamily,
          fontSize: styles.typography.fontSize,
          fontWeight: styles.typography.fontWeight,
          fontStyle: styles.typography.fontStyle,
          lineHeight: styles.typography.lineHeight,
          letterSpacing: styles.typography.letterSpacing,
          textAlign: styles.typography.textAlign,
          textDecoration: styles.typography.textDecoration,
          textTransform: styles.typography.textTransform,
          color: styles.typography.color,
          
          // Background from nested structure
          backgroundColor: styles.background.backgroundColor,
          backgroundImage: styles.background.backgroundImage,
          
          // Spacing from nested structure
          margin: styles.spacing.margin,
          marginTop: styles.spacing.marginTop,
          marginRight: styles.spacing.marginRight,
          marginBottom: styles.spacing.marginBottom,
          marginLeft: styles.spacing.marginLeft,
          padding: styles.spacing.padding,
          paddingTop: styles.spacing.paddingTop,
          paddingRight: styles.spacing.paddingRight,
          paddingBottom: styles.spacing.paddingBottom,
          paddingLeft: styles.spacing.paddingLeft,
          
          // Border from nested structure
          border: styles.border.border,
          borderWidth: styles.border.borderWidth,
          borderStyle: styles.border.borderStyle,
          borderColor: styles.border.borderColor,
          borderRadius: styles.border.borderRadius,
          
          // Layout from nested structure
          display: styles.layout.display,
          position: styles.layout.position,
          width: styles.dimensions.width,
          height: styles.dimensions.height,
          
          // Effects from nested structure
          opacity: styles.effects.opacity,
          boxShadow: styles.effects.boxShadow,
          textShadow: styles.effects.textShadow,
          transform: styles.effects.transform
        };

        const component = {
          id: `web-${i}`,
          selector: getElementSelector(element),
          tagName: element.tagName.toLowerCase(),
          type: componentType,
          text: element.textContent?.trim().substring(0, 200) || '',
          attributes: {
            id: element.id || null,
            className: element.className || null,
            role: element.getAttribute('role') || null,
            ariaLabel: element.getAttribute('aria-label') || null,
            title: element.getAttribute('title') || null,
            alt: element.getAttribute('alt') || null,
            href: element.getAttribute('href') || null,
            src: element.getAttribute('src') || null
          },
          // For comparison engine compatibility
          boundingRect: {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            right: Math.round(rect.right),
            bottom: Math.round(rect.bottom)
          },
          // Dimensions property expected by comparison engine
          dimensions: {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            x: Math.round(rect.left),
            y: Math.round(rect.top)
          },
          // Flat styles for compatibility
          styles: flatStyles,
          // Enhanced data structure  
          position: {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            right: Math.round(rect.right),
            bottom: Math.round(rect.bottom)
          },
          detailedStyles: styles,
          childCount: element.children.length,
          depth: 0, // Will be calculated in hierarchy analysis
          parentSelector: element.parentElement ? getElementSelector(element.parentElement) : null
        };

        components.push(component);
        processedElements.add(element);
      }

      return components;
    }, this.config);
  }

  /**
   * Extract semantic UI components (buttons, forms, navigation, etc.)
   */
  async extractSemanticComponents() {
    return await this.page.evaluate(() => {
      const semanticComponents = [];

      // Find form components
      const forms = document.querySelectorAll('form');
      forms.forEach((form, index) => {
        const inputs = form.querySelectorAll('input, select, textarea, button');
        semanticComponents.push({
          type: 'form',
          id: `form-${index}`,
          selector: form.id ? `#${form.id}` : `form:nth-of-type(${index + 1})`,
          action: form.action,
          method: form.method,
          inputCount: inputs.length,
          inputs: Array.from(inputs).map(input => ({
            type: input.type,
            name: input.name,
            placeholder: input.placeholder,
            required: input.required
          }))
        });
      });

      // Find navigation components
      const navs = document.querySelectorAll('nav, [role="navigation"], .nav, .navbar, .menu');
      navs.forEach((nav, index) => {
        const links = nav.querySelectorAll('a');
        semanticComponents.push({
          type: 'navigation',
          id: `nav-${index}`,
          selector: nav.id ? `#${nav.id}` : `nav:nth-of-type(${index + 1})`,
          linkCount: links.length,
          links: Array.from(links).map(link => ({
            text: link.textContent?.trim(),
            href: link.href,
            external: link.hostname !== window.location.hostname
          }))
        });
      });

      // Find button components
      const buttons = document.querySelectorAll('button, .btn, [role="button"], input[type="button"], input[type="submit"]');
      buttons.forEach((button, index) => {
        semanticComponents.push({
          type: 'button',
          id: `button-${index}`,
          selector: button.id ? `#${button.id}` : `button:nth-of-type(${index + 1})`,
          text: button.textContent?.trim() || button.value,
          buttonType: button.type,
          disabled: button.disabled
        });
      });

      // Find image components
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        semanticComponents.push({
          type: 'image',
          id: `image-${index}`,
          selector: img.id ? `#${img.id}` : `img:nth-of-type(${index + 1})`,
          src: img.src,
          alt: img.alt,
          width: img.naturalWidth,
          height: img.naturalHeight,
          loading: img.loading
        });
      });

      // Find table components
      const tables = document.querySelectorAll('table');
      tables.forEach((table, index) => {
        const rows = table.querySelectorAll('tr');
        const headers = table.querySelectorAll('th');
        semanticComponents.push({
          type: 'table',
          id: `table-${index}`,
          selector: table.id ? `#${table.id}` : `table:nth-of-type(${index + 1})`,
          rowCount: rows.length,
          columnCount: headers.length,
          hasCaption: !!table.querySelector('caption'),
          caption: table.querySelector('caption')?.textContent?.trim()
        });
      });

      return semanticComponents;
    });
  }

  /**
   * Analyze component hierarchy and relationships
   */
  async analyzeComponentHierarchy() {
    return await this.page.evaluate(() => {
      const hierarchy = {
        maxDepth: 0,
        containers: [],
        relationships: []
      };

      function calculateDepth(element, currentDepth = 0) {
        hierarchy.maxDepth = Math.max(hierarchy.maxDepth, currentDepth);
        
        if (element.children.length > 0) {
          Array.from(element.children).forEach(child => {
            calculateDepth(child, currentDepth + 1);
          });
        }
      }

      // Calculate maximum depth
      calculateDepth(document.body);

      // Find container elements
      const containers = document.querySelectorAll('div, section, article, aside, header, footer, main, nav');
      containers.forEach((container, index) => {
        const childElements = container.children.length;
        if (childElements > 2) { // Only consider meaningful containers
          hierarchy.containers.push({
            id: `container-${index}`,
            selector: container.id ? `#${container.id}` : container.tagName.toLowerCase(),
            childCount: childElements,
            depth: 0, // Would need to calculate based on DOM position
            type: container.tagName.toLowerCase()
          });
        }
      });

      return hierarchy;
    });
  }

  /**
   * Handle authentication similar to the original WebExtractor
   */
  async handleAuthentication(page, authentication) {
    try {
      console.log('🔐 Setting up authentication...');
      
      if (!authentication || !authentication.type) {
        throw new Error('Invalid authentication configuration');
      }

      if (authentication.type === 'credentials') {
        console.log('🔒 Using credentials authentication');
        const { loginUrl, username, password, waitTime = 3000 } = authentication;

        if (!loginUrl || !username || !password) {
          throw new Error('Missing required authentication fields');
        }

        // Navigate to login page
        console.log('🔄 Navigating to login page:', loginUrl);
        await this.navigateWithRetries(page, loginUrl);

        // Wait for page to load
        await page.waitForFunction(() => document.readyState === 'complete');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Find and fill username field
        console.log('🔑 Filling username field...');
        await page.evaluate((username) => {
          const usernameField = Array.from(document.querySelectorAll('input')).find(input => 
            input.type === 'email' || 
            input.type === 'text' || 
            input.id?.toLowerCase().includes('email') || 
            input.name?.toLowerCase().includes('email') ||
            input.id?.toLowerCase().includes('username') || 
            input.name?.toLowerCase().includes('username')
          );
          if (usernameField) {
            usernameField.value = username;
            usernameField.dispatchEvent(new Event('input', { bubbles: true }));
            usernameField.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, username);

        // Find and fill password field
        console.log('🔑 Filling password field...');
        await page.evaluate((password) => {
          const passwordField = Array.from(document.querySelectorAll('input')).find(input => 
            input.type === 'password' || 
            input.id?.toLowerCase().includes('password') || 
            input.name?.toLowerCase().includes('password')
          );
          if (passwordField) {
            passwordField.value = password;
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, password);

        // Find and click submit button
        console.log('🔄 Submitting login form...');
        await page.evaluate(() => {
          const submitButton = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(button => 
            button.type === 'submit' || 
            button.textContent?.toLowerCase().includes('login') ||
            button.textContent?.toLowerCase().includes('sign in') ||
            button.value?.toLowerCase().includes('login') ||
            button.value?.toLowerCase().includes('sign in')
          );
          if (submitButton) {
            submitButton.click();
          }
        });

        // Wait for navigation and additional time for any redirects/loading
        console.log('⏳ Waiting for default timeout...');
        await new Promise(resolve => setTimeout(resolve, waitTime));

        // Check if login was successful
        const loginFailed = await page.evaluate(() => {
          const errorMessages = Array.from(document.querySelectorAll('*')).find(el => 
            el.textContent?.toLowerCase().includes('invalid') ||
            el.textContent?.toLowerCase().includes('incorrect') ||
            el.textContent?.toLowerCase().includes('failed')
          );
          return !!errorMessages;
        });

        if (loginFailed) {
          throw new Error('Login failed - invalid credentials or error message detected');
        }

      } else {
        throw new Error(`Unsupported authentication type: ${authentication.type}`);
      }

    } catch (error) {
      console.error('❌ Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Close the browser and cleanup resources
   */
  async close() {
    try {
      console.log('🔄 Closing Enhanced Web Extractor...');
      
      if (this.browser) {
        await BrowserManager.closeBrowserSafely(this.browser);
        console.log('✅ Browser closed safely');
      }
      
      this.page = null;
      this.browser = null;
      
      console.log('✅ Enhanced Web Extractor closed successfully');
    } catch (error) {
      console.error('❌ Error closing Enhanced Web Extractor:', error);
      // Force cleanup even if there are errors
      await BrowserManager.cleanupOrphanedProcesses();
      this.page = null;
      this.browser = null;
    }
  }

  /**
   * Force cleanup of browser resources
   */
  async forceCleanup() {
    try {
      console.log('🧹 Force cleaning up Enhanced Web Extractor resources...');
      
      if (this.browser) {
        try {
          // Try to get browser process and kill it if needed
          const process = this.browser.process();
          if (process && !process.killed) {
            process.kill('SIGKILL');
            console.log('🔫 Browser process killed');
          }
        } catch (processError) {
          console.warn('⚠️ Error killing browser process:', processError.message);
        }
      }
      
      this.page = null;
      this.browser = null;
      
      console.log('✅ Force cleanup completed');
    } catch (error) {
      console.error('❌ Error during force cleanup:', error);
      this.page = null;
      this.browser = null;
    }
  }

  /**
   * Check if the extractor is ready for use
   */
  isReady() {
    return this.browser && 
           !this.browser.process()?.killed && 
           this.page && 
           !this.page.isClosed();
  }

  /**
   * Get status information about the extractor
   */
  getStatus() {
    return {
      browserReady: this.browser && !this.browser.process()?.killed,
      pageReady: this.page && !this.page.isClosed(),
      fullyReady: this.isReady()
    };
  }

  /**
   * Extract comprehensive web data using multiple extraction methods
   * @param {string} url - Target URL
   * @param {Object} authentication - Authentication config
   * @returns {Object} Comprehensive web data with multiple analysis methods
   */
  async extractComprehensiveWebData(url, authentication = null) {
    try {
      console.log(`🌐 Comprehensive extraction from: ${url}`);
      
      // Ensure browser is initialized and ready
      if (!this.browser || this.browser.process()?.killed) {
        console.log('🔄 Browser not ready, initializing...');
        await this.initialize();
      }

      // Ensure page is ready and not closed
      if (!this.page || this.page.isClosed()) {
        console.log('🔄 Page not ready, creating new page...');
        this.page = await this.browser.newPage();
        await this.page.setViewport(this.config.viewport);
        await this.page.setDefaultTimeout(this.config.timeout);
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      }

      // Handle authentication if provided
      if (authentication) {
        await this.handleAuthentication(this.page, authentication);
      }

      // Navigate to target URL with retries
      let navigationSuccess = false;
      let lastError = null;
      
      const navigationStrategies = [
        { waitUntil: ['domcontentloaded', 'networkidle0'], timeout: this.config.timeout },
        { waitUntil: 'domcontentloaded', timeout: this.config.timeout },
        { waitUntil: 'load', timeout: Math.min(this.config.timeout, 30000) },
        { waitUntil: 'domcontentloaded', timeout: 15000 }
      ];
      
      for (let attempt = 1; attempt <= navigationStrategies.length; attempt++) {
        try {
          const strategy = navigationStrategies[attempt - 1];
          console.log(`🔄 Navigation attempt ${attempt}/${navigationStrategies.length} to: ${url}`);
          
          await this.page.goto(url, strategy);
          
          navigationSuccess = true;
          console.log(`✅ Successfully navigated to: ${url}`);
          break;
        } catch (error) {
          lastError = error;
          console.warn(`⚠️ Navigation attempt ${attempt} failed:`, error.message);
          
          if (attempt < navigationStrategies.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (this.page.isClosed()) {
              this.page = await this.browser.newPage();
              await this.page.setViewport(this.config.viewport);
              await this.page.setDefaultTimeout(this.config.timeout);
            }
          }
        }
      }

      if (!navigationSuccess) {
        throw new Error(`Failed to navigate to ${url} after ${navigationStrategies.length} attempts. Last error: ${lastError?.message}`);
      }

             // Wait for page to be fully rendered
       try {
         await Promise.race([
           new Promise(resolve => setTimeout(resolve, 3000)),
           this.page.waitForSelector('body', { timeout: 5000 })
         ]);
       } catch (waitError) {
         console.warn('⚠️ Page wait timeout, proceeding with extraction:', waitError.message);
       }

      console.log('🔍 Starting comprehensive extraction...');

      // Method 1: Extract CSS Stylesheets
      console.log('📋 Method 1: Analyzing CSS stylesheets...');
      const stylesheets = await this.extractCSSStylesheets();

      // Method 2: Extract UI Components
      console.log('🎯 Method 2: Extracting UI components...');
      const uiComponents = await this.extractUIComponents();

      // Method 3: Extract DOM Hierarchy
      console.log('🌳 Method 3: Analyzing DOM hierarchy...');
      const domHierarchy = await this.extractDOMHierarchy();

      // Method 4: Extract CSS Variables
      console.log('🎨 Method 4: Extracting CSS custom properties...');
      const cssVariables = await this.extractCSSVariables();

      // Method 5: Extract Color Palette
      console.log('🎨 Method 5: Building color palette...');
      const colorPalette = await this.extractColorPalette();

      // Method 6: Extract Typography System
      console.log('📝 Method 6: Analyzing typography system...');
      const typographySystem = await this.extractTypographySystem();

      // Build comprehensive results
      const comprehensiveData = {
        url,
        extractedAt: new Date().toISOString(),
        authentication: authentication ? 'enabled' : 'none',
        extractionMethod: 'Comprehensive Web Analysis',
        
        summary: {
          totalElements: domHierarchy.length,
          totalComponents: uiComponents.length,
          totalColors: colorPalette.length,
          totalFonts: typographySystem.fonts.length,
          totalStylesheets: stylesheets.length
        },

        methods: {
          stylesheets,
          uiComponents,
          domHierarchy,
          cssVariables,
          colorPalette,
          typographySystem
        },

        metadata: {
          pageTitle: await this.page.title(),
          viewport: this.config.viewport,
          userAgent: await this.page.evaluate(() => navigator.userAgent)
        }
      };

      console.log(`✅ Comprehensive extraction complete!`);
      console.log(`   📊 ${uiComponents.length} UI components`);
      console.log(`   🎨 ${colorPalette.length} colors`);
      console.log(`   📝 ${typographySystem.fonts.length} fonts`);
      console.log(`   📋 ${stylesheets.length} stylesheets`);

      return comprehensiveData;

    } catch (error) {
      console.error('❌ Comprehensive web extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract CSS stylesheets and their rules
   */
  async extractCSSStylesheets() {
    return await this.page.evaluate(() => {
      const stylesheets = [];
      
      for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i];
        const sheetData = {
          href: sheet.href,
          media: sheet.media ? Array.from(sheet.media).join(', ') : 'all',
          rules: []
        };

        try {
          const rules = sheet.cssRules || sheet.rules;
          for (let j = 0; j < Math.min(rules.length, 100); j++) { // Limit to prevent timeout
            const rule = rules[j];
            if (rule.type === CSSRule.STYLE_RULE) {
              const styles = {};
              for (let k = 0; k < rule.style.length; k++) {
                const prop = rule.style[k];
                styles[prop] = rule.style.getPropertyValue(prop);
              }
              
              sheetData.rules.push({
                selector: rule.selectorText,
                styles
              });
            }
          }
        } catch (e) {
          // CORS or other restrictions
          sheetData.error = 'Unable to access stylesheet rules (CORS)';
        }

        stylesheets.push(sheetData);
      }

      return stylesheets;
    });
  }

  /**
   * Extract UI components with semantic meaning
   */
  async extractUIComponents() {
    return await this.page.evaluate((config) => {
      const components = [];
      const uiSelectors = [
        'button', 'input', 'select', 'textarea', 'a', 'form',
        '[role="button"]', '[role="link"]', '[role="textbox"]',
        '.btn', '.button', '.link', '.input', '.form-control',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div',
        '.card', '.modal', '.dropdown', '.navbar', '.sidebar'
      ];

      uiSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((element, index) => {
            if (index >= 50) return; // Limit per selector

            const rect = element.getBoundingClientRect();
            const computed = window.getComputedStyle(element);

            // Skip invisible elements
            if (rect.width === 0 || rect.height === 0 || computed.display === 'none') {
              return;
            }

            const component = {
              type: getComponentType(element),
              tagName: element.tagName.toLowerCase(),
              id: element.id || null,
              className: element.className || null,
              text: element.textContent ? element.textContent.trim().substring(0, 100) : null,
              selector: selector,
              styles: {
                color: computed.color,
                backgroundColor: computed.backgroundColor,
                fontSize: computed.fontSize,
                fontFamily: computed.fontFamily,
                fontWeight: computed.fontWeight,
                padding: computed.padding,
                margin: computed.margin,
                border: computed.border,
                borderRadius: computed.borderRadius,
                boxShadow: computed.boxShadow,
                display: computed.display,
                position: computed.position
              },
              dimensions: {
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                x: Math.round(rect.left),
                y: Math.round(rect.top)
              }
            };

            components.push(component);
          });
        } catch (e) {
          // Skip problematic selectors
        }
      });

      function getComponentType(element) {
        const tag = element.tagName.toLowerCase();
        const role = element.getAttribute('role');
        const type = element.getAttribute('type');
        const className = element.className || '';

        // Role-based detection
        if (role) {
          return role.toUpperCase();
        }

        // Tag-based detection
        if (['button', 'input', 'select', 'textarea'].includes(tag)) {
          return tag.toUpperCase();
        }

        if (tag === 'a') return 'LINK';
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) return 'HEADING';
        if (tag === 'p') return 'TEXT';
        if (tag === 'img') return 'IMAGE';
        if (tag === 'form') return 'FORM';

        // Class-based detection
        const classStr = typeof className === 'string' ? className : String(className || '');
        if (classStr.includes('btn') || classStr.includes('button')) return 'BUTTON';
        if (classStr.includes('card')) return 'CARD';
        if (classStr.includes('modal')) return 'MODAL';
        if (classStr.includes('nav')) return 'NAVIGATION';

        return 'ELEMENT';
      }

      return components;
    }, this.config);
  }

  /**
   * Extract DOM hierarchy with depth information
   */
  async extractDOMHierarchy() {
    return await this.page.evaluate(() => {
      const hierarchy = [];

      function walkDOM(element, depth = 0, parent = null) {
        if (depth > 10) return; // Prevent infinite recursion

        const rect = element.getBoundingClientRect();
        const computed = window.getComputedStyle(element);

        hierarchy.push({
          tagName: element.tagName.toLowerCase(),
          id: element.id || null,
          className: element.className || null,
          depth,
          parent: parent ? parent.tagName.toLowerCase() : null,
          children: element.children.length,
          text: element.textContent ? element.textContent.trim().substring(0, 50) : null,
          visible: rect.width > 0 && rect.height > 0 && computed.display !== 'none',
          dimensions: {
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        });

        // Recursively process children
        for (const child of element.children) {
          walkDOM(child, depth + 1, element);
        }
      }

      // Start from body
      if (document.body) {
        walkDOM(document.body);
      }

      return hierarchy;
    });
  }

  /**
   * Extract CSS custom properties (variables)
   */
  async extractCSSVariables() {
    return await this.page.evaluate(() => {
      const variables = {};
      const rootStyles = getComputedStyle(document.documentElement);

      // Extract CSS custom properties from root
      for (let i = 0; i < rootStyles.length; i++) {
        const prop = rootStyles[i];
        if (prop.startsWith('--')) {
          variables[prop] = rootStyles.getPropertyValue(prop).trim();
        }
      }

      return variables;
    });
  }

  /**
   * Extract color palette from the page
   */
  async extractColorPalette() {
    return await this.page.evaluate(() => {
      const colors = new Set();
      const colorRegex = /#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/g;

      // Extract colors from computed styles
      const allElements = document.querySelectorAll('*');
      for (let i = 0; i < Math.min(allElements.length, 500); i++) {
        const element = allElements[i];
        const computed = window.getComputedStyle(element);
        
        [computed.color, computed.backgroundColor, computed.borderColor].forEach(color => {
          if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
            colors.add(color);
          }
        });
      }

      // Convert to hex when possible and return as array
      return Array.from(colors).map(color => {
        let hex = color;
        if (color.startsWith('rgb')) {
          const matches = color.match(/\d+/g);
          if (matches && matches.length >= 3) {
            const [r, g, b] = matches.map(Number);
            hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
          }
        }
        return {
          original: color,
          hex: hex
        };
      });
    });
  }

  /**
   * Extract typography system information
   */
  async extractTypographySystem() {
    return await this.page.evaluate(() => {
      const fonts = new Set();
      const fontSizes = new Set();
      const textStyles = [];

      // Text-containing elements
      const textSelectors = ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'button', 'label', 'li'];
      
      textSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        for (let i = 0; i < Math.min(elements.length, 20); i++) {
          const element = elements[i];
          const computed = window.getComputedStyle(element);
          const text = element.textContent ? element.textContent.trim() : '';
          
          if (text.length > 0) {
            fonts.add(computed.fontFamily);
            fontSizes.add(computed.fontSize);
            
            if (textStyles.length < 30) {
              textStyles.push({
                tagName: element.tagName.toLowerCase(),
                text: text.substring(0, 50),
                fontFamily: computed.fontFamily,
                fontSize: computed.fontSize,
                fontWeight: computed.fontWeight,
                color: computed.color,
                lineHeight: computed.lineHeight
              });
            }
          }
        }
      });

      return {
        fonts: Array.from(fonts),
        fontSizes: Array.from(fontSizes),
        textStyles
      };
    });
  }

  /**
   * Take screenshot of the current page
   * @param {string} selector - Optional CSS selector for element screenshot
   * @returns {Object} Screenshot data with buffer and base64
   */
  async takeScreenshot(selector = null) {
    try {
      if (!this.page || this.page.isClosed()) {
        throw new Error('Page not available for screenshot');
      }

      let screenshotBuffer;
      
      if (selector) {
        const element = await this.page.$(selector);
        if (element) {
          screenshotBuffer = await element.screenshot({ type: 'png' });
        } else {
          console.warn(`Element not found for selector: ${selector}, taking full page screenshot`);
          screenshotBuffer = await this.page.screenshot({ type: 'png', fullPage: true });
        }
      } else {
        screenshotBuffer = await this.page.screenshot({ type: 'png', fullPage: true });
      }

      return {
        buffer: screenshotBuffer,
        base64: screenshotBuffer.toString('base64'),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error taking screenshot:', error);
      throw error;
    }
  }

  /**
   * Take screenshot of a specific component/element
   * @param {string} selector - CSS selector for the element
   * @returns {Object} Screenshot data with buffer and base64
   */
  async takeComponentScreenshot(selector) {
    try {
      if (!this.page || this.page.isClosed()) {
        throw new Error('Page not available for component screenshot');
      }

      const element = await this.page.$(selector);
      if (!element) {
        throw new Error(`Element not found for selector: ${selector}`);
      }

      // Wait for element to be visible
      await element.waitForSelector(':not([style*="display: none"])', { timeout: 5000 }).catch(() => {});

      const screenshotBuffer = await element.screenshot({ 
        type: 'png',
        captureBeyondViewport: false 
      });

      return {
        buffer: screenshotBuffer,
        base64: screenshotBuffer.toString('base64'),
        selector: selector,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Error taking component screenshot for ${selector}:`, error);
      throw error;
    }
  }

  /**
   * Extract web data - main interface method used by ComparisonService
   * @param {string} url - Target URL
   * @param {Object} options - Extraction options including authentication
   * @returns {Promise<Object>} Extracted web data
   */
  async extract(url, options = {}) {
    try {
      // Properly destructure options with default values
      const { 
        authentication = null,
        timeout = 60000,
        includeVisual = false 
      } = options;

      // Create new page for extraction
      const page = await this.browser.newPage();
      await page.setViewport(this.config.viewport);
      await page.setDefaultTimeout(timeout);

      try {
        // Handle authentication if provided
        if (authentication) {
          await this.handleAuthentication(page, authentication);
        }

        // Navigate to target URL
        await this.navigateWithRetries(page, url);

        // Wait for page to be ready
        await page.waitForFunction(() => document.readyState === 'complete');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extract elements
        const elements = await this.extractElements(page.mainFrame());

        // Extract styles
        const styles = await page.evaluate(() => {
          const computedStyles = {};
          const elements = document.querySelectorAll('*');
          elements.forEach(el => {
            const style = window.getComputedStyle(el);
            const elementStyles = {
              color: style.color,
              backgroundColor: style.backgroundColor,
              fontSize: style.fontSize,
              fontFamily: style.fontFamily,
              padding: style.padding,
              margin: style.margin,
              border: style.border,
              borderRadius: style.borderRadius,
              boxShadow: style.boxShadow
            };
            computedStyles[el.tagName.toLowerCase()] = elementStyles;
          });
          return computedStyles;
        });

        // Take screenshots if requested
        const screenshots = [];
        if (includeVisual) {
          const screenshot = await page.screenshot({
            fullPage: true,
            type: 'jpeg',
            quality: 80
          });
          screenshots.push({
            type: 'full',
            data: screenshot.toString('base64'),
            format: 'jpeg'
          });
        }

        return {
          elements,
          styles,
          screenshots,
          metadata: {
            url,
            timestamp: new Date().toISOString(),
            extractorVersion: '2.0.0'
          }
        };

      } finally {
        if (page && !page.isClosed()) {
          await page.close().catch(console.error);
        }
      }

    } catch (error) {
      console.error('❌ Enhanced extraction failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.page = null;
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  }
}

export default EnhancedWebExtractor; 