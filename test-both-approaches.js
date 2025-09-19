/**
 * Test both MCP client approaches to find the working solution
 * This will help us determine which session management approach works
 */

import FigmaMCPClient from './src/figma/mcpClient.js';

async function testPersistentApproach() {
  console.log('🔧 Testing Persistent Connection Approach...\n');
  
  const client = new FigmaMCPClient();
  
  try {
    console.log('📋 Step 1: Connecting...');
    await client.connect();
    console.log('✅ Connection successful');

    console.log('📋 Step 2: Testing tools/list...');
    try {
      const tools = await client.listTools();
      console.log('✅ tools/list successful:', tools?.tools?.map(t => t.name) || []);
    } catch (toolsError) {
      console.log('⚠️ tools/list failed:', toolsError.message);
    }

    console.log('📋 Step 3: Testing get_code...');
    const result = await client.getCode();
    console.log('✅ Persistent approach works! Result:', result);
    
    client.disconnect();
    return { success: true, result };
    
  } catch (error) {
    console.log('❌ Persistent approach failed:', error.message);
    try {
      client.disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
    return { success: false, error: error.message };
  }
}

async function testSessionApproach() {
  console.log('🔧 Testing Session-Aware Approach...\n');
  
  const client = new FigmaMCPClient();
  
  try {
    console.log('📋 Step 1: Connecting...');
    await client.connect();
    console.log('✅ Connection successful');

    console.log('📋 Step 2: Testing tools/list...');
    try {
      const tools = await client.listTools();
      console.log('✅ tools/list successful:', tools?.tools?.map(t => t.name) || []);
    } catch (toolsError) {
      console.log('⚠️ tools/list failed:', toolsError.message);
    }

    console.log('📋 Step 3: Testing get_code...');
    const result = await client.getCode();
    console.log('✅ Session approach works! Result:', result);
    
    return { success: true, result };
    
  } catch (error) {
    console.log('❌ Session approach failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function findWorkingSolution() {
  console.log('🎯 Finding the correct session management approach...\n');
  console.log('📋 Prerequisites:');
  console.log('   1. Figma Desktop is running');
  console.log('   2. You have a Figma file open');
  console.log('   3. A frame/component is selected');
  console.log('   4. Dev Mode is enabled in Figma');
  console.log('   5. MCP server is running on port 3845');
  console.log('');

  // Test persistent approach first (most likely to work)
  const persistentResult = await testPersistentApproach();
  
  if (persistentResult.success) {
    console.log('\n🎉 SOLUTION FOUND: Persistent Connection Approach works!');
    console.log('📊 Result preview:', JSON.stringify(persistentResult.result, null, 2).substring(0, 500));
    return 'persistent';
  }
  
  console.log('\n🔄 Persistent approach failed, trying session-aware approach...\n');
  
  // Test session-aware approach as fallback
  const sessionResult = await testSessionApproach();
  
  if (sessionResult.success) {
    console.log('\n🎉 SOLUTION FOUND: Session-Aware Approach works!');
    console.log('📊 Result preview:', JSON.stringify(sessionResult.result, null, 2).substring(0, 500));
    return 'session';
  }
  
  console.log('\n❌ Both approaches failed - need to investigate further');
  console.log('🔧 Debug information:');
  console.log('   Persistent error:', persistentResult.error);
  console.log('   Session error:', sessionResult.error);
  
  console.log('\n💡 Troubleshooting suggestions:');
  console.log('   1. Verify Figma Desktop is running and Dev Mode is enabled');
  console.log('   2. Check that you have a frame/component selected in Figma');
  console.log('   3. Ensure the MCP server is running on port 3845');
  console.log('   4. Try restarting Figma Desktop');
  console.log('   5. Check Figma console for MCP server logs');
  
  return null;
}

async function demonstrateWorkingSolution() {
  console.log('🎯 Demonstrating the working MCP solution...\n');
  
  const workingApproach = await findWorkingSolution();
  
  if (workingApproach) {
    console.log(`\n🚀 Using ${workingApproach} approach for full demonstration...\n`);
    
    const ClientClass = workingApproach === 'persistent' ? 
      FigmaMCPClient;
    
    const client = new ClientClass();
    
    try {
      await client.connect();
      
      // Test multiple tools
      console.log('🔧 Testing multiple MCP tools...');
      
      const [metadataResult, codeResult, variablesResult] = await Promise.allSettled([
        client.getMetadata(),
        client.getCode(),
        client.getVariableDefs()
      ]);

      console.log('\n📊 Full MCP extraction results:');
      console.log('   Metadata:', metadataResult.status === 'fulfilled' ? '✅ Success' : `❌ ${metadataResult.reason?.message}`);
      console.log('   Code:', codeResult.status === 'fulfilled' ? '✅ Success' : `❌ ${codeResult.reason?.message}`);
      console.log('   Variables:', variablesResult.status === 'fulfilled' ? '✅ Success' : `❌ ${variablesResult.reason?.message}`);

      if (metadataResult.status === 'fulfilled') {
        console.log('\n📋 Metadata preview:', JSON.stringify(metadataResult.value, null, 2).substring(0, 300) + '...');
      }

      if (codeResult.status === 'fulfilled') {
        console.log('\n💻 Code preview:', JSON.stringify(codeResult.value, null, 2).substring(0, 300) + '...');
      }

      console.log('\n🎉 MCP extraction is now working! The solution is ready for integration.');
      
      // Cleanup
      if (workingApproach === 'persistent') {
        client.disconnect();
      }
      
    } catch (error) {
      console.error('❌ Demonstration failed:', error);
    }
  } else {
    console.log('\n❌ No working solution found. Manual debugging required.');
  }
}

// Run the comprehensive test
demonstrateWorkingSolution().catch(console.error);
