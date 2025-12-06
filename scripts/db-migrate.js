#!/usr/bin/env node
/**
 * Database Migration Script
 * Runs database migrations for SQLite or Supabase
 */

import { getDatabaseAdapter } from '../src/database/index.js';
import { initializeSchema, runMigrations } from '../src/database/migrations/MigrationRunner.js';

async function runMigrationsScript() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Get database adapter
    const adapter = await getDatabaseAdapter();
    const dbType = adapter.getType ? adapter.getType() : 'unknown';
    console.log(`✅ Connected to ${dbType} database`);
    
    // Initialize schema if needed
    await initializeSchema(adapter);
    
    // Run migrations
    const applied = await runMigrations(adapter);
    
    if (applied.length > 0) {
      console.log(`✅ Applied ${applied.length} migration(s): ${applied.join(', ')}`);
    } else {
      console.log('✅ No new migrations to apply');
    }
    
    console.log(`✅ Migrations completed successfully using ${dbType} adapter`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runMigrationsScript();

