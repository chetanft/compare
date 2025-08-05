import { ErrorCategorizer } from './errorCategorizer.js';
import { BrowserManager } from './browserManager.js';

/**
 * Enhanced Error Handling Service
 * Provides centralized error handling, categorization, and formatting
 */

export class ErrorHandlingService {
  constructor() {
    this.retryDelays = [1000, 2000, 5000]; // Progressive delays
    this.maxRetries = 3;
    this.errorCategories = {
      // Figma extraction errors
      FIGMA_API_ERROR: {
        code: 'FIGMA_API_ERROR',
        httpStatus: 502,
        message: 'Error communicating with Figma API'
      },
      FIGMA_FILE_NOT_FOUND: {
        code: 'FIGMA_FILE_NOT_FOUND',
        httpStatus: 404,
        message: 'Figma file not found or inaccessible'
      },
      FIGMA_NODE_NOT_FOUND: {
        code: 'FIGMA_NODE_NOT_FOUND',
        httpStatus: 404,
        message: 'Specified node not found in Figma file'
      },
      FIGMA_AUTH_ERROR: {
        code: 'FIGMA_AUTH_ERROR',
        httpStatus: 401,
        message: 'Invalid or missing Figma API token'
      },
      FIGMA_EXTRACTION_TIMEOUT: {
        code: 'FIGMA_EXTRACTION_TIMEOUT',
        httpStatus: 504,
        message: 'Figma extraction timed out'
      },
      FIGMA_PARSING_ERROR: {
        code: 'FIGMA_PARSING_ERROR',
        httpStatus: 500,
        message: 'Error parsing Figma data'
      },
      FIGMA_MCP_ERROR: {
        code: 'FIGMA_MCP_ERROR',
        httpStatus: 502,
        message: 'Error communicating with Figma MCP server'
      },
      
      // Web extraction errors
      WEB_NAVIGATION_ERROR: {
        code: 'WEB_NAVIGATION_ERROR',
        httpStatus: 502,
        message: 'Error navigating to web URL'
      },
      WEB_TIMEOUT_ERROR: {
        code: 'WEB_TIMEOUT_ERROR',
        httpStatus: 504,
        message: 'Web extraction timed out'
      },
      WEB_AUTH_ERROR: {
        code: 'WEB_AUTH_ERROR',
        httpStatus: 401,
        message: 'Web authentication failed'
      },
      WEB_SELECTOR_ERROR: {
        code: 'WEB_SELECTOR_ERROR',
        httpStatus: 400,
        message: 'Invalid or missing CSS selector'
      },
      
      // Comparison errors
      COMPARISON_ERROR: {
        code: 'COMPARISON_ERROR',
        httpStatus: 500,
        message: 'Error comparing Figma and web data'
      },
      
      // Report generation errors
      REPORT_GENERATION_ERROR: {
        code: 'REPORT_GENERATION_ERROR',
        httpStatus: 500,
        message: 'Error generating comparison report'
      },
      
      // Generic errors
      VALIDATION_ERROR: {
        code: 'VALIDATION_ERROR',
        httpStatus: 400,
        message: 'Invalid request parameters'
      },
      SERVER_ERROR: {
        code: 'SERVER_ERROR',
        httpStatus: 500,
        message: 'Internal server error'
      }
    };
  }

