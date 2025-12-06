/**
 * Report Repository
 * Handles CRUD operations for reports
 */

export class ReportRepository {
  constructor(adapter) {
    this.adapter = adapter;
    this.table = 'reports';
  }

  /**
   * Create a new report
   * @param {Object} data - Report data
   * @returns {Promise<Object>} Created report
   */
  async create(data) {
    const reportData = {
      id: data.id || this.adapter.generateUUID(),
      userId: data.userId || null,
      comparisonId: data.comparisonId || null,
      title: data.title,
      format: data.format || 'html',
      storagePath: data.storagePath,
      fileSize: data.fileSize || null,
      createdAt: data.createdAt || new Date().toISOString()
    };

    return await this.adapter.insert(this.table, reportData);
  }

  /**
   * Get report by ID
   * @param {string} id - Report ID
   * @returns {Promise<Object|null>} Report or null
   */
  async findById(id) {
    const results = await this.adapter.select(this.table, {
      where: { id },
      limit: 1
    });

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Update report
   * @param {string} id - Report ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated report
   */
  async update(id, data) {
    const updated = await this.adapter.update(this.table, data, { id });
    return updated.length > 0 ? updated[0] : null;
  }

  /**
   * Delete report
   * @param {string} id - Report ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const count = await this.adapter.delete(this.table, { id });
    return count > 0;
  }

  /**
   * List reports with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of reports
   */
  async list(filters = {}) {
    const {
      userId = null,
      comparisonId = null,
      format = null,
      limit = 50,
      offset = 0,
      orderBy = [{ column: 'createdAt', ascending: false }]
    } = filters;

    const where = {};
    if (userId) where.userId = userId;
    if (comparisonId) where.comparisonId = comparisonId;
    if (format) where.format = format;

    return await this.adapter.select(this.table, {
      where,
      orderBy,
      limit,
      offset
    });
  }

  /**
   * Find reports by comparison ID
   * @param {string} comparisonId - Comparison ID
   * @returns {Promise<Array>} Reports for comparison
   */
  async findByComparisonId(comparisonId) {
    return await this.list({ comparisonId });
  }
}

