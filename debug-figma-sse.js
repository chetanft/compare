/**
 * Debug script to understand what the Figma MCP server expects
 * This will help us figure out the correct SSE protocol
 */

import { EventSource } from 'eventsource';

async function debugFigmaMCPServer() {
  console.log('🔍 Debugging Figma MCP Server SSE connection...');
  
  // First, let's check if the server is running
  console.log('🔄 Step 1: Testing basic HTTP connection...');
  
  try {
    const response = await fetch('http://127.0.0.1:3845/mcp', {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('📊 HTTP Response Status:', response.status);
    console.log('📊 HTTP Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const text = await response.text();
      console.log('📊 HTTP Response Body:', text.substring(0, 500));
    } else {
      const errorText = await response.text();
      console.log('❌ HTTP Error Body:', errorText);
    }
  } catch (httpError) {
    console.error('❌ HTTP connection failed:', httpError.message);
  }

  console.log('\n🔄 Step 2: Testing EventSource connection...');
  
  // Try EventSource connection
  const eventSource = new EventSource('http://127.0.0.1:3845/mcp');
  
  eventSource.onopen = (event) => {
    console.log('✅ EventSource opened:', event);
  };
  
  eventSource.onmessage = (event) => {
    console.log('📨 EventSource message:', event.data);
  };
  
  eventSource.onerror = (error) => {
    console.error('❌ EventSource error:', error);
    eventSource.close();
  };

  // Wait a bit then close
  setTimeout(() => {
    console.log('🔄 Closing EventSource...');
    eventSource.close();
  }, 3000);

  console.log('\n🔄 Step 3: Testing different endpoints...');
  
  // Try different potential endpoints
  const endpoints = [
    'http://127.0.0.1:3845/mcp',
    'http://127.0.0.1:3845/sse',
    'http://127.0.0.1:3845/events',
    'http://127.0.0.1:3845/',
    'http://127.0.0.1:3845'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`🔄 Testing endpoint: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'text/event-stream' }
      });
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 200) {
        const contentType = response.headers.get('content-type');
        console.log(`   Content-Type: ${contentType}`);
        
        if (contentType?.includes('text/event-stream')) {
          console.log('   ✅ This endpoint supports SSE!');
        }
      }
    } catch (endpointError) {
      console.log(`   ❌ Failed: ${endpointError.message}`);
    }
  }

  console.log('\n🔄 Step 4: Testing MCP initialization via POST...');
  
  // Try the initialization we know works
  try {
    const initResponse = await fetch('http://127.0.0.1:3845/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'debug-client', version: '1.0.0' }
        }
      })
    });

    console.log('📊 Init Response Status:', initResponse.status);
    console.log('📊 Init Response Headers:', Object.fromEntries(initResponse.headers.entries()));
    
    const initText = await initResponse.text();
    console.log('📊 Init Response Body:', initText);
    
  } catch (initError) {
    console.error('❌ Init failed:', initError.message);
  }
}

debugFigmaMCPServer().catch(console.error);
