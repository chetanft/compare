-- Supabase Database Schema
-- Figma-Web Comparison Tool

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS & AUTH
-- =============================================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- =============================================================================
-- SAVED CREDENTIALS (Encrypted)
-- =============================================================================

CREATE TABLE public.saved_credentials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  login_url TEXT,
  username_encrypted TEXT NOT NULL,
  password_vault_id TEXT NOT NULL, -- Reference to Supabase Vault secret
  notes TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.saved_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access own credentials
CREATE POLICY "Users can manage own credentials"
  ON public.saved_credentials FOR ALL
  USING (auth.uid() = user_id);

-- =============================================================================
-- COMPARISONS
-- =============================================================================

CREATE TYPE comparison_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE public.comparisons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  figma_url TEXT NOT NULL,
  web_url TEXT NOT NULL,
  credential_id UUID REFERENCES public.saved_credentials(id),
  status comparison_status DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  result JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.comparisons ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access own comparisons
CREATE POLICY "Users can manage own comparisons"
  ON public.comparisons FOR ALL
  USING (auth.uid() = user_id);

-- =============================================================================
-- DESIGN SYSTEMS (for FT-DS integration)
-- =============================================================================

CREATE TABLE public.design_systems (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_global BOOLEAN DEFAULT FALSE,
  tokens JSONB NOT NULL, -- { colors, typography, spacing, shadows, borderRadius }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.design_systems ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view global + own design systems
CREATE POLICY "Users can view accessible design systems"
  ON public.design_systems FOR SELECT
  USING (is_global = TRUE OR auth.uid() = user_id);

-- Policy: Users can manage own non-global design systems
CREATE POLICY "Users can manage own design systems"
  ON public.design_systems FOR ALL
  USING (auth.uid() = user_id AND is_global = FALSE);

-- =============================================================================
-- EXTRACTION CACHE
-- =============================================================================

CREATE TABLE public.extraction_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('figma', 'web')),
  data JSONB NOT NULL,
  hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cache lookups
CREATE INDEX idx_extraction_cache_url ON public.extraction_cache(source_url, source_type);
CREATE INDEX idx_extraction_cache_expires ON public.extraction_cache(expires_at);

-- Enable RLS (public read for caching)
ALTER TABLE public.extraction_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read cache
CREATE POLICY "Anyone can read cache"
  ON public.extraction_cache FOR SELECT
  USING (TRUE);

-- =============================================================================
-- REPORTS (for generated comparison reports)
-- =============================================================================

CREATE TABLE public.reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  comparison_id UUID REFERENCES public.comparisons(id),
  title TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('html', 'pdf', 'json', 'csv')),
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access own reports
CREATE POLICY "Users can manage own reports"
  ON public.reports FOR ALL
  USING (auth.uid() = user_id);

-- =============================================================================
-- SCREENSHOT RESULTS (for screenshot comparison metadata)
-- =============================================================================

CREATE TABLE public.screenshot_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  upload_id TEXT NOT NULL,
  comparison_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  figma_screenshot_path TEXT NOT NULL,
  developed_screenshot_path TEXT NOT NULL,
  diff_image_path TEXT,
  side_by_side_path TEXT,
  metrics JSONB,
  discrepancies JSONB,
  enhanced_analysis JSONB,
  color_palettes JSONB,
  report_path TEXT,
  settings JSONB,
  processing_time INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.screenshot_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access own screenshot results
CREATE POLICY "Users can manage own screenshot results"
  ON public.screenshot_results FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_comparisons_user_id ON public.comparisons(user_id);
CREATE INDEX idx_comparisons_status ON public.comparisons(status);
CREATE INDEX idx_comparisons_created_at ON public.comparisons(created_at DESC);
CREATE INDEX idx_saved_credentials_user_id ON public.saved_credentials(user_id);
CREATE INDEX idx_reports_user_id ON public.reports(user_id);
CREATE INDEX idx_reports_comparison_id ON public.reports(comparison_id);
CREATE INDEX idx_screenshot_results_user_id ON public.screenshot_results(user_id);
CREATE INDEX idx_screenshot_results_comparison_id ON public.screenshot_results(comparison_id);
CREATE INDEX idx_screenshot_results_status ON public.screenshot_results(status);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function: Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function: Clean expired cache
CREATE OR REPLACE FUNCTION public.clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.extraction_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
