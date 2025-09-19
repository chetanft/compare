/**
 * Unit Tests for UnifiedFigmaExtractor
 * Tests the unified Figma extraction with MCP and API fallback
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UnifiedFigmaExtractor } from '../../../src/shared/extractors/UnifiedFigmaExtractor.js';
import { MockFigmaAPI, resetAllMocks } from '../../helpers/mockServices.js';

describe('UnifiedFigmaExtractor', () => {
  let figmaExtractor;
  let config;

  beforeEach(() => {
    config = global.testUtils.generateTestConfig();
    figmaExtractor = new UnifiedFigmaExtractor(config);
    MockFigmaAPI.setup();
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with valid config', () => {
      expect(figmaExtractor).toBeInstanceOf(UnifiedFigmaExtractor);
      expect(figmaExtractor.config).toEqual(config);
    });

    test('should initialize with empty config', () => {
      const extractor = new UnifiedFigmaExtractor({});
      expect(extractor).toBeInstanceOf(UnifiedFigmaExtractor);
      expect(extractor.config).toEqual({});
    });

    test('should initialize with default values when config is partial', () => {
      const partialConfig = { figma: { accessToken: 'test-token' } };
      const extractor = new UnifiedFigmaExtractor(partialConfig);
      expect(extractor.config.figma.accessToken).toBe('test-token');
    });
  });

  describe('Configuration Validation', () => {
    test('should accept valid configuration', () => {
      const validConfig = {
        figma: { accessToken: 'test-token' },
        comparison: { thresholds: { fontSize: 2 } }
      };
      const extractor = new UnifiedFigmaExtractor(validConfig);
      expect(extractor.config).toEqual(validConfig);
    });

    test('should handle missing figma config', () => {
      const configWithoutFigma = { comparison: { thresholds: {} } };
      const extractor = new UnifiedFigmaExtractor(configWithoutFigma);
      expect(extractor.config).toEqual(configWithoutFigma);
    });
  });

  describe('Utility Methods', () => {
    test('should have processDesignData method', () => {
      expect(typeof figmaExtractor.processDesignData).toBe('function');
    });

    test('should have extractDesignData method', () => {
      expect(typeof figmaExtractor.extractDesignData).toBe('function');
    });

    test('should have initialize method', () => {
      expect(typeof figmaExtractor.initialize).toBe('function');
    });
  });

  describe('Data Processing', () => {
    test('should process mock design data correctly', async () => {
      const mockData = {
        document: {
          id: 'test-document',
          name: 'Test Document',
          type: 'DOCUMENT',
          children: [
            {
              id: 'test-frame',
              name: 'Test Frame',
              type: 'FRAME',
              children: []
            }
          ]
        }
      };

      const result = await figmaExtractor.processDesignData(mockData, 'test-file-id');
      
      expect(result).toHaveProperty('fileId', 'test-file-id');
      expect(result).toHaveProperty('components');
      expect(Array.isArray(result.components)).toBe(true);
    });

    test('should handle empty document', async () => {
      const mockData = {
        document: {
          id: 'empty-document',
          name: 'Empty Document',
          type: 'DOCUMENT',
          children: []
        }
      };

      const result = await figmaExtractor.processDesignData(mockData, 'empty-file-id');
      
      expect(result).toHaveProperty('fileId', 'empty-file-id');
      expect(result.components).toEqual([]);
    });
  });

  describe('Component Processing', () => {
    test('should process frame components', async () => {
      const mockData = {
        document: {
          id: 'test-document',
          name: 'Test Document',
          type: 'DOCUMENT',
          children: [
            {
              id: 'test-frame',
              name: 'Test Frame',
              type: 'FRAME',
              backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
              children: []
            }
          ]
        }
      };

      const result = await figmaExtractor.processDesignData(mockData);
      
      expect(result.components).toHaveLength(1);
      expect(result.components[0]).toHaveProperty('type', 'FRAME');
      expect(result.components[0]).toHaveProperty('name', 'Test Frame');
    });

    test('should handle components with properties', async () => {
      const mockData = {
        document: {
          id: 'test-document',
          name: 'Test Document',
          type: 'DOCUMENT',
          children: [
            {
              id: 'test-text',
              name: 'Test Text',
              type: 'TEXT',
              style: {
                fontFamily: 'Inter',
                fontSize: 16
              },
              fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }]
            }
          ]
        }
      };

      const result = await figmaExtractor.processDesignData(mockData);
      
      expect(result.components).toHaveLength(1);
      expect(result.components[0]).toHaveProperty('properties');
      expect(result.components[0].properties).toBeInstanceOf(Object);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid data gracefully', async () => {
      const invalidData = { invalid: 'data' };
      
      const result = await figmaExtractor.processDesignData(invalidData);
      
      expect(result).toHaveProperty('components');
      expect(result.components).toEqual([]);
    });

    test('should handle null document', async () => {
      const nullDocumentData = { document: null };
      
      const result = await figmaExtractor.processDesignData(nullDocumentData);
      
      expect(result).toHaveProperty('components');
      expect(result.components).toEqual([]);
    });
  });

  describe('Data Validation', () => {
    test('should return proper data structure', async () => {
      const mockData = {
        document: {
          id: 'test-document',
          name: 'Test Document',
          type: 'DOCUMENT',
          children: [
            {
              id: 'test-component',
              name: 'Test Component',
              type: 'RECTANGLE'
            }
          ]
        }
      };

      const result = await figmaExtractor.processDesignData(mockData, 'test-file');
      
      expect(result).toHaveProperty('fileId');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('extractedAt');
      expect(typeof result.extractedAt).toBe('string');
    });

    test('should validate component structure', async () => {
      const mockData = {
        document: {
          id: 'test-document',
          name: 'Test Document',
          type: 'DOCUMENT',
          children: [
            {
              id: 'test-component',
              name: 'Test Component',
              type: 'RECTANGLE'
            }
          ]
        }
      };

      const result = await figmaExtractor.processDesignData(mockData);
      
      if (result.components.length > 0) {
        const component = result.components[0];
        expect(component).toHaveProperty('id');
        expect(component).toHaveProperty('name');
        expect(component).toHaveProperty('type');
        expect(component).toHaveProperty('properties');
      }
    });
  });
}); 