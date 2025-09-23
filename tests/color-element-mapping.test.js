/**
 * Tests for Color Element Mapping Service
 * Verifies bidirectional color-element associations and analytics
 */

import { ColorElementMappingService } from '../src/services/ColorElementMappingService.js';

describe('ColorElementMappingService', () => {
  let service;

  beforeEach(() => {
    service = new ColorElementMappingService();
  });

  afterEach(() => {
    service.clear();
  });

  describe('Basic Color-Element Association', () => {
    test('should add color-element association', () => {
      const element = {
        id: 'test-element-1',
        name: 'Test Button',
        type: 'BUTTON'
      };

      service.addColorElementAssociation('#ff0000', element, 'background', 'figma');

      const elements = service.getElementsByColor('#ff0000');
      expect(elements).toHaveLength(1);
      expect(elements[0].elementDetails.name).toBe('Test Button');
      expect(elements[0].colorType).toBe('background');
      expect(elements[0].source).toBe('figma');
    });

    test('should handle multiple elements with same color', () => {
      const element1 = { id: 'elem1', name: 'Button 1', type: 'BUTTON' };
      const element2 = { id: 'elem2', name: 'Button 2', type: 'BUTTON' };

      service.addColorElementAssociation('#ff0000', element1, 'background', 'figma');
      service.addColorElementAssociation('#ff0000', element2, 'background', 'web');

      const elements = service.getElementsByColor('#ff0000');
      expect(elements).toHaveLength(2);
      
      const sources = elements.map(e => e.source);
      expect(sources).toContain('figma');
      expect(sources).toContain('web');
    });

    test('should handle element with multiple colors', () => {
      const element = {
        id: 'multi-color-element',
        name: 'Complex Button',
        type: 'BUTTON'
      };

      service.addColorElementAssociation('#ff0000', element, 'background', 'figma');
      service.addColorElementAssociation('#00ff00', element, 'text', 'figma');
      service.addColorElementAssociation('#0000ff', element, 'border', 'figma');

      const colors = service.getColorsByElement('multi-color-element');
      expect(colors).toHaveLength(3);
      
      const colorValues = colors.map(c => c.color);
      expect(colorValues).toContain('#ff0000');
      expect(colorValues).toContain('#00ff00');
      expect(colorValues).toContain('#0000ff');
    });
  });

  describe('Color Normalization', () => {
    test('should normalize RGB colors to hex', () => {
      const element = { id: 'test', name: 'Test', type: 'DIV' };
      
      service.addColorElementAssociation('rgb(255, 0, 0)', element, 'background', 'web');
      
      const elements = service.getElementsByColor('#ff0000');
      expect(elements).toHaveLength(1);
    });

    test('should normalize color case', () => {
      const element = { id: 'test', name: 'Test', type: 'DIV' };
      
      service.addColorElementAssociation('#FF0000', element, 'background', 'web');
      
      const elements = service.getElementsByColor('#ff0000');
      expect(elements).toHaveLength(1);
    });

    test('should handle named colors', () => {
      const element = { id: 'test', name: 'Test', type: 'DIV' };
      
      service.addColorElementAssociation('red', element, 'background', 'web');
      
      const elements = service.getElementsByColor('#ff0000');
      expect(elements).toHaveLength(1);
    });
  });

  describe('Analytics', () => {
    beforeEach(() => {
      // Set up test data
      const elements = [
        { id: 'elem1', name: 'Button 1', type: 'BUTTON' },
        { id: 'elem2', name: 'Button 2', type: 'BUTTON' },
        { id: 'elem3', name: 'Text 1', type: 'TEXT' }
      ];

      service.addColorElementAssociation('#ff0000', elements[0], 'background', 'figma');
      service.addColorElementAssociation('#ff0000', elements[1], 'background', 'web');
      service.addColorElementAssociation('#00ff00', elements[2], 'text', 'figma');
    });

    test('should provide comprehensive analytics', () => {
      const analytics = service.getColorAnalytics();

      expect(analytics.totalColors).toBe(2);
      expect(analytics.totalElements).toBe(3);
      expect(analytics.colorBreakdown).toHaveLength(2);
      
      const redColor = analytics.colorBreakdown.find(c => c.color === '#ff0000');
      expect(redColor.elementCount).toBe(2);
      expect(redColor.stats.sources).toContain('figma');
      expect(redColor.stats.sources).toContain('web');
    });

    test('should provide single color analytics', () => {
      const analytics = service.getColorAnalytics('#ff0000');

      expect(analytics.color).toBe('#ff0000');
      expect(analytics.totalElements).toBe(2);
      expect(analytics.usageBreakdown.bySource.figma).toBe(1);
      expect(analytics.usageBreakdown.bySource.web).toBe(1);
    });

    test('should provide source breakdown', () => {
      const analytics = service.getColorAnalytics();
      
      expect(analytics.sourceBreakdown.figma).toBe(2);
      expect(analytics.sourceBreakdown.web).toBe(1);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      // Set up varied test data
      const elements = [
        { id: 'elem1', name: 'Button', type: 'BUTTON' },
        { id: 'elem2', name: 'Text', type: 'TEXT' },
        { id: 'elem3', name: 'Icon', type: 'ICON' }
      ];

      service.addColorElementAssociation('#ff0000', elements[0], 'background', 'figma');
      service.addColorElementAssociation('#ff0000', elements[1], 'text', 'figma');
      service.addColorElementAssociation('#00ff00', elements[2], 'fill', 'web');
      service.addColorElementAssociation('#0000ff', elements[0], 'border', 'web');
    });

    test('should search by element count range', () => {
      const results = service.searchColors({
        minElementCount: 2,
        maxElementCount: 10
      });

      expect(results).toHaveLength(1);
      expect(results[0].color).toBe('#ff0000');
    });

    test('should filter by source', () => {
      const results = service.searchColors({
        source: 'web'
      });

      expect(results).toHaveLength(2);
      const colors = results.map(r => r.color);
      expect(colors).toContain('#00ff00');
      expect(colors).toContain('#0000ff');
    });

    test('should filter by color type', () => {
      const results = service.searchColors({
        colorType: 'background'
      });

      expect(results).toHaveLength(1);
      expect(results[0].color).toBe('#ff0000');
    });

    test('should filter by element type', () => {
      const results = service.searchColors({
        elementType: 'BUTTON'
      });

      expect(results).toHaveLength(2);
      const colors = results.map(r => r.color);
      expect(colors).toContain('#ff0000');
      expect(colors).toContain('#0000ff');
    });
  });

  describe('Recommendations', () => {
    test('should identify overused colors', () => {
      // Create many elements with the same color
      for (let i = 0; i < 15; i++) {
        const element = { id: `elem${i}`, name: `Element ${i}`, type: 'DIV' };
        service.addColorElementAssociation('#ff0000', element, 'background', 'web');
      }

      const recommendations = service.getColorRecommendations();
      
      expect(recommendations.recommendations).toHaveLength(1);
      expect(recommendations.recommendations[0].type).toBe('overuse');
      expect(recommendations.recommendations[0].colors).toContain('#ff0000');
    });

    test('should identify single-use colors', () => {
      // Create many single-use colors
      for (let i = 0; i < 10; i++) {
        const element = { id: `elem${i}`, name: `Element ${i}`, type: 'DIV' };
        const color = `#${i.toString().padStart(6, '0')}`;
        service.addColorElementAssociation(color, element, 'background', 'web');
      }

      const recommendations = service.getColorRecommendations();
      
      const singleUseRec = recommendations.recommendations.find(r => r.type === 'single-use');
      expect(singleUseRec).toBeDefined();
    });
  });

  describe('Data Export', () => {
    beforeEach(() => {
      const element = { id: 'test', name: 'Test Element', type: 'BUTTON' };
      service.addColorElementAssociation('#ff0000', element, 'background', 'figma');
    });

    test('should export JSON data', () => {
      const exported = service.exportData('json');
      const data = JSON.parse(exported);

      expect(data.metadata).toBeDefined();
      expect(data.analytics).toBeDefined();
      expect(data.recommendations).toBeDefined();
      expect(data.metadata.totalColors).toBe(1);
    });

    test('should export CSV data', () => {
      const exported = service.exportData('csv');
      
      expect(exported).toContain('Color,Element Count,Sources,Color Types,Elements');
      expect(exported).toContain('#ff0000');
      expect(exported).toContain('figma');
    });
  });

  describe('Service Statistics', () => {
    test('should provide accurate statistics', () => {
      const element1 = { id: 'elem1', name: 'Element 1', type: 'BUTTON' };
      const element2 = { id: 'elem2', name: 'Element 2', type: 'TEXT' };

      service.addColorElementAssociation('#ff0000', element1, 'background', 'figma');
      service.addColorElementAssociation('#ff0000', element2, 'text', 'figma');
      service.addColorElementAssociation('#00ff00', element1, 'border', 'web');

      const stats = service.getStats();

      expect(stats.totalColors).toBe(2);
      expect(stats.totalElements).toBe(2);
      expect(stats.totalColorAssociations).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    test('should handle invalid color values gracefully', () => {
      const element = { id: 'test', name: 'Test', type: 'DIV' };
      
      service.addColorElementAssociation('invalid-color', element, 'background', 'web');
      service.addColorElementAssociation('', element, 'text', 'web');
      service.addColorElementAssociation(null, element, 'border', 'web');

      // Should normalize all invalid colors to default
      const elements = service.getElementsByColor('#000000');
      expect(elements.length).toBeGreaterThan(0);
    });

    test('should handle empty analytics requests', () => {
      const analytics = service.getColorAnalytics();
      
      expect(analytics.totalColors).toBe(0);
      expect(analytics.totalElements).toBe(0);
      expect(analytics.colorBreakdown).toHaveLength(0);
    });

    test('should handle non-existent color queries', () => {
      const elements = service.getElementsByColor('#nonexistent');
      expect(elements).toHaveLength(0);
    });

    test('should handle non-existent element queries', () => {
      const colors = service.getColorsByElement('non-existent-element');
      expect(colors).toHaveLength(0);
    });
  });
});

// Integration test with mock API
describe('Color Analytics API Integration', () => {
  let service;

  beforeEach(() => {
    service = new ColorElementMappingService();
    
    // Mock data setup
    const figmaElement = {
      id: 'figma-button-1',
      name: 'Primary Button',
      type: 'BUTTON',
      properties: {
        width: 120,
        height: 40
      }
    };

    const webElement = {
      id: 'web-button-1',
      name: '.btn-primary',
      type: 'button',
      className: 'btn btn-primary',
      selector: 'button.btn-primary'
    };

    service.addColorElementAssociation('#007bff', figmaElement, 'background', 'figma');
    service.addColorElementAssociation('#007bff', webElement, 'background', 'web');
    service.addColorElementAssociation('#ffffff', figmaElement, 'text', 'figma');
    service.addColorElementAssociation('#ffffff', webElement, 'text', 'web');
  });

  test('should provide cross-platform color analysis', () => {
    const blueAnalytics = service.getColorAnalytics('#007bff');
    
    expect(blueAnalytics.totalElements).toBe(2);
    expect(blueAnalytics.usageBreakdown.bySource.figma).toBe(1);
    expect(blueAnalytics.usageBreakdown.bySource.web).toBe(1);
    expect(blueAnalytics.usageBreakdown.byColorType.background).toBe(2);
  });

  test('should identify design consistency opportunities', () => {
    const analytics = service.getColorAnalytics();
    
    // Both platforms use the same primary colors
    const blueColor = analytics.colorBreakdown.find(c => c.color === '#007bff');
    const whiteColor = analytics.colorBreakdown.find(c => c.color === '#ffffff');
    
    expect(blueColor.stats.sources).toContain('figma');
    expect(blueColor.stats.sources).toContain('web');
    expect(whiteColor.stats.sources).toContain('figma');
    expect(whiteColor.stats.sources).toContain('web');
  });
});
