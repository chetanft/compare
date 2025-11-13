#!/usr/bin/env node
/**
 * API Compatibility Validation Test
 * Tests that macOS app has all required endpoints that frontend expects
 */

import { CONFIGURED_PORTS } from './src/config/PORTS.js';

const requiredEndpoints = [
  // Health and status
  { method: 'GET', path: '/api/health', description: 'Health check' },
  
  // Settings
  { method: 'GET', path: '/api/settings/current', description: 'Get current settings' },
  { method: 'POST', path: '/api/settings/save', description: 'Save settings' },
  { method: 'POST', path: '/api/settings/test-connection', description: 'Test Figma connection' },
  
  // Reports
  { method: 'GET', path: '/api/reports', description: 'List reports' },
  { method: 'GET', path: '/api/reports/list', description: 'List reports (alt endpoint)' },
  
  // MCP Status
  { method: 'GET', path: '/api/mcp/status', description: 'MCP status' },
  
  // Figma extraction
  { method: 'POST', path: '/api/figma/extract', description: 'Extract Figma data' },
  { method: 'POST', path: '/api/figma-only/extract', description: 'Extract Figma only' },
  
  // Web extraction
  { method: 'POST', path: '/api/web/extract', description: 'Extract web data' },
  { method: 'POST', path: '/api/web/extract-v3', description: 'Extract web data v3' },
  { method: 'POST', path: '/api/web/extract-v2', description: 'Extract web data v2' },
  { method: 'POST', path: '/api/web-only/extract', description: 'Extract web only' },
  
  // Comparison
  { method: 'POST', path: '/api/compare', description: 'Compare Figma and web' },
  
  // Screenshots
  { method: 'POST', path: '/api/screenshots/upload', description: 'Upload screenshots' },
  { method: 'POST', path: '/api/screenshots/compare', description: 'Compare screenshots' },
  { method: 'GET', path: '/api/screenshots/list', description: 'List screenshots' },
  
  // Performance monitoring
  { method: 'GET', path: '/api/performance/summary', description: 'Performance summary' },
  { method: 'GET', path: '/api/performance/realtime', description: 'Realtime performance' },
  { method: 'GET', path: '/api/health/circuit-breakers', description: 'Circuit breakers status' },
  
  // Extraction management
  { method: 'POST', path: '/api/extractions/test-id/cancel', description: 'Cancel extraction' }
];

async function testEndpoint(baseUrl, endpoint) {
  const url = `${baseUrl}${endpoint.path}`;
  const options = {
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // Add minimal body for POST requests
  if (endpoint.method === 'POST') {
    if (endpoint.path.includes('settings/save')) {
      options.body = JSON.stringify({ test: true });
    } else if (endpoint.path.includes('test-connection')) {
      options.body = JSON.stringify({ figmaPersonalAccessToken: 'test-token' });
    } else if (endpoint.path.includes('extract')) {
      options.body = JSON.stringify({ 
        figmaUrl: 'https://www.figma.com/file/test',
        webUrl: 'https://example.com',
        url: 'https://example.com'
      });
    } else if (endpoint.path.includes('compare')) {
      options.body = JSON.stringify({ 
        figmaUrl: 'https://www.figma.com/file/test',
        webUrl: 'https://example.com'
      });
    } else if (endpoint.path.includes('screenshots')) {
      options.body = JSON.stringify({ uploadId: 'test-id', settings: {} });
    } else {
      options.body = JSON.stringify({});
    }
  }
  
  try {
    const response = await fetch(url, options);
    
    // Consider 4xx/5xx as "endpoint exists" - we're just testing availability
    const exists = response.status !== 404;
    const statusText = `${response.status} ${response.statusText}`;
    
    return {
      success: exists,
      status: response.status,
      statusText,
      endpoint: endpoint.path,
      method: endpoint.method,
      description: endpoint.description
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      endpoint: endpoint.path,
      method: endpoint.method,
      description: endpoint.description
    };
  }
}

async function validateApiCompatibility() {
  const baseUrl = `http://localhost:${CONFIGURED_PORTS.SERVER}`;
  
  console.log('🔍 Validating API Compatibility between Web App and macOS App');
  console.log(`📡 Testing ${requiredEndpoints.length} endpoints on ${baseUrl}`);
  console.log('=' .repeat(80));
  
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const endpoint of requiredEndpoints) {
    const result = await testEndpoint(baseUrl, endpoint);
    results.push(result);
    
    if (result.success) {
      successCount++;
      console.log(`✅ ${result.method} ${result.endpoint} - ${result.statusText}`);
    } else {
      errorCount++;
      console.log(`❌ ${result.method} ${result.endpoint} - ${result.error || result.statusText}`);
    }
  }
  
  console.log('=' .repeat(80));
  console.log(`📊 Results: ${successCount} available, ${errorCount} missing/error`);
  console.log(`🎯 Compatibility: ${Math.round((successCount / requiredEndpoints.length) * 100)}%`);
  
  if (errorCount === 0) {
    console.log('🎉 Perfect! macOS app has 100% API compatibility with web app');
    process.exit(0);
  } else {
    console.log(`⚠️  ${errorCount} endpoints need attention for full compatibility`);
    process.exit(1);
  }
}

// Check if server is running first
async function checkServerHealth() {
  try {
    const response = await fetch(`http://localhost:${CONFIGURED_PORTS.SERVER}/api/health`);
    if (response.ok) {
      console.log('✅ macOS server is running');
      return true;
    }
  } catch (error) {
    console.log(`❌ macOS server is not running on port ${CONFIGURED_PORTS.SERVER}`);
    console.log('💡 Please start the macOS app first: npm run electron:dev');
    return false;
  }
}

async function main() {
  console.log('🧪 macOS App API Compatibility Test');
  console.log('');
  
  const serverRunning = await checkServerHealth();
  if (!serverRunning) {
    process.exit(1);
  }
  
  await validateApiCompatibility();
}

// Add fetch polyfill for Node.js if needed
if (typeof fetch === 'undefined') {
  console.log('Installing fetch polyfill...');
  const { default: fetch } = await import('node-fetch');
  globalThis.fetch = fetch;
}

main().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
