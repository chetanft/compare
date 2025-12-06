#!/usr/bin/env node
/**
 * Data Migration Script
 * Migrates existing file-based data to database
 */

import { initDatabase } from '../src/database/init.js';
import { getDatabaseAdapter } from '../src/database/index.js';
import { createServices } from '../src/services/index.js';
import { getStorageProvider } from '../src/config/storage-config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function migrateReports(services) {
  const reportsDir = path.join(projectRoot, 'output', 'reports');
  if (!fs.existsSync(reportsDir)) {
    console.log('📁 No reports directory found, skipping reports migration');
    return 0;
  }

  const reportFiles = fs.readdirSync(reportsDir).filter(f => f.endsWith('.html'));
  if (reportFiles.length === 0) {
    console.log('📁 No report files found, skipping reports migration');
    return 0;
  }

  console.log(`📄 Migrating ${reportFiles.length} report(s)...`);
  let migrated = 0;

  for (const file of reportFiles) {
    try {
      const filePath = path.join(reportsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const stats = fs.statSync(filePath);
      
      // Extract metadata from filename or content
      const title = file.replace('.html', '');
      const storagePath = `reports/${file}`;

      // Create report record (using a default userId for local mode)
      await services.reports.generateAndSave(null, content, {
        userId: 'local-user',
        title,
        format: 'html'
      });

      migrated++;
    } catch (error) {
      console.warn(`⚠️ Failed to migrate report ${file}:`, error.message);
    }
  }

  console.log(`✅ Migrated ${migrated}/${reportFiles.length} report(s)`);
  return migrated;
}

