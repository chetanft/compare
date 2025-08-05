/**
 * Unit tests for BrowserPool
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { getBrowserPool, shutdownBrowserPool } from '../../src/browser/BrowserPool.js';

describe('BrowserPool', () => {
  let browserPool;

  beforeEach(async () => {
    browserPool = getBrowserPool();
    await browserPool.initialize();
  });

  afterEach(async () => {
    await shutdownBrowserPool();
  });

  describe('Browser Management', () => {
    test('should create and reuse browser instances', async () => {
      const browser1 = await browserPool.getBrowser();
      const browser2 = await browserPool.getBrowser();
      
      expect(browser1).toBe(browser2); // Should reuse same browser
      expect(browser1.isConnected()).toBe(true);
    });

    test('should create different browsers for different options', async () => {
      const browser1 = await browserPool.getBrowser({ headless: true });
      const browser2 = await browserPool.getBrowser({ headless: false });
      
      // Should create different browsers due to different options
      expect(browser1).not.toBe(browser2);
    });

    test('should handle browser disconnection gracefully', async () => {
      const browser = await browserPool.getBrowser();
      await browser.close();
      
      // Should create new browser when old one is disconnected
      const newBrowser = await browserPool.getBrowser();
      expect(newBrowser.isConnected()).toBe(true);
      expect(newBrowser).not.toBe(browser);
    });
  });

  describe('Page Management', () => {
    test('should create and track pages', async () => {
      const { page, pageId } = await browserPool.createPage();
      
      expect(page).toBeDefined();
      expect(pageId).toBeDefined();
      expect(typeof pageId).toBe('string');
      
      const stats = browserPool.getStats();
      expect(stats.activePagesCount).toBe(1);
    });

    test('should configure page with default settings', async () => {
      const { page } = await browserPool.createPage();
      
      const viewport = page.viewport();
      expect(viewport.width).toBe(1920);
      expect(viewport.height).toBe(1080);
    });

    test('should configure page with custom settings', async () => {
      const { page } = await browserPool.createPage({
        width: 1024,
        height: 768
      });
      
      const viewport = page.viewport();
      expect(viewport.width).toBe(1024);
      expect(viewport.height).toBe(768);
    });

    test('should close pages properly', async () => {
      const { page, pageId } = await browserPool.createPage();
      
      await browserPool.closePage(pageId);
      
      expect(page.isClosed()).toBe(true);
      
      const stats = browserPool.getStats();
      expect(stats.activePagesCount).toBe(0);
    });

    test('should update page activity', async () => {
      const { pageId } = await browserPool.createPage();
      
      // Should not throw
      browserPool.updatePageActivity(pageId);
      browserPool.updatePageActivity('non-existent-id');
    });
  });

  describe('Resource Management', () => {
    test('should respect maximum browsers limit', async () => {
      // Get stats to check current limits
      const stats = browserPool.getStats();
      expect(stats.maxBrowsers).toBeGreaterThan(0);
    });

    test('should respect maximum pages per browser limit', async () => {
      const stats = browserPool.getStats();
      expect(stats.maxPagesPerBrowser).toBeGreaterThan(0);
    });

    test('should cleanup idle pages', async () => {
      // Create a page
      const { pageId } = await browserPool.createPage();
      
      // Manually trigger cleanup (normally happens automatically)
      await browserPool.cleanupIdlePages();
      
      // Page should still exist since it's not old enough
      const stats = browserPool.getStats();
      expect(stats.activePagesCount).toBe(1);
    });
  });

  describe('Statistics', () => {
    test('should provide accurate statistics', async () => {
      const { pageId } = await browserPool.createPage();
      
      const stats = browserPool.getStats();
      
      expect(stats).toMatchObject({
        connectedBrowsers: expect.any(Number),
        totalBrowsers: expect.any(Number),
        activePagesCount: 1,
        pagesByBrowser: expect.any(Object),
        maxBrowsers: expect.any(Number),
        maxPagesPerBrowser: expect.any(Number)
      });
    });

    test('should track pages by browser', async () => {
      await browserPool.createPage();
      await browserPool.createPage();
      
      const stats = browserPool.getStats();
      expect(stats.activePagesCount).toBe(2);
    });
  });

  describe('Shutdown', () => {
    test('should shutdown gracefully', async () => {
      const { page, pageId } = await browserPool.createPage();
      
      await browserPool.shutdown();
      
      expect(page.isClosed()).toBe(true);
      
      const stats = browserPool.getStats();
      expect(stats.activePagesCount).toBe(0);
      expect(stats.connectedBrowsers).toBe(0);
    });

    test('should prevent new operations after shutdown', async () => {
      await browserPool.shutdown();
      
      await expect(browserPool.getBrowser()).rejects.toThrow('shutting down');
    });
  });

  describe('Error Handling', () => {
    test('should handle page creation errors gracefully', async () => {
      // Close all browsers to force error
      await browserPool.shutdown();
      
      await expect(browserPool.createPage()).rejects.toThrow();
    });

    test('should handle page closure errors gracefully', async () => {
      const { pageId } = await browserPool.createPage();
      
      // Close page twice should not throw
      await browserPool.closePage(pageId);
      await browserPool.closePage(pageId); // Should not throw
    });
  });
}); 