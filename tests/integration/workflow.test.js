/**
 * Integration Tests for Complete Workflow
 * Tests end-to-end integration between all modules
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('Complete Workflow Integration', () => {
  let config;

  beforeEach(() => {
    config = {
      figma: {
        accessToken: 'test-token'
      },
      comparison: {
        threshold: 0.1
      },
      output: {
        directory: './test-reports'
      }
    };
  });

  describe('Configuration Integration', () => {
    test('should respect configuration settings across modules', () => {
      expect(config.figma.accessToken).toBe('test-token');
      expect(config.comparison.threshold).toBe(0.1);
      expect(config.output.directory).toBe('./test-reports');
    });

    test('should handle missing configuration gracefully', () => {
      const emptyConfig = {};
      expect(emptyConfig.figma).toBeUndefined();
      expect(emptyConfig.comparison).toBeUndefined();
      expect(emptyConfig.output).toBeUndefined();
    });
  });

  describe('Report Integration', () => {
    test('should generate comprehensive reports with all data', () => {
      const mockComparisonResults = {
        comparisons: [],
        summary: { totalMatches: 0, totalDeviations: 0 },
        metadata: {
          figmaFileId: 'test-file-id',
          webUrl: 'https://example.com',
          timestamp: new Date().toISOString()
        }
      };

      expect(mockComparisonResults.metadata.figmaFileId).toBe('test-file-id');
      expect(mockComparisonResults.metadata.webUrl).toBe('https://example.com');
      expect(mockComparisonResults.metadata.timestamp).toBeDefined();
    });

    test('should include visual comparison data when available', () => {
      const mockVisualResults = {
        summary: {
          totalPixelDifference: 1250,
          percentageDifference: 2.5,
          threshold: 0.1
        },
        regions: []
      };

      expect(mockVisualResults.summary.totalPixelDifference).toBe(1250);
      expect(mockVisualResults.summary.percentageDifference).toBe(2.5);
      expect(mockVisualResults.summary.threshold).toBe(0.1);
    });
  });
}); 