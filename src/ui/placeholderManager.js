/**
 * UI Placeholder Manager
 * Centralizes placeholder text management for UI components
 * Replaces hardcoded placeholder strings with dynamic, configurable values
 */

import { PLACEHOLDER_TEXT, PLACEHOLDER_URLS } from '../constants/placeholders.js';

class PlaceholderManager {
  constructor() {
    this.placeholders = {
      // Form placeholders
      figmaUrl: PLACEHOLDER_TEXT.figmaUrl,
      webUrl: PLACEHOLDER_TEXT.webUrl,
      loginUrl: PLACEHOLDER_TEXT.loginUrl,
      
      // Credential placeholders
      username: PLACEHOLDER_TEXT.username,
      password: PLACEHOLDER_TEXT.password,
      email: PLACEHOLDER_TEXT.email,
      
      // Selector placeholders
      usernameSelector: PLACEHOLDER_TEXT.usernameSelector,
      passwordSelector: PLACEHOLDER_TEXT.passwordSelector,
      submitSelector: PLACEHOLDER_TEXT.submitSelector,
      cssSelector: '.btn-primary, #header, [data-testid="component"]',
      successIndicator: '.dashboard, .profile-menu, .user-menu',
      
      // JSON placeholders
      cookiesJson: PLACEHOLDER_TEXT.cookiesJson,
      headersJson: PLACEHOLDER_TEXT.headersJson,
      
      // API placeholders
      figmaToken: PLACEHOLDER_TEXT.token,
      mcpServerUrl: PLACEHOLDER_URLS.api.mcpServer,
      mcpEndpoint: PLACEHOLDER_URLS.api.mcpEndpoint,
      
      // Search and filter placeholders
      searchReports: 'Search reports by name, date, or status...',
      webhookUrl: 'https://hooks.slack.com/services/...',
      
      // Advanced placeholders
      waitTime: '300',
      maxRetries: '3',
      timeout: '30000'
    };
  }

  /**
   * Get placeholder text by key
   * @param {string} key - Placeholder key
   * @returns {string} Placeholder text
   */
  get(key) {
    return this.placeholders[key] || '';
  }

  /**
   * Set custom placeholder text
   * @param {string} key - Placeholder key
   * @param {string} value - Placeholder value
   */
  set(key, value) {
    this.placeholders[key] = value;
  }

  /**
   * Get all placeholders for a specific category
   * @param {string} category - Category name (form, auth, api, etc.)
   * @returns {Object} Category placeholders
   */
  getCategory(category) {
    const categories = {
      form: {
        figmaUrl: this.placeholders.figmaUrl,
        webUrl: this.placeholders.webUrl,
        cssSelector: this.placeholders.cssSelector
      },
      auth: {
        loginUrl: this.placeholders.loginUrl,
        username: this.placeholders.username,
        password: this.placeholders.password,
        usernameSelector: this.placeholders.usernameSelector,
        passwordSelector: this.placeholders.passwordSelector,
        submitSelector: this.placeholders.submitSelector,
        successIndicator: this.placeholders.successIndicator
      },
      api: {
        figmaToken: this.placeholders.figmaToken,
        mcpServerUrl: this.placeholders.mcpServerUrl,
        mcpEndpoint: this.placeholders.mcpEndpoint
      },
      json: {
        cookies: this.placeholders.cookiesJson,
        headers: this.placeholders.headersJson
      }
    };

    return categories[category] || {};
  }

  /**
   * Update placeholders in DOM elements
   * @param {string} selector - CSS selector for elements to update
   */
  updateDOM(selector = '[placeholder]') {
    if (typeof document === 'undefined') return; // Server-side safety

    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const currentPlaceholder = element.getAttribute('placeholder');
      const updatedPlaceholder = this.mapLegacyPlaceholder(currentPlaceholder);
      
      if (updatedPlaceholder !== currentPlaceholder) {
        element.setAttribute('placeholder', updatedPlaceholder);
      }
    });
  }

  /**
   * Map legacy hardcoded placeholders to new dynamic ones
   * @param {string} placeholder - Current placeholder text
   * @returns {string} Updated placeholder text
   */
  mapLegacyPlaceholder(placeholder) {
    const mappings = {
      'https://www.figma.com/design/ABC123/Design-Name?node-id=1:2': this.placeholders.figmaUrl,
      'https://example.com': this.placeholders.webUrl,
      'https://example.com/login': this.placeholders.loginUrl,
      'your-username': this.placeholders.username,
      'your-password': this.placeholders.password,
      'user@example.com': this.placeholders.email,
      '#username': this.placeholders.usernameSelector,
      '#password': this.placeholders.passwordSelector,
      'button[type="submit"]': this.placeholders.submitSelector,
      '.btn-primary, #header': this.placeholders.cssSelector,
      '.dashboard, .profile-menu': this.placeholders.successIndicator,
      'figd_xxxxxxxxxxxx': this.placeholders.figmaToken,
      'http://localhost:3845': this.placeholders.mcpServerUrl,
      '/sse': this.placeholders.mcpEndpoint,
      '[{"name": "session_id", "value": "abc123", "domain": ".example.com"}]': this.placeholders.cookiesJson,
      '{"Authorization": "Bearer your-token", "X-API-Key": "your-key"}': this.placeholders.headersJson
    };

    return mappings[placeholder] || placeholder;
  }

  /**
   * Generate contextual placeholder based on field type
   * @param {string} fieldType - Type of field (url, email, selector, etc.)
   * @param {string} context - Additional context (figma, web, auth, etc.)
   * @returns {string} Contextual placeholder
   */
  getContextual(fieldType, context = '') {
    const contextualPlaceholders = {
      url: {
        figma: this.placeholders.figmaUrl,
        web: this.placeholders.webUrl,
        login: this.placeholders.loginUrl,
        webhook: this.placeholders.webhookUrl
      },
      selector: {
        username: this.placeholders.usernameSelector,
        password: this.placeholders.passwordSelector,
        submit: this.placeholders.submitSelector,
        css: this.placeholders.cssSelector,
        success: this.placeholders.successIndicator
      },
      credential: {
        username: this.placeholders.username,
        password: this.placeholders.password,
        email: this.placeholders.email,
        token: this.placeholders.figmaToken
      },
      json: {
        cookies: this.placeholders.cookiesJson,
        headers: this.placeholders.headersJson
      }
    };

    return contextualPlaceholders[fieldType]?.[context] || '';
  }

  /**
   * Initialize placeholder manager for the current page
   */
  init() {
    // Update existing DOM elements
    this.updateDOM();

    // Set up mutation observer for dynamic content
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const placeholderElements = node.querySelectorAll('[placeholder]');
                placeholderElements.forEach(element => {
                  const currentPlaceholder = element.getAttribute('placeholder');
                  const updatedPlaceholder = this.mapLegacyPlaceholder(currentPlaceholder);
                  
                  if (updatedPlaceholder !== currentPlaceholder) {
                    element.setAttribute('placeholder', updatedPlaceholder);
                  }
                });
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
}

// Create singleton instance
const placeholderManager = new PlaceholderManager();

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => placeholderManager.init());
  } else {
    placeholderManager.init();
  }
}

export default placeholderManager;
export { PlaceholderManager }; 