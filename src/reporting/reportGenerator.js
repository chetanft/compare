import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { generateCSSIncludes } from './utils/cssIncludes.js';
import { IssueFormatter } from '../services/reports/IssueFormatter.js';
import { 
  generateProgressBar, 
  generateCircularProgress, 
  generateDonutChart,
  generateEnhancedSummaryCard,
  generateCollapsibleSection,
  generateThemeToggle,
  generateInteractiveJS,
  generateEnhancedColorSwatch,
  generateStickyNav
} from './utils/templateHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

/**
 * Report Generator
 * Generates HTML reports from comparison results
 */
export class ReportGenerator {
  constructor(config = {}) {
    this.config = {
      templatePath: path.join(__dirname, 'templates/report.html'),
      webTemplatePath: path.join(__dirname, 'templates/web-extraction-report.html'),
      figmaTemplatePath: path.join(__dirname, 'templates/figma-extraction-report.html'),
      outputDir: path.join(rootDir, 'output/reports'),
      ...config
    };
  }
  
  /**
   * Generate HTML report from comparison results
   * @param {Object} comparisonResults - Comparison results
   * @param {Object} options - Report options
   * @returns {Promise<string>} Path to generated report
   */
  async generateReport(comparisonResults, options = {}) {
    const { outputPath } = options;
    
    logger.info('Generating HTML report');
    
    try {
      // Ensure output directory exists
      const actualOutputPath = outputPath || path.join(this.config.outputDir, `report_${Date.now()}.html`);
      await fs.mkdir(path.dirname(actualOutputPath), { recursive: true });
      
      // Generate HTML content
      const htmlContent = await this.generateHtmlContent(comparisonResults);
      
      // Write HTML to file
      await fs.writeFile(actualOutputPath, htmlContent);
      
      logger.info(`Report generated at ${actualOutputPath}`);
      return actualOutputPath;
    } catch (error) {
      logger.error('Failed to generate report', error);
      throw error;
    }
  }
  
  /**
   * Generate HTML content from comparison results
   * @param {Object} comparisonResults - Comparison results
   * @returns {Promise<string>} HTML content
   */
  async generateHtmlContent(comparisonResults) {
    try {
      // Determine extraction type and select appropriate template
      const extractionType = comparisonResults.metadata?.extractionType || 'comparison';
      let templatePath;
      
      if (extractionType === 'web-only') {
        templatePath = this.config.webTemplatePath;
      } else if (extractionType === 'figma-only') {
        templatePath = this.config.figmaTemplatePath;
      } else {
        templatePath = this.config.templatePath; // comparison template
      }
      
      // Load template
      let template;
      try {
        template = await fs.readFile(templatePath, 'utf8');
      } catch (error) {
        logger.warn(`Template not found at ${templatePath}, using default template`);
        template = this.getDefaultTemplate();
      }
      
      // Generate CSS includes
      const cssIncludes = await generateCSSIncludes({ 
        inline: true // Use inline CSS for standalone reports
      });
      
      // Replace CSS placeholder
      template = template.replace('{{cssIncludes}}', cssIncludes);
      
      // Replace placeholders with actual data based on extraction type
      const html = this.replacePlaceholders(template, comparisonResults, extractionType);
      
      return html;
    } catch (error) {
      logger.error('Failed to generate HTML content', error);
      throw error;
    }
  }
  
