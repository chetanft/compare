/**
 * Clean Configuration
 * Simple configuration for the application
 */

export const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3007,
    host: process.env.HOST || 'localhost'
  },

  // MCP configuration
  mcp: {
    enabled: true,
    url: 'http://127.0.0.1:3845',
    endpoint: '/mcp'
  },

  // CORS configuration
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3007',
      'http://localhost:5173'
    ],
    credentials: true
  },

  // Timeouts
  timeouts: {
    figmaExtraction: 60000,
    webExtraction: 30000,
    comparison: 10000
  }
}; 