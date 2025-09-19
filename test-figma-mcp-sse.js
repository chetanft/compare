/**
 * Test script for the new SSE-based Figma MCP Client
 * This tests the proper connection to Figma Dev Mode MCP Server
 */

import FigmaMCPClient from './src/figma/mcpClient.js';

async function testFigmaMCPConnection() {
  console.log('🎯 Testing Figma Dev Mode MCP Server with SSE transport...');
  console.log('📋 Make sure:');
  console.log('   1. Figma Desktop is running');
  console.log('   2. You have a Figma file open');
  console.log('   3. A frame/component is selected');
  console.log('   4. Dev Mode is enabled');
  console.log('   5. MCP server is running on port 3845');
  console.log('');

  const client = new FigmaMCPClient();

  try {
    // Test connection
    console.log('🔄 Step 1: Testing connection...');
    await client.connect();
    console.log('✅ Connection successful!');

    // Test get_code tool
    console.log('🔄 Step 2: Testing get_code tool...');
    try {
      const codeResult = await client.getCode();
      console.log('✅ get_code successful:', codeResult);
    } catch (codeError) {
      console.log('⚠️ get_code failed:', codeError.message);
    }

    // Test get_metadata tool
    console.log('🔄 Step 3: Testing get_metadata tool...');
    try {
      const metadataResult = await client.getMetadata();
      console.log('✅ get_metadata successful:', metadataResult);
    } catch (metadataError) {
      console.log('⚠️ get_metadata failed:', metadataError.message);
    }

    // Test get_variable_defs tool
    console.log('🔄 Step 4: Testing get_variable_defs tool...');
    try {
      const variablesResult = await client.getVariableDefs();
      console.log('✅ get_variable_defs successful:', variablesResult);
    } catch (variablesError) {
      console.log('⚠️ get_variable_defs failed:', variablesError.message);
    }

    // Test full extraction
    console.log('🔄 Step 5: Testing full extraction...');
    const testUrl = 'https://www.figma.com/design/test123/Test-File';
    try {
      const extractionResult = await client.extractFigmaData(testUrl);
      console.log('✅ Full extraction successful!');
      console.log('📊 Extraction result:', {
        method: extractionResult.extractionMethod,
        components: extractionResult.components?.length || 0,
        hasMetadata: !!extractionResult.metadata,
        hasCode: !!extractionResult.code,
        hasVariables: !!extractionResult.variables
      });
    } catch (extractionError) {
      console.log('⚠️ Full extraction failed:', extractionError.message);
    }

    // Clean up
    await client.disconnect();
    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Is Figma Desktop running?');
    console.log('   2. Is the MCP server running on port 3845?');
    console.log('   3. Is Dev Mode enabled in Figma?');
    console.log('   4. Do you have a frame/component selected?');
    
    // Try to disconnect anyway
    try {
      await client.disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
  }
}

// Run the test
testFigmaMCPConnection().catch(console.error);
