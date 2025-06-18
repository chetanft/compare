import { EnhancedWebExtractor } from '../scraper/enhancedWebExtractor.js';
import { ErrorHandlingService } from '../utils/ErrorHandlingService.js';
import { BrowserManager } from '../utils/browserManager.js';

export class WebExtractionService {
  constructor(config = {}) {
    this.config = {
      timeout: 60000,
      maxRetries: 3,
      microfrontendConfig: {
        waitTime: 5000,
        retryInterval: 1000,
        maxModuleRetries: 3
      },
      ...config
    };

    this.errorHandler = new ErrorHandlingService();
    this.initialized = false;
    this.extractor = null;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // If extractor is already set (e.g. in tests), just initialize it
      if (this.extractor) {
        await this.extractor.initialize();
      } else {
        this.extractor = new EnhancedWebExtractor(this.config);
        await this.extractor.initialize();
      }
      
      this.initialized = true;
    } catch (error) {
      const categorizedError = this.errorHandler.categorizeError(error, {
        type: 'initialization',
        context: 'web_extractor'
      });
      throw categorizedError;
    }
  }

  /**
   * Extract web data with enhanced error handling
   */
  async extractWebData(url, authentication = null) {
    try {
      console.log(`\n🌐 Starting web extraction: ${url}`);

      // Ensure initialized
      await this.initialize();

      if (authentication) {
        await this.handleAuthentication(authentication);
      }

      const result = await this.extractor.extract(url, {
        waitForSelectors: ['body', '#root', '#app'],
        timeout: this.config.timeout,
        retryCount: this.config.maxRetries,
        interceptPatterns: [
          // Block unnecessary resources
          '**/google-analytics.com/*',
          '**/analytics.js',
          '**/gtag.js',
          '**/*.woff*',
          '**/*.ttf',
          '**/*.eot'
        ]
      });

      return {
        elements: result.elements || [],
        metadata: {
          extractorVersion: result.version,
          timestamp: new Date().toISOString(),
          url
        }
      };
    } catch (error) {
      const categorizedError = this.errorHandler.categorizeError(error, {
        type: 'web_extraction',
        url,
        authentication: authentication ? 'provided' : 'none'
      });

      if (categorizedError.categorized.shouldRetry && this.config.maxRetries > 0) {
        console.log(`\n⚠️ Extraction failed, retrying... (${this.config.maxRetries} attempts remaining)`);
        this.config.maxRetries--;
        await this.cleanup();
        this.initialized = false;
        return this.extractWebData(url, authentication);
      }

      throw categorizedError;
    }
  }

  /**
   * Handle authentication with retries
   */
  async handleAuthentication(auth) {
    if (!auth || !auth.loginUrl) {
      throw new Error('Invalid authentication configuration');
    }

    console.log(`🔐 Handling credentials authentication...`);
    console.log(`🔐 Navigating to login URL: ${auth.loginUrl}`);

    try {
      // Navigate to login page
      await this.extractor.page.goto(auth.loginUrl, {
        waitUntil: 'networkidle0',
        timeout: this.config.timeout
      });

      // Wait for form fields
      await this.extractor.page.waitForSelector('input[type="text"], input[type="email"], input[name="username"]');
      await this.extractor.page.waitForSelector('input[type="password"]');

      // Fill credentials
      await this.extractor.page.type('input[type="text"], input[type="email"], input[name="username"]', auth.username);
      await this.extractor.page.type('input[type="password"]', auth.password);

      // Submit form
      await Promise.all([
        this.extractor.page.waitForNavigation({ waitUntil: 'networkidle0' }),
        this.extractor.page.click('button[type="submit"], input[type="submit"]')
      ]);

      // Wait for authentication to complete
      await new Promise(resolve => setTimeout(resolve, auth.waitTime || 3000));

      console.log(`✅ Authentication completed successfully`);
    } catch (error) {
      const categorizedError = this.errorHandler.categorizeError(error, {
        type: 'authentication',
        url: auth.loginUrl
      });

      categorizedError.categorized.category = 'authentication_error';
      categorizedError.categorized.actionable = true;
      throw categorizedError;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.extractor) {
      await this.extractor.cleanup();
      this.extractor = null;
      this.initialized = false;
    }
  }
} 