  /**
   * Categorize an error based on its message and context
   * @param {Error} error - The error to categorize
   * @param {string} context - The context in which the error occurred
   * @returns {Object} Categorized error with code, message, and details
   */
  categorizeError(error, context = 'general') {
    const errorMessage = error.message || 'Unknown error';
    let category;
    
    // Figma extraction errors
    if (context === 'figma') {
      if (errorMessage.includes('API key') || errorMessage.includes('token') || errorMessage.includes('401')) {
        category = this.errorCategories.FIGMA_AUTH_ERROR;
      } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        if (errorMessage.includes('node')) {
          category = this.errorCategories.FIGMA_NODE_NOT_FOUND;
        } else {
          category = this.errorCategories.FIGMA_FILE_NOT_FOUND;
        }
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        category = this.errorCategories.FIGMA_EXTRACTION_TIMEOUT;
      } else if (errorMessage.includes('parse') || errorMessage.includes('JSON')) {
        category = this.errorCategories.FIGMA_PARSING_ERROR;
      } else if (errorMessage.includes('MCP') || errorMessage.includes('mcp')) {
        category = this.errorCategories.FIGMA_MCP_ERROR;
      } else {
        category = this.errorCategories.FIGMA_API_ERROR;
      }
    } 
    // Web extraction errors
    else if (context === 'web') {
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        category = this.errorCategories.WEB_TIMEOUT_ERROR;
      } else if (errorMessage.includes('navigation') || errorMessage.includes('ERR_') || errorMessage.includes('ENOTFOUND')) {
        category = this.errorCategories.WEB_NAVIGATION_ERROR;
      } else if (errorMessage.includes('auth') || errorMessage.includes('login') || errorMessage.includes('credentials')) {
        category = this.errorCategories.WEB_AUTH_ERROR;
      } else if (errorMessage.includes('selector')) {
        category = this.errorCategories.WEB_SELECTOR_ERROR;
      } else {
        category = this.errorCategories.WEB_NAVIGATION_ERROR;
      }
    }
    // Comparison errors
    else if (context === 'comparison') {
      category = this.errorCategories.COMPARISON_ERROR;
    }
    // Report generation errors
    else if (context === 'report') {
      category = this.errorCategories.REPORT_GENERATION_ERROR;
    }
    // Validation errors
    else if (context === 'validation') {
      category = this.errorCategories.VALIDATION_ERROR;
    }
    // Generic server errors
    else {
      category = this.errorCategories.SERVER_ERROR;
    }
    
    return {
      code: category.code,
      message: this.formatErrorMessage(errorMessage, category),
      details: error.stack || errorMessage,
      httpStatus: category.httpStatus
    };
  }
  
  /**
   * Format an error message for user-friendly display
   * @param {string} errorMessage - The original error message
   * @param {Object} category - The error category
   * @returns {string} Formatted error message
   */
  formatErrorMessage(errorMessage, category) {
    // Start with the category message as a base
    let formattedMessage = category.message;
    
    // Add specific details from the error message if available
    if (errorMessage) {
      // Extract the most relevant part of the error message
      const relevantPart = this.extractRelevantErrorPart(errorMessage);
      
      // Only add the relevant part if it adds value
      if (relevantPart && !formattedMessage.includes(relevantPart)) {
        formattedMessage += `: ${relevantPart}`;
      }
    }
    
    return formattedMessage;
  }
  
  /**
   * Extract the most relevant part of an error message
   * @param {string} errorMessage - The full error message
   * @returns {string} The most relevant part of the message
   */
  extractRelevantErrorPart(errorMessage) {
    // Remove common prefixes that don't add value
    let cleaned = errorMessage
      .replace(/Error:/i, '')
      .replace(/Failed to/i, '')
      .replace(/Unable to/i, '')
      .trim();
    
    // If the message is too long, try to extract the most important part
    if (cleaned.length > 100) {
      // Look for specific patterns that often contain the core issue
      const patterns = [
        /reason: ([^.]+)/i,
        /because: ([^.]+)/i,
        /message: ([^.]+)/i,
        /error: ([^.]+)/i
      ];
      
      for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      
      // If no pattern matches, take the first sentence
      const firstSentence = cleaned.split(/\.|\n/)[0];
      if (firstSentence && firstSentence.length < 100) {
        return firstSentence.trim();
      }
      
      // As a last resort, truncate
      return cleaned.substring(0, 100) + '...';
    }
    
    return cleaned;
  }
  
  /**
   * Handle an error by categorizing it and formatting a response
   * @param {Error} error - The error to handle
   * @param {string} context - The context in which the error occurred
   * @returns {Object} Formatted error response
   */
  handleError(error, context = 'general') {
    console.error(`❌ Error in ${context}:`, error);
    
    const categorizedError = this.categorizeError(error, context);
    
    return {
      error: true,
      code: categorizedError.code,
      message: categorizedError.message,
      context,
      timestamp: Date.now()
    };
  }
  
  /**
   * Create a standardized error response for HTTP APIs
   * @param {Error} error - The error to handle
   * @param {string} context - The context in which the error occurred
   * @returns {Object} HTTP response object with status code and body
   */
  createErrorResponse(error, context = 'general') {
    const categorizedError = this.categorizeError(error, context);
    
    return {
      status: categorizedError.httpStatus,
      body: {
        error: true,
        code: categorizedError.code,
        message: categorizedError.message,
        context,
        timestamp: Date.now()
      }
    };
  }
  
  /**
   * Create a user-friendly error message for UI display
   * @param {Error} error - The error to handle
   * @param {string} context - The context in which the error occurred
   * @returns {string} User-friendly error message
   */
  createUserMessage(error, context = 'general') {
    const categorizedError = this.categorizeError(error, context);
    
    // Map error codes to user-friendly messages
    const userMessages = {
      FIGMA_API_ERROR: 'There was a problem connecting to Figma. Please try again later.',
      FIGMA_FILE_NOT_FOUND: 'The Figma file could not be found. Please check the URL and your access permissions.',
      FIGMA_NODE_NOT_FOUND: 'The specified element in the Figma file could not be found.',
      FIGMA_AUTH_ERROR: 'Authentication with Figma failed. Please check your API token.',
      FIGMA_EXTRACTION_TIMEOUT: 'The Figma file took too long to process. It may be too large or complex.',
      FIGMA_PARSING_ERROR: 'There was a problem processing the Figma file data.',
      FIGMA_MCP_ERROR: 'There was a problem with the Figma Dev Mode connection.',
      
      WEB_NAVIGATION_ERROR: 'Could not access the website. Please check the URL and ensure the site is accessible.',
      WEB_TIMEOUT_ERROR: 'The website took too long to respond. It may be too large or complex.',
      WEB_AUTH_ERROR: 'Authentication with the website failed. Please check your credentials.',
      WEB_SELECTOR_ERROR: 'The specified elements on the website could not be found.',
      
      COMPARISON_ERROR: 'There was a problem comparing the Figma design with the website.',
      REPORT_GENERATION_ERROR: 'There was a problem generating the comparison report.',
      
      VALIDATION_ERROR: 'Please check your input and try again.',
      SERVER_ERROR: 'An unexpected error occurred. Please try again later.'
    };
    
    return userMessages[categorizedError.code] || categorizedError.message;
  }

  /**
   * Handle extraction errors with retry logic
   */
  async handleExtractionError(error, context, retryCallback) {
    const categorizedError = this.categorizeError(error, context);
    const userFriendlyError = this.createUserFriendlyMessage(categorizedError.categorized, context);


    if (this.shouldRetry(categorizedError)) {
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          
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
      return {
        shouldIgnore: true,
        reason: 'Non-critical microfrontend loading error'
      };
    }
    return { shouldIgnore: false };
  }
}

export default ErrorHandlingService; 