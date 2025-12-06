-- Seed script for Supabase database
-- Run this after migrations to populate initial data

-- Insert a sample global design system
INSERT INTO public.design_systems (id, name, slug, is_global, tokens, css_text, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Design System',
  'default',
  true,
  '{
    "colors": {
      "primary": "#0070f3",
      "secondary": "#7928ca",
      "success": "#17c964",
      "warning": "#f5a623",
      "error": "#e00"
    },
    "typography": {
      "fontFamilies": ["Inter", "system-ui", "sans-serif"],
      "fontSizes": [12, 14, 16, 18, 20, 24, 32, 48],
      "fontWeights": [400, 500, 600, 700]
    },
    "spacing": {
      "base": 8,
      "scale": [4, 8, 12, 16, 24, 32, 48, 64]
    },
    "shadows": {
      "sm": "0 1px 2px rgba(0,0,0,0.05)",
      "md": "0 4px 6px rgba(0,0,0,0.1)",
      "lg": "0 10px 15px rgba(0,0,0,0.1)"
    },
    "borderRadius": {
      "sm": "4px",
      "md": "8px",
      "lg": "12px",
      "full": "9999px"
    }
  }'::jsonb,
  '/* Default Design System CSS */
:root {
  --color-primary: #0070f3;
  --color-secondary: #7928ca;
  --color-success: #17c964;
  --color-warning: #f5a623;
  --color-error: #e00;
  
  --font-family: Inter, system-ui, sans-serif;
  --spacing-base: 8px;
  
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Create storage buckets if they don't exist (requires Supabase dashboard or API)
-- These should be created via Supabase dashboard:
-- - reports (public bucket)
-- - screenshots (public bucket)  
-- - design-systems (public bucket)

-- Note: Storage buckets must be created manually via Supabase dashboard
-- or using the Supabase Management API
