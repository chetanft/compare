/**
 * Report Service
 * Business logic for report operations
 */

import { ReportRepository } from '../database/repositories/ReportRepository.js';

export class ReportService {
  constructor(adapter, storageProvider) {
    this.repository = new ReportRepository(adapter);
    this.storage = storageProvider;
  }

  /**
   * Generate and save a report
   * @param {string} comparisonId - Comparison ID
   * @param {Object} reportData - Report data (HTML, JSON, etc.)
   * @param {Object} metadata - Report metadata
   * @returns {Promise<Object>} Saved report
   */
  async generateAndSave(comparisonId, reportData, metadata = {}) {
    // Save report file via storage provider
    const storageResult = await this.storage.saveReport(reportData, {
      comparisonId,
      title: metadata.title || `Report for comparison ${comparisonId}`,
      format: metadata.format || 'html'
    });

    // Save report metadata to database
    const report = await this.repository.create({
      id: storageResult.id,
      userId: metadata.userId || null,
      comparisonId,
      title: storageResult.title,
      format: storageResult.format,
      storagePath: storageResult.url,
      fileSize: storageResult.fileSize
    });

    return report;
  }

  /**
   * Get report by ID
   * @param {string} id - Report ID
   * @returns {Promise<Object|null>} Report or null
   */
  async getReport(id) {
    return await this.repository.findById(id);
  }

  /**
   * Get report data (file content)
   * @param {string} id - Report ID
   * @returns {Promise<{data: string|Buffer, metadata: Object}>} Report data and metadata
   */
  async getReportData(id) {
    const report = await this.repository.findById(id);
    if (!report) {
      throw new Error(`Report not found: ${id}`);
    }

    // Get report file from storage
    const { data, metadata } = await this.storage.getReport(id);
    return { data, metadata };
  }

  /**
   * List reports
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of reports
   */
  async listReports(filters = {}) {
    return await this.repository.list(filters);
  }

  /**
   * Delete report
   * @param {string} id - Report ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteReport(id) {
    // Delete from storage
    await this.storage.deleteReport(id);
    
    // Delete from database
    return await this.repository.delete(id);
  }

  /**
   * Get reports for a comparison
   * @param {string} comparisonId - Comparison ID
   * @returns {Promise<Array>} Reports for comparison
   */
  async getReportsForComparison(comparisonId) {
    return await this.repository.findByComparisonId(comparisonId);
  }
}

