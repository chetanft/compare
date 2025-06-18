/**
 * Sample Test
 * Simple test to verify Jest setup is working correctly
 */

import { describe, test, expect } from '@jest/globals';

describe('Test Setup Verification', () => {
  test('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  test('should access global test utilities', () => {
    expect(global.testUtils).toBeDefined();
    expect(typeof global.testUtils.generateTestConfig).toBe('function');
  });

  test('should generate test config', () => {
    const config = global.testUtils.generateTestConfig();
    
    expect(config).toHaveProperty('figma');
    expect(config).toHaveProperty('comparison');
    expect(config).toHaveProperty('puppeteer');
    expect(config).toHaveProperty('output');
  });

  test('should generate mock figma data', () => {
    const figmaData = global.testUtils.generateMockFigmaData();
    
    expect(figmaData).toHaveProperty('document');
    expect(figmaData).toHaveProperty('components');
    expect(figmaData).toHaveProperty('styles');
  });

  test('should generate mock web data', () => {
    const webData = global.testUtils.generateMockWebData();
    
    expect(webData).toHaveProperty('url');
    expect(webData).toHaveProperty('elements');
    expect(webData).toHaveProperty('screenshot');
    expect(Array.isArray(webData.elements)).toBe(true);
  });
}); 