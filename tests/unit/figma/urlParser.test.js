/**
 * Unit Tests for FigmaUrlParser
 * Tests URL parsing functionality for Figma URLs
 */

import { describe, test, expect } from '@jest/globals';
import FigmaUrlParser from '../../../src/figma/urlParser.js';

describe('FigmaUrlParser', () => {
  describe('parseUrl', () => {
    test('should parse standard Figma design URL', () => {
      const url = 'https://www.figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys?node-id=2-22260&t=O0660yrD8pUZ4JYU-4';
      const result = FigmaUrlParser.parseUrl(url);

      expect(result).toEqual({
        fileId: 'fb5Yc1aKJv9YWsMLnNlWeK',
        nodeId: '2:22260',
        fileName: 'My-Journeys',
        urlType: 'design',
        originalUrl: url
      });
    });

    test('should parse Figma file URL without node ID', () => {
      const url = 'https://www.figma.com/file/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys';
      const result = FigmaUrlParser.parseUrl(url);

      expect(result).toEqual({
        fileId: 'fb5Yc1aKJv9YWsMLnNlWeK',
        nodeId: null,
        fileName: 'My-Journeys',
        urlType: 'file',
        originalUrl: url
      });
    });

    test('should parse Figma proto URL', () => {
      const url = 'https://www.figma.com/proto/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys?node-id=2-22260';
      const result = FigmaUrlParser.parseUrl(url);

      expect(result).toEqual({
        fileId: 'fb5Yc1aKJv9YWsMLnNlWeK',
        nodeId: '2:22260',
        fileName: 'My-Journeys',
        urlType: 'prototype',
        originalUrl: url
      });
    });

    test('should parse URL with encoded characters in file name', () => {
      const url = 'https://www.figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My%20Journeys%20-%20Test?node-id=2-22260';
      const result = FigmaUrlParser.parseUrl(url);

      expect(result).toEqual({
        fileId: 'fb5Yc1aKJv9YWsMLnNlWeK',
        nodeId: '2:22260',
        fileName: 'My Journeys - Test',
        urlType: 'design',
        originalUrl: url
      });
    });

    test('should parse URL with complex node ID format', () => {
      const url = 'https://www.figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys?node-id=123%3A456&t=abc123def456-1';
      const result = FigmaUrlParser.parseUrl(url);

      expect(result).toEqual({
        fileId: 'fb5Yc1aKJv9YWsMLnNlWeK',
        nodeId: '123:456',
        fileName: 'My-Journeys',
        urlType: 'design',
        originalUrl: url
      });
    });

    test('should handle URLs with additional query parameters', () => {
      const url = 'https://www.figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys?node-id=2-22260&t=O0660yrD8pUZ4JYU-4&scaling=min-zoom&page-id=0%3A1';
      const result = FigmaUrlParser.parseUrl(url);

      expect(result).toEqual({
        fileId: 'fb5Yc1aKJv9YWsMLnNlWeK',
        nodeId: '2:22260',
        fileName: 'My-Journeys',
        urlType: 'design',
        originalUrl: url,
        pageId: '0:1',
        scaling: 'min-zoom'
      });
    });

    test('should handle URLs without file name', () => {
      const url = 'https://www.figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/?node-id=2-22260';
      const result = FigmaUrlParser.parseUrl(url);

      expect(result).toEqual({
        fileId: 'fb5Yc1aKJv9YWsMLnNlWeK',
        nodeId: '2:22260',
        fileName: '',
        urlType: 'design',
        originalUrl: url
      });
    });
  });

  describe('Error Handling', () => {
    test('should throw error for invalid URL format', () => {
      const invalidUrl = 'https://example.com/not-figma';
      
      expect(() => {
        FigmaUrlParser.parseUrl(invalidUrl);
      }).toThrow('Invalid Figma URL. Must be a figma.com URL.');
    });

    test('should throw error for missing file ID', () => {
      const invalidUrl = 'https://www.figma.com/design/';
      
      expect(() => {
        FigmaUrlParser.parseUrl(invalidUrl);
      }).toThrow('Could not extract file ID from URL');
    });

    test('should throw error for malformed URL', () => {
      const invalidUrl = 'not-a-url';
      
      expect(() => {
        FigmaUrlParser.parseUrl(invalidUrl);
      }).toThrow('Invalid Figma URL. Must be a figma.com URL.');
    });

    test('should throw error for empty string', () => {
      expect(() => {
        FigmaUrlParser.parseUrl('');
      }).toThrow('Invalid URL provided');
    });

    test('should throw error for null or undefined', () => {
      expect(() => {
        FigmaUrlParser.parseUrl(null);
      }).toThrow('Invalid URL provided');

      expect(() => {
        FigmaUrlParser.parseUrl(undefined);
      }).toThrow('Invalid URL provided');
    });
  });

  describe('Edge Cases', () => {
    test('should handle URLs with different domains', () => {
      const url = 'https://figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys?node-id=2-22260';
      const result = FigmaUrlParser.parseUrl(url);

      expect(result.fileId).toBe('fb5Yc1aKJv9YWsMLnNlWeK');
    });

    test('should handle URLs with trailing slashes', () => {
      const url = 'https://www.figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys/?node-id=2-22260';
      const result = FigmaUrlParser.parseUrl(url);

      expect(result.fileId).toBe('fb5Yc1aKJv9YWsMLnNlWeK');
      expect(result.fileName).toBe('My-Journeys');
    });

    test('should handle URLs with hash fragments', () => {
      const url = 'https://www.figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys?node-id=2-22260#section';
      const result = FigmaUrlParser.parseUrl(url);

      expect(result.fileId).toBe('fb5Yc1aKJv9YWsMLnNlWeK');
      expect(result.nodeId).toBe('2:22260');
    });

    test('should handle very long file IDs', () => {
      const longFileId = 'a'.repeat(50);
      const url = `https://www.figma.com/design/${longFileId}/My-Journeys?node-id=2-22260`;
      const result = FigmaUrlParser.parseUrl(url);

      expect(result.fileId).toBe(longFileId);
    });

    test('should handle special characters in file names', () => {
      const url = 'https://www.figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys-2024-@#$%?node-id=2-22260';
      const result = FigmaUrlParser.parseUrl(url);

      expect(result.fileName).toBe('My-Journeys-2024-@');
    });
  });

  describe('Utility Methods', () => {
    test('should validate Figma URLs correctly', () => {
      const validUrls = [
        'https://www.figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys',
        'https://www.figma.com/file/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys',
        'https://www.figma.com/proto/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys',
        'https://figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys'
      ];

      const invalidUrls = [
        'https://example.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys',
        'not-a-url',
        ''
      ];

      validUrls.forEach(url => {
        expect(FigmaUrlParser.isFigmaUrl(url)).toBe(true);
      });

      invalidUrls.forEach(url => {
        expect(FigmaUrlParser.isFigmaUrl(url)).toBe(false);
      });
    });

    test('should extract file ID from URL', () => {
      const pathname = '/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys';
      const fileId = FigmaUrlParser.extractFileId(pathname);

      expect(fileId).toBe('fb5Yc1aKJv9YWsMLnNlWeK');
    });

    test('should extract node ID from URL', () => {
      const searchParams = new URLSearchParams('node-id=2-22260&t=abc123');
      const nodeId = FigmaUrlParser.extractNodeId(searchParams);

      expect(nodeId).toBe('2:22260');
    });

    test('should return null for missing node ID', () => {
      const searchParams = new URLSearchParams('t=abc123');
      const nodeId = FigmaUrlParser.extractNodeId(searchParams);

      expect(nodeId).toBeNull();
    });
  });

  describe('Performance', () => {
    test('should parse URLs efficiently', () => {
      const url = 'https://www.figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys?node-id=2-22260&t=O0660yrD8pUZ4JYU-4';
      
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        FigmaUrlParser.parseUrl(url);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete 1000 parses in under 100ms
    });

    test('should handle concurrent parsing', async () => {
      const urls = Array.from({ length: 100 }, (_, i) => 
        `https://www.figma.com/design/fb5Yc1aKJv9YWsMLnNlWeK/My-Journeys-${i}?node-id=2-${i}`
      );

      const startTime = Date.now();
      const results = await Promise.all(urls.map(url => 
        Promise.resolve(FigmaUrlParser.parseUrl(url))
      ));
      const endTime = Date.now();

      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(50); // Should complete in under 50ms
      
      results.forEach((result, index) => {
        expect(result.fileName).toBe(`My-Journeys-${index}`);
        expect(result.nodeId).toBe(`2:${index}`);
      });
    });
  });
}); 