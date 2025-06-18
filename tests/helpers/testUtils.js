import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test utilities for comparison service tests
 */
export class TestUtils {
  /**
   * Create a temporary test directory
   */
  static async createTempTestDir() {
    const tempDir = join(__dirname, '../temp');
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  /**
   * Clean up temporary test files
   */
  static async cleanupTempFiles(directory) {
    try {
      await fs.rm(directory, { recursive: true, force: true });
    } catch (error) {
      console.warn('Warning: Failed to clean up temp files:', error.message);
    }
  }

  /**
   * Generate test comparison data
   */
  static generateTestData(options = {}) {
    const {
      componentCount = 10,
      childrenPerComponent = 3,
      textLength = 100
    } = options;

    return {
      components: Array(componentCount).fill(null).map((_, i) => ({
        id: `test-component-${i}`,
        name: `Test Component ${i}`,
        type: 'div',
        styles: {
          width: '100px',
          height: '100px',
          backgroundColor: '#ffffff',
          border: '1px solid #000000'
        },
        children: Array(childrenPerComponent).fill(null).map((_, j) => ({
          id: `test-child-${i}-${j}`,
          type: 'span',
          text: 'Test text '.repeat(Math.ceil(textLength / 10))
        }))
      }))
    };
  }

  /**
   * Mock browser page for testing
   */
  static createMockPage() {
    return {
      goto: async () => {},
      waitForSelector: async () => {},
      evaluate: async () => {},
      screenshot: async () => Buffer.from('fake-screenshot'),
      close: async () => {},
      on: () => {},
      setViewport: async () => {},
      setUserAgent: async () => {},
      setExtraHTTPHeaders: async () => {},
      setRequestInterception: async () => {},
      setDefaultTimeout: () => {},
      metrics: async () => ({
        Timestamp: Date.now(),
        Documents: 1,
        Frames: 1,
        JSEventListeners: 100,
        Nodes: 1000,
        LayoutCount: 10,
        RecalcStyleCount: 5,
        LayoutDuration: 0.5,
        RecalcStyleDuration: 0.3,
        ScriptDuration: 1.0,
        TaskDuration: 2.0,
        JSHeapUsedSize: 50000000,
        JSHeapTotalSize: 100000000
      })
    };
  }

  /**
   * Wait for a condition with timeout
   */
  static async waitForCondition(condition, timeout = 5000, interval = 100) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Create test report file
   */
  static async createTestReport(data, path) {
    const report = {
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        version: '1.0.0',
        generator: 'test-utils'
      }
    };

    await fs.writeFile(path, JSON.stringify(report, null, 2));
    return report;
  }
} 