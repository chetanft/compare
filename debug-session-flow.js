/**
 * Debug the exact session flow with the Figma MCP server
 * This will help us understand how sessions work
 */

async function debugSessionFlow() {
  console.log('🔍 Debugging Figma MCP session flow...\n');

  let sessionId = null;

  // Step 1: Initialize and capture ALL response details
  console.log('📋 Step 1: Initialize request...');
  
  const initResponse = await fetch('http://127.0.0.1:3845/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
          resources: { subscribe: true }
        },
        clientInfo: {
          name: "debug-client",
          version: "1.0.0"
        }
      }
    })
  });

  console.log('📊 Initialize Response Status:', initResponse.status);
  console.log('📊 Initialize Response Headers:');
  for (const [key, value] of initResponse.headers.entries()) {
    console.log(`   ${key}: ${value}`);
    if (key.toLowerCase().includes('session')) {
      sessionId = value;
      console.log(`   🔑 Found session ID: ${sessionId}`);
    }
  }

  const initText = await initResponse.text();
  console.log('📊 Initialize Response Body:', initText);

  // Parse the session ID from the response
  const sessionMatch = initText.match(/"mcp-session-id":\s*"([^"]+)"/);
  if (sessionMatch) {
    sessionId = sessionMatch[1];
    console.log('🔑 Extracted session ID from body:', sessionId);
  }

  if (!sessionId) {
    console.log('❌ No session ID found, cannot continue');
    return;
  }

  // Step 2: Try different ways to use the session ID
  console.log('\n📋 Step 2: Testing different session usage patterns...\n');

  // Method 1: Session in headers
  console.log('🔧 Method 1: Session ID in headers...');
  try {
    const headerResponse = await fetch('http://127.0.0.1:3845/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
        'X-MCP-Session-ID': sessionId,
        'Session-ID': sessionId
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list"
      })
    });

    console.log(`   Status: ${headerResponse.status}`);
    const headerText = await headerResponse.text();
    console.log(`   Response: ${headerText.substring(0, 200)}...`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Method 2: Session in URL parameter
  console.log('\n🔧 Method 2: Session ID in URL parameter...');
  try {
    const urlResponse = await fetch(`http://127.0.0.1:3845/mcp?sessionId=${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/list"
      })
    });

    console.log(`   Status: ${urlResponse.status}`);
    const urlText = await urlResponse.text();
    console.log(`   Response: ${urlText.substring(0, 200)}...`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Method 3: Session in request body
  console.log('\n🔧 Method 3: Session ID in request body...');
  try {
    const bodyResponse = await fetch('http://127.0.0.1:3845/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/list",
        sessionId: sessionId
      })
    });

    console.log(`   Status: ${bodyResponse.status}`);
    const bodyText = await bodyResponse.text();
    console.log(`   Response: ${bodyText.substring(0, 200)}...`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Method 4: Different endpoint with session
  console.log('\n🔧 Method 4: Different endpoint with session...');
  try {
    const endpointResponse = await fetch(`http://127.0.0.1:3845/mcp/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/list"
      })
    });

    console.log(`   Status: ${endpointResponse.status}`);
    const endpointText = await endpointResponse.text();
    console.log(`   Response: ${endpointText.substring(0, 200)}...`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Method 5: Try sending initialized notification first
  console.log('\n🔧 Method 5: Send initialized notification then try tools/list...');
  try {
    // Send initialized notification
    const notifyResponse = await fetch('http://127.0.0.1:3845/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
        params: {}
      })
    });

    console.log(`   Notification status: ${notifyResponse.status}`);
    await notifyResponse.text(); // Consume response

    // Now try tools/list
    const toolsResponse = await fetch('http://127.0.0.1:3845/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 6,
        method: "tools/list"
      })
    });

    console.log(`   Tools/list status: ${toolsResponse.status}`);
    const toolsText = await toolsResponse.text();
    console.log(`   Tools/list response: ${toolsText.substring(0, 200)}...`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n🎯 Debug complete. Look for successful responses above.');
}

debugSessionFlow().catch(console.error);
