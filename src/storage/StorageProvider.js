/**
 * Storage Provider Interface
 * Abstract interface for storage operations supporting both local filesystem and Supabase
 */

/**
 * @typedef {Object} ReportMetadata
 * @property {string} id - Report ID
 * @property {string} title - Report title
 * @property {string} comparisonId - Associated comparison ID
 * @property {string} format - Report format (html, pdf, json, csv)
 * @property {string} url - URL or path to access the report
 * @property {number} fileSize - File size in bytes
 * @property {string} createdAt - ISO timestamp
 * @property {string} [userId] - User ID (for Supabase)
 */

/**
 * @typedef {Object} ScreenshotMetadata
 * @property {string} comparisonId - Comparison ID
 * @property {string} uploadId - Upload ID
 * @property {string} url - URL or path to screenshot
 * @property {string} createdAt - ISO timestamp
 */

/**
 * @typedef {Object} DesignSystemData
 * @property {string} id - Design system ID
 * @property {string} name - Design system name
 * @property {string} slug - Unique slug
 * @property {Object} tokens - Design tokens (colors, typography, spacing, etc.)
 * @property {string} [cssUrl] - URL to CSS file in storage
 * @property {string} [cssText] - Inline CSS text
 * @property {string} [figmaFileKey] - Figma file key
 * @property {string} [figmaNodeId] - Figma node ID
 * @property {boolean} isGlobal - Whether system is global
 * @property {string} [userId] - User ID (for Supabase)
 */

/**
 * Abstract Storage Provider Interface
 * All storage providers must implement these methods
 */
export class StorageProvider {
  /**
   * Save a comparison report
   * @param {string|Buffer} reportData - Report content (HTML, JSON, etc.)
   * @param {Object} metadata - Report metadata
   * @returns {Promise<ReportMetadata>} Saved report metadata
   */
  async saveReport(reportData, metadata) {
    throw new Error('saveReport must be implemented by subclass');
  }

  /**
   * Get a report by ID
   * @param {string} reportId - Report ID
   * @returns {Promise<{data: string|Buffer, metadata: ReportMetadata}>} Report data and metadata
   */
  async getReport(reportId) {
    throw new Error('getReport must be implemented by subclass');
  }

  /**
   * List reports with optional filters
   * @param {Object} filters - Filter options (userId, comparisonId, format, etc.)
   * @returns {Promise<ReportMetadata[]>} List of report metadata
   */
  async listReports(filters = {}) {
    throw new Error('listReports must be implemented by subclass');
  }

  /**
   * Delete a report
   * @param {string} reportId - Report ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteReport(reportId) {
    throw new Error('deleteReport must be implemented by subclass');
  }

  /**
   * Save a screenshot file
   * @param {Buffer|string} fileData - Screenshot file data
   * @param {Object} metadata - Screenshot metadata
   * @returns {Promise<ScreenshotMetadata>} Saved screenshot metadata
   */
  async saveScreenshot(fileData, metadata) {
    throw new Error('saveScreenshot must be implemented by subclass');
  }

  /**
   * Get screenshot URL or path
   * @param {string} comparisonId - Comparison ID
   * @param {string} [imageType] - Image type (pixel-diff, side-by-side, etc.)
   * @returns {Promise<string>} URL or path to screenshot
   */
  async getScreenshotUrl(comparisonId, imageType = 'pixel-diff') {
    throw new Error('getScreenshotUrl must be implemented by subclass');
  }

  /**
   * Save a design system
   * @param {DesignSystemData} systemData - Design system data
   * @returns {Promise<DesignSystemData>} Saved design system data
   */
  async saveDesignSystem(systemData) {
    throw new Error('saveDesignSystem must be implemented by subclass');
  }

  /**
   * Get a design system by ID
   * @param {string} systemId - Design system ID
   * @returns {Promise<DesignSystemData>} Design system data
   */
  async getDesignSystem(systemId) {
    throw new Error('getDesignSystem must be implemented by subclass');
  }

  /**
   * List design systems
   * @param {Object} filters - Filter options (userId, isGlobal, etc.)
   * @returns {Promise<DesignSystemData[]>} List of design systems
   */
  async listDesignSystems(filters = {}) {
    throw new Error('listDesignSystems must be implemented by subclass');
  }

  /**
   * Delete a design system
   * @param {string} systemId - Design system ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteDesignSystem(systemId) {
    throw new Error('deleteDesignSystem must be implemented by subclass');
  }

  /**
   * Get design system CSS content
   * @param {string} systemId - Design system ID
   * @returns {Promise<string>} CSS content (from URL or inline text)
   */
  async getDesignSystemCSS(systemId) {
    throw new Error('getDesignSystemCSS must be implemented by subclass');
  }

  /**
   * Save a credential
   * @param {Object} credentialData - Credential data (name, url, username, password, notes)
   * @param {Object} metadata - Metadata (id, etc.)
   * @returns {Promise<Object>} Saved credential metadata
   */
  async saveCredential(credentialData, metadata) {
    throw new Error('saveCredential must be implemented by subclass');
  }

  /**
   * List credentials
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of credential metadata
   */
  async listCredentials(filters = {}) {
    throw new Error('listCredentials must be implemented by subclass');
  }

  /**
   * Get a credential by ID
   * @param {string} credentialId - Credential ID
   * @returns {Promise<Object>} Credential metadata
   */
  async getCredential(credentialId) {
    throw new Error('getCredential must be implemented by subclass');
  }

  /**
   * Delete a credential
   * @param {string} credentialId - Credential ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteCredential(credentialId) {
    throw new Error('deleteCredential must be implemented by subclass');
  }

  /**
   * Decrypt a credential (server-side only)
   * @param {string} credentialId - Credential ID
   * @returns {Promise<Object>} Decrypted credential (username, password)
   */
  async decryptCredential(credentialId) {
    throw new Error('decryptCredential must be implemented by subclass');
  }

  /**
   * Check if storage provider is available
   * @returns {Promise<boolean>} Availability status
   */
  async isAvailable() {
    return true;
  }

  /**
   * Get storage mode identifier
   * @returns {string} Storage mode ('local' or 'supabase')
   */
  getStorageMode() {
    throw new Error('getStorageMode must be implemented by subclass');
  }
}
