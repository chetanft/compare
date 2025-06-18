import { ErrorCategorizer } from './errorCategorizer.js';
import { BrowserManager } from './browserManager.js';

export class ErrorHandlingService {
  constructor() {
    this.retryDelays = [1000, 2000, 5000]; // Progressive delays
    this.maxRetries = 3;
  }

  /**
   * Categorize error for better handling
   */
  categorizeError(error, context = {}) {
    const categorizedError = new Error(error.message);
    categorizedError.original = error;
    categorizedError.context = context;
    categorizedError.timestamp = new Date().toISOString();

    // Add categorization
    categorizedError.categorized = this.determineErrorCategory(error, context);
    
    // Add user-friendly message
    categorizedError.userFriendly = this.createUserFriendlyMessage(
      categorizedError.categorized,
      context
    );

    return categorizedError;
  }

  /**
   * Determine error category and metadata
   */
  determineErrorCategory(error, context) {
    const message = error.message.toLowerCase();
    const type = context.type || 'unknown';
    const stack = error.stack || '';

    // Critical errors - highest priority
    if (message.includes('page crashed') || message.includes('browser disconnected')) {
      return {
        category: 'critical_error',
        severity: 'critical',
        actionable: true,
        shouldRetry: true,
        suggestedAction: 'Restarting browser session due to crash'
      };
    }

    // Report generation errors
    if (type === 'report_generation' || message.includes('invalid string length')) {
      return {
        category: 'report_error',
        severity: 'high',
        actionable: true,
        shouldRetry: false,
        suggestedAction: 'Reducing data chunk size and retrying'
      };
    }

    // Component extraction errors
    if (message.includes('component extraction') || message.includes('selector not found')) {
      return {
        category: 'extraction_error',
        severity: 'high',
        actionable: true,
        shouldRetry: true,
        suggestedAction: 'Retrying component extraction with fallback strategy'
      };
    }

    // Authentication errors
    if (type === 'authentication' || message.includes('auth') || message.includes('login')) {
      return {
        category: 'authentication_error',
        severity: 'high',
        actionable: true,
        shouldRetry: true,
        suggestedAction: 'Verify credentials and try again'
      };
    }

    // Microfrontend errors - lower severity since they're often non-critical
    if (message.includes('@ft-mf/') || message.includes('systemjs')) {
      return {
        category: 'microfrontend_warning',
        severity: 'low',
        actionable: false,
        shouldRetry: false,
        suggestedAction: 'Non-critical module load warning - continuing extraction'
      };
    }

    // External integration warnings (Google Maps, etc)
    if (message.includes('google maps') || message.includes('api warning')) {
      return {
        category: 'external_warning',
        severity: 'info',
        actionable: false,
        shouldRetry: false,
        suggestedAction: 'External service warning - not affecting core functionality'
      };
    }

    // Network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return {
        category: 'network_error',
        severity: 'medium',
        actionable: true,
        shouldRetry: true,
        suggestedAction: 'Check network connection and try again'
      };
    }

    // Default unknown error
    return {
      category: 'unknown_error',
      severity: 'medium',
      actionable: false,
      shouldRetry: true,
      suggestedAction: 'Unknown error occurred'
    };
  }

  /**
   * Create user-friendly error message
   */
  createUserFriendlyMessage(categorized, context) {
    const { category, severity, suggestedAction } = categorized;
    const { type, url } = context;

    const messages = {
      critical_error: {
        title: '🚨 Critical Error',
        description: 'The browser or page has crashed.',
        action: 'Restarting with a fresh browser session.'
      },
      report_error: {
        title: '📊 Report Generation Failed',
        description: 'Unable to generate the comparison report due to size limits.',
        action: 'Reducing chunk size and retrying.'
      },
      extraction_error: {
        title: '🔍 Component Extraction Failed',
        description: 'Unable to extract some components from the page.',
        action: 'Retrying with fallback extraction strategy.'
      },
      authentication_error: {
        title: '🔐 Authentication Failed',
        description: 'Unable to log in to the application.',
        action: 'Please verify your credentials.'
      },
      microfrontend_warning: {
        title: '⚠️ Module Load Warning',
        description: 'Some non-critical modules failed to load.',
        action: 'Continuing with core functionality.'
      },
      external_warning: {
        title: 'ℹ️ External Service Warning',
        description: 'Warning from external service integration.',
        action: 'This does not affect comparison functionality.'
      },
      network_error: {
        title: '🌐 Network Issue',
        description: 'Connection problems detected.',
        action: 'Check network and retry.'
      },
      unknown_error: {
        title: '❌ Unexpected Error',
        description: 'An unexpected error occurred.',
        action: 'Please try again or contact support.'
      }
    };

    const message = messages[category] || messages.unknown_error;
    return {
      ...message,
      severity,
      context: `Error occurred during ${type} operation${url ? ` for ${url}` : ''}.`,
      suggestedAction
    };
  }

  /**
   * Handle extraction errors with retry logic
   */
  async handleExtractionError(error, context, retryCallback) {
    const categorizedError = this.categorizeError(error, context);
    const userFriendlyError = this.createUserFriendlyMessage(categorizedError.categorized, context);

    console.log('\n❌ Extraction Error:');
    console.log(`${userFriendlyError.title}`);
    console.log(`Description: ${userFriendlyError.description}`);

    if (this.shouldRetry(categorizedError)) {
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          console.log(`\n🔄 Retry attempt ${attempt + 1}/${this.maxRetries}`);
          
          // Wait before retry with progressive delay
          await new Promise(resolve => setTimeout(resolve, this.retryDelays[attempt]));
          
          // Clean up resources if needed
          if (this.needsCleanup(categorizedError)) {
            await BrowserManager.cleanupOrphanedProcesses();
          }
          
          // Execute retry callback
          return await retryCallback();
        } catch (retryError) {
          if (attempt === this.maxRetries - 1) {
            throw this.enhanceError(retryError, context);
          }
        }
      }
    }

    throw this.enhanceError(error, context);
  }

  /**
   * Handle report generation errors
   */
  async handleReportError(error, context) {
    const categorizedError = this.categorizeError(error, context);
    
    if (error.message.includes('Invalid string length')) {
      console.log('\n⚠️ Report size limit exceeded, attempting chunked generation...');
      return {
        shouldChunk: true,
        chunkSize: Math.floor(context.dataSize / 2) // Reduce chunk size
      };
    }

    throw this.enhanceError(error, context);
  }

  /**
   * Determine if error should trigger a retry
   */
  shouldRetry(categorizedError) {
    const retryableCategories = [
      'browser_infrastructure',
      'navigation_timeout',
      'network_connectivity',
      'target_site_module_error'
    ];
    
    return retryableCategories.includes(categorizedError.category);
  }

  /**
   * Check if error requires resource cleanup
   */
  needsCleanup(categorizedError) {
    const cleanupCategories = [
      'browser_infrastructure',
      'browser_launch_failure'
    ];
    
    return cleanupCategories.includes(categorizedError.category);
  }

  /**
   * Enhance error with additional context
   */
  enhanceError(error, context) {
    const enhanced = new Error(error.message);
    enhanced.originalError = error;
    enhanced.context = context;
    enhanced.timestamp = new Date().toISOString();
    enhanced.categorized = this.categorizeError(error, context);
    return enhanced;
  }

  /**
   * Handle microfrontend loading errors
   */
  handleMicrofrontendError(error) {
    if (error.message.includes('@ft-mf/')) {
      console.log('\n⚠️ Microfrontend loading error detected, applying workaround...');
      return {
        shouldIgnore: true,
        reason: 'Non-critical microfrontend loading error'
      };
    }
    return { shouldIgnore: false };
  }
} 