  /**
   * Replace placeholders in template with actual data
   * @param {string} template - HTML template
   * @param {Object} comparisonResults - Comparison results
   * @param {string} extractionType - Type of extraction (web-only, figma-only, comparison)
   * @returns {string} HTML content
   */
  replacePlaceholders(template, comparisonResults, extractionType = 'comparison') {
    // Basic info
    let html = template;
    
    if (extractionType === 'web-only') {
      return this.replaceWebOnlyPlaceholders(html, comparisonResults);
    } else if (extractionType === 'figma-only') {
      return this.replaceFigmaOnlyPlaceholders(html, comparisonResults);
    }
    
    // Default comparison report placeholders
    // Replace basic info (use replaceAll to handle multiple occurrences)
    html = html.replaceAll('{{title}}', `Comparison Report - ${new Date().toLocaleString()}`);
    html = html.replaceAll('{{figmaFileName}}', comparisonResults.figmaData.fileName || 'Unknown Figma File');
    html = html.replaceAll('{{webUrl}}', comparisonResults.webData.url || 'Unknown Web URL');
    html = html.replaceAll('{{timestamp}}', comparisonResults.timestamp || new Date().toISOString());
    
    // Replace summary data
    const summary = comparisonResults.summary || {};
    html = html.replaceAll('{{componentsAnalyzed}}', summary.componentsAnalyzed || 0);
    html = html.replaceAll('{{matchPercentage}}', summary.overallMatchPercentage?.toFixed(2) || '0.00');
    html = html.replaceAll('{{overallSeverity}}', summary.overallSeverity || 'unknown');
    
    // Replace color and typography match data
    const matchStats = summary.matchStats || {};
    html = html.replaceAll('{{colorMatches}}', matchStats.colors?.matched || 0);
    html = html.replaceAll('{{colorMatchPercentage}}', matchStats.colors?.percentage || 0);
    html = html.replaceAll('{{colorTotal}}', matchStats.colors?.total || 0);
    html = html.replaceAll('{{typographyMatches}}', matchStats.typography?.matched || 0);
    html = html.replaceAll('{{typographyMatchPercentage}}', matchStats.typography?.percentage || 0);
    html = html.replaceAll('{{typographyTotal}}', matchStats.typography?.total || 0);
    
    // Generate severity counts
    const severityCounts = summary.severityCounts || { high: 0, medium: 0, low: 0 };
    html = html.replaceAll('{{highSeverityCount}}', severityCounts.high || 0);
    html = html.replaceAll('{{mediumSeverityCount}}', severityCounts.medium || 0);
    html = html.replaceAll('{{lowSeverityCount}}', severityCounts.low || 0);
    
    // Generate comparison tables
    html = html.replaceAll('{{comparisonTables}}', this.generateComparisonTables(comparisonResults.comparisons || []));
    
    // Generate DevRev issues table
    html = html.replaceAll('{{devrevIssuesTable}}', this.generateDevRevIssuesTable(comparisonResults));
    
    // Generate JSON data for interactive features
    const jsonData = JSON.stringify(comparisonResults);
    html = html.replaceAll('{{jsonData}}', jsonData);
    
    // Generate enhanced interactive components
    html = this.addEnhancedComponents(html, comparisonResults);
    
    return html;
  }
  
  /**
   * Add enhanced interactive components to the HTML
   * @param {string} html - HTML template
   * @param {Object} comparisonResults - Comparison results
   * @returns {string} Enhanced HTML
   */
  addEnhancedComponents(html, comparisonResults) {
    const summary = comparisonResults.summary || {};
    const matchStats = summary.matchStats || {};
    
    // Generate progress bars
    const colorPercentage = matchStats.colors?.percentage || 0;
    const typographyPercentage = matchStats.typography?.percentage || 0;
    const overallPercentage = summary.overallMatchPercentage || 0;
    
    html = html.replaceAll('{{colorProgress}}', generateProgressBar(colorPercentage, colorPercentage > 80 ? 'success' : colorPercentage > 60 ? 'warning' : 'danger'));
    html = html.replaceAll('{{typographyProgress}}', generateProgressBar(typographyPercentage, typographyPercentage > 80 ? 'success' : typographyPercentage > 60 ? 'warning' : 'danger'));
    html = html.replaceAll('{{overallProgress}}', generateProgressBar(overallPercentage, overallPercentage > 80 ? 'success' : overallPercentage > 60 ? 'warning' : 'danger'));
    html = html.replaceAll('{{componentsProgress}}', generateProgressBar(Math.min(100, (summary.componentsAnalyzed || 0) * 10), 'primary'));
    
    // Generate severity donut chart
    const severityCounts = summary.severityCounts || { high: 0, medium: 0, low: 0 };
    const total = severityCounts.high + severityCounts.medium + severityCounts.low;
    const severityData = {
      success: total > 0 ? Math.round((severityCounts.low / total) * 100) : 0,
      warning: total > 0 ? Math.round((severityCounts.medium / total) * 100) : 0,
      danger: total > 0 ? Math.round((severityCounts.high / total) * 100) : 0
    };
    html = html.replaceAll('{{severityChart}}', generateDonutChart(severityData, 'Issues'));
    
    // Generate sticky navigation
    const sections = [
      { id: 'summary', title: 'Summary' },
      { id: 'comparison-results', title: 'Results' },
      { id: 'details', title: 'Details' }
    ];
    html = html.replaceAll('{{stickyNav}}', generateStickyNav(sections));
    
    // Add theme toggle and interactive JavaScript
    html = html.replaceAll('{{themeToggle}}', generateThemeToggle());
    html = html.replaceAll('{{interactiveJS}}', generateInteractiveJS());
    
    // Add DevRev table styles and scripts
    html = html.replaceAll('{{devrevTableStyles}}', this.getDevRevTableStyles());
    html = html.replaceAll('{{devrevTableScripts}}', this.getDevRevTableScripts());
    
    return html;
  }
  