async function migrateCredentials(services) {
  const credsDir = path.join(projectRoot, 'output', 'credentials');
  if (!fs.existsSync(credsDir)) {
    console.log('📁 No credentials directory found, skipping credentials migration');
    return 0;
  }

  const credFiles = fs.readdirSync(credsDir).filter(f => f.endsWith('.json'));
  if (credFiles.length === 0) {
    console.log('📁 No credential files found, skipping credentials migration');
    return 0;
  }

  console.log(`🔐 Migrating ${credFiles.length} credential(s)...`);
  let migrated = 0;

  for (const file of credFiles) {
    try {
      const filePath = path.join(credsDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      await services.credentials.createCredential({
        userId: 'local-user',
        name: data.name || file.replace('.json', ''),
        url: data.url || '',
        loginUrl: data.loginUrl || '',
        username: data.username || '',
        password: data.password || '',
        notes: data.notes || ''
      });

      migrated++;
    } catch (error) {
      console.warn(`⚠️ Failed to migrate credential ${file}:`, error.message);
    }
  }

  console.log(`✅ Migrated ${migrated}/${credFiles.length} credential(s)`);
  return migrated;
}

async function migrateDesignSystems(services) {
  const dsDir = path.join(projectRoot, 'output', 'design-systems');
  if (!fs.existsSync(dsDir)) {
    console.log('📁 No design-systems directory found, skipping design systems migration');
    return 0;
  }

  const dsFiles = fs.readdirSync(dsDir).filter(f => f.endsWith('.json'));
  if (dsFiles.length === 0) {
    console.log('📁 No design system files found, skipping design systems migration');
    return 0;
  }

  console.log(`🎨 Migrating ${dsFiles.length} design system(s)...`);
  let migrated = 0;

  for (const file of dsFiles) {
    try {
      const filePath = path.join(dsDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      await services.designSystems.createDesignSystem({
        userId: null, // Global design systems
        name: data.name || file.replace('.json', ''),
        slug: data.slug || file.replace('.json', '').toLowerCase().replace(/\s+/g, '-'),
        isGlobal: true,
        tokens: data.tokens || {},
        cssText: data.css || '',
        figmaFileKey: data.figmaFileKey || null,
        figmaNodeId: data.figmaNodeId || null
      });

      migrated++;
    } catch (error) {
      console.warn(`⚠️ Failed to migrate design system ${file}:`, error.message);
    }
  }

  console.log(`✅ Migrated ${migrated}/${dsFiles.length} design system(s)`);
  return migrated;
}

async function migrateScreenshotResults(services) {
  const screenshotsDir = path.join(projectRoot, 'output', 'screenshots', 'comparisons');
  if (!fs.existsSync(screenshotsDir)) {
    console.log('📁 No screenshots directory found, skipping screenshot results migration');
    return 0;
  }

  const comparisonDirs = fs.readdirSync(screenshotsDir).filter(f => {
    const fullPath = path.join(screenshotsDir, f);
    return fs.statSync(fullPath).isDirectory();
  });

  if (comparisonDirs.length === 0) {
    console.log('📁 No screenshot comparison directories found, skipping migration');
    return 0;
  }

  console.log(`📸 Migrating ${comparisonDirs.length} screenshot comparison(s)...`);
  let migrated = 0;

  for (const dir of comparisonDirs) {
    try {
      const dirPath = path.join(screenshotsDir, dir);
      const metadataPath = path.join(dirPath, 'metadata.json');
      
      if (!fs.existsSync(metadataPath)) {
        console.warn(`⚠️ No metadata.json found for ${dir}, skipping`);
        continue;
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      
      await services.screenshots.saveScreenshotComparisonResult({
        userId: 'local-user',
        uploadId: dir,
        comparisonId: dir,
        status: metadata.status || 'completed',
        figmaScreenshotPath: metadata.figmaScreenshotPath || `screenshots/${dir}/figma.png`,
        developedScreenshotPath: metadata.developedScreenshotPath || `screenshots/${dir}/developed.png`,
        diffImagePath: metadata.diffImagePath || `screenshots/${dir}/diff.png`,
        sideBySidePath: metadata.sideBySidePath || `screenshots/${dir}/side-by-side.png`,
        metrics: metadata.metrics || {},
        discrepancies: metadata.discrepancies || [],
        enhancedAnalysis: metadata.enhancedAnalysis || {},
        colorPalettes: metadata.colorPalettes || {},
        reportPath: metadata.reportPath || `screenshots/${dir}/report.html`,
        settings: metadata.settings || {},
        processingTime: metadata.processingTime || null,
        errorMessage: metadata.errorMessage || null
      });

      migrated++;
    } catch (error) {
      console.warn(`⚠️ Failed to migrate screenshot comparison ${dir}:`, error.message);
    }
  }

  console.log(`✅ Migrated ${migrated}/${comparisonDirs.length} screenshot comparison(s)`);
  return migrated;
}

async function runDataMigration() {
  try {
    console.log('🔄 Starting data migration from file-based storage to database...\n');
    
    // Initialize database and services
    const adapter = await getDatabaseAdapter();
    const storageProvider = getStorageProvider('local-user');
    const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.LOCAL_CREDENTIAL_KEY || null;
    const services = createServices(adapter, storageProvider, encryptionKey);
    
    const dbType = adapter.getType ? adapter.getType() : 'unknown';
    console.log(`✅ Database initialized with ${dbType} adapter\n`);
    
    // Create default local user if it doesn't exist
    const localUserId = 'local-user';
    try {
      const existingUser = await adapter.queryOne('SELECT id FROM profiles WHERE id = ?', [localUserId]);
      if (!existingUser) {
        await adapter.insert('profiles', {
          id: localUserId,
          email: 'local@example.com',
          displayName: 'Local User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Created default local user\n');
      }
    } catch (error) {
      console.warn('⚠️ Could not create default user:', error.message);
    }

    // Migrate each data type
    const reportsCount = await migrateReports(services);
    console.log('');
    
    const credsCount = await migrateCredentials(services);
    console.log('');
    
    const dsCount = await migrateDesignSystems(services);
    console.log('');
    
    const screenshotsCount = await migrateScreenshotResults(services);
    console.log('');

    const total = reportsCount + credsCount + dsCount + screenshotsCount;
    console.log(`✅ Data migration completed! Migrated ${total} total record(s)`);
    console.log(`   - Reports: ${reportsCount}`);
    console.log(`   - Credentials: ${credsCount}`);
    console.log(`   - Design Systems: ${dsCount}`);
    console.log(`   - Screenshot Results: ${screenshotsCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Data migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runDataMigration();

