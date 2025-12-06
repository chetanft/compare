#!/usr/bin/env node

/**
 * Data Migration Script
 * Migrates existing local file-based data to SQLite database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabaseAdapter } from '../src/database/index.js';
import { createRepositories } from '../src/database/repositories/index.js';
import { getStorageProvider } from '../src/config/storage-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(process.cwd(), 'output');
const REPORTS_DIR = path.join(OUTPUT_DIR, 'reports');
const CREDENTIALS_DIR = path.join(OUTPUT_DIR, 'credentials');
const DESIGN_SYSTEMS_DIR = path.join(OUTPUT_DIR, 'design-systems');
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, 'screenshots', 'comparisons');
const SNAPSHOTS_DIR = path.join(OUTPUT_DIR, 'snapshots');

/**
 * Migrate reports from filesystem to database
 */
async function migrateReports(adapter, repositories, storageProvider) {
  console.log('📄 Migrating reports...');
  
  if (!fs.existsSync(REPORTS_DIR)) {
    console.log('  No reports directory found, skipping');
    return 0;
  }

  const files = fs.readdirSync(REPORTS_DIR).filter(f => /\.(html|json|pdf|csv)$/.test(f));
  let migrated = 0;

  for (const file of files) {
    try {
      const filePath = path.join(REPORTS_DIR, file);
      const stats = fs.statSync(filePath);
      const format = path.extname(file).slice(1);
      const reportId = path.basename(file, `.${format}`);
      
      // Read report data
      const reportData = fs.readFileSync(filePath, 'utf8');
      
      // Save via storage provider (handles file storage)
      const storageResult = await storageProvider.saveReport(reportData, {
        id: reportId,
        comparisonId: null, // Will be set if we can find it
        title: `Report ${reportId}`,
        format
      });

      // Save metadata to database
      await repositories.reports.create({
        id: storageResult.id,
        userId: null,
        comparisonId: null,
        title: storageResult.title,
        format: storageResult.format,
        storagePath: storageResult.url,
        fileSize: stats.size
      });

      migrated++;
      console.log(`  ✅ Migrated: ${file}`);
    } catch (error) {
      console.error(`  ❌ Failed to migrate ${file}:`, error.message);
    }
  }

  console.log(`  Migrated ${migrated} reports`);
  return migrated;
}

/**
 * Migrate credentials from filesystem to database
 */
async function migrateCredentials(adapter, repositories) {
  console.log('🔐 Migrating credentials...');
  
  if (!fs.existsSync(CREDENTIALS_DIR)) {
    console.log('  No credentials directory found, skipping');
    return 0;
  }

  const files = fs.readdirSync(CREDENTIALS_DIR).filter(f => f.endsWith('.json'));
  let migrated = 0;

  for (const file of files) {
    try {
      const filePath = path.join(CREDENTIALS_DIR, file);
      const credentialData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Credentials are already encrypted, just migrate metadata
      await repositories.credentials.create({
        id: credentialData.id,
        userId: null,
        name: credentialData.name,
        url: credentialData.url,
        loginUrl: credentialData.loginUrl || null,
        usernameEncrypted: credentialData.username_encrypted,
        passwordVaultId: credentialData.password_vault_id || credentialData.password_encrypted,
        notes: credentialData.notes || null,
        lastUsedAt: credentialData.last_used_at || null,
        createdAt: credentialData.created_at || new Date().toISOString(),
        updatedAt: credentialData.updated_at || new Date().toISOString()
      });

      migrated++;
      console.log(`  ✅ Migrated: ${file}`);
    } catch (error) {
      console.error(`  ❌ Failed to migrate ${file}:`, error.message);
    }
  }

  console.log(`  Migrated ${migrated} credentials`);
  return migrated;
}

/**
 * Migrate design systems from filesystem to database
 */
async function migrateDesignSystems(adapter, repositories, storageProvider) {
  console.log('🎨 Migrating design systems...');
  
  if (!fs.existsSync(DESIGN_SYSTEMS_DIR)) {
    console.log('  No design systems directory found, skipping');
    return 0;
  }

  const files = fs.readdirSync(DESIGN_SYSTEMS_DIR).filter(f => f.endsWith('.json'));
  let migrated = 0;

  for (const file of files) {
    try {
      const filePath = path.join(DESIGN_SYSTEMS_DIR, file);
      const systemData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Check if CSS file exists
      const cssPath = path.join(DESIGN_SYSTEMS_DIR, `${systemData.id}.css`);
      let cssText = null;
      if (fs.existsSync(cssPath)) {
        cssText = fs.readFileSync(cssPath, 'utf8');
      }

      await repositories.designSystems.create({
        id: systemData.id,
        userId: systemData.userId || null,
        name: systemData.name,
        slug: systemData.slug,
        isGlobal: systemData.isGlobal || false,
        tokens: systemData.tokens,
        cssUrl: systemData.cssUrl || null,
        cssText: cssText || systemData.cssText || null,
        figmaFileKey: systemData.figmaFileKey || null,
        figmaNodeId: systemData.figmaNodeId || null,
        createdAt: systemData.createdAt || new Date().toISOString(),
        updatedAt: systemData.updatedAt || new Date().toISOString()
      });

      migrated++;
      console.log(`  ✅ Migrated: ${file}`);
    } catch (error) {
      console.error(`  ❌ Failed to migrate ${file}:`, error.message);
    }
  }

  console.log(`  Migrated ${migrated} design systems`);
  return migrated;
}

