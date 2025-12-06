/**
 * Comparison Service
 * Business logic for comparison operations
 */

import { ComparisonRepository } from '../database/repositories/ComparisonRepository.js';

export class ComparisonService {
  constructor(adapter) {
    this.repository = new ComparisonRepository(adapter);
  }

  /**
   * Create a new comparison
   * @param {Object} data - Comparison data
   * @returns {Promise<Object>} Created comparison
   */
  async createComparison(data) {
    const comparison = await this.repository.create({
      userId: data.userId || null,
      figmaUrl: data.figmaUrl,
      webUrl: data.webUrl,
      credentialId: data.credentialId || null,
      status: 'pending'
    });

    return comparison;
  }

  /**
   * Start a comparison (update status to processing)
   * @param {string} id - Comparison ID
   * @returns {Promise<Object>} Updated comparison
   */
  async startComparison(id) {
    return await this.repository.update(id, {
      status: 'processing',
      progress: 0
    });
  }

  /**
   * Complete a comparison
   * @param {string} id - Comparison ID
   * @param {Object} result - Comparison result
   * @param {number} durationMs - Duration in milliseconds
   * @returns {Promise<Object>} Updated comparison
   */
  async completeComparison(id, result, durationMs) {
    return await this.repository.update(id, {
      status: 'completed',
      result,
      durationMs,
      completedAt: new Date().toISOString(),
      progress: 100
    });
  }

  /**
   * Fail a comparison
   * @param {string} id - Comparison ID
   * @param {string} errorMessage - Error message
   * @returns {Promise<Object>} Updated comparison
   */
  async failComparison(id, errorMessage) {
    return await this.repository.update(id, {
      status: 'failed',
      errorMessage,
      completedAt: new Date().toISOString()
    });
  }

  /**
   * Update comparison progress
   * @param {string} id - Comparison ID
   * @param {number} progress - Progress percentage (0-100)
   * @returns {Promise<Object>} Updated comparison
   */
  async updateProgress(id, progress) {
    return await this.repository.update(id, {
      progress: Math.min(100, Math.max(0, progress))
    });
  }

  /**
   * Get comparison by ID
   * @param {string} id - Comparison ID
   * @returns {Promise<Object|null>} Comparison or null
   */
  async getComparison(id) {
    return await this.repository.findById(id);
  }

  /**
   * List comparisons
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of comparisons
   */
  async listComparisons(filters = {}) {
    return await this.repository.list(filters);
  }

  /**
   * Delete comparison
   * @param {string} id - Comparison ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteComparison(id) {
    return await this.repository.delete(id);
  }

  /**
   * Find comparisons by URLs
   * @param {string} figmaUrl - Figma URL
   * @param {string} webUrl - Web URL
   * @returns {Promise<Array>} Matching comparisons
   */
  async findComparisonsByUrls(figmaUrl, webUrl) {
    return await this.repository.findByUrls(figmaUrl, webUrl);
  }
}

