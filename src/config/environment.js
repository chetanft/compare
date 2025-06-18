/**
 * Environment Configuration
 * Centralizes all environment variables and configuration settings
 * Replaces hardcoded values throughout the application
 */

export const config = {
  // Figma Configuration
  figma: {
    accessToken: process.env.FIGMA_ACCESS_TOKEN || '',
    baseUrl: process.env.FIGMA_BASE_URL || 'https://api.figma.com',
    defaultFileId: process.env.FIGMA_DEFAULT_FILE_ID || '',
    defaultNodeId: process.env.FIGMA_DEFAULT_NODE_ID || ''
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 3006,
    host: process.env.HOST || 'localhost',
    mcpUrl: process.env.MCP_SERVER_URL || 'http://127.0.0.1:3845',
    mcpEndpoint: process.env.MCP_ENDPOINT || '/sse'
  },

  // Development URLs (for testing and examples)
  development: {
    testServerUrl: process.env.TEST_SERVER_URL || 'http://localhost:3004',
    mockWebUrl: process.env.MOCK_WEB_URL || 'https://example.com',
    mockLoginUrl: process.env.MOCK_LOGIN_URL || 'https://example.com/login'
  },

  // Application Environment
  app: {
    environment: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test'
  },

  // Output Configuration
  output: {
    reportDir: process.env.REPORT_DIR || './output/reports',
    screenshotDir: process.env.SCREENSHOT_DIR || './output/screenshots',
    imageDir: process.env.IMAGE_DIR || './output/images'
  },

  // Security Configuration
  security: {
    sessionSecret: process.env.SESSION_SECRET || 'development-secret-change-in-production',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100
  }
};

// Validation function to check required environment variables
export function validateEnvironment() {
  const errors = [];

  if (config.app.isProduction) {
    if (!config.figma.accessToken) {
      errors.push('FIGMA_ACCESS_TOKEN is required in production');
    }
    if (config.security.sessionSecret === 'development-secret-change-in-production') {
      errors.push('SESSION_SECRET must be set in production');
    }
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    if (config.app.isProduction) {
      process.exit(1);
    }
  }

  return errors.length === 0;
}

// Helper function to get server URL
export function getServerUrl() {
  return `http://${config.server.host}:${config.server.port}`;
}

// Helper function to get MCP URL
export function getMCPUrl() {
  return `${config.server.mcpUrl}${config.server.mcpEndpoint}`;
}

export default config; 