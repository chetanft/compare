/**
 * Application Constants
 * Fixed ports and configuration values for consistent behavior
 */

// Fixed application port - like Figma's 3845
export const APP_SERVER_PORT = 3847;

// MCP Server port (Figma's fixed port)
export const MCP_SERVER_PORT = 3845;

// Application metadata
export const APP_CONFIG = {
  name: 'Figma-Web Comparison Tool',
  version: '2.0.0',
  port: APP_SERVER_PORT,
  
  // Server configuration
  server: {
    port: APP_SERVER_PORT,
    host: 'localhost',
    timeout: 30000,
  },
  
  // MCP configuration
  mcp: {
    port: MCP_SERVER_PORT,
    url: `http://localhost:${MCP_SERVER_PORT}`,
    endpoint: '/mcp'
  },
  
  // Development settings
  dev: {
    hotReload: true,
    debugMode: process.env.NODE_ENV === 'development'
  }
};

// Export for easy access
export const { server: SERVER_CONFIG, mcp: MCP_CONFIG } = APP_CONFIG;
