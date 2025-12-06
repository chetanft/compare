/**
 * Screenshot Repository
 * Handles CRUD operations for screenshot comparison results
 */

export class ScreenshotRepository {
  constructor(adapter) {
    this.adapter = adapter;
    this.table = 'screenshot_results';
  }

  /**
   * Create a new screenshot result
   * @param {Object} data - Screenshot result data
   * @returns {Promise<Object>} Created screenshot result
   */
  async create(data) {
    const resultData = {
      id: data.id || this.adapter.generateUUID(),
      userId: data.userId || null,
      uploadId: data.uploadId,
      comparisonId: data.comparisonId,
      status: data.status || 'processing',
      figmaScreenshotPath: data.figmaScreenshotPath,
      developedScreenshotPath: data.developedScreenshotPath,
      diffImagePath: data.diffImagePath || null,
      sideBySidePath: data.sideBySidePath || null,
      metrics: data.metrics ? JSON.stringify(data.metrics) : null,
      discrepancies: data.discrepancies ? JSON.stringify(data.discrepancies) : null,
      enhancedAnalysis: data.enhancedAnalysis ? JSON.stringify(data.enhancedAnalysis) : null,
      colorPalettes: data.colorPalettes ? JSON.stringify(data.colorPalettes) : null,
      reportPath: data.reportPath || null,
      settings: data.settings ? JSON.stringify(data.settings) : null,
      processingTime: data.processingTime || null,
      errorMessage: data.errorMessage || null,
      createdAt: data.createdAt || new Date().toISOString(),
      completedAt: data.completedAt || null
    };

    return await this.adapter.insert(this.table, resultData);
  }

  /**
   * Get screenshot result by ID
   * @param {string} id - Screenshot result ID
   * @returns {Promise<Object|null>} Screenshot result or null
   */
  async findById(id) {
    const results = await this.adapter.select(this.table, {
      where: { id },
      limit: 1
    });

    return this.parseJsonFields(results.length > 0 ? results[0] : null);
  }

  /**
   * Get screenshot result by comparison ID
   * @param {string} comparisonId - Comparison ID
   * @returns {Promise<Object|null>} Screenshot result or null
   */
  async findByComparisonId(comparisonId) {
    const results = await this.adapter.select(this.table, {
      where: { comparisonId },
      limit: 1
    });

    return this.parseJsonFields(results.length > 0 ? results[0] : null);
  }

  /**
   * Update screenshot result
   * @param {string} id - Screenshot result ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated screenshot result
   */
  async update(id, data) {
    const updateData = { ...data };

    // Convert JSON fields
    if (updateData.metrics && typeof updateData.metrics === 'object') {
      updateData.metrics = JSON.stringify(updateData.metrics);
    }
    if (updateData.discrepancies && typeof updateData.discrepancies === 'object') {
      updateData.discrepancies = JSON.stringify(updateData.discrepancies);
    }
    if (updateData.enhancedAnalysis && typeof updateData.enhancedAnalysis === 'object') {
      updateData.enhancedAnalysis = JSON.stringify(updateData.enhancedAnalysis);
    }
    if (updateData.colorPalettes && typeof updateData.colorPalettes === 'object') {
      updateData.colorPalettes = JSON.stringify(updateData.colorPalettes);
    }
    if (updateData.settings && typeof updateData.settings === 'object') {
      updateData.settings = JSON.stringify(updateData.settings);
    }

    const updated = await this.adapter.update(this.table, updateData, { id });
    return this.parseJsonFields(updated.length > 0 ? updated[0] : null);
  }

  /**
   * Delete screenshot result
   * @param {string} id - Screenshot result ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const count = await this.adapter.delete(this.table, { id });
    return count > 0;
  }

  /**
   * List screenshot results with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of screenshot results
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

    return results.map(result => this.parseJsonFields(result)).filter(Boolean);
  }

  /**
   * Parse JSON fields from database row
   * @param {Object|null} row - Database row
   * @returns {Object|null} Parsed row
   */
  parseJsonFields(row) {
    if (!row) return null;

    const parsed = { ...row };

    const jsonFields = ['metrics', 'discrepancies', 'enhancedAnalysis', 'colorPalettes', 'settings'];
    for (const field of jsonFields) {
      if (parsed[field] && typeof parsed[field] === 'string') {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch (e) {
          // Invalid JSON, keep as string
        }
      }
    }

    return parsed;
  }
}

