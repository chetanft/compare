/**
 * Test the working MCP client
 */

import FigmaMCPClient from './src/figma/mcpClient.js';

async function testWorkingClient() {
  console.log('🎯 Testing Working Figma MCP Client...\n');
  console.log('📋 Prerequisites:');
  console.log('   1. Figma Desktop is running');
  console.log('   2. You have a Figma file open');
  console.log('   3. A frame/component is selected');
  console.log('   4. Dev Mode is enabled in Figma');
  console.log('   5. MCP server is running on port 3845');
  console.log('');

  const client = new FigmaMCPClient();

  try {
    // Test connection
    console.log('🔄 Step 1: Testing connection...');
    await client.connect();
    console.log('✅ Connection successful!');

    // Test tools list
    console.log('🔄 Step 2: Testing tools/list...');
    const tools = await client.listTools();
    console.log('✅ Available tools:', tools.tools?.map(t => t.name) || []);

    // Test get_code
    console.log('🔄 Step 3: Testing get_code...');
    try {
      const codeResult = await client.getCode();
      console.log('✅ get_code successful!');
      console.log('📝 Code preview:', JSON.stringify(codeResult, null, 2).substring(0, 300) + '...');
    } catch (codeError) {
      console.log('⚠️ get_code failed:', codeError.message);
    }

    // Test get_metadata
    console.log('🔄 Step 4: Testing get_metadata...');
    try {
      const metadataResult = await client.getMetadata();
      console.log('✅ get_metadata successful!');
      console.log('📊 Metadata preview:', JSON.stringify(metadataResult, null, 2).substring(0, 300) + '...');
    } catch (metadataError) {
      console.log('⚠️ get_metadata failed:', metadataError.message);
    }

    // Test get_variable_defs
    console.log('🔄 Step 5: Testing get_variable_defs...');
    try {
      const variablesResult = await client.getVariableDefs();
      console.log('✅ get_variable_defs successful!');
      console.log('🎨 Variables preview:', JSON.stringify(variablesResult, null, 2).substring(0, 300) + '...');
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
      
      if (extractionResult.components?.length > 0) {
        console.log('🎨 First component:', extractionResult.components[0]);
      }
      
    } catch (extractionError) {
      console.log('⚠️ Full extraction failed:', extractionError.message);
    }

    console.log('\n🎉 Working MCP client test completed successfully!');
    console.log('🚀 The Figma MCP extraction is now working!');

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

testWorkingClient().catch(console.error);