  /**
   * Generate comparison tables HTML
   * @param {Array<Object>} comparisons - Comparison results
   * @returns {string} HTML content
   */
  generateComparisonTables(comparisons) {
    if (!comparisons || comparisons.length === 0) {
      return '<div class="no-data">No comparison data available</div>';
    }
    
    let tablesHtml = '';
    
    // Group comparisons by severity
    const severityGroups = {
      high: [],
      medium: [],
      low: []
    };
    
    comparisons.forEach(comp => {
      const severity = comp.overallDeviation?.severity || 'low';
      severityGroups[severity].push(comp);
    });
    
    // Generate tables for each severity group
    Object.entries(severityGroups).forEach(([severity, comps]) => {
      if (comps.length === 0) return;
      
      tablesHtml += `
        <div class="severity-group severity-${severity}">
          <h3>${this.capitalizeFirst(severity)} Severity Issues (${comps.length})</h3>
          ${comps.map(comp => this.generateComparisonTable(comp)).join('')}
        </div>
      `;
    });
    
    return tablesHtml;
  }
  
  /**
   * Generate a single comparison table
   * @param {Object} comparison - Comparison result
   * @returns {string} HTML content
   */
  generateComparisonTable(comparison) {
    const component = comparison.component || {};
    const element = comparison.element || {};
    const matchScore = comparison.matchScore?.toFixed(2) || '0.00';
    const matchPercentage = comparison.overallDeviation?.matchPercentage?.toFixed(2) || '0.00';
    
    return `
      <div class="comparison-item severity-${comparison.overallDeviation?.severity || 'low'}">
        <div class="comparison-header">
          <h4>${component.name || 'Unnamed Component'} (${component.type || 'Unknown Type'})</h4>
          <div class="comparison-meta">
            <span class="match-score">Match Score: ${matchScore}</span>
            <span class="match-percentage">Match Percentage: ${matchPercentage}%</span>
          </div>
        </div>
        
        <div class="comparison-details">
          <div class="component-info">
            <h5>Figma Component</h5>
            <div class="info-row"><span>ID:</span> ${component.id || 'Unknown'}</div>
            <div class="info-row"><span>Name:</span> ${component.name || 'Unnamed'}</div>
            <div class="info-row"><span>Type:</span> ${component.type || 'Unknown'}</div>
          </div>
          
          <div class="element-info">
            <h5>Web Element</h5>
            <div class="info-row"><span>Tag:</span> ${element.tagName || 'Unknown'}</div>
            <div class="info-row"><span>ID:</span> ${element.id || 'None'}</div>
            <div class="info-row"><span>Classes:</span> ${element.classes?.join(', ') || 'None'}</div>
            <div class="info-row"><span>Path:</span> ${element.path || 'Unknown'}</div>
          </div>
        </div>
        
        <table class="property-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Figma Value</th>
              <th>Web Value</th>
              <th>Status</th>
              <th>Deviation</th>
            </tr>
          </thead>
          <tbody>
            ${this.generatePropertyRows(comparison.propertyComparisons || [])}
          </tbody>
        </table>
      </div>
    `;
  }
  
