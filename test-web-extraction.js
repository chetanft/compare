import axios from 'axios';
import { CONFIGURED_PORTS } from './src/config/PORTS.js';

const BASE_URL = `http://localhost:${CONFIGURED_PORTS.SERVER}`;

async function testWebExtraction() {
  try {
    console.log('🧪 Testing web extraction fixes...');
    
    // Test 1: Legacy endpoint should work
    console.log('\n1. Testing legacy /api/web/extract endpoint...');
    const legacyResponse = await axios.post(`${BASE_URL}/api/web/extract`, {
      url: 'https://httpbin.org/html'
    });
    
    if (legacyResponse.data.success) {
      console.log('✅ Legacy endpoint works');
      console.log(`   Elements extracted: ${legacyResponse.data.data.elements?.length || 0}`);
      
      // Check if elements have the new format
      if (legacyResponse.data.data.elements?.length > 0) {
        const firstElement = legacyResponse.data.data.elements[0];
        console.log(`   First element has tagName: ${!!firstElement.tagName}`);
        console.log(`   First element has styles: ${!!firstElement.styles}`);
        console.log(`   First element has className: ${!!firstElement.className}`);
      }
    } else {
      console.log('❌ Legacy endpoint failed:', legacyResponse.data.error);
    }
    
    // Test 2: Web-only endpoint should work
    console.log('\n2. Testing /api/web-only/extract endpoint...');
    const webOnlyResponse = await axios.post(`${BASE_URL}/api/web-only/extract`, {
      webUrl: 'https://httpbin.org/html'
    });
    
    if (webOnlyResponse.data.success) {
      console.log('✅ Web-only endpoint works');
      console.log(`   Elements extracted: ${webOnlyResponse.data.data.webData?.elements?.length || 0}`);
      
      // Check if elements have the new format
      if (webOnlyResponse.data.data.webData?.elements?.length > 0) {
        const firstElement = webOnlyResponse.data.data.webData.elements[0];
        console.log(`   First element has tagName: ${!!firstElement.tagName}`);
        console.log(`   First element has styles: ${!!firstElement.styles}`);
        console.log(`   First element has className: ${!!firstElement.className}`);
      }
    } else {
      console.log('❌ Web-only endpoint failed:', webOnlyResponse.data.error);
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

testWebExtraction(); 