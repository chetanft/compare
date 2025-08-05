import { ReportGenerator } from './reportGenerator.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Singleton instance
let reportGenerator = null;

/**
 * Get report generator instance
 * @param {Object} config - Configuration
 * @returns {ReportGenerator} Report generator instance
 */
export function getReportGenerator(config = {}) {
  if (reportGenerator) {
    return reportGenerator;
  }
  
  logger.info('Creating report generator');
  reportGenerator = new ReportGenerator(config);
  
  return reportGenerator;
}

/**
 * Generate HTML report from comparison results
 * @param {Object} comparisonResults - Comparison results
 * @param {Object} options - Report options
 * @returns {Promise<string>} Path to generated report
 */
export async function generateReport(comparisonResults, options = {}) {
  const generator = getReportGenerator(options.config);
  
  try {
    return await generator.generateReport(comparisonResults, options);
  } catch (error) {
    logger.error('Failed to generate report', error);
    throw error;
  }
}

/**
 * Create templates directory and default template
 * @returns {Promise<void>}
 */
export async function setupTemplates() {
  try {
    const templatesDir = path.join(__dirname, 'templates');
    await fs.mkdir(templatesDir, { recursive: true });
    
    // Create default template if it doesn't exist
    const defaultTemplatePath = path.join(templatesDir, 'report.html');
    
    try {
      await fs.access(defaultTemplatePath);
      logger.info('Default template already exists');
    } catch (error) {
      // Create default template
      const generator = new ReportGenerator();
      const defaultTemplate = generator.getDefaultTemplate();
      
      await fs.writeFile(defaultTemplatePath, defaultTemplate);
      logger.info('Default template created');
    }
  } catch (error) {
    logger.error('Failed to setup templates', error);
    throw error;
  }
}

export { ReportGenerator };

export default {
  getReportGenerator,
  generateReport,
  setupTemplates,
  ReportGenerator
}; 