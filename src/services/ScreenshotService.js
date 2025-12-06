/**
 * Screenshot Service
 * Business logic for screenshot comparison operations
 */

import { ScreenshotRepository } from '../database/repositories/ScreenshotRepository.js';

export class ScreenshotService {
  constructor(adapter) {
    this.repository = new ScreenshotRepository(adapter);
  }

  /**
   * Create a new screenshot result
   * @param {Object} data - Screenshot result data
   * @returns {Promise<Object>} Created screenshot result
   */
  async createScreenshotResult(data) {
    return await this.repository.create(data);
  }

  /**
   * Get screenshot result by ID
   * @param {string} id - Screenshot result ID
   * @returns {Promise<Object|null>} Screenshot result or null
   */
  async getScreenshotResult(id) {
    return await this.repository.findById(id);
  }

  /**
   * Get screenshot result by comparison ID
   * @param {string} comparisonId - Comparison ID
   * @returns {Promise<Object|null>} Screenshot result or null
   */
  async getScreenshotResultByComparisonId(comparisonId) {
    return await this.repository.findByComparisonId(comparisonId);
  }

  /**
   * Update screenshot result
   * @param {string} id - Screenshot result ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated screenshot result
   */
  async updateScreenshotResult(id, data) {
    return await this.repository.update(id, data);
  }

  /**
   * Complete screenshot comparison
   * @param {string} id - Screenshot result ID
   * @param {Object} result - Comparison result
   * @returns {Promise<Object>} Updated screenshot result
   */
  async completeScreenshotComparison(id, result) {
    return await this.repository.update(id, {
      status: 'completed',
      ...result,
      completedAt: new Date().toISOString()
    });
  }

  /**
   * Fail screenshot comparison
   * @param {string} id - Screenshot result ID
   * @param {string} errorMessage - Error message
   * @returns {Promise<Object>} Updated screenshot result
   */
  async failScreenshotComparison(id, errorMessage) {
    return await this.repository.update(id, {
      status: 'failed',
      errorMessage,
      completedAt: new Date().toISOString()
    });
  }

  /**
   * Delete screenshot result
   * @param {string} id - Screenshot result ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteScreenshotResult(id) {
    return await this.repository.delete(id);
  }

  /**
   * List screenshot results
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of screenshot results
   */
  async listScreenshotResults(filters = {}) {
    return await this.repository.list(filters);
  }
}

