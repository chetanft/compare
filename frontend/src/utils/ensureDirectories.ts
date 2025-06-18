/**
 * Utility to ensure necessary directories exist for the application
 */
import fs from 'fs';
import path from 'path';

/**
 * Ensures that all required output directories exist
 */
export const ensureOutputDirectories = (): void => {
  const directories = [
    'output',
    'output/reports',
    'output/images',
    'output/screenshots',
    'output/freighttiger-extraction'
  ];

  directories.forEach(dir => {
    const dirPath = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      console.log(`Creating directory: ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
};

/**
 * Checks if a specific report file exists
 * @param reportId The ID of the report to check
 * @returns True if the report exists, false otherwise
 */
export const checkReportExists = (reportId: string): boolean => {
  const reportPaths = [
    path.resolve(process.cwd(), `output/reports/${reportId}.html`),
    path.resolve(process.cwd(), `output/reports/comparison-${reportId}.html`),
    path.resolve(process.cwd(), `output/reports/${reportId}.json`),
    path.resolve(process.cwd(), `output/reports/comparison-${reportId}.json`)
  ];

  return reportPaths.some(filePath => fs.existsSync(filePath));
}; 