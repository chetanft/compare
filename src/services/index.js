/**
 * Service Index
 * Exports all services and factory function
 */

export { ComparisonService } from './ComparisonService.js';
export { ReportService } from './ReportService.js';
export { CredentialService } from './CredentialService.js';
export { DesignSystemService } from './DesignSystemService.js';
export { ScreenshotService } from './ScreenshotService.js';

/**
 * Create all services with a given adapter and storage provider
 * @param {DatabaseAdapter} adapter - Database adapter
 * @param {StorageProvider} storageProvider - Storage provider
 * @param {string} encryptionKey - Encryption key for credentials
 * @returns {Object} Service instances
 */
import { ComparisonService } from './ComparisonService.js';
import { ReportService } from './ReportService.js';
import { CredentialService } from './CredentialService.js';
import { DesignSystemService } from './DesignSystemService.js';
import { ScreenshotService } from './ScreenshotService.js';

export function createServices(adapter, storageProvider, encryptionKey = null) {
  return {
    comparisons: new ComparisonService(adapter),
    reports: new ReportService(adapter, storageProvider),
    credentials: new CredentialService(adapter, encryptionKey),
    designSystems: new DesignSystemService(adapter),
    screenshots: new ScreenshotService(adapter)
  };
}

