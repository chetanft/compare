/**
 * Comparison Repository
 * Handles CRUD operations for comparisons
 */

export class ComparisonRepository {
  constructor(adapter) {
    this.adapter = adapter;
    this.table = 'comparisons';
  }

  /**
   * Create a new comparison
   * @param {Object} data - Comparison data
   * @returns {Promise<Object>} Created comparison
   */
  async create(data) {
    const comparisonData = {
      id: data.id || this.adapter.generateUUID(),
      userId: data.userId || null,
      figmaUrl: data.figmaUrl,
      webUrl: data.webUrl,
      credentialId: data.credentialId || null,
      status: data.status || 'pending',
      progress: data.progress || 0,
      result: data.result ? JSON.stringify(data.result) : null,
      errorMessage: data.errorMessage || null,
      durationMs: data.durationMs || null,
      createdAt: data.createdAt || new Date().toISOString(),
      completedAt: data.completedAt || null
    };

    // Convert JSON fields for SQLite
    if (this.adapter.getType() === 'sqlite') {
      comparisonData.result = comparisonData.result;
    }

    return await this.adapter.insert(this.table, comparisonData);
  }

  /**
   * Get comparison by ID
   * @param {string} id - Comparison ID
   * @returns {Promise<Object|null>} Comparison or null
   */
  async findById(id) {
    const results = await this.adapter.select(this.table, {
      where: { id },
      limit: 1
    });

    if (results.length === 0) {
      return null;
    }

    const comparison = results[0];
    
    // Parse JSON fields
    if (comparison.result && typeof comparison.result === 'string') {
      try {
        comparison.result = JSON.parse(comparison.result);
      } catch (e) {
        // Invalid JSON, keep as string
      }
    }

    return comparison;
  }

  /**
   * Update comparison
   * @param {string} id - Comparison ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated comparison
   */
  async update(id, data) {
    const updateData = { ...data };

    // Convert JSON fields
    if (updateData.result && typeof updateData.result === 'object') {
      updateData.result = JSON.stringify(updateData.result);
    }

    // Add updated timestamp
    if (!updateData.updatedAt) {
      updateData.updatedAt = new Date().toISOString();
    }

    const updated = await this.adapter.update(this.table, updateData, { id });
    return updated.length > 0 ? updated[0] : null;
  }

  /**
   * Delete comparison
   * @param {string} id - Comparison ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const count = await this.adapter.delete(this.table, { id });
    return count > 0;
  }

  /**
   * List comparisons with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of comparisons
   */
  async list(filters = {}) {
    const {
      userId = null,
      status = null,
      limit = 50,
      offset = 0,
      orderBy = [{ column: 'createdAt', ascending: false }]
    } = filters;

    const where = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const results = await this.adapter.select(this.table, {
      where,
      orderBy,
      limit,
      offset
    });

    // Parse JSON fields
    return results.map(comparison => {
      if (comparison.result && typeof comparison.result === 'string') {
        try {
          comparison.result = JSON.parse(comparison.result);
        } catch (e) {
          // Invalid JSON, keep as string
        }
      }
      return comparison;
    });
  }

  /**
   * Find comparisons by URLs
   * @param {string} figmaUrl - Figma URL
   * @param {string} webUrl - Web URL
   * @returns {Promise<Array>} Matching comparisons
   */
  async findByUrls(figmaUrl, webUrl) {
    // Note: This is a simplified version. For complex queries, we might need raw SQL
    const results = await this.adapter.select(this.table, {
      where: {
        figmaUrl,
        webUrl
      },
      orderBy: [{ column: 'createdAt', ascending: false }]
    });

    return results.map(comparison => {
      if (comparison.result && typeof comparison.result === 'string') {
        try {
          comparison.result = JSON.parse(comparison.result);
        } catch (e) {
          // Invalid JSON, keep as string
        }
      }
      return comparison;
    });
  }
}

