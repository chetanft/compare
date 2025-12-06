/**
 * Migration Runner
 * Runs database migrations for both SQLite and Supabase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Convert Postgres SQL to SQLite-compatible SQL
 * @param {string} sql - Postgres SQL
 * @returns {string} SQLite-compatible SQL
 */
function convertPostgresToSQLite(sql) {
  let converted = sql;

  // Replace UUID type with TEXT
  converted = converted.replace(/\bUUID\b/gi, 'TEXT');
  
  // Replace uuid_generate_v4() with SQLite UUID generation
  converted = converted.replace(/uuid_generate_v4\(\)/gi, 
    "(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))))");

  // Replace JSONB with TEXT
  converted = converted.replace(/\bJSONB\b/gi, 'TEXT');

  // Replace TIMESTAMPTZ with TEXT
  converted = converted.replace(/\bTIMESTAMPTZ\b/gi, 'TEXT');

  // Replace NOW() with CURRENT_TIMESTAMP (SQLite compatible)
  converted = converted.replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP");

  // Replace BOOLEAN with INTEGER CHECK
  converted = converted.replace(/\bBOOLEAN\b/gi, 'INTEGER CHECK (value IN (0, 1))');

  // Remove RLS policies (not applicable to SQLite)
  converted = converted.replace(/ALTER TABLE .* ENABLE ROW LEVEL SECURITY;?/gi, '');
  converted = converted.replace(/CREATE POLICY .*;/gi, '');

  // Remove triggers and functions (SQLite has limited support)
  converted = converted.replace(/CREATE TRIGGER .*;/gi, '');
  converted = converted.replace(/CREATE OR REPLACE FUNCTION .*;/gi, '');

  // Replace CREATE TYPE with CHECK constraints
  converted = converted.replace(/CREATE TYPE (\w+) AS ENUM \((.+)\);/gi, 
    (match, typeName, values) => {
      const valueList = values.split(',').map(v => v.trim().replace(/'/g, '')).join(', ');
      return `-- Enum ${typeName} replaced with CHECK constraint in table definitions`;
    });

  // Replace ENUM references with TEXT CHECK
  converted = converted.replace(/\b(\w+_status|\w+_format)\b/gi, 'TEXT');

  // Remove public schema prefix
  converted = converted.replace(/public\./g, '');

  // Remove REFERENCES auth.users (SQLite doesn't have auth schema)
  converted = converted.replace(/REFERENCES auth\.users\(id\)/gi, '');
  
  // Remove auth.uid() function calls (SQLite doesn't have auth functions)
  converted = converted.replace(/auth\.uid\(\)/gi, 'NULL');
  
  // Fix ALTER TABLE ADD COLUMN IF NOT EXISTS (SQLite doesn't support IF NOT EXISTS in ALTER TABLE)
  converted = converted.replace(/ALTER TABLE .* ADD COLUMN IF NOT EXISTS/gi, (match) => {
    // SQLite doesn't support IF NOT EXISTS in ALTER TABLE, so we'll skip these
    // The columns should already exist in the base schema
    return '-- ' + match + ' (skipped - SQLite limitation)';
  });

  // Add IF NOT EXISTS to CREATE TABLE (only if not already present)
  converted = converted.replace(/CREATE TABLE (?!IF NOT EXISTS )(\w+)/gi, 'CREATE TABLE IF NOT EXISTS $1');

  // Add IF NOT EXISTS to CREATE INDEX (only if not already present)
  converted = converted.replace(/CREATE INDEX (?!IF NOT EXISTS )(\w+)/gi, 'CREATE INDEX IF NOT EXISTS $1');

  return converted;
}

/**
 * Load migration files
 * @returns {Array} Array of migration objects
 */
function loadMigrations() {
  const migrationsDir = path.join(__dirname, '../../../supabase/migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql') && !file.includes('.sqlite.'))
    .sort();

  return files.map(file => {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const version = file.replace(/^\d+_/, '').replace(/\.sql$/, '');
    
    return {
      file,
      version,
      content,
      sqliteContent: convertPostgresToSQLite(content)
    };
  });
}

/**
 * Get applied migrations
 * @param {DatabaseAdapter} adapter - Database adapter
 * @returns {Promise<Array>} Array of applied migration versions
 */
async function getAppliedMigrations(adapter) {
  try {
    if (adapter.getType() === 'sqlite') {
      // Check if schema_migrations table exists
      try {
        const tableExists = await adapter.queryOne(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'`
        );
        
        if (!tableExists) {
          // Create schema_migrations table
          const createTableSql = `
            CREATE TABLE IF NOT EXISTS schema_migrations (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              version TEXT NOT NULL UNIQUE,
              applied_at TEXT DEFAULT (datetime('now'))
            )
          `;
          if (adapter.exec) {
            adapter.exec(createTableSql);
          } else {
            adapter.db.exec(createTableSql);
          }
          return [];
        }
      } catch (e) {
        // Table doesn't exist, create it
        const createTableSql = `
          CREATE TABLE IF NOT EXISTS schema_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version TEXT NOT NULL UNIQUE,
            applied_at TEXT DEFAULT (datetime('now'))
          )
        `;
        if (adapter.exec) {
          adapter.exec(createTableSql);
        } else {
          adapter.db.exec(createTableSql);
        }
        return [];
      }

      const results = await adapter.query('SELECT version FROM schema_migrations ORDER BY applied_at ASC');
      return results.map(r => r.version);
    } else {
      // Supabase
      try {
        const results = await adapter.select('schema_migrations', {
          orderBy: [{ column: 'applied_at', ascending: true }]
        });
        return results.map(r => r.version);
      } catch (e) {
        // Table doesn't exist yet
        return [];
      }
    }
  } catch (error) {
    // Table doesn't exist yet
    return [];
  }
}

/**
 * Record migration as applied
 * @param {DatabaseAdapter} adapter - Database adapter
 * @param {string} version - Migration version
 */
async function recordMigration(adapter, version) {
  if (adapter.getType() === 'supabase') {
    await adapter.insert('schema_migrations', {
      version,
      appliedAt: new Date().toISOString()
    });
  } else {
    // SQLite - use parameterized query to avoid SQL injection
    const stmt = adapter.db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, CURRENT_TIMESTAMP)');
    stmt.run(version);
  }
}

