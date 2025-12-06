# Database Architecture

## Overview

The application uses a unified database architecture that supports both SQLite (desktop) and Supabase Postgres (SaaS) modes. All database operations go through a repository/service abstraction layer, ensuring identical behavior regardless of backend.

## Schema

### Core Tables

#### `profiles`
User profiles (extends auth.users in Supabase, standalone in SQLite)
- `id` (UUID/TEXT) - Primary key
- `email` (TEXT)
- `display_name` (TEXT)
- `avatar_url` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ/TEXT)

#### `saved_credentials`
Encrypted web app credentials
- `id` (UUID/TEXT) - Primary key
- `user_id` (UUID/TEXT) - Foreign key to profiles
- `name` (TEXT) - Credential name
- `url` (TEXT) - Target URL
- `login_url` (TEXT) - Optional login page URL
- `username_encrypted` (TEXT) - Encrypted username
- `password_vault_id` (TEXT) - Supabase Vault ID or encrypted password
- `notes` (TEXT) - Optional notes
- `last_used_at` (TIMESTAMPTZ/TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ/TEXT)

#### `comparisons`
Comparison jobs and results
- `id` (UUID/TEXT) - Primary key
- `user_id` (UUID/TEXT) - Foreign key to profiles
- `figma_url` (TEXT) - Figma design URL
- `web_url` (TEXT) - Web implementation URL
- `credential_id` (UUID/TEXT) - Optional credential reference
- `status` (ENUM/TEXT) - 'pending', 'processing', 'completed', 'failed'
- `progress` (INTEGER) - 0-100
- `result` (JSONB/TEXT) - Comparison result data
- `error_message` (TEXT) - Error if failed
- `duration_ms` (INTEGER) - Processing duration
- `created_at` (TIMESTAMPTZ/TEXT)
- `completed_at` (TIMESTAMPTZ/TEXT)

#### `design_systems`
Design system definitions with tokens
- `id` (UUID/TEXT) - Primary key
- `user_id` (UUID/TEXT) - Foreign key to profiles (nullable for global)
- `name` (TEXT) - Design system name
- `slug` (TEXT) - Unique slug
- `is_global` (BOOLEAN/INTEGER) - Whether system is global
- `tokens` (JSONB/TEXT) - Design tokens (colors, typography, spacing, etc.)
- `css_url` (TEXT) - URL to CSS file in storage
- `css_text` (TEXT) - Inline CSS text
- `figma_file_key` (TEXT) - Optional Figma file key
- `figma_node_id` (TEXT) - Optional Figma node ID
- `created_at`, `updated_at` (TIMESTAMPTZ/TEXT)

#### `extraction_cache`
Cached extraction results
- `id` (UUID/TEXT) - Primary key
- `source_url` (TEXT) - Source URL
- `source_type` (TEXT) - 'figma' or 'web'
- `data` (JSONB/TEXT) - Cached extraction data
- `hash` (TEXT) - Content hash for validation
- `expires_at` (TIMESTAMPTZ/TEXT) - Cache expiration
- `created_at` (TIMESTAMPTZ/TEXT)

#### `reports`
Report metadata
- `id` (UUID/TEXT) - Primary key
- `user_id` (UUID/TEXT) - Foreign key to profiles
- `comparison_id` (UUID/TEXT) - Foreign key to comparisons
- `title` (TEXT) - Report title
- `format` (ENUM/TEXT) - 'html', 'pdf', 'json', 'csv'
- `storage_path` (TEXT) - Path in storage (filesystem or Supabase Storage)
- `file_size` (INTEGER) - File size in bytes
- `created_at` (TIMESTAMPTZ/TEXT)

#### `screenshot_results`
Screenshot comparison metadata and results
- `id` (UUID/TEXT) - Primary key
- `user_id` (UUID/TEXT) - Foreign key to profiles
- `upload_id` (TEXT) - Upload session ID
- `comparison_id` (TEXT) - Unique comparison ID
- `status` (ENUM/TEXT) - 'processing', 'completed', 'failed'
- `figma_screenshot_path` (TEXT) - Path to Figma screenshot
- `developed_screenshot_path` (TEXT) - Path to developed screenshot
- `diff_image_path` (TEXT) - Path to diff image
- `side_by_side_path` (TEXT) - Path to side-by-side image
- `metrics` (JSONB/TEXT) - Comparison metrics
- `discrepancies` (JSONB/TEXT) - List of discrepancies
- `enhanced_analysis` (JSONB/TEXT) - Enhanced analysis data
- `color_palettes` (JSONB/TEXT) - Color palette comparison
- `report_path` (TEXT) - Path to detailed report
- `settings` (JSONB/TEXT) - Comparison settings used
- `processing_time` (INTEGER) - Processing time in ms
- `error_message` (TEXT) - Error if failed
- `created_at` (TIMESTAMPTZ/TEXT)
- `completed_at` (TIMESTAMPTZ/TEXT)

## Database Adapters

### SQLiteAdapter
- Uses `better-sqlite3` for synchronous operations
- Database file: `./data/app.db` (default) or `DATABASE_URL`
- Converts Postgres types to SQLite equivalents:
  - UUID → TEXT with UUID generation function
  - JSONB → TEXT with JSON validation
  - TIMESTAMPTZ → TEXT (ISO8601)
  - BOOLEAN → INTEGER (0/1)
  - ENUM → TEXT with CHECK constraints

### SupabaseAdapter
- Uses Supabase JS client
- Requires `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Uses Row Level Security (RLS) for data isolation
- Supports transactions via Supabase RPC functions

## Migrations

### Migration Files
- Location: `supabase/migrations/*.sql`
- Format: Postgres SQL
- Auto-converted to SQLite-compatible SQL

### Migration Runner
- `src/database/migrations/MigrationRunner.js`
- Converts Postgres SQL to SQLite SQL
- Tracks applied migrations in `schema_migrations` table
- Runs automatically on server startup

### Running Migrations
```bash
# Run migrations manually
npm run db:migrate

# Migrate existing file-based data to database
npm run db:migrate-data
```

## Usage Examples

### Initialize Database
```javascript
import { initDatabase } from './src/database/init.js';

const services = await initDatabase({ userId: req.user?.id });
```

### Use Services
```javascript
// Create a comparison
const comparison = await services.comparisons.createComparison({
  figmaUrl: 'https://figma.com/file/xxx',
  webUrl: 'https://example.com',
  userId: req.user?.id
});

// Save a report
const report = await services.reports.generateAndSave(
  comparisonId,
  reportHtml,
  { title: 'My Report', format: 'html' }
);

// List comparisons
const comparisons = await services.comparisons.listComparisons({
  userId: req.user?.id,
  limit: 10
});
```

## Environment Variables

```bash
# Database Configuration
DATABASE_URL=file:./data/app.db  # SQLite path (local)
# OR
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
SUPABASE_ANON_KEY=xxx

# Deployment Mode (auto-detected if not set)
DEPLOYMENT_MODE=local|saas

# Credential Encryption
CREDENTIAL_ENCRYPTION_KEY=your-secure-key
LOCAL_CREDENTIAL_KEY=your-local-key
```

## Best Practices

1. **Always use services, not repositories directly** - Services handle business logic and validation
2. **Use transactions for multi-step operations** - Adapters support transactions
3. **Handle JSON fields properly** - Repositories automatically serialize/deserialize JSON
4. **Use filters in list operations** - Always filter by userId in multi-user scenarios
5. **Migrate data before switching modes** - Run `npm run db:migrate-data` before switching from file-based to database