  /**
   * Generate property comparison rows
   * @param {Array<Object>} propertyComparisons - Property comparisons
   * @returns {string} HTML content
   */
  generatePropertyRows(propertyComparisons) {
    if (!propertyComparisons || propertyComparisons.length === 0) {
      return '<tr><td colspan="5">No property comparisons available</td></tr>';
    }
    
    return propertyComparisons.map(prop => {
      const statusClass = prop.matches ? 'match' : 'mismatch';
      const deviation = typeof prop.deviation === 'number' 
        ? prop.deviation.toFixed(2) 
        : prop.deviation || 'N/A';
      
      return `
        <tr class="${statusClass}">
          <td>${this.formatPropertyName(prop.property)}</td>
          <td>${this.formatPropertyValue(prop.figmaValue)}</td>
          <td>${this.formatPropertyValue(prop.webValue)}</td>
          <td class="status-cell ${statusClass}">${prop.matches ? 'Match' : 'Mismatch'}</td>
          <td>${deviation}</td>
        </tr>
      `;
    }).join('');
  }
  
  /**
   * Generate DevRev-ready issues table
   * @param {Object} comparisonResults - Comparison results
   * @returns {string} HTML content for DevRev issues table
   */
  generateDevRevIssuesTable(comparisonResults) {
    try {
      // Transform comparison results into DevRev issues
      const formatter = new IssueFormatter();
      const issues = formatter.transform(comparisonResults);
      
      if (!issues || issues.length === 0) {
        return `
          <div class="no-data">
            <p>✅ No issues found - All components match the design specifications!</p>
          </div>
        `;
      }
      
      // Generate table HTML
      return `
        <section class="devrev-issues-section" id="devrev-issues">
          <div class="section-header">
            <h2>📋 Comparison Issues (DevRev Format)</h2>
            <p class="section-description">
              Ready-to-upload issue tracker format with frame/component names from Figma.
              Copy to clipboard or export as CSV for use in DevRev or other issue tracking systems.
            </p>
          </div>
          
          <div class="table-controls">
            <button onclick="exportDevRevTableToCSV()" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export as CSV
            </button>
            <button onclick="copyDevRevTableToClipboard()" class="btn btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copy Table
            </button>
            <input 
              type="search" 
              placeholder="Filter issues..." 
              id="devrev-filter-input"
              class="table-filter"
              onkeyup="filterDevRevTable()"
            >
            <div class="issue-stats">
              <span class="stat-badge stat-critical">Critical: ${issues.filter(i => i.severity === 'Critical').length}</span>
              <span class="stat-badge stat-major">Major: ${issues.filter(i => i.severity === 'Major').length}</span>
              <span class="stat-badge stat-minor">Minor: ${issues.filter(i => i.severity === 'Minor').length}</span>
            </div>
          </div>
          
          <div class="table-wrapper">
            <table class="devrev-issues-table" id="devrev-issues-table">
              <thead>
                <tr>
                  <th class="sortable" onclick="sortDevRevTable(0)">Issue ID</th>
                  <th class="sortable" onclick="sortDevRevTable(1)">Title / Summary</th>
                  <th class="sortable" onclick="sortDevRevTable(2)">Description</th>
                  <th class="sortable" onclick="sortDevRevTable(3)">Module</th>
                  <th class="sortable" onclick="sortDevRevTable(4)">Frame / Component Name</th>
                  <th>Figma ID</th>
                  <th>Type</th>
                  <th>Web Element</th>
                  <th class="sortable" onclick="sortDevRevTable(8)">Severity</th>
                  <th class="sortable" onclick="sortDevRevTable(9)">Priority</th>
                  <th>Status</th>
                  <th>Expected Result</th>
                  <th>Actual Result</th>
                  <th>Environment</th>
                  <th>Created Date</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${issues.map(issue => this.generateDevRevIssueRow(issue)).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="table-footer">
            <p>📊 Total Issues: <strong>${issues.length}</strong></p>
            <p>💡 Tip: Click column headers to sort, use the filter to search, or export to CSV for DevRev upload</p>
          </div>
        </section>
      `;
    } catch (error) {
      logger.error('Failed to generate DevRev issues table', error);
      return '<div class="error">Failed to generate DevRev issues table</div>';
    }
  }
  
