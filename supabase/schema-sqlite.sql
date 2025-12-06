-- SQLite Database Schema
-- Mirrors Supabase Postgres schema for local desktop mode
-- Figma-Web Comparison Tool

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- =============================================================================
-- USERS & AUTH (Local mode: single user, no auth table needed)
-- =============================================================================

-- User profiles (simplified for local mode)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SAVED CREDENTIALS (Encrypted)
-- =============================================================================

CREATE TABLE IF NOT EXISTS saved_credentials (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT REFERENCES profiles(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  login_url TEXT,
  username_encrypted TEXT NOT NULL,
  password_vault_id TEXT NOT NULL, -- For local mode, stores encrypted password directly
  notes TEXT,
  last_used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- COMPARISONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS comparisons (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT REFERENCES profiles(id),
  figma_url TEXT NOT NULL,
  web_url TEXT NOT NULL,
  credential_id TEXT REFERENCES saved_credentials(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  result TEXT, -- JSON stored as TEXT (SQLite doesn't have JSONB)
  error_message TEXT,
  duration_ms INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

-- =============================================================================
-- DESIGN SYSTEMS (for FT-DS integration)
-- =============================================================================

CREATE TABLE IF NOT EXISTS design_systems (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT REFERENCES profiles(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_global INTEGER DEFAULT 0 CHECK (is_global IN (0, 1)), -- BOOLEAN as INTEGER
  tokens TEXT NOT NULL, -- JSON stored as TEXT
  css_url TEXT,
  css_text TEXT,
  figma_file_key TEXT,
  figma_node_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- EXTRACTION CACHE
-- =============================================================================

CREATE TABLE IF NOT EXISTS extraction_cache (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('figma', 'web')),
  data TEXT NOT NULL, -- JSON stored as TEXT
  hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- REPORTS (for generated comparison reports)
-- =============================================================================

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT REFERENCES profiles(id),
  comparison_id TEXT REFERENCES comparisons(id),
  title TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('html', 'pdf', 'json', 'csv')),
  storage_path TEXT NOT NULL, -- Path in local filesystem or Supabase Storage
  file_size INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SCREENSHOT RESULTS (NEW - missing from current schema)
-- =============================================================================

CREATE TABLE IF NOT EXISTS screenshot_results (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
  user_id TEXT REFERENCES profiles(id),
  upload_id TEXT NOT NULL,
  comparison_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  figma_screenshot_path TEXT NOT NULL,
  developed_screenshot_path TEXT NOT NULL,
  diff_image_path TEXT,
  side_by_side_path TEXT,
  metrics TEXT, -- JSON stored as TEXT
  discrepancies TEXT, -- JSON stored as TEXT
  enhanced_analysis TEXT, -- JSON stored as TEXT
  color_palettes TEXT, -- JSON stored as TEXT
  report_path TEXT,
  settings TEXT, -- JSON stored as TEXT (comparison settings)
  processing_time INTEGER,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_comparisons_user_id ON comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_status ON comparisons(status);
CREATE INDEX IF NOT EXISTS idx_comparisons_created_at ON comparisons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_credentials_user_id ON saved_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_comparison_id ON reports(comparison_id);
CREATE INDEX IF NOT EXISTS idx_design_systems_user_id ON design_systems(user_id);
CREATE INDEX IF NOT EXISTS idx_design_systems_slug ON design_systems(slug);
CREATE INDEX IF NOT EXISTS idx_design_systems_figma_file_key ON design_systems(figma_file_key);
CREATE INDEX IF NOT EXISTS idx_extraction_cache_url ON extraction_cache(source_url, source_type);
CREATE INDEX IF NOT EXISTS idx_extraction_cache_expires ON extraction_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_screenshot_results_user_id ON screenshot_results(user_id);
CREATE INDEX IF NOT EXISTS idx_screenshot_results_comparison_id ON screenshot_results(comparison_id);
CREATE INDEX IF NOT EXISTS idx_screenshot_results_status ON screenshot_results(status);

-- =============================================================================
-- SCHEMA MIGRATIONS TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP
);

