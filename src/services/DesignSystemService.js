/**
 * Design System Service
 * Business logic for design system operations
 */

import { DesignSystemRepository } from '../database/repositories/DesignSystemRepository.js';

export class DesignSystemService {
  constructor(adapter) {
    this.repository = new DesignSystemRepository(adapter);
  }

  /**
   * Create a new design system
   * @param {Object} data - Design system data
   * @returns {Promise<Object>} Created design system
   */
  async createDesignSystem(data) {
    return await this.repository.create(data);
  }

  /**
   * Get design system by ID
   * @param {string} id - Design system ID
   * @returns {Promise<Object|null>} Design system or null
   */
  async getDesignSystem(id) {
    return await this.repository.findById(id);
  }

  /**
   * Get design system by slug
   * @param {string} slug - Design system slug
   * @returns {Promise<Object|null>} Design system or null
   */
  async getDesignSystemBySlug(slug) {
    return await this.repository.findBySlug(slug);
  }

  /**
   * Update design system
   * @param {string} id - Design system ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated design system
   */
  async updateDesignSystem(id, data) {
    return await this.repository.update(id, data);
  }

  /**
   * Delete design system
   * @param {string} id - Design system ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteDesignSystem(id) {
    return await this.repository.delete(id);
  }

  /**
   * List design systems
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of design systems
   */
  async listDesignSystems(filters = {}) {
    return await this.repository.list(filters);
  }
}