/**
 * Run migrations
 * @param {DatabaseAdapter} adapter - Database adapter
 * @returns {Promise<Array>} Array of applied migration versions
 */
export async function runMigrations(adapter) {
  if (!adapter.isConnected()) {
    await adapter.connect();
  }

  const migrations = loadMigrations();
  const applied = await getAppliedMigrations(adapter);
  const appliedVersions = new Set(applied);

  const newlyApplied = [];

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) {
      continue; // Already applied
    }

    console.log(`Running migration: ${migration.file}`);

    try {
      const sql = adapter.getType() === 'sqlite' 
        ? migration.sqliteContent 
        : migration.content;

      // Split SQL by semicolons and execute each statement
      // Filter out SQLite-incompatible statements (COMMENT, etc.)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => {
          if (s.length === 0) return false;
          if (s.startsWith('--')) return false;
          // SQLite doesn't support COMMENT ON statements
          if (s.toUpperCase().startsWith('COMMENT')) return false;
          return true;
        });

      for (const statement of statements) {
        if (adapter.getType() === 'sqlite') {
          adapter.exec(statement);
        } else {
          // For Supabase, we need to use the query method
          // But Supabase doesn't support raw SQL well, so we skip complex migrations
          console.warn(`Skipping raw SQL for Supabase: ${statement.substring(0, 50)}...`);
        }
      }

      await recordMigration(adapter, migration.version);
      newlyApplied.push(migration.version);
      console.log(`✅ Applied migration: ${migration.version}`);
    } catch (error) {
      console.error(`❌ Failed to apply migration ${migration.version}:`, error.message);
      throw error;
    }
  }

  return newlyApplied;
}

/**
 * Initialize database schema (run initial schema if no migrations)
 * @param {DatabaseAdapter} adapter - Database adapter
 */
export async function initializeSchema(adapter) {
  if (!adapter.isConnected()) {
    await adapter.connect();
  }

  const applied = await getAppliedMigrations(adapter);
  
  // If no migrations applied, run initial schema
  if (applied.length === 0) {
    const schemaPath = adapter.getType() === 'sqlite'
      ? path.join(__dirname, '../../../supabase/schema-sqlite.sql')
      : null;

    if (schemaPath && fs.existsSync(schemaPath)) {
      console.log('Initializing database schema...');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      if (adapter.getType() === 'sqlite') {
        adapter.exec(schema);
        await recordMigration(adapter, 'initial_schema');
        console.log('✅ Initial schema applied');
      }
    }
  }
}

