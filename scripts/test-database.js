#!/usr/bin/env node
/**
 * Quick Database Test Script
 * Tests database operations end-to-end
 */

import { initDatabase } from '../src/database/init.js';

async function testDatabase() {
  try {
    console.log('🧪 Testing database system...\n');
    
    // Initialize database
    const services = await initDatabase({ userId: 'local-user' });
    console.log('✅ Database initialized');
    console.log('   Available services:', Object.keys(services).join(', '));
    
    // Test: List reports
    console.log('\n📄 Testing reports...');
    const reports = await services.reports.listReports({ userId: 'local-user' });
    console.log(`   Found ${reports.length} report(s)`);
    
    // Test: List comparisons
    console.log('\n🔄 Testing comparisons...');
    const comparisons = await services.comparisons.listComparisons('local-user');
    console.log(`   Found ${comparisons.length} comparison(s)`);
    
    // Test: List credentials
    console.log('\n🔐 Testing credentials...');
    const credentials = await services.credentials.listCredentials('local-user');
    console.log(`   Found ${credentials.length} credential(s)`);
    
    // Test: List design systems
    console.log('\n🎨 Testing design systems...');
    const designSystems = await services.designSystems.listDesignSystems();
    console.log(`   Found ${designSystems.length} design system(s)`);
    
    // Test: List screenshot results
    console.log('\n📸 Testing screenshot results...');
    const screenshots = await services.screenshots.listScreenshotResults('local-user');
    console.log(`   Found ${screenshots.length} screenshot comparison(s)`);
    
    console.log('\n✅ All database tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testDatabase();