/**
 * Migrate screenshot results from filesystem to database
 */
async function migrateScreenshots(adapter, repositories) {
  console.log('📸 Migrating screenshot results...');
  
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    console.log('  No screenshots directory found, skipping');
    return 0;
  }

  const dirs = fs.readdirSync(SCREENSHOTS_DIR).filter(d => {
    const dirPath = path.join(SCREENSHOTS_DIR, d);
    return fs.statSync(dirPath).isDirectory();
  });

  let migrated = 0;

  for (const dir of dirs) {
    try {
      const resultPath = path.join(SCREENSHOTS_DIR, dir, 'result.json');
      if (!fs.existsSync(resultPath)) {
        continue;
      }

      const resultData = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
      
      await repositories.screenshots.create({
        id: resultData.id,
        userId: null,
        uploadId: resultData.uploadId || `upload_${Date.now()}`,
        comparisonId: resultData.id,
        status: resultData.status || 'completed',
        figmaScreenshotPath: resultData.figmaScreenshotPath,
        developedScreenshotPath: resultData.developedScreenshotPath,
        diffImagePath: resultData.diffImagePath,
        sideBySidePath: resultData.sideBySidePath,
        metrics: resultData.metrics,
        discrepancies: resultData.discrepancies,
        enhancedAnalysis: resultData.enhancedAnalysis,
        colorPalettes: resultData.colorPalettes,
        reportPath: resultData.reportPath,
        settings: resultData.settings,
        processingTime: resultData.processingTime,
        createdAt: resultData.createdAt || new Date().toISOString(),
        completedAt: resultData.completedAt || null
      });

      migrated++;
      console.log(`  ✅ Migrated: ${dir}`);
    } catch (error) {
      console.error(`  ❌ Failed to migrate ${dir}:`, error.message);
    }
  }

  console.log(`  Migrated ${migrated} screenshot results`);
  return migrated;
}

/**
 * Migrate comparison snapshots to comparisons table
 */
async function migrateSnapshots(adapter, repositories) {
  console.log('📋 Migrating comparison snapshots...');
  
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    console.log('  No snapshots directory found, skipping');
    return 0;
  }

  const indexPath = path.join(SNAPSHOTS_DIR, 'index.json');
  if (!fs.existsSync(indexPath)) {
    console.log('  No snapshots index found, skipping');
    return 0;
  }

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const records = index.records || [];
  let migrated = 0;

  for (const record of records) {
    try {
      if (!fs.existsSync(record.payloadPath)) {
        continue;
      }

      const payload = JSON.parse(fs.readFileSync(record.payloadPath, 'utf8'));
      const metadata = payload.metadata || {};
      const figmaMeta = metadata.figma || {};
      const webMeta = metadata.web || {};

      await repositories.comparisons.create({
        id: record.id,
        userId: null,
        figmaUrl: figmaMeta.fileId ? `https://www.figma.com/file/${figmaMeta.fileId}` : '',
        webUrl: webMeta.url || '',
        status: 'completed',
        result: payload,
        createdAt: record.createdAt || new Date().toISOString()
      });

      migrated++;
      console.log(`  ✅ Migrated: ${record.id}`);
    } catch (error) {
      console.error(`  ❌ Failed to migrate ${record.id}:`, error.message);
    }
  }

  console.log(`  Migrated ${migrated} comparison snapshots`);
  return migrated;
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 Starting data migration...\n');

  try {
    // Initialize database adapter (SQLite for local migration)
    const adapter = await getDatabaseAdapter({
      dbPath: process.env.DATABASE_URL?.replace('file:', '') || './data/app.db'
    });

    // Create repositories
    const repositories = createRepositories(adapter);

    // Get storage provider
    const storageProvider = getStorageProvider();

    // Run migrations
    const reportCount = await migrateReports(adapter, repositories, storageProvider);
    const credentialCount = await migrateCredentials(adapter, repositories);
    const designSystemCount = await migrateDesignSystems(adapter, repositories, storageProvider);
    const screenshotCount = await migrateScreenshots(adapter, repositories);
    const snapshotCount = await migrateSnapshots(adapter, repositories);

    console.log('\n✅ Migration complete!');
    console.log(`  Reports: ${reportCount}`);
    console.log(`  Credentials: ${credentialCount}`);
    console.log(`  Design Systems: ${designSystemCount}`);
    console.log(`  Screenshots: ${screenshotCount}`);
    console.log(`  Snapshots: ${snapshotCount}`);
    console.log(`  Total: ${reportCount + credentialCount + designSystemCount + screenshotCount + snapshotCount}`);

    await adapter.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
main();

