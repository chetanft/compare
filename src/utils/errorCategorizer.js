/**
 * Error Categorization Utility
 * Distinguishes between different types of errors and provides user-friendly explanations
 */

export class ErrorCategorizer {
  static categorizeError(error, context = {}) {
    const errorMessage = error.message || error.toString();
    const errorStack = error.stack || '';
    
    const category = this.determineCategory(errorMessage, errorStack, context);
    const explanation = this.getExplanation(category, errorMessage, context);
    const severity = this.getSeverity(category);
    const actionable = this.isActionable(category);
    
    return {
      category,
      severity,
      actionable,
      explanation,
      originalError: errorMessage,
      context,
      timestamp: new Date().toISOString(),
      suggestions: this.getSuggestions(category, context)
    };
  }

  static determineCategory(errorMessage, errorStack, context) {
    const message = errorMessage.toLowerCase();
    
    // Browser/Infrastructure Issues (Our Responsibility)
    if (message.includes('target closed') || 
        message.includes('session closed') ||
        message.includes('browser has been closed') ||
        message.includes('page has been closed')) {
      return 'browser_infrastructure';
    }
    
    if (message.includes('timeout') && 
        (message.includes('navigation') || message.includes('goto'))) {
      return 'navigation_timeout';
    }
    
    if (message.includes('failed to launch') ||
        message.includes('could not find browser') ||
        message.includes('chrome not found')) {
      return 'browser_launch_failure';
    }
    
    if (message.includes('socket hang up') ||
        message.includes('econnreset') ||
        message.includes('connection reset')) {
      return 'browser_infrastructure';
    }
    
    // Target Site Issues (External)
    if (message.includes('systemjs') ||
        message.includes('unable to resolve bare specifier') ||
        message.includes('module loading') ||
        message.includes('webpack_require')) {
      return 'target_site_module_error';
    }
    
    if (message.includes('cannot read properties of undefined') ||
        message.includes('cannot read properties of null') ||
        message.includes('is not a function') ||
        message.includes('application') && message.includes('died')) {
      return 'target_site_javascript_error';
    }
    
    if (message.includes('net::err_') ||
        message.includes('dns_probe_finished') ||
        message.includes('connection refused') ||
        message.includes('network error')) {
      return 'network_connectivity';
    }
    
    if (message.includes('403') || message.includes('forbidden') ||
        message.includes('401') || message.includes('unauthorized') ||
        message.includes('authentication failed')) {
      return 'authentication_error';
    }
    
    if (message.includes('404') || message.includes('not found') ||
        message.includes('page not found')) {
      return 'page_not_found';
    }
    
    // Extraction Issues (Mixed Responsibility)
    if (message.includes('no elements found') ||
        message.includes('no components found') ||
        message.includes('extraction failed')) {
      return 'extraction_no_data';
    }
    
    if (message.includes('selector') && message.includes('not found')) {
      return 'selector_not_found';
    }
    
    // Configuration Issues (User Responsibility)
    if (message.includes('invalid url') ||
        message.includes('malformed url') ||
        message.includes('invalid figma')) {
      return 'invalid_configuration';
    }
    
    // Default category
    return 'unknown_error';
  }

  static getSeverity(category) {
    const severityMap = {
      // Critical - Blocks core functionality
      browser_infrastructure: 'critical',
      browser_launch_failure: 'critical',
      invalid_configuration: 'critical',
      
      // High - Affects user experience significantly
      navigation_timeout: 'high',
      network_connectivity: 'high',
      authentication_error: 'high',
      page_not_found: 'high',
      
      // Medium - Partial functionality loss
      extraction_no_data: 'medium',
      selector_not_found: 'medium',
      
      // Low - External issues, expected behavior
      target_site_module_error: 'low',
      target_site_javascript_error: 'low',
      
      // Unknown
      unknown_error: 'medium'
    };
    
    return severityMap[category] || 'medium';
  }

  static isActionable(category) {
    const actionableCategories = [
      'browser_infrastructure',
      'browser_launch_failure',
      'navigation_timeout',
      'invalid_configuration',
      'authentication_error',
      'selector_not_found'
    ];
    
    return actionableCategories.includes(category);
  }

