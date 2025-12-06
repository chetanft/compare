# Architecture Overview

## Unified Database Architecture

The application uses a unified database architecture that supports both SQLite (desktop) and Supabase Postgres (SaaS) modes through a repository/service abstraction layer.

### Database Adapters

- **SQLiteAdapter**: Uses `better-sqlite3` for local desktop mode
- **SupabaseAdapter**: Uses Supabase JS client for SaaS mode

### Deployment Mode Detection

- Auto-detects based on environment:
  - **SQLite (local)**: Default for desktop, uses `DATABASE_URL` or `./data/app.db`
  - **Supabase (saas)**: When `SUPABASE_URL` is set and `VERCEL=1` or explicit `DEPLOYMENT_MODE=saas`

### Schema

Unified schema covering all entities:
- `profiles` - User profiles
- `saved_credentials` - Encrypted credentials
- `comparisons` - Comparison jobs with status tracking
- `design_systems` - Design tokens and CSS
- `extraction_cache` - Cached extraction results
- `reports` - Report metadata
- `screenshot_results` - Screenshot comparison metadata

### Migrations

- Migration files in `supabase/migrations/*.sql` (Postgres)
- Automatically converted to SQLite-compatible SQL
- Run on server startup via `MigrationRunner`
- Tracked in `schema_migrations` table

### Repository Layer

Repositories provide unified CRUD operations:
- `ComparisonRepository` - Comparison management
- `ReportRepository` - Report metadata
- `CredentialRepository` - Credential CRUD
- `DesignSystemRepository` - Design system management
- `ScreenshotRepository` - Screenshot results
- `CacheRepository` - Extraction cache

### Service Layer

Services wrap repositories with business logic:
- `ComparisonService` - Comparison operations
- `ReportService` - Report generation + storage coordination
- `CredentialService` - Credential encryption/decryption
- `DesignSystemService` - Design system operations
- `ScreenshotService` - Screenshot comparison orchestration

## Storage Abstraction Layer

The application uses a unified storage abstraction that supports both local filesystem (desktop) and Supabase (SaaS) storage modes.

### Storage Providers

- **LocalStorageProvider**: Stores data in local filesystem (`output/` directory)
- **SupabaseStorageProvider**: Stores data in Supabase (tables + Storage buckets)

### Storage Mode Detection

- Desktop: Checks for `SUPABASE_URL` env var
  - If present: Optional Supabase sync mode
  - If absent: Local filesystem only
- SaaS: Always uses Supabase storage

### Supported Operations

- Reports: Save, retrieve, list, delete
- Screenshots: Upload, retrieve URLs
- Design Systems: CRUD operations with CSS support
- Credentials: Encrypted storage with Supabase Vault

## Authentication

### Desktop Mode
- Optional Supabase authentication
- When configured, users can sign in to sync data
- Session persisted locally

### SaaS Mode
- Required Supabase authentication
- All operations scoped to authenticated user
- RLS policies enforce data isolation

## MCP Integration

### Local MCP (Desktop)
- Connects to Figma Desktop App's MCP server
- Default: `http://127.0.0.1:3845/mcp`
- No authentication required

### Remote MCP (SaaS)
- Connects to Figma's remote MCP service
- Default: `https://mcp.figma.com/mcp`
- Requires Figma Personal Access Token
- Token stored securely (Supabase Vault or env var)

## Design Systems

### Storage
- Design tokens stored as JSONB in database
- CSS can be stored inline (`css_text`) or in Storage (`css_url`)
- Supports Figma integration (file key + node ID)

### Usage
- Design systems provide context for comparisons
- Tokens used for threshold calculations
- CSS can be served via `/api/design-systems/:id/css`

## Credentials Vault

### Encryption
- Username: Encrypted with AES-256-GCM
- Password: Stored in Supabase Vault (preferred) or encrypted column
- Master key derived from environment or user session

### Features
- CRUD operations with RLS
- Auto-fill in comparison forms
- Last used tracking
- Secure server-side decryption

## Report Persistence

### Unified Storage
- **Desktop Mode**: Reports saved to `output/reports/` + metadata in SQLite
- **SaaS Mode**: Reports saved to Supabase Storage bucket `reports` + metadata in Postgres
- All reports accessed via `ReportService` which coordinates storage + database
- Metadata includes: id, userId, comparisonId, title, format, storagePath, fileSize, createdAt

### Migration
- Existing reports can be migrated via `npm run db:migrate-data`
- Script reads `output/reports/*.html` and creates database records

## Screenshot Comparison

### Unified Storage
- **Desktop Mode**: Screenshots saved to `output/screenshots/` + metadata in SQLite
- **SaaS Mode**: Screenshots saved to Supabase Storage bucket `screenshots` + metadata in Postgres
- Metadata stored in `screenshot_results` table with full comparison results
- Includes: metrics, discrepancies, enhancedAnalysis, colorPalettes, settings

### Processing
- Images processed server-side via `ScreenshotComparisonService`
- Results automatically saved to database via `ScreenshotService`
- Can be queried via repository layer

## Data Migration

### Migrating Existing Data
Run `npm run db:migrate-data` to migrate:
- Reports from `output/reports/` → database
- Credentials from `output/credentials/` → database
- Design systems from `output/design-systems/` → database
- Screenshot results from `output/screenshots/comparisons/` → database
- Comparison snapshots from `output/snapshots/` → database

### Migration Commands
- `npm run db:migrate` - Run schema migrations
- `npm run db:migrate-data` - Migrate existing file-based data to database
- `npm run db:seed` - Seed database with initial data (if implemented)
