-- Migration: Add screenshot_results table
-- Adds table for screenshot comparison metadata

CREATE TABLE IF NOT EXISTS public.screenshot_results (
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_screenshot_results_user_id ON public.screenshot_results(user_id);
CREATE INDEX IF NOT EXISTS idx_screenshot_results_comparison_id ON public.screenshot_results(comparison_id);
CREATE INDEX IF NOT EXISTS idx_screenshot_results_status ON public.screenshot_results(status);

