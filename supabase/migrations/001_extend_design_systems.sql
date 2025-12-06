-- Migration: Extend design_systems table with CSS support
-- Adds columns for CSS storage (URL and inline text) and Figma integration

-- Add CSS-related columns
ALTER TABLE public.design_systems 
ADD COLUMN IF NOT EXISTS css_url TEXT,
ADD COLUMN IF NOT EXISTS css_text TEXT,
ADD COLUMN IF NOT EXISTS figma_file_key TEXT,
ADD COLUMN IF NOT EXISTS figma_node_id TEXT;

-- Add index for figma_file_key lookups
CREATE INDEX IF NOT EXISTS idx_design_systems_figma_file_key 
ON public.design_systems(figma_file_key);

-- Add index for slug lookups (already unique, but index helps)
CREATE INDEX IF NOT EXISTS idx_design_systems_slug 
ON public.design_systems(slug);

-- Add comment to table
COMMENT ON TABLE public.design_systems IS 'Design systems with tokens, CSS, and optional Figma integration';
COMMENT ON COLUMN public.design_systems.css_url IS 'URL to CSS file in Supabase Storage or external CDN';
COMMENT ON COLUMN public.design_systems.css_text IS 'Inline CSS text (for small CSS files)';
COMMENT ON COLUMN public.design_systems.figma_file_key IS 'Figma file key for design system source';
COMMENT ON COLUMN public.design_systems.figma_node_id IS 'Figma node ID for design system component';
