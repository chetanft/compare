/**
 * Color Analytics API Routes
 * Provides endpoints for color-based element discovery and analytics
 */

import express from 'express';
import { colorElementMapping } from '../services/ColorElementMappingService.js';

const router = express.Router();

/**
 * GET /api/colors/analytics
 * Get comprehensive color analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const { color } = req.query;
    
    const analytics = colorElementMapping.getColorAnalytics(color);
    
    res.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Color analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get color analytics',
        code: 'COLOR_ANALYTICS_ERROR',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/colors/:color/elements
 * Get all elements using a specific color
 */
router.get('/:color/elements', async (req, res) => {
  try {
    const { color } = req.params;
    
    if (!color) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Color parameter is required',
          code: 'MISSING_COLOR_PARAMETER'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const elements = colorElementMapping.getElementsByColor(color);
    
    res.json({
      success: true,
      data: {
        color,
        elementCount: elements.length,
        elements
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get elements by color error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get elements by color',
        code: 'GET_ELEMENTS_BY_COLOR_ERROR',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/colors/elements/:elementId/colors
 * Get all colors used by a specific element
 */
router.get('/elements/:elementId/colors', async (req, res) => {
  try {
    const { elementId } = req.params;
    
    if (!elementId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Element ID parameter is required',
          code: 'MISSING_ELEMENT_ID_PARAMETER'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const colors = colorElementMapping.getColorsByElement(elementId);
    
    res.json({
      success: true,
      data: {
        elementId,
        colorCount: colors.length,
        colors
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get colors by element error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get colors by element',
        code: 'GET_COLORS_BY_ELEMENT_ERROR',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/colors/search
 * Search colors by criteria
 */
router.post('/search', async (req, res) => {
  try {
    const criteria = req.body || {};
    
    const results = colorElementMapping.searchColors(criteria);
    
    res.json({
      success: true,
      data: {
        criteria,
        resultCount: results.length,
        results
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Color search error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to search colors',
        code: 'COLOR_SEARCH_ERROR',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/colors/recommendations
 * Get color usage recommendations
 */
router.get('/recommendations', async (req, res) => {
  try {
    const recommendations = colorElementMapping.getColorRecommendations();
    
    res.json({
      success: true,
      data: recommendations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Color recommendations error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get color recommendations',
        code: 'COLOR_RECOMMENDATIONS_ERROR',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/colors/stats
 * Get color mapping service statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = colorElementMapping.getStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Color stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get color statistics',
        code: 'COLOR_STATS_ERROR',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/colors/export
 * Export color mapping data
 */
router.get('/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid format. Supported formats: json, csv',
          code: 'INVALID_FORMAT'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    const exportData = colorElementMapping.exportData(format);
    
    // Set appropriate headers for download
    const filename = `color-analytics-${new Date().toISOString().split('T')[0]}.${format}`;
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(exportData);
  } catch (error) {
    console.error('❌ Color export error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to export color data',
        code: 'COLOR_EXPORT_ERROR',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/colors/clear
 * Clear all color mapping data (useful for testing)
 */
router.post('/clear', async (req, res) => {
  try {
    const statsBeforeClear = colorElementMapping.getStats();
    
    colorElementMapping.clear();
    
    res.json({
      success: true,
      data: {
        message: 'Color mapping data cleared successfully',
        clearedStats: statsBeforeClear
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Color clear error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to clear color mapping data',
        code: 'COLOR_CLEAR_ERROR',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/colors/palette
 * Get all unique colors with usage counts
 */
router.get('/palette', async (req, res) => {
  try {
    const { limit = 50, sortBy = 'usage' } = req.query;
    
    const analytics = colorElementMapping.getColorAnalytics();
    
    let palette = analytics.colorBreakdown || [];
    
    // Sort by usage (elementCount) or alphabetically
    if (sortBy === 'usage') {
      palette = palette.sort((a, b) => b.elementCount - a.elementCount);
    } else if (sortBy === 'color') {
      palette = palette.sort((a, b) => a.color.localeCompare(b.color));
    }
    
    // Apply limit
    palette = palette.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        totalColors: analytics.totalColors,
        palette,
        sortBy,
        limit: parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Color palette error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get color palette',
        code: 'COLOR_PALETTE_ERROR',
        details: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
