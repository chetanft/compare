# Design Systems Guide

## Overview

Design systems allow you to store design tokens (colors, typography, spacing, etc.) and CSS that can be used as context during comparisons.

## Creating a Design System

1. Go to Settings → Design Systems
2. Click "Add Design System"
3. Fill in:
   - **Name**: Display name
   - **Slug**: URL-friendly identifier (auto-generated from name)
   - **Design Tokens**: JSON object with your tokens
   - **CSS**: Upload file or paste inline CSS

## Design Tokens Format

```json
{
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
}
```

## CSS Storage

### Inline CSS (Small Files)
- Stored directly in database (`css_text` column)
- Good for CSS < 10KB
- Accessed via `/api/design-systems/:id/css`

### External CSS (Large Files)
- Uploaded to Supabase Storage
- URL stored in `css_url` column
- Good for CSS > 10KB or external CDN URLs

## Using Design Systems in Comparisons

Design systems are automatically used when:
1. A design system is marked as "active" (future feature)
2. Comparison engine references stored tokens for thresholds
3. CSS is injected into comparison reports

## Figma Integration

Design systems can be linked to Figma files:
- **Figma File Key**: Extracted from Figma URL
- **Figma Node ID**: Specific component/node ID

This allows importing design tokens directly from Figma MCP responses.

## Global Design Systems

Global design systems are available to all users (SaaS mode only):
- Created by admins
- Cannot be edited by regular users
- Useful for organization-wide design standards