  /**
   * Generate a single DevRev issue row
   * @param {Object} issue - Issue object
   * @returns {string} HTML content for table row
   */
  generateDevRevIssueRow(issue) {
    return `
      <tr class="severity-${issue.severity?.toLowerCase()}" data-severity="${issue.severity}" data-priority="${issue.priority}">
        <td class="issue-id">${issue.issueId}</td>
        <td class="issue-title">${this.escapeHtml(issue.title)}</td>
        <td class="issue-description"><div class="truncate-text">${this.escapeHtml(issue.description)}</div></td>
        <td>${this.escapeHtml(issue.module)}</td>
        <td class="component-name"><code>${this.escapeHtml(issue.frameComponentName)}</code></td>
        <td class="figma-id"><small>${this.escapeHtml(issue.figmaComponentId)}</small></td>
        <td><small>${this.escapeHtml(issue.figmaComponentType)}</small></td>
        <td class="web-element"><code>${this.escapeHtml(issue.webElement)}</code></td>
        <td><span class="badge badge-${issue.severity?.toLowerCase()}">${issue.severity}</span></td>
        <td><span class="badge badge-priority-${issue.priority?.toLowerCase()}">${issue.priority}</span></td>
        <td><span class="badge badge-status">${issue.status}</span></td>
        <td class="expected-result"><div class="truncate-text">${this.escapeHtml(issue.expectedResult)}</div></td>
        <td class="actual-result"><div class="truncate-text">${this.escapeHtml(issue.actualResult)}</div></td>
        <td>${this.escapeHtml(issue.environment)}</td>
        <td class="date">${issue.createdDate}</td>
        <td class="remarks"><div class="truncate-text">${this.escapeHtml(issue.remarks)}</div></td>
      </tr>
    `;
  }
  
  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }
  
  /**
   * Format property name for display
   * @param {string} property - Property name
   * @returns {string} Formatted property name
   */
  formatPropertyName(property) {
    if (!property) return 'Unknown';
    
    // Convert camelCase to Title Case with spaces
    return property
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
  
  /**
   * Format property value for display
   * @param {*} value - Property value
   * @returns {string} Formatted property value
   */
  formatPropertyValue(value) {
    if (value === undefined || value === null) {
      return 'N/A';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return value.toString();
  }
  
  /**
   * Capitalize first letter of a string
   * @param {string} str - Input string
   * @returns {string} Capitalized string
   */
  capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  /**
   * Get default HTML template
   * @returns {string} HTML template
   */
  getDefaultTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <style>
    :root {
      --color-primary: #4f46e5;
      --color-secondary: #6366f1;
      --color-success: #10b981;
      --color-warning: #f59e0b;
      --color-danger: #ef4444;
      --color-gray-50: #f9fafb;
      --color-gray-100: #f3f4f6;
      --color-gray-200: #e5e7eb;
      --color-gray-300: #d1d5db;
      --color-gray-400: #9ca3af;
      --color-gray-500: #6b7280;
      --color-gray-600: #4b5563;
      --color-gray-700: #374151;
      --color-gray-800: #1f2937;
      --color-gray-900: #111827;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.5;
      color: var(--color-gray-800);
      background-color: var(--color-gray-50);
      margin: 0;
      padding: 0;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    header {
      background-color: white;
      padding: 1.5rem 2rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
    }
    
    h1 {
      margin: 0;
      color: var(--color-gray-900);
      font-size: 1.875rem;
      font-weight: 700;
    }
    
    .metadata {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-top: 1rem;
      color: var(--color-gray-600);
    }
    
    .metadata-item {
      display: flex;
      align-items: center;
    }
    
    .metadata-item strong {
      margin-right: 0.5rem;
    }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .summary-card {
      background-color: white;
      padding: 1.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .summary-card h3 {
      margin-top: 0;
      color: var(--color-gray-700);
      font-size: 1.25rem;
    }
    
    .summary-value {
      font-size: 2.25rem;
      font-weight: 700;
      color: var(--color-primary);
      margin: 0.5rem 0;
    }
    
    .severity-counts {
      display: flex;
      justify-content: space-between;
      margin-top: 1rem;
    }
    
    .severity-count {
      text-align: center;
      flex: 1;
    }
    
    .severity-count-value {
      font-size: 1.5rem;
      font-weight: 600;
    }
    
    .severity-count-label {
      font-size: 0.875rem;
      color: var(--color-gray-600);
    }
    
    .severity-high .severity-count-value {
      color: var(--color-danger);
    }
    
    .severity-medium .severity-count-value {
      color: var(--color-warning);
    }
    
    .severity-low .severity-count-value {
      color: var(--color-success);
    }
    
    .severity-group {
      margin-bottom: 2rem;
    }
    
    .severity-group h3 {
      padding: 0.75rem 1.5rem;
      border-radius: 0.375rem;
      font-size: 1.25rem;
      margin-bottom: 1.5rem;
    }
    
    .severity-high h3 {
      background-color: rgba(239, 68, 68, 0.1);
      color: var(--color-danger);
    }
    
    .severity-medium h3 {
      background-color: rgba(245, 158, 11, 0.1);
      color: var(--color-warning);
    }
    
    .severity-low h3 {
      background-color: rgba(16, 185, 129, 0.1);
      color: var(--color-success);
    }
    
    .comparison-item {
      background-color: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    
    .comparison-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--color-gray-200);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    
    .comparison-header h4 {
      margin: 0;
      font-size: 1.125rem;
      color: var(--color-gray-800);
    }
    
    .comparison-meta {
      display: flex;
      gap: 1.5rem;
      font-size: 0.875rem;
    }
    
    .match-score, .match-percentage {
      display: inline-flex;
      align-items: center;
      color: var(--color-gray-700);
    }
    
    .comparison-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      padding: 1.5rem;
      background-color: var(--color-gray-50);
    }
    
    .component-info, .element-info {
      background-color: white;
      padding: 1rem;
      border-radius: 0.375rem;
      border: 1px solid var(--color-gray-200);
    }
    
    .component-info h5, .element-info h5 {
      margin-top: 0;
      margin-bottom: 0.75rem;
      color: var(--color-gray-700);
      font-size: 1rem;
    }
    
    .info-row {
      display: flex;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }
    
    .info-row span {
      font-weight: 600;
      min-width: 80px;
      color: var(--color-gray-600);
    }
    
    .property-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    
    .property-table th {
      background-color: var(--color-gray-100);
      text-align: left;
      padding: 0.75rem 1.5rem;
      border-bottom: 2px solid var(--color-gray-300);
      color: var(--color-gray-700);
    }
    
    .property-table td {
      padding: 0.75rem 1.5rem;
      border-bottom: 1px solid var(--color-gray-200);
      vertical-align: top;
    }
    
    .property-table tr:last-child td {
      border-bottom: none;
    }
    
    .property-table tr.match {
      background-color: rgba(16, 185, 129, 0.05);
    }
    
    .property-table tr.mismatch {
      background-color: rgba(239, 68, 68, 0.05);
    }
    
    .status-cell {
      font-weight: 600;
    }
    
    .status-cell.match {
      color: var(--color-success);
    }
    
    .status-cell.mismatch {
      color: var(--color-danger);
    }
    
    .no-data {
      padding: 2rem;
      text-align: center;
      background-color: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      color: var(--color-gray-500);
    }
    
    footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--color-gray-200);
      text-align: center;
      color: var(--color-gray-500);
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>{{title}}</h1>
      <div class="metadata">
        <div class="metadata-item">
          <strong>Figma File:</strong> {{figmaFileName}}
        </div>
        <div class="metadata-item">
          <strong>Web URL:</strong> {{webUrl}}
        </div>
        <div class="metadata-item">
          <strong>Generated:</strong> {{timestamp}}
        </div>
      </div>
    </header>
    
    <div class="summary">
      <div class="summary-card">
        <h3>Components Analyzed</h3>
        <div class="summary-value">{{componentsAnalyzed}}</div>
      </div>
      
      <div class="summary-card">
        <h3>Overall Match Percentage</h3>
        <div class="summary-value">{{matchPercentage}}%</div>
        <div>Severity: <strong>{{overallSeverity}}</strong></div>
      </div>
      
      <div class="summary-card">
        <h3>Issues by Severity</h3>
        <div class="severity-counts">
          <div class="severity-count severity-high">
            <div class="severity-count-value">{{highSeverityCount}}</div>
            <div class="severity-count-label">High</div>
          </div>
          <div class="severity-count severity-medium">
            <div class="severity-count-value">{{mediumSeverityCount}}</div>
            <div class="severity-count-label">Medium</div>
          </div>
          <div class="severity-count severity-low">
            <div class="severity-count-value">{{lowSeverityCount}}</div>
            <div class="severity-count-label">Low</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="comparison-results">
      {{comparisonTables}}
    </div>
    
    <!-- DevRev Issues Table Section -->
    {{devrevIssuesTable}}
    
    <footer>
      <p>Generated by Figma-Web Comparison Tool</p>
    </footer>
  </div>
  
  <script>
    // Store comparison data for interactive features
    const comparisonData = {{jsonData}};
    
    // Add interactive features here if needed
  </script>
  
  <!-- DevRev Table Styles -->
  {{devrevTableStyles}}
  
  <!-- DevRev Table Scripts -->
  {{devrevTableScripts}}
</body>
</html>`;
  }

  /**
   * Replace placeholders for web-only extraction reports
   * @param {string} html - HTML template
   * @param {Object} comparisonResults - Comparison results
   * @returns {string} HTML content
   */
  replaceWebOnlyPlaceholders(html, comparisonResults) {
    const webData = comparisonResults.webData || {};
    const elements = webData.elements || [];
    const colorPalette = webData.colorPalette || [];
    const typography = webData.typography || { fontFamilies: [], fontSizes: [], fontWeights: [] };
    
    // Basic info
    html = html.replaceAll('{{title}}', `Web Extraction Report - ${new Date().toLocaleString()}`);
    html = html.replaceAll('{{webUrl}}', webData.url || 'Unknown Web URL');
    html = html.replaceAll('{{timestamp}}', comparisonResults.timestamp || new Date().toISOString());
    
    // Summary data
    html = html.replaceAll('{{totalElements}}', elements.length);
    html = html.replaceAll('{{colorCount}}', colorPalette.length);
    html = html.replaceAll('{{fontFamilyCount}}', typography.fontFamilies?.length || 0);
    
    // Generate element breakdown
    const elementBreakdown = this.generateElementBreakdown(elements);
    html = html.replaceAll('{{elementBreakdown}}', elementBreakdown);
    
    // Generate color palette
    const colorPaletteHtml = this.generateColorPalette(colorPalette);
    html = html.replaceAll('{{colorPalette}}', colorPaletteHtml);
    
    // Generate typography styles
    const typographyStylesHtml = this.generateTypographyStyles(typography);
    html = html.replaceAll('{{typographyStyles}}', typographyStylesHtml);
    
    return html;
  }

  /**
   * Replace placeholders for figma-only extraction reports
   * @param {string} html - HTML template
   * @param {Object} comparisonResults - Comparison results
   * @returns {string} HTML content
   */
  replaceFigmaOnlyPlaceholders(html, comparisonResults) {
    const figmaData = comparisonResults.figmaData || {};
    const components = figmaData.components || [];
    
    // Basic info
    html = html.replaceAll('{{title}}', `Figma Extraction Report - ${new Date().toLocaleString()}`);
    html = html.replaceAll('{{figmaFileName}}', figmaData.fileName || 'Unknown Figma File');
    html = html.replaceAll('{{timestamp}}', comparisonResults.timestamp || new Date().toISOString());
    
    // Summary data
    html = html.replaceAll('{{totalComponents}}', components.length);
    html = html.replaceAll('{{designTokenCount}}', components.length); // Simplified for now
    
    // Generate component list
    const componentListHtml = this.generateComponentList(components);
    html = html.replaceAll('{{componentList}}', componentListHtml);
    
    // Generate design tokens
    const designTokensHtml = this.generateDesignTokens(figmaData);
    html = html.replaceAll('{{designTokens}}', designTokensHtml);
    
    return html;
  }

  /**
   * Generate element breakdown HTML for web extraction
   * @param {Array} elements - Web elements
   * @returns {string} HTML content
   */
  generateElementBreakdown(elements) {
    const breakdown = {};
    elements.forEach(element => {
      const tag = element.type || element.tagName || 'unknown';
      breakdown[tag] = (breakdown[tag] || 0) + 1;
    });

    return Object.entries(breakdown)
      .sort(([,a], [,b]) => b - a) // Sort by count descending
      .map(([tag, count]) => `
        <div class="element-type">
          <div class="element-count">${count}</div>
          <div class="element-label">${tag}</div>
        </div>
      `).join('');
  }

  /**
   * Generate color palette HTML
   * @param {Array} colors - Color palette
   * @returns {string} HTML content
   */
  generateColorPalette(colors) {
    if (!colors || colors.length === 0) {
      return '<div class="text-gray-600">No colors detected</div>';
    }

    return colors.map(color => `
      <div class="color-item">
        <div class="color-swatch" style="background-color: ${color};"></div>
        <div class="color-value">${color}</div>
      </div>
    `).join('');
  }

  /**
   * Generate typography styles HTML
   * @param {Object} typography - Typography data
   * @returns {string} HTML content
   */
  generateTypographyStyles(typography) {
    const sections = [];
    
    if (typography.fontFamilies && typography.fontFamilies.length > 0) {
      sections.push(`
        <div class="typography-item">
          <h4>Font Families</h4>
          <div class="typography-values">
            ${typography.fontFamilies.map(font => `<span class="typography-tag">${font}</span>`).join('')}
          </div>
        </div>
      `);
    }
    
    if (typography.fontSizes && typography.fontSizes.length > 0) {
      sections.push(`
        <div class="typography-item">
          <h4>Font Sizes</h4>
          <div class="typography-values">
            ${typography.fontSizes.map(size => `<span class="typography-tag">${size}</span>`).join('')}
          </div>
        </div>
      `);
    }
    
    if (typography.fontWeights && typography.fontWeights.length > 0) {
      sections.push(`
        <div class="typography-item">
          <h4>Font Weights</h4>
          <div class="typography-values">
            ${typography.fontWeights.map(weight => `<span class="typography-tag">${weight}</span>`).join('')}
          </div>
        </div>
      `);
    }

    return sections.length > 0 ? sections.join('') : '<div class="text-gray-600">No typography styles detected</div>';
  }

  /**
   * Generate component list HTML for Figma extraction
   * @param {Array} components - Figma components
   * @returns {string} HTML content
   */
  generateComponentList(components) {
    if (!components || components.length === 0) {
      return '<div class="text-gray-600">No components found</div>';
    }

    return components.map(component => `
      <div class="component-item">
        <div class="component-header">
          <div class="component-name">${component.name || 'Unnamed Component'}</div>
          <div class="component-type">${component.type || 'Unknown'}</div>
        </div>
        <div class="component-details">
          ID: ${component.id || 'N/A'}
        </div>
      </div>
    `).join('');
  }

  /**
   * Generate design tokens HTML for Figma extraction
   * @param {Object} figmaData - Figma data
   * @returns {string} HTML content
   */
  generateDesignTokens(figmaData) {
    // This is a simplified implementation
    // In a real scenario, you'd extract actual design tokens from Figma
    return `
      <div class="token-group">
        <h4>Colors</h4>
        <div class="token-values">
          <span class="token-tag">Extract from Figma</span>
        </div>
      </div>
      <div class="token-group">
        <h4>Typography</h4>
        <div class="token-values">
          <span class="token-tag">Extract from Figma</span>
        </div>
      </div>
    `;
  }
  
  /**
   * Get DevRev table styles
   * @returns {string} CSS styles for DevRev table
   */
  getDevRevTableStyles() {
    try {
      const stylesPath = path.join(__dirname, 'utils/devrevTableStyles.css');
      const styles = require('fs').readFileSync(stylesPath, 'utf8');
      return `<style>${styles}</style>`;
    } catch (error) {
      logger.warn('Failed to load DevRev table styles', error);
      return '<style>/* DevRev table styles not found */</style>';
    }
  }
  
  /**
   * Get DevRev table scripts
   * @returns {string} JavaScript for DevRev table functionality
   */
  getDevRevTableScripts() {
    try {
      const scriptsPath = path.join(__dirname, 'utils/devrevTableScripts.js');
      const scripts = require('fs').readFileSync(scriptsPath, 'utf8');
      return `<script>${scripts}</script>`;
    } catch (error) {
      logger.warn('Failed to load DevRev table scripts', error);
      return '<script>// DevRev table scripts not found</script>';
    }
  }
}

export default ReportGenerator; 