  static getExplanation(category, errorMessage, context) {
    const explanations = {
      browser_infrastructure: {
        title: "Browser Connection Issue",
        description: "The browser instance was unexpectedly closed or became unresponsive. This is typically a temporary infrastructure issue.",
        userFriendly: "Our browser connection was interrupted. This usually resolves itself on retry."
      },
      
      browser_launch_failure: {
        title: "Browser Launch Failure", 
        description: "Failed to start the browser engine. This could be due to system resources or browser installation issues.",
        userFriendly: "We couldn't start the browser. This might be a temporary system issue."
      },
      
      navigation_timeout: {
        title: "Page Load Timeout",
        description: "The target page took too long to load completely. This could be due to slow network, heavy page content, or site issues.",
        userFriendly: "The page is taking too long to load. This might be due to a slow connection or heavy page content."
      },
      
      target_site_module_error: {
        title: "Target Site Module Loading Error",
        description: "The target website has JavaScript module loading issues (SystemJS, webpack, etc.). This is an issue with the target site's code, not our tool.",
        userFriendly: "The target website has technical issues with its JavaScript modules. This is not a problem with our tool."
      },
      
      target_site_javascript_error: {
        title: "Target Site JavaScript Error",
        description: "The target website has JavaScript runtime errors. These are bugs in the target site's code and don't affect our extraction accuracy.",
        userFriendly: "The target website has JavaScript errors. Our tool handles these gracefully and continues extraction."
      },
      
      network_connectivity: {
        title: "Network Connectivity Issue",
        description: "Unable to reach the target website due to network issues, DNS problems, or the site being down.",
        userFriendly: "We couldn't connect to the website. Please check if the URL is correct and the site is accessible."
      },
      
      authentication_error: {
        title: "Authentication Failed",
        description: "Login credentials were rejected or the authentication process failed.",
        userFriendly: "Login failed. Please check your username and password, or verify if the site requires different authentication."
      },
      
      page_not_found: {
        title: "Page Not Found",
        description: "The specified URL doesn't exist or has been moved.",
        userFriendly: "The page wasn't found. Please check if the URL is correct or if the page has been moved."
      },
      
      extraction_no_data: {
        title: "No Data Extracted",
        description: "No meaningful components were found on the page. This could be due to the page being empty, heavily dynamic, or using unsupported technologies.",
        userFriendly: "We couldn't find any components on this page. The page might be empty or use technologies that require special handling."
      },
      
      selector_not_found: {
        title: "Element Not Found",
        description: "The specified CSS selector didn't match any elements on the page.",
        userFriendly: "The specified element wasn't found on the page. The selector might be incorrect or the page structure might have changed."
      },
      
      invalid_configuration: {
        title: "Invalid Configuration",
        description: "The provided configuration (URL, Figma file, etc.) is invalid or malformed.",
        userFriendly: "There's an issue with the provided configuration. Please check your URLs and settings."
      },
      
      unknown_error: {
        title: "Unexpected Error",
        description: "An unexpected error occurred that doesn't fit our known error categories.",
        userFriendly: "An unexpected error occurred. Our team will investigate this issue."
      }
    };
    
    const explanation = explanations[category] || explanations.unknown_error;
    
    return {
      ...explanation,
      technicalDetails: errorMessage,
      context: context.url ? `URL: ${context.url}` : 'No additional context'
    };
  }

  static getSuggestions(category, context) {
    const suggestions = {
      browser_infrastructure: [
        "Retry the operation - browser issues are often temporary",
        "If the issue persists, restart the application",
        "Check system resources (memory, CPU usage)"
      ],
      
      browser_launch_failure: [
        "Restart the application",
        "Check if Chrome/Chromium is properly installed",
        "Verify system permissions for browser execution"
      ],
      
      navigation_timeout: [
        "Try again - the site might be temporarily slow",
        "Check your internet connection",
        "Try a different page from the same site",
        "Consider using a simpler page for testing"
      ],
      
      target_site_module_error: [
        "This is expected behavior for sites with module loading issues",
        "Try a different page from the same site",
        "Contact the site owner about their technical issues",
        "Our tool will extract what it can despite these errors"
      ],
      
      target_site_javascript_error: [
        "This is normal - many sites have JavaScript errors",
        "Our tool handles these gracefully",
        "The extraction will continue with available data",
        "These errors don't affect our analysis accuracy"
      ],
      
      network_connectivity: [
        "Check your internet connection",
        "Verify the URL is correct and accessible",
        "Try accessing the site in a regular browser",
        "Check if the site requires VPN or special access"
      ],
      
      authentication_error: [
        "Verify your username and password",
        "Check if the site uses two-factor authentication",
        "Ensure the login URL is correct",
        "Try logging in manually first to verify credentials"
      ],
      
      page_not_found: [
        "Double-check the URL for typos",
        "Try the site's homepage first",
        "Check if the page requires authentication",
        "Verify the page exists by accessing it in a browser"
      ],
      
      extraction_no_data: [
        "Try a different page with more visible content",
        "Check if the page requires user interaction to load content",
        "Verify the page isn't behind a paywall or login",
        "Consider if the page uses heavy JavaScript frameworks"
      ],
      
      selector_not_found: [
        "Verify the CSS selector is correct",
        "Check if the page structure has changed",
        "Try a more general selector",
        "Inspect the page to find the correct selector"
      ],
      
      invalid_configuration: [
        "Check all URLs are properly formatted",
        "Verify Figma file IDs and access tokens",
        "Ensure all required fields are filled",
        "Review the configuration documentation"
      ],
      
      unknown_error: [
        "Try the operation again",
        "Check the application logs for more details",
        "Contact support if the issue persists",
        "Provide the error details when reporting the issue"
      ]
    };
    
    return suggestions[category] || suggestions.unknown_error;
  }

  static formatForUser(categorizedError) {
    const { category, severity, explanation, suggestions, actionable } = categorizedError;
    
    const severityEmoji = {
      critical: '🔴',
      high: '🟠', 
      medium: '🟡',
      low: '🔵'
    };
    
    const actionableText = actionable ? '✅ Actionable' : '⚠️ External Issue';
    
    return {
      title: `${severityEmoji[severity]} ${explanation.title}`,
      description: explanation.userFriendly,
      severity: severity.toUpperCase(),
      actionable: actionableText,
      suggestions: suggestions.slice(0, 3), // Top 3 suggestions
      technicalDetails: explanation.technicalDetails,
      category: category.replace(/_/g, ' ').toUpperCase()
    };
  }
}

export default ErrorCategorizer; 