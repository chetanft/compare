/**
 * Test script for the manual MCP client implementation
 * This tests the proper MCP protocol handshake with Figma server
 */

import FigmaMCPClient from './src/figma/mcpClient.js';

async function testManualMCPConnection() {
  console.log('🎯 Testing Manual Figma MCP Client...');
  console.log('📋 Prerequisites:');
  console.log('   1. Figma Desktop is running');
  console.log('   2. You have a Figma file open');
  console.log('   3. A frame/component is selected');
  console.log('   4. Dev Mode is enabled in Figma');
  console.log('   5. MCP server is running on port 3845');
  console.log('');

  const client = new FigmaMCPClient();

  try {
    // Test connection and initialization
    console.log('🔄 Step 1: Testing connection and MCP handshake...');
    await client.connect();
    console.log('✅ Connection and initialization successful!');

    // Test listing tools
    console.log('🔄 Step 2: Testing tools/list...');
    try {
      const tools = await client.listTools();
      console.log('✅ tools/list successful:', tools);
    } catch (toolsError) {
      console.log('⚠️ tools/list failed:', toolsError.message);
    }

    // Test get_metadata tool
    console.log('🔄 Step 3: Testing get_metadata tool...');
    try {
      const metadataResult = await client.getMetadata();
      console.log('✅ get_metadata successful:', metadataResult);
    } catch (metadataError) {
      console.log('⚠️ get_metadata failed:', metadataError.message);
    }

    // Test get_code tool
    console.log('🔄 Step 4: Testing get_code tool...');
    try {
      const codeResult = await client.getCode();
      console.log('✅ get_code successful:', codeResult);
    } catch (codeError) {
      console.log('⚠️ get_code failed:', codeError.message);
    }

    // Test get_variable_defs tool
    console.log('🔄 Step 5: Testing get_variable_defs tool...');
    try {
      const variablesResult = await client.getVariableDefs();
      console.log('✅ get_variable_defs successful:', variablesResult);
    } catch (variablesError) {
      console.log('⚠️ get_variable_defs failed:', variablesError.message);
    }

    // Test full extraction
    console.log('🔄 Step 6: Testing full extraction...');
    const testUrl = 'https://www.figma.com/design/test123/Test-File';
    try {
      const extractionResult = await client.extractFigmaData(testUrl);
      console.log('✅ Full extraction successful!');
      console.log('📊 Extraction summary:', {
        method: extractionResult.extractionMethod,
        components: extractionResult.components?.length || 0,
        hasMetadata: !!extractionResult.metadata,
        hasCode: !!extractionResult.code,
        hasVariables: !!extractionResult.variables
      });
    } catch (extractionError) {
      console.log('⚠️ Full extraction failed:', extractionError.message);
    }

    console.log('✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Is Figma Desktop running?');
    console.log('   2. Is Dev Mode enabled in Figma preferences?');
    console.log('   3. Do you have a Figma file open?');
    console.log('   4. Is a frame/component selected in Figma?');
    console.log('   5. Check the Figma console for MCP server status');
  }
}

// Run the test
testManualMCPConnection().catch(console.error);
