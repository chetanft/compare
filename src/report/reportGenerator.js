import { promises as fs } from 'fs';
import path from 'path';
import { getReportsDir } from '../utils/outputPaths.js';

/**
 * Report Generator
 * Generates HTML reports for design comparison results
 */
class ReportGenerator {
  constructor(config) {
    this.config = config;
    this.outputDir = config.output?.reportDir || getReportsDir();
    this.MAX_STRING_LENGTH = 1000; // Maximum length for any string value
    this.MAX_COMPONENTS = 200; // Maximum number of components to process
    this.MAX_DEVIATIONS = 50; // Maximum number of deviations per component
    this.MAX_MATCHES = 50; // Maximum number of matches per component
    this.CHUNK_SIZE = 50; // Number of components to process at once
  }

  /**
   * Generate HTML content only
   * @param {Object} comparisonData - Style comparison results
   * @param {Object} visualData - Visual diff results
   * @param {Object} options - Report options
   * @param {Object} categorizedData - Optional categorized component data
   * @returns {string} HTML content
   */
  async generateHTML(comparisonData, visualData = null, options = {}, categorizedData = null) {
    try {
      return this.generateHTMLContent(comparisonData, visualData, options, categorizedData);
    } catch (error) {
      console.error('Error generating HTML content:', error);
      throw new Error(`Failed to generate HTML: ${error.message}`);
    }
  }

  /**
   * Generate complete HTML report
   * @param {Object} comparisonData - Style comparison results
   * @param {Object} visualData - Visual diff results
   * @param {Object} options - Report options
   * @param {Object} categorizedData - Optional categorized component data
   * @returns {string} Path to generated HTML report
   */
  async generateReport(comparisonData, visualData = null, options = {}, categorizedData = null) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = options.filename || `comparison-report-${timestamp}.html`;
      const reportPath = path.join(this.outputDir, filename);

      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Generate HTML content with categorized data
      const htmlContent = this.generateHTMLContent(comparisonData, visualData, options, categorizedData);

      // Write HTML file
      await fs.writeFile(reportPath, htmlContent);

      return reportPath;

    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  /**
   * Generate HTML content for the report with categorized data support
   * @param {Object} comparisonData - Style comparison results
   * @param {Object} visualData - Visual diff results
   * @param {Object} options - Report options
   * @param {Object} categorizedData - Optional categorized component data
   * @returns {string} Complete HTML content
   */
  generateHTMLContent(comparisonData, visualData, options, categorizedData = null) {
    const title = options.title || 'Figma vs Web Comparison Report';
    
    // Determine if we should show categorized view
    const showCategorized = categorizedData && categorizedData.schema;
    
    // Get raw data if provided
    const figmaData = options.figmaData;
    const webData = options.webData;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; line-height: 1.6; }
        .container { max-width: 1400px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #312e81 0%, #1e3a8a 50%, #2563eb 100%); color: white; padding: 36px; border-radius: 18px; margin-bottom: 30px; text-align: left; position: relative; overflow: hidden; }
    .header::after { content: ''; position: absolute; inset: 0; opacity: 0.35; background: radial-gradient(circle at top right, rgba(255,255,255,0.6), transparent 55%); }
    .header-content { position: relative; z-index: 1; }
    .section { background: white; padding: 32px; border-radius: 18px; margin-bottom: 30px; border: 1px solid rgba(15,23,42,0.06); box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08); }
        
        /* Navigation styles */
        .nav-tabs { display: flex; border-bottom: 1px solid #ddd; margin-bottom: 20px; }
        .nav-tab { padding: 12px 20px; background: #f8f9fa; border: 1px solid #ddd; border-bottom: none; cursor: pointer; margin-right: 2px; border-radius: 8px 8px 0 0; }
        .nav-tab.active { background: white; border-bottom: 1px solid white; margin-bottom: -1px; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        
        /* Main tab content styles */
        .main-tab-content { display: none; }
        .main-tab-content.active { display: block; }
        
        /* Accordion styles */
        .accordion { margin: 20px 0; }
        .accordion-header { background: #f8f9fa; padding: 15px 20px; border: 1px solid #ddd; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-radius: 8px; margin-bottom: 2px; }
        .accordion-header:hover { background: #e9ecef; }
        .accordion-header.active { background: #e7f3ff; border-color: #007bff; }
        .accordion-content { border: 1px solid #ddd; border-top: none; padding: 20px; background: white; display: none; border-radius: 0 0 8px 8px; }
        .accordion-content.active { display: block; }
        .accordion-icon { transition: transform 0.3s ease; }
        .accordion-icon.rotated { transform: rotate(180deg); }
        
        /* Category badges */
        .category-badge { background: #007bff; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px; }
        .category-badge.atoms { background: #28a745; }
        .category-badge.molecules { background: #17a2b8; }
        .category-badge.organisms { background: #6f42c1; }
        .category-badge.layout { background: #fd7e14; }
        .category-badge.design-tokens { background: #dc3545; }
        
        /* Component grid */
        .component-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .component-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: white; }
        .component-card h4 { margin: 0 0 10px 0; color: #333; }
        .component-card .meta { font-size: 12px; color: #666; margin-bottom: 10px; }
        .component-card .properties { font-size: 14px; }
        
        /* Table Styles */
        .comparison-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
        .comparison-table th { background: #f8f9fa; padding: 15px 12px; text-align: left; border: 1px solid #ddd; font-weight: 600; position: sticky; top: 0; z-index: 10; }
        .comparison-table td { padding: 12px; border: 1px solid #ddd; vertical-align: top; }
        .comparison-table tbody tr:nth-child(even) { background: #f9f9f9; }
        .comparison-table tbody tr:hover { background: #f1f3f4; }
        
        /* Status indicators */
        .status-match { background: #d4edda; color: #155724; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 12px; }
        .status-mismatch { background: #f8d7da; color: #721c24; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 12px; }
        .status-missing { background: #fff3cd; color: #856404; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 12px; }
        .status-unfetched { background: #e2f3ff; color: #0066cc; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 12px; }
        
        /* Property categories */
        .prop-color { background: #e3f2fd; border-left: 4px solid #2196f3; }
        .prop-typography { background: #f3e5f5; border-left: 4px solid #9c27b0; }
        .prop-spacing { background: #e8f5e8; border-left: 4px solid #4caf50; }
        .prop-layout { background: #fff3e0; border-left: 4px solid #ff9800; }
        .prop-border { background: #fce4ec; border-left: 4px solid #e91e63; }
        
        /* Color swatches */
        .color-swatch { display: inline-block; width: 20px; height: 20px; border-radius: 3px; border: 1px solid #ccc; vertical-align: middle; margin-right: 8px; }
        .color-value { font-family: 'Courier New', monospace; font-size: 12px; }
        
        /* Typography samples */
        .typography-sample { border: 1px solid #ddd; padding: 6px 10px; border-radius: 4px; display: inline-block; background: white; margin: 2px 0; }
        
        /* Component sections */
        .component-section { margin: 30px 0; }
        .component-title { background: #343a40; color: white; padding: 15px; margin: 0; font-size: 18px; border-radius: 8px 8px 0 0; }
        
        /* Summary cards */
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; margin: 20px 0; }
    .summary-card { background: linear-gradient(145deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95)); padding: 24px; border-radius: 16px; border: 1px solid rgba(15,23,42,0.08); box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.15); position: relative; overflow: hidden; }
    .summary-card::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at top right, rgba(37,99,235,0.18), transparent 60%); opacity: 0.8; }
    .summary-card-content { position: relative; z-index: 1; }
    .summary-card h3 { margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 600; }
    .summary-card .number { font-size: 3rem; font-weight: 700; margin: 12px 0; display: block; color: #1d4ed8; letter-spacing: -0.04em; }
    .summary-card .label { color: #475569; font-size: 14px; text-transform: uppercase; letter-spacing: 0.15em; }
        
        /* Property type labels */
        .prop-label { font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
        .prop-label.color { color: #2196f3; }
        .prop-label.typography { color: #9c27b0; }
        .prop-label.spacing { color: #4caf50; }
        .prop-label.layout { color: #ff9800; }
        .prop-label.border { color: #e91e63; }
        
        /* Reason text */
        .reason-text { font-style: italic; color: #666; font-size: 13px; margin-top: 4px; }
        
        /* Count indicators */
        .count-indicator { background: #6c757d; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px; margin-left: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <button onclick="history.back()" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; backdrop-filter: blur(10px);">
                    ← Back to Reports
                </button>
                <div style="text-align: right; font-size: 12px; opacity: 0.8;">
                    Generated: ${new Date().toLocaleString()}
                </div>
            </div>
            <h1>Design Comparison Report</h1>
            <p>Detailed Element-by-Element Analysis</p>
        </div>
        
        <!-- Main Data Tabs -->
        <div class="section">
          <div class="nav-tabs">
            <div class="nav-tab active" onclick="showMainTab('figma-data')">
              🎨 Figma Data
            </div>
            <div class="nav-tab" onclick="showMainTab('web-data')">
              🌐 Web Data  
            </div>
            <div class="nav-tab" onclick="showMainTab('comparison-data')">
              🔍 Comparison Analysis
            </div>
          </div>
        </div>
        
        <!-- Figma Data Tab -->
        <div id="figma-data-content" class="main-tab-content active">
          ${this.generateFigmaDataTab(figmaData)}
        </div>
        
        <!-- Web Data Tab -->
        <div id="web-data-content" class="main-tab-content">
          ${this.generateWebDataTab(webData)}
        </div>
        
        <!-- Comparison Data Tab -->
        <div id="comparison-data-content" class="main-tab-content">
          ${showCategorized ? this.generateCategorizedNavigation() : ''}
          ${showCategorized ? this.generateCategorizedContent(categorizedData, comparisonData) : ''}
          ${this.generateSummarySection(comparisonData)}
          ${!showCategorized ? this.generateDetailedComparisonTable(comparisonData.comparisons || []) : ''}
          ${this.generateColorAnalysis(comparisonData.comparisons || [])}
          ${this.generateTypographyAnalysis(comparisonData.comparisons || [])}
        </div>
    </div>
    
    <script>
        // Main tab functionality
        function showMainTab(tabName) {
            // Hide all main tab contents
            const mainTabs = document.querySelectorAll('.main-tab-content');
            mainTabs.forEach(tab => tab.classList.remove('active'));
            
            // Hide all main nav tabs
            const mainNavTabs = document.querySelectorAll('.section .nav-tabs .nav-tab');
            mainNavTabs.forEach(tab => tab.classList.remove('active'));
            
            // Show selected main tab content
            const selectedContent = document.getElementById(tabName + '-content');
            if (selectedContent) {
                selectedContent.classList.add('active');
            }
            
            // Show selected main nav tab
            const selectedTab = event.target;
            if (selectedTab) {
                selectedTab.classList.add('active');
            }
        }
        
        // Sub-tab functionality for categorized content
        function showTab(tabName) {
            // Hide all sub-tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Remove active class from all tabs
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab content
            const targetContent = document.getElementById(tabName + '-content');
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            // Add active class to selected tab
            const targetTab = document.querySelector('[onclick="showTab(\\''+tabName+'\\')"]');
            if (targetTab) {
                targetTab.classList.add('active');
            }
        }
        
        // Accordion functionality
        function toggleAccordion(element) {
            const content = element.nextElementSibling;
            const icon = element.querySelector('.accordion-icon');
            
            if (content.classList.contains('active')) {
                content.classList.remove('active');
                element.classList.remove('active');
                icon.classList.remove('rotated');
            } else {
                content.classList.add('active');
                element.classList.add('active');
                icon.classList.add('rotated');
            }
        }
        
        // Initialize first tab as active
        document.addEventListener('DOMContentLoaded', function() {
            const firstTab = document.querySelector('.nav-tab');
            if (firstTab) {
                firstTab.click();
            }
        });
    </script>
</body>
</html>`;
  }

  generateSummarySection(comparisonData) {
    const totalComponents = comparisonData.comparisons?.length || 0;
    const totalDeviations = comparisonData.metadata?.summary?.totalDeviations || 0;
    const totalMatches = comparisonData.metadata?.summary?.matches || 0;
    const totalUnfetched = this.countUnfetchedProperties(comparisonData.comparisons || []);
    
    const matchPercentage = totalComponents > 0 ? Math.round(((totalMatches) / (totalMatches + totalDeviations + totalUnfetched)) * 100) : 0;
    
    const severityBreakdown = comparisonData.metadata?.summary?.severity || { high: 0, medium: 0, low: 0 };
    const colorIssues = this.countIssuesByType(comparisonData.comparisons, 'color');
    const typographyIssues = this.countIssuesByType(comparisonData.comparisons, 'typography');
    const spacingIssues = this.countIssuesByType(comparisonData.comparisons, 'spacing');

    return `
    <div class="section">
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <h3>Total Components</h3>
          <span class="number">${totalComponents}</span>
          <span class="label">Elements analyzed</span>
        </div>
        <div class="summary-card">
          <h3>Match Rate</h3>
          <span class="number">${matchPercentage}%</span>
          <span class="label">Design consistency</span>
        </div>
        <div class="summary-card">
          <h3>Total Issues</h3>
          <span class="number">${totalDeviations}</span>
          <span class="label">Deviations found</span>
        </div>
        <div class="summary-card">
          <h3>Unfetched Data</h3>
          <span class="number">${totalUnfetched}</span>
          <span class="label">Properties not available</span>
        </div>
        <div class="summary-card">
          <h3>Critical Issues</h3>
          <span class="number">${severityBreakdown.high}</span>
          <span class="label">High priority fixes</span>
        </div>
        <div class="summary-card">
          <h3>Color Issues</h3>
          <span class="number">${colorIssues}</span>
          <span class="label">Color mismatches</span>
        </div>
      </div>
    </div>`;
  }

  countUnfetchedProperties(comparisons) {
    let count = 0;
    comparisons.forEach(comp => {
      if (comp.unfetched && comp.unfetched.length > 0) {
        count += comp.unfetched.length;
      }
    });
    return count;
  }

  generateDetailedComparisonTable(comparisons) {
    if (!comparisons || comparisons.length === 0) {
      return '<div class="section"><h2>No comparisons available</h2></div>';
    }

    // Prevent oversized HTML by limiting processed comparisons & rows
    const MAX_COMPARISONS = 500; // Safety cap
    const MAX_ROWS = 10000; // Absolute row cap

    const tableRows = [];
    let rowCount = 0;

    (comparisons.slice(0, MAX_COMPARISONS)).forEach(comp => {
      const componentName = comp.componentName || 'Unknown Component';
      
      // Add deviations
      if (comp.deviations && comp.deviations.length > 0) {
        comp.deviations.forEach(dev => {
          if (rowCount >= MAX_ROWS) return;
          tableRows.push(this.createTableRow(
            componentName,
            dev.property,
            this.formatValue(dev.property, dev.figmaValue),
            this.formatValue(dev.property, dev.webValue),
            'MISMATCH',
            dev.message || `${dev.property} values don't match`,
            dev.severity || 'medium'
          ));
          rowCount++;
        });
      }
      
      // Add matches
      if (comp.matches && comp.matches.length > 0) {
        comp.matches.forEach(match => {
          if (rowCount >= MAX_ROWS) return;
          tableRows.push(this.createTableRow(
            componentName,
            match.property,
            this.formatValue(match.property, match.value),
            this.formatValue(match.property, match.value),
            'MATCH',
            match.message || `${match.property} values match`,
            'low'
          ));
          rowCount++;
        });
      }
      
      // Add unfetched properties
      if (comp.unfetched && comp.unfetched.length > 0) {
        comp.unfetched.forEach(unfetched => {
          if (rowCount >= MAX_ROWS) return;
          tableRows.push(this.createTableRow(
            componentName,
            unfetched.property,
            unfetched.figmaValue || 'Not available',
            unfetched.webValue || 'Not available',
            'UNFETCHED',
            unfetched.message || `${unfetched.property} data not available`,
            'info'
          ));
          rowCount++;
        });
      }
      
      // Add missing elements if any
      if (comp.missing && comp.missing.length > 0) {
        comp.missing.forEach(missing => {
          if (rowCount >= MAX_ROWS) return;
          tableRows.push(this.createTableRow(
            componentName,
            missing.property || 'Element',
            missing.figmaValue || 'Present',
            'Not Found',
            'MISSING',
            missing.message || 'Element not found in web implementation',
            'high'
          ));
          rowCount++;
        });
      }
    });

    return `
    <div class="section">
      <h2>Detailed Comparison Table</h2>
      ${rowCount >= MAX_ROWS ? `<p><em>Showing first ${MAX_ROWS.toLocaleString()} rows. Table truncated for size.</em></p>` : ''}
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Component/Element</th>
            <th>Property</th>
            <th>Figma Design</th>
            <th>Web Implementation</th>
            <th>Status</th>
            <th>Details/Reason</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows.join('')}
        </tbody>
      </table>
    </div>`;
  }

  createTableRow(component, property, figmaValue, webValue, status, reason, severity = 'medium') {
    const statusClass = status === 'MATCH' ? 'status-match' : 
                       status === 'MISSING' ? 'status-missing' : 
                       status === 'UNFETCHED' ? 'status-unfetched' : 'status-mismatch';
    
    const propertyType = this.getPropertyType(property);
    const rowClass = severity === 'high' ? 'severity-high' : '';

    return `
      <tr class="${rowClass}">
        <td><strong>${component}</strong></td>
        <td>
          <span class="prop-label ${propertyType}">${propertyType}</span><br>
          <strong>${property}</strong>
        </td>
        <td>${figmaValue}</td>
        <td>${webValue}</td>
        <td><span class="${statusClass}">${status}</span></td>
        <td>
          <div>${reason}</div>
          ${status === 'MISMATCH' ? this.generateMismatchDetails(property, figmaValue, webValue) : ''}
        </td>
      </tr>`;
  }

  formatValue(property, value) {
    if (!value) return 'N/A';
    
    // Handle color values
    if (this.isColorProperty(property)) {
      const color = this.normalizeColor(value);
      return `<div><span class="color-swatch" style="background-color: ${color};"></span><span class="color-value">${color}</span></div>`;
    }
    
    // Handle typography values
    if (this.isTypographyProperty(property)) {
      return `<div class="typography-sample" style="${this.getTypographyStyle(property, value)}">${value}</div>`;
    }
    
    // Default formatting
    return `<code>${value}</code>`;
  }

  generateMismatchDetails(property, figmaValue, webValue) {
    if (this.isColorProperty(property)) {
      return `<div class="reason-text">Color difference detected</div>`;
    }
    if (this.isTypographyProperty(property)) {
      return `<div class="reason-text">Typography mismatch</div>`;
    }
    if (this.isSpacingProperty(property)) {
      const diff = this.calculateSpacingDiff(figmaValue, webValue);
      return `<div class="reason-text">Spacing difference: ${diff}</div>`;
    }
    return '';
  }

  generateColorAnalysis(comparisons) {
    const colorIssues = [];
    const colorMatches = [];
    
    comparisons.forEach(comp => {
      [...(comp.deviations || []), ...(comp.matches || [])].forEach(item => {
        if (this.isColorProperty(item.property)) {
          if (comp.deviations?.includes(item)) {
            colorIssues.push({
              component: comp.componentName,
              property: item.property,
              figma: item.figmaValue,
              web: item.webValue,
              message: item.message
            });
          } else {
            colorMatches.push({
              component: comp.componentName,
              property: item.property,
              value: item.value
            });
          }
        }
      });
    });

    if (colorIssues.length === 0 && colorMatches.length === 0) {
      return '';
    }

    return `
    <div class="section">
      <h2>Color Analysis</h2>
      ${colorIssues.length > 0 ? `
        <h3>Color Mismatches (${colorIssues.length})</h3>
        <table class="comparison-table">
          <thead>
            <tr><th>Component</th><th>Property</th><th>Figma Color</th><th>Web Color</th><th>Issue</th></tr>
          </thead>
          <tbody>
            ${colorIssues.map(issue => `
              <tr class="prop-color">
                <td>${issue.component}</td>
                <td>${issue.property}</td>
                <td>${this.formatValue(issue.property, issue.figma)}</td>
                <td>${this.formatValue(issue.property, issue.web)}</td>
                <td>${issue.message}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
      
      ${colorMatches.length > 0 ? `
        <h3>Color Matches (${colorMatches.length})</h3>
        <div style="margin: 10px 0;">
          ${colorMatches.map(match => 
            `<span style="margin: 5px; display: inline-block;">${this.formatValue(match.property, match.value)} ${match.property}</span>`
          ).join('')}
        </div>
      ` : ''}
    </div>`;
  }

  generateTypographyAnalysis(comparisons) {
    const typographyIssues = [];
    const typographyMatches = [];
    
    comparisons.forEach(comp => {
      [...(comp.deviations || []), ...(comp.matches || [])].forEach(item => {
        if (this.isTypographyProperty(item.property)) {
          if (comp.deviations?.includes(item)) {
            typographyIssues.push({
              component: comp.componentName,
              property: item.property,
              figma: item.figmaValue,
              web: item.webValue,
              message: item.message
            });
          } else {
            typographyMatches.push({
              component: comp.componentName,
              property: item.property,
              value: item.value
            });
          }
        }
      });
    });

    if (typographyIssues.length === 0 && typographyMatches.length === 0) {
      return '';
    }

    return `
    <div class="section">
      <h2>Typography Analysis</h2>
      ${typographyIssues.length > 0 ? `
        <h3>Typography Issues (${typographyIssues.length})</h3>
        <table class="comparison-table">
          <thead>
            <tr><th>Component</th><th>Property</th><th>Figma Value</th><th>Web Value</th><th>Issue</th></tr>
          </thead>
          <tbody>
            ${typographyIssues.map(issue => `
              <tr class="prop-typography">
                <td>${issue.component}</td>
                <td>${issue.property}</td>
                <td>${this.formatValue(issue.property, issue.figma)}</td>
                <td>${this.formatValue(issue.property, issue.web)}</td>
                <td>${issue.message}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    </div>`;
  }

  // Helper methods
  getPropertyType(property) {
    if (this.isColorProperty(property)) return 'color';
    if (this.isTypographyProperty(property)) return 'typography';
    if (this.isSpacingProperty(property)) return 'spacing';
    if (this.isBorderProperty(property)) return 'border';
    return 'layout';
  }

  isColorProperty(property) {
    return ['backgroundColor', 'color', 'borderColor', 'fill', 'stroke'].includes(property);
  }

  isTypographyProperty(property) {
    return ['fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign'].includes(property);
  }

  isSpacingProperty(property) {
    return ['padding', 'margin', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 
            'marginTop', 'marginRight', 'marginBottom', 'marginLeft'].includes(property);
  }

  isBorderProperty(property) {
    return ['border', 'borderWidth', 'borderStyle', 'borderRadius'].includes(property);
  }

  normalizeColor(color) {
    if (!color) return '#000000';
    return color.toString();
  }

  getTypographyStyle(property, value) {
    if (property === 'fontSize') return `font-size: ${value};`;
    if (property === 'fontFamily') return `font-family: ${value};`;
    if (property === 'fontWeight') return `font-weight: ${value};`;
    return '';
  }

  calculateSpacingDiff(figmaValue, webValue) {
    const figmaNum = parseFloat(figmaValue);
    const webNum = parseFloat(webValue);
    if (isNaN(figmaNum) || isNaN(webNum)) return 'N/A';
    return `${Math.abs(figmaNum - webNum)}px`;
  }

  countIssuesByType(comparisons, type) {
    if (!comparisons) return 0;
    let count = 0;
    comparisons.forEach(comp => {
      if (comp.deviations) {
        comp.deviations.forEach(dev => {
          if (this.getPropertyType(dev.property) === type) count++;
        });
      }
    });
    return count;
  }

  /**
   * Generate JSON report
   * @param {Object} comparisonData - Style comparison results
   * @param {Object} visualData - Visual diff results
   * @param {Object} options - Report options
   * @returns {string} Path to generated JSON report
   */
  async generateJSONReport(comparisonData, visualData, options = {}) {
    try {
      const reportPath = path.join(this.outputDir, `comparison-${Date.now()}.json`);
      const writeStream = fs.createWriteStream(reportPath);

      // Start JSON object
      writeStream.write('{\n');

      // Write metadata and summary first
      await this.writeJSONChunk(writeStream, '"metadata":', comparisonData.metadata || {});
      writeStream.write(',\n');
      
      await this.writeJSONChunk(writeStream, '"summary":', comparisonData.summary || {});
      writeStream.write(',\n');

      // Start comparisons array
      writeStream.write('"comparisons": [\n');

      // Process comparisons in chunks
      const comparisons = comparisonData.comparisons || [];
      const chunks = this.chunkArray(comparisons, this.CHUNK_SIZE || 10);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const processedChunk = await this.processJSONChunk(chunk);
        
        // Write each comparison in the chunk
        for (let j = 0; j < processedChunk.length; j++) {
          const comparison = processedChunk[j];
          const isLastInChunk = j === processedChunk.length - 1;
          const isLastChunk = i === chunks.length - 1;

          // Write the comparison
          await this.writeJSONChunk(writeStream, null, comparison);

          // Add comma if not last item
          if (!isLastInChunk || !isLastChunk) {
            writeStream.write(',\n');
          } else {
            writeStream.write('\n');
          }
        }

        // Report progress
        if (options.onProgress) {
          const progress = ((i + 1) / chunks.length) * 100;
          options.onProgress({
            stage: 'json_generation',
            progress,
            currentChunk: i + 1,
            totalChunks: chunks.length
          });
        }
      }

      // Close comparisons array
      writeStream.write('],\n');

      // Write visual comparison data if present
      if (visualData) {
        await this.writeJSONChunk(writeStream, '"visualComparison":', visualData);
        writeStream.write(',\n');
      }

      // Write closing brace
      writeStream.write('}\n');

      // Close the stream
      await new Promise((resolve, reject) => {
        writeStream.end(err => {
          if (err) reject(err);
          else resolve();
        });
      });

      return reportPath;

    } catch (error) {
      console.error('Error generating JSON report:', error);
      throw error;
    }
  }

  // Helper method to write JSON chunks
  async writeJSONChunk(writeStream, key, data) {
    return new Promise((resolve, reject) => {
      try {
        if (key) {
          writeStream.write(`${key} `);
        }
        
        // Convert data to string in smaller chunks if needed
        const jsonString = JSON.stringify(data, null, 2);
        const chunkSize = 1024 * 1024; // 1MB chunks
        
        for (let i = 0; i < jsonString.length; i += chunkSize) {
          const chunk = jsonString.slice(i, i + chunkSize);
          writeStream.write(chunk);
        }
        
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate report summary
   */
  generateReportSummary(comparisonData, visualData) {
    const metadata = comparisonData.metadata || {};
    const totalComparisons = comparisonData.comparisons?.length || 0;
    const totalDeviations = metadata.totalDeviations || 0;
    
    return {
      overallScore: totalComparisons > 0 ? 
        Math.round(((totalComparisons - totalDeviations) / totalComparisons) * 100) : 0,
      totalComponents: totalComparisons,
      totalDeviations,
      severityBreakdown: metadata.severity || { high: 0, medium: 0, low: 0 },
      visualSimilarity: visualData?.summary?.avgSimilarity || null,
      recommendations: this.generateRecommendations(comparisonData, visualData)
    };
  }

  /**
   * Generate recommendations based on results
   */
  generateRecommendations(comparisonData, visualData) {
    const recommendations = [];
    const metadata = comparisonData.metadata || {};
    const severity = metadata.severity || {};

    if (severity.high > 0) {
      recommendations.push(`Address ${severity.high} high-severity deviations immediately`);
    }
    if (severity.medium > 5) {
      recommendations.push('Review medium-severity deviations for design consistency');
    }
    if (visualData && visualData.summary?.avgSimilarity < 80) {
      recommendations.push('Significant visual differences detected - review implementation');
    }
    if (metadata.totalDeviations === 0) {
      recommendations.push('Excellent design implementation - maintain consistency');
    }

    return recommendations;
  }

  /**
   * Generate categorized navigation tabs
   */
  generateCategorizedNavigation() {
    return `
    <div class="section">
      <div class="nav-tabs">
        <div class="nav-tab active" onclick="showTab('design-tokens')">
          🎨 Design Tokens <span class="category-badge design-tokens">System</span>
        </div>
        <div class="nav-tab" onclick="showTab('atoms')">
          ⚛️ Atoms <span class="category-badge atoms">Basic</span>
        </div>
        <div class="nav-tab" onclick="showTab('molecules')">
          🧬 Molecules <span class="category-badge molecules">Combined</span>
        </div>
        <div class="nav-tab" onclick="showTab('organisms')">
          🦠 Organisms <span class="category-badge organisms">Complex</span>
        </div>
        <div class="nav-tab" onclick="showTab('layout')">
          📐 Layout <span class="category-badge layout">Structure</span>
        </div>
        <div class="nav-tab" onclick="showTab('comparison')">
          🔍 Detailed Comparison <span class="category-badge">Analysis</span>
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate categorized content sections
   */
  generateCategorizedContent(categorizedData, comparisonData) {
    return `
      ${this.generateDesignTokensTab(categorizedData)}
      ${this.generateAtomsTab(categorizedData)}
      ${this.generateMoleculesTab(categorizedData)}
      ${this.generateOrganismsTab(categorizedData)}
      ${this.generateLayoutTab(categorizedData)}
      ${this.generateComparisonTab(comparisonData)}
    `;
  }

  /**
   * Generate Design Tokens tab content
   */
  generateDesignTokensTab(categorizedData) {
    const tokens = categorizedData.designTokens || {};
    
    return `
    <div id="design-tokens-content" class="tab-content">
      <div class="section">
        <h2>🎨 Design Token Analysis</h2>
        <p>Foundational design elements that maintain consistency across your design system.</p>
        
        <div class="accordion">
          ${this.generateTokenAccordion('Colors', 'colors', tokens.colors, '#2196f3')}
          ${this.generateTokenAccordion('Typography', 'typography', tokens.typography, '#9c27b0')}
          ${this.generateTokenAccordion('Spacing', 'spacing', tokens.spacing, '#4caf50')}
          ${this.generateTokenAccordion('Shadows', 'shadows', tokens.shadows, '#ff9800')}
          ${this.generateTokenAccordion('Border Radius', 'borderRadius', tokens.borderRadius, '#e91e63')}
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate Atoms tab content
   */
  generateAtomsTab(categorizedData) {
    const atoms = categorizedData.schema?.atoms || {};
    
    return `
    <div id="atoms-content" class="tab-content">
      <div class="section">
        <h2>⚛️ Atomic Design Elements</h2>
        <p>Basic building blocks that cannot be broken down further without losing functionality.</p>
        
        <div class="accordion">
          ${this.generateComponentAccordion('Typography', atoms.typography, '📝')}
          ${this.generateComponentAccordion('Buttons', atoms.buttons, '🔘')}
          ${this.generateComponentAccordion('Icons', atoms.icons, '🎯')}
          ${this.generateComponentAccordion('Inputs', atoms.inputs, '📝')}
          ${this.generateComponentAccordion('Badges', atoms.badges, '🏷️')}
          ${this.generateComponentAccordion('Dividers', atoms.dividers, '➖')}
          ${this.generateComponentAccordion('Loaders', atoms.loaders, '⏳')}
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate Molecules tab content
   */
  generateMoleculesTab(categorizedData) {
    const molecules = categorizedData.schema?.molecules || {};
    
    return `
    <div id="molecules-content" class="tab-content">
      <div class="section">
        <h2>🧬 Molecular Components</h2>
        <p>Groups of atoms bonded together to form relatively simple, reusable components.</p>
        
        <div class="accordion">
          ${this.generateComponentAccordion('Cards', molecules.cards, '🃏')}
          ${this.generateComponentAccordion('Navigation', molecules.navigation, '🧭')}
          ${this.generateComponentAccordion('Form Groups', molecules.formGroups, '📋')}
          ${this.generateComponentAccordion('Search Boxes', molecules.searchBoxes, '🔍')}
          ${this.generateComponentAccordion('Tabs', molecules.tabs, '📑')}
          ${this.generateComponentAccordion('Dropdowns', molecules.dropdowns, '📋')}
          ${this.generateComponentAccordion('Modals', molecules.modals, '🖼️')}
          ${this.generateComponentAccordion('Pagination', molecules.pagination, '📄')}
          ${this.generateComponentAccordion('Accordions', molecules.accordions, '📁')}
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate Organisms tab content
   */
  generateOrganismsTab(categorizedData) {
    const organisms = categorizedData.schema?.organisms || {};
    
    return `
    <div id="organisms-content" class="tab-content">
      <div class="section">
        <h2>🦠 Organism Components</h2>
        <p>Complex interface components made up of groups of molecules and atoms.</p>
        
        <div class="accordion">
          ${this.generateComponentAccordion('Headers', organisms.headers, '🔝')}
          ${this.generateComponentAccordion('Footers', organisms.footers, '🔚')}
          ${this.generateComponentAccordion('Sidebars', organisms.sidebars, '⏸️')}
          ${this.generateComponentAccordion('Tables', organisms.tables, '📊')}
          ${this.generateComponentAccordion('Forms', organisms.forms, '📝')}
          ${this.generateComponentAccordion('Galleries', organisms.galleries, '🖼️')}
          ${this.generateComponentAccordion('Dashboards', organisms.dashboards, '📈')}
          ${this.generateComponentAccordion('Articles', organisms.articles, '📰')}
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate Layout tab content
   */
  generateLayoutTab(categorizedData) {
    const layout = categorizedData.schema?.layout || {};
    
    return `
    <div id="layout-content" class="tab-content">
      <div class="section">
        <h2>📐 Layout Systems</h2>
        <p>Structural patterns and layout mechanisms used to organize content.</p>
        
        <div class="accordion">
          ${this.generateComponentAccordion('Flexbox', layout.flexbox, '📐')}
          ${this.generateComponentAccordion('Grid Systems', layout.grids, '⊞')}
          ${this.generateComponentAccordion('Containers', layout.containers, '📦')}
          ${this.generateComponentAccordion('Positioning', layout.positioning, '📍')}
        </div>
      </div>
    </div>`;
  }

  /**
   * Generate Comparison tab content
   */
  generateComparisonTab(comparisonData) {
    return `
    <div id="comparison-content" class="tab-content">
      ${this.generateDetailedComparisonTable(comparisonData.comparisons || [])}
    </div>`;
  }

  /**
   * Extract standardized properties from component for property-level comparison
   */
  extractComponentProperties(component, source) {
    const properties = [];
    
    if (source === 'figma') {
      // Extract Figma component properties with standard naming
      if (component.properties?.color) {
        properties.push({ name: 'color', value: component.properties.color, component: component.name });
      }
      if (component.properties?.backgroundColor) {
        properties.push({ name: 'backgroundColor', value: component.properties.backgroundColor, component: component.name });
      }
      if (component.properties?.typography) {
        const typo = component.properties.typography;
        properties.push({ 
          name: 'typography', 
          value: `${typo.fontFamily} ${typo.fontSize}px ${typo.fontWeight}`, 
          component: component.name 
        });
        if (typo.fontFamily) {
          properties.push({ name: 'fontFamily', value: typo.fontFamily, component: component.name });
        }
        if (typo.fontSize) {
          properties.push({ name: 'fontSize', value: `${typo.fontSize}px`, component: component.name });
        }
      }
      if (component.properties?.spacing) {
        Object.entries(component.properties.spacing).forEach(([prop, value]) => {
          properties.push({ 
            name: 'spacing', 
            value: `${value}px (${prop})`, 
            component: component.name 
          });
        });
      }
      if (component.properties?.borderRadius) {
        properties.push({ 
          name: 'borderRadius', 
          value: `${component.properties.borderRadius}px`, 
          component: component.name 
        });
      }
      if (component.properties?.width) {
        properties.push({ name: 'width', value: `${component.properties.width}px`, component: component.name });
      }
      if (component.properties?.height) {
        properties.push({ name: 'height', value: `${component.properties.height}px`, component: component.name });
      }
      
    } else if (source === 'web') {
      // Extract web component properties with standard naming
      if (component.styles?.color) {
        properties.push({ name: 'color', value: component.styles.color, component: component.selector });
      }
      if (component.styles?.backgroundColor && component.styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        properties.push({ name: 'backgroundColor', value: component.styles.backgroundColor, component: component.selector });
      }
      if (component.styles?.fontFamily && component.styles?.fontSize) {
        properties.push({ 
          name: 'typography', 
          value: `${component.styles.fontFamily} ${component.styles.fontSize} ${component.styles.fontWeight || 'normal'}`, 
          component: component.selector 
        });
        properties.push({ name: 'fontFamily', value: component.styles.fontFamily, component: component.selector });
        properties.push({ name: 'fontSize', value: component.styles.fontSize, component: component.selector });
      }
      
      // Spacing properties
      ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 
       'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(prop => {
        if (component.styles?.[prop] && parseFloat(component.styles[prop]) > 0) {
          properties.push({ 
            name: 'spacing', 
            value: `${component.styles[prop]} (${prop})`, 
            component: component.selector 
          });
        }
      });
      
      if (component.styles?.borderRadius && component.styles.borderRadius !== '0px') {
        properties.push({ name: 'borderRadius', value: component.styles.borderRadius, component: component.selector });
      }
      if (component.styles?.width) {
        properties.push({ name: 'width', value: component.styles.width, component: component.selector });
      }
      if (component.styles?.height) {
        properties.push({ name: 'height', value: component.styles.height, component: component.selector });
      }
      if (component.styles?.display) {
        properties.push({ name: 'display', value: component.styles.display, component: component.selector });
      }
      if (component.styles?.position) {
        properties.push({ name: 'position', value: component.styles.position, component: component.selector });
      }
      if (component.styles?.flexDirection) {
        properties.push({ name: 'flexDirection', value: component.styles.flexDirection, component: component.selector });
      }
      if (component.styles?.justifyContent) {
        properties.push({ name: 'justifyContent', value: component.styles.justifyContent, component: component.selector });
      }
      if (component.styles?.alignItems) {
        properties.push({ name: 'alignItems', value: component.styles.alignItems, component: component.selector });
      }
    }
    
    return properties;
  }

  /**
   * Generate accordion section for design tokens
   */
  generateTokenAccordion(title, key, tokens, color) {
    if (!tokens || tokens.length === 0) {
      return `
      <div class="accordion-header" onclick="toggleAccordion(this)">
        <h3>${title} <span class="count-indicator">0</span></h3>
        <span class="accordion-icon">▼</span>
      </div>
      <div class="accordion-content">
        <p>No ${title.toLowerCase()} tokens found.</p>
      </div>`;
    }

    const tokenRows = tokens.slice(0, 20).map(token => {
      // Group tokens by source to compare Figma vs Web
      const figmaSources = token.sources.filter(s => s.source === 'figma');
      const webSources = token.sources.filter(s => s.source === 'web');
      
      const figmaDesign = figmaSources.length > 0 ? 
        `Found (${figmaSources.length} uses)` : 'Not found';
      
      const webImplementation = webSources.length > 0 ? 
        `Found (${webSources.length} uses)` : 'Not found';
      
      let status, statusClass;
      if (figmaSources.length > 0 && webSources.length > 0) {
        status = 'Match';
        statusClass = 'status-match';
      } else if (figmaSources.length > 0 && webSources.length === 0) {
        status = 'Missing in Web';
        statusClass = 'status-missing';
      } else if (figmaSources.length === 0 && webSources.length > 0) {
        status = 'Missing in Figma';
        statusClass = 'status-mismatch';
      }
      
      let details = '';
      if (key === 'colors') {
        details = `Color token used in ${token.sources.map(s => s.type || 'Unknown').join(', ')} contexts`;
      } else if (key === 'typography') {
        const font = token.sources[0];
        details = `Font: ${font?.fontFamily || 'Unknown'}, Size: ${font?.fontSize || 'Unknown'}, Weight: ${font?.fontWeight || 'Unknown'}`;
      } else {
        details = `${title} token used in ${token.sources.map(s => s.property || 'General').join(', ')} properties`;
      }
      
      const propertyName = key === 'colors' ? 
        `Color: ${token.value}` : 
        key === 'typography' ? 
        `Typography: ${token.value.split('-')[0]}...` :
        `${title}: ${token.value}`;
      
      return `
        <tr>
          <td>
            ${key === 'colors' ? 
              `<div style="display: flex; align-items: center;"><span class="color-swatch" style="background-color: ${token.value};"></span><code style="margin-left: 8px;">${token.value}</code></div>` :
              `<code>${token.value}</code>`
            }
          </td>
          <td>${figmaDesign}</td>
          <td>${webImplementation}</td>
          <td><span class="${statusClass}">${status}</span></td>
          <td>${details}</td>
        </tr>`;
    }).join('');

    return `
    <div class="accordion-header" onclick="toggleAccordion(this)">
      <h3>${title} <span class="count-indicator">${tokens.length}</span></h3>
      <span class="accordion-icon">▼</span>
    </div>
    <div class="accordion-content">
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Figma Design</th>
            <th>Web Implementation</th>
            <th>Status</th>
            <th>Details/Reason</th>
          </tr>
        </thead>
        <tbody>
          ${tokenRows}
        </tbody>
      </table>
      ${tokens.length > 20 ? `<p><em>Showing top 20 of ${tokens.length} tokens...</em></p>` : ''}
    </div>`;
  }

  /**
   * Generate accordion section for component categories
   */
  generateComponentAccordion(title, categoryData, icon) {
    if (!categoryData) {
      return `
      <div class="accordion-header" onclick="toggleAccordion(this)">
        <h3>${icon} ${title} <span class="count-indicator">0</span></h3>
        <span class="accordion-icon">▼</span>
      </div>
      <div class="accordion-content">
        <p>No ${title.toLowerCase()} found.</p>
      </div>`;
    }

    const figmaCount = categoryData.figmaColumn?.length || 0;
    const webCount = categoryData.webColumn?.length || 0;
    const totalCount = figmaCount + webCount;

    if (totalCount === 0) {
      return `
      <div class="accordion-header" onclick="toggleAccordion(this)">
        <h3>${icon} ${title} <span class="count-indicator">0</span></h3>
        <span class="accordion-icon">▼</span>
      </div>
      <div class="accordion-content">
        <p>No ${title.toLowerCase()} found in either Figma or web implementation.</p>
      </div>`;
    }

    // Generate property-level comparison with specific naming
    const allRows = [];
    const figmaComponents = categoryData.figmaColumn || [];
    const webComponents = categoryData.webColumn || [];
    
    // Create comprehensive property comparison map
    const propertyMap = new Map();
    
    // Extract Figma properties first (these get priority)
    figmaComponents.forEach(comp => {
      const properties = this.extractComponentProperties(comp, 'figma');
      properties.forEach(prop => {
        if (!propertyMap.has(prop.name)) {
          propertyMap.set(prop.name, { figma: [], web: [] });
        }
        propertyMap.get(prop.name).figma.push(prop);
      });
    });
    
    // Extract Web properties and match/add them
    webComponents.forEach(comp => {
      const properties = this.extractComponentProperties(comp, 'web');
      properties.forEach(prop => {
        if (!propertyMap.has(prop.name)) {
          propertyMap.set(prop.name, { figma: [], web: [] });
        }
        propertyMap.get(prop.name).web.push(prop);
      });
    });
    
    // Sort properties: Figma properties first, then web-only properties
    const sortedProperties = Array.from(propertyMap.entries()).sort(([nameA, dataA], [nameB, dataB]) => {
      const aHasFigma = dataA.figma.length > 0;
      const bHasFigma = dataB.figma.length > 0;
      
      if (aHasFigma && !bHasFigma) return -1;
      if (!aHasFigma && bHasFigma) return 1;
      return nameA.localeCompare(nameB);
    });
    
    // Generate table rows
    sortedProperties.forEach(([propertyName, data]) => {
      const figmaValues = data.figma;
      const webValues = data.web;
      
      // Figma Design column
      const figmaDesign = figmaValues.length > 0 ? 
        figmaValues.map(v => v.value).join(', ') : 'Not found';
      
      // Web Implementation column
      const webImplementation = webValues.length > 0 ? 
        webValues.map(v => v.value).join(', ') : 'Not found';
      
      // Status column
      let status, statusClass;
      if (figmaValues.length > 0 && webValues.length > 0) {
        const figmaValue = figmaValues[0].value;
        const webValue = webValues[0].value;
        if (figmaValue === webValue) {
          status = 'Match';
          statusClass = 'status-match';
        } else {
          status = 'Mismatch';
          statusClass = 'status-mismatch';
        }
      } else if (figmaValues.length > 0 && webValues.length === 0) {
        status = 'Missing in Web';
        statusClass = 'status-missing';
      } else if (figmaValues.length === 0 && webValues.length > 0) {
        status = 'Missing in Figma';
        statusClass = 'status-mismatch';
      }
      
      // Details/Reason column
      let details = '';
      if (figmaValues.length > 0 && webValues.length > 0) {
        details = `Expected: ${figmaValues[0].value}, Found: ${webValues[0].value}`;
      } else if (figmaValues.length > 0) {
        details = `Property defined in Figma but not implemented in web`;
      } else {
        details = `Web implementation uses property not defined in Figma design`;
      }
      
      allRows.push(`
        <tr>
          <td><strong>${propertyName}</strong></td>
          <td>${figmaDesign}</td>
          <td>${webImplementation}</td>
          <td><span class="${statusClass}">${status}</span></td>
          <td>${details}</td>
        </tr>
      `);
    });

    return `
    <div class="accordion-header" onclick="toggleAccordion(this)">
      <h3>${icon} ${title} <span class="count-indicator">${totalCount}</span> 
        <small>(${figmaCount} Figma, ${webCount} Web)</small>
      </h3>
      <span class="accordion-icon">▼</span>
    </div>
    <div class="accordion-content">
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Figma Design</th>
            <th>Web Implementation</th>
            <th>Status</th>
            <th>Details/Reason</th>
          </tr>
        </thead>
        <tbody>
          ${allRows.join('')}
        </tbody>
      </table>
      ${totalCount > 20 ? `<p><em>Showing all ${totalCount} components...</em></p>` : ''}
    </div>`;
  }

  /**
   * Generate Figma Data tab content
   */
  generateFigmaDataTab(figmaData) {
    if (!figmaData) {
      return `
      <div class="section">
        <h2>🎨 Figma Data</h2>
        <p>No Figma data available for this comparison.</p>
      </div>`;
    }

    const components = figmaData.components || [];
    const designTokens = figmaData.designTokens || {};
    
    // Limit the number of components we render to avoid generating an excessively large string
    const MAX_COMPONENTS_TO_RENDER = 200;
    const displayedComponents = components.slice(0, MAX_COMPONENTS_TO_RENDER);
    const componentsTruncated = components.length > MAX_COMPONENTS_TO_RENDER;
    
    return `
    <div class="section">
      <h2>🎨 Figma Design Data</h2>
      <p>Components and design tokens extracted from the Figma design file.</p>
      
      <div class="summary-grid">
        <div class="summary-card">
          <h3>Components</h3>
          <span class="number">${components.length}</span>
          <span class="label">Design Elements</span>
        </div>
        <div class="summary-card">
          <h3>Colors</h3>
          <span class="number">${(designTokens.colors || []).length}</span>
          <span class="label">Color Tokens</span>
        </div>
        <div class="summary-card">
          <h3>Typography</h3>
          <span class="number">${(designTokens.typography || []).length}</span>
          <span class="label">Text Styles</span>
        </div>
        <div class="summary-card">
          <h3>Spacing</h3>
          <span class="number">${(designTokens.spacing || []).length}</span>
          <span class="label">Spacing Tokens</span>
        </div>
      </div>
      
      ${this.generateDesignTokensSection(designTokens, 'figma')}
      
      ${displayedComponents.length > 0 ? `
      <h3>Figma Components</h3>
      <div class="component-grid">
        ${displayedComponents.map(component => `
          <div class="component-card">
            <h4>${component.name || 'Unnamed Component'}</h4>
            <div class="meta">Type: ${component.type || 'Unknown'}</div>
            <div class="properties">
              ${component.properties ? Object.entries(component.properties)
                .filter(([key, value]) => value !== null && value !== undefined)
                .slice(0, 5)
                .map(([key, value]) => `<div><strong>${key}:</strong> ${this.formatValue(key, value)}</div>`)
                .join('') : 'No properties'}
            </div>
          </div>
        `).join('')}
      </div>
      <p><em>Showing ${displayedComponents.length}${componentsTruncated ? ` of ${components.length}` : ''} components</em></p>
      ` : '<p>No components found in Figma data.</p>'}
    </div>`;
  }

  /**
   * Generate Web Data tab content
   */
  generateWebDataTab(webData) {
    if (!webData) {
      return `
      <div class="section">
        <h2>🌐 Web Data</h2>
        <p>No web data available for this comparison.</p>
      </div>`;
    }

    const elements = webData.elements || [];
    const semanticElements = webData.semanticElements || [];
    
    // Extract design tokens from web elements
    const webDesignTokens = this.extractWebDesignTokens(elements);
    
    return `
    <div class="section">
      <h2>🌐 Web Implementation Data</h2>
      <p>Elements and styles extracted from the live web page.</p>
      
      <div class="summary-grid">
        <div class="summary-card">
          <h3>Total Elements</h3>
          <span class="number">${elements.length}</span>
          <span class="label">DOM Elements</span>
        </div>
        <div class="summary-card">
          <h3>Colors Found</h3>
          <span class="number">${webDesignTokens.colors.length}</span>
          <span class="label">Color Values</span>
        </div>
        <div class="summary-card">
          <h3>Typography</h3>
          <span class="number">${webDesignTokens.typography.length}</span>
          <span class="label">Font Combinations</span>
        </div>
        <div class="summary-card">
          <h3>Spacing</h3>
          <span class="number">${webDesignTokens.spacing.length}</span>
          <span class="label">Spacing Values</span>
        </div>
      </div>
      
      ${this.generateDesignTokensSection(webDesignTokens, 'web')}
      
      ${elements.length > 0 ? `
      <h3>Web Elements</h3>
      <div class="component-grid">
        ${elements.slice(0, 50).map(element => `
          <div class="component-card">
            <h4>${element.tagName || 'Unknown'}${element.className ? `.${element.className.split(' ')[0]}` : ''}</h4>
            <div class="meta">
              ${element.selector ? `Selector: ${element.selector.slice(0, 50)}${element.selector.length > 50 ? '...' : ''}` : 'No selector'}
            </div>
            <div class="properties">
              ${element.styles ? Object.entries(element.styles)
                .filter(([key, value]) => value && key !== 'selector')
                .slice(0, 5)
                .map(([key, value]) => `<div><strong>${key}:</strong> ${typeof value === 'string' ? value.slice(0, 30) + (value.length > 30 ? '...' : '') : value}</div>`)
                .join('') : 'No styles'}
            </div>
          </div>
        `).join('')}
      </div>
      ${elements.length > 50 ? `<p><em>Showing 50 of ${elements.length} elements...</em></p>` : `<p><em>Showing all ${elements.length} elements</em></p>`}
      ` : '<p>No elements found in web data.</p>'}
      
      ${semanticElements.length > 0 ? `
      <h3>Semantic Elements</h3>
      <div class="component-grid">
        ${semanticElements.slice(0, 10).map(element => `
          <div class="component-card">
            <h4>${element.role || element.tagName || 'Unknown'}</h4>
            <div class="meta">
              ${element.text ? `Text: ${element.text.slice(0, 100)}${element.text.length > 100 ? '...' : ''}` : 'No text content'}
            </div>
            <div class="properties">
              ${element.attributes ? Object.entries(element.attributes)
                .slice(0, 3)
                .map(([key, value]) => `<div><strong>${key}:</strong> ${value}</div>`)
                .join('') : 'No attributes'}
            </div>
          </div>
        `).join('')}
      </div>
      ${semanticElements.length > 10 ? `<p><em>Showing 10 of ${semanticElements.length} semantic elements...</em></p>` : ''}
      ` : ''}
    </div>`;
  }

  /**
   * Extract design tokens from web elements
   */
  extractWebDesignTokens(elements) {
    const tokens = {
      colors: new Set(),
      typography: new Set(),
      spacing: new Set(),
      borderRadius: new Set()
    };

    elements.forEach(element => {
      if (!element.styles) return;

      // Extract colors
      if (element.styles.color && element.styles.color !== 'rgb(0, 0, 0)') {
        tokens.colors.add(element.styles.color);
      }
      if (element.styles.backgroundColor && element.styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        tokens.colors.add(element.styles.backgroundColor);
      }

      // Extract typography
      if (element.styles.fontFamily && element.styles.fontSize) {
        const fontKey = `${element.styles.fontFamily} ${element.styles.fontSize} ${element.styles.fontWeight || 'normal'}`;
        tokens.typography.add(fontKey);
      }

      // Extract spacing
      ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 
       'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(prop => {
        if (element.styles[prop] && parseFloat(element.styles[prop]) > 0) {
          tokens.spacing.add(element.styles[prop]);
        }
      });

      // Extract border radius
      if (element.styles?.borderRadius && element.styles.borderRadius !== '0px') {
        tokens.borderRadius.add(element.styles.borderRadius);
      }
    });

    return {
      colors: Array.from(tokens.colors).slice(0, 50),
      typography: Array.from(tokens.typography).slice(0, 30),
      spacing: Array.from(tokens.spacing).slice(0, 40),
      borderRadius: Array.from(tokens.borderRadius).slice(0, 20)
    };
  }

  /**
   * Generate design tokens section for display
   */
  generateDesignTokensSection(designTokens, source) {
    if (!designTokens) return '';

    const colors = designTokens.colors || [];
    const typography = designTokens.typography || [];
    const spacing = designTokens.spacing || [];
    const borderRadius = designTokens.borderRadius || [];

    return `
    <div class="design-tokens-section">
      <h3>🎨 Design Tokens (${source === 'figma' ? 'Figma' : 'Web'})</h3>
      
      ${colors.length > 0 ? `
      <div class="accordion">
        <div class="accordion-header" onclick="toggleAccordion(this)">
          <h4>Colors <span class="count-indicator">${colors.length}</span></h4>
          <span class="accordion-icon">▼</span>
        </div>
        <div class="accordion-content">
          <div class="component-grid">
            ${colors.map(color => {
              const colorValue = typeof color === 'string' ? color : color.value;
              return `
              <div class="component-card">
                <div style="display: flex; align-items: center;">
                  <span class="color-swatch" style="background-color: ${colorValue}; width: 30px; height: 30px; border-radius: 4px; border: 1px solid #ccc; margin-right: 10px;"></span>
                  <div>
                    <div class="color-value">${colorValue}</div>
                    ${color.type ? `<div class="meta">Type: ${color.type}</div>` : ''}
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>
          <p><em>Showing all ${colors.length} colors</em></p>
        </div>
      </div>
      ` : ''}
      
      ${typography.length > 0 ? `
      <div class="accordion">
        <div class="accordion-header" onclick="toggleAccordion(this)">
          <h4>Typography <span class="count-indicator">${typography.length}</span></h4>
          <span class="accordion-icon">▼</span>
        </div>
        <div class="accordion-content">
          <div class="component-grid">
            ${typography.slice(0, 15).map(typo => {
              const typoValue = typeof typo === 'string' ? typo : typo.value;
              return `
              <div class="component-card">
                <div class="typography-sample">${typoValue}</div>
                ${typo.type ? `<div class="meta">Type: ${typo.type}</div>` : ''}
              </div>`;
            }).join('')}
          </div>
          ${typography.length > 15 ? `<p><em>Showing 15 of ${typography.length} typography styles...</em></p>` : ''}
        </div>
      </div>
      ` : ''}
      
      ${spacing.length > 0 ? `
      <div class="accordion">
        <div class="accordion-header" onclick="toggleAccordion(this)">
          <h4>Spacing <span class="count-indicator">${spacing.length}</span></h4>
          <span class="accordion-icon">▼</span>
        </div>
        <div class="accordion-content">
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px;">
            ${spacing.slice(0, 30).map(space => {
              const spaceValue = typeof space === 'string' ? space : space.value;
              return `
              <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <div style="font-weight: bold; color: #333;">${spaceValue}</div>
              </div>`;
            }).join('')}
          </div>
          ${spacing.length > 30 ? `<p><em>Showing 30 of ${spacing.length} spacing values...</em></p>` : ''}
        </div>
      </div>
      ` : ''}
      
      ${borderRadius.length > 0 ? `
      <div class="accordion">
        <div class="accordion-header" onclick="toggleAccordion(this)">
          <h4>Border Radius <span class="count-indicator">${borderRadius.length}</span></h4>
          <span class="accordion-icon">▼</span>
        </div>
        <div class="accordion-content">
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px;">
            ${borderRadius.slice(0, 20).map(radius => {
              const radiusValue = typeof radius === 'string' ? radius : radius.value;
              return `
              <div style="text-align: center; padding: 10px; background: #f8f9fa; border-radius: ${radiusValue}; border: 1px solid #ddd;">
                <div style="font-weight: bold; color: #333;">${radiusValue}</div>
              </div>`;
            }).join('')}
          </div>
          ${borderRadius.length > 20 ? `<p><em>Showing 20 of ${borderRadius.length} border radius values...</em></p>` : ''}
        </div>
      </div>
      ` : ''}
    </div>`;
  }

  /**
   * Trim string values to prevent memory issues
   */
  trimValue(value, maxLength = this.MAX_STRING_LENGTH) {
    if (typeof value === 'string') {
      return value.length > maxLength ? value.substring(0, maxLength) + '...' : value;
    }
    return value;
  }

  /**
   * Safely process component data with size limits
   */
  processComponentData(component) {
    return {
      id: component.id,
      name: this.trimValue(component.name, 100),
      type: component.type,
      properties: Object.fromEntries(
        Object.entries(component.properties || {})
          .slice(0, 20) // Limit number of properties
          .map(([key, value]) => [key, this.trimValue(value)])
      ),
      deviations: (component.deviations || [])
        .slice(0, this.MAX_DEVIATIONS)
        .map(dev => ({
          ...dev,
          message: this.trimValue(dev.message),
          figmaValue: this.trimValue(dev.figmaValue),
          webValue: this.trimValue(dev.webValue)
        })),
      matches: (component.matches || [])
        .slice(0, this.MAX_MATCHES)
        .map(match => ({
          ...match,
          message: this.trimValue(match.message),
          value: this.trimValue(match.value)
        }))
    };
  }

  /**
   * Generate reports with streaming support for large datasets
   */
  async generateReports(comparisonData, options = {}) {
    try {
      const { comparisons = [], metadata = {}, summary = {} } = comparisonData;
      
      // Generate reports in parallel using streams
      const [htmlReport, jsonReport] = await Promise.all([
        this.generateStreamingHTML(comparisons, metadata, summary, options),
        this.generateStreamingJSON(comparisons, metadata, summary, options)
      ]);

      return { html: htmlReport, json: jsonReport };
    } catch (error) {
      console.error('Error generating reports:', error);
      throw new Error(`Failed to generate reports: ${error.message}`);
    }
  }

  /**
   * Generate HTML report using streaming for large datasets
   */
  async generateStreamingHTML(comparisons, metadata, summary, options = {}) {
    const { title = 'Comparison Report' } = options;
    const chunks = this.chunkArray(comparisons, this.CHUNK_SIZE);
    
    // Start HTML with header
    let html = this.generateHTMLHeader(title, metadata, summary);
    
    // Process comparison chunks
    for (const [index, chunk] of chunks.entries()) {
      const chunkHtml = await this.processComparisonChunk(chunk, index);
      html += chunkHtml;
      
      // Optional progress callback
      if (options.onProgress) {
        const progress = ((index + 1) / chunks.length) * 100;
        options.onProgress({
          stage: 'html_generation',
          progress,
          currentChunk: index + 1,
          totalChunks: chunks.length
        });
      }
    }
    
    // Add footer
    html += this.generateHTMLFooter();
    
    return html;
  }

  /**
   * Generate JSON report using streaming for large datasets
   */
  async generateStreamingJSON(comparisons, metadata, summary, options = {}) {
    const chunks = this.chunkArray(comparisons, this.CHUNK_SIZE);
    const processedComparisons = [];
    
    // Process comparison chunks
    for (const [index, chunk] of chunks.entries()) {
      const processedChunk = await this.processJSONChunk(chunk);
      processedComparisons.push(...processedChunk);
      
      // Optional progress callback
      if (options.onProgress) {
        const progress = ((index + 1) / chunks.length) * 100;
        options.onProgress({
          stage: 'json_generation',
          progress,
          currentChunk: index + 1,
          totalChunks: chunks.length
        });
      }
    }
    
    // Combine all data
    const report = {
      metadata,
      summary,
      comparisons: processedComparisons
    };
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * Process a chunk of comparisons for HTML report
   */
  async processComparisonChunk(chunk, chunkIndex) {
    let html = '';
    
    for (const comparison of chunk) {
      html += `
        <div class="comparison-item" data-chunk="${chunkIndex}">
          <h3>${comparison.componentName || 'Unnamed Component'}</h3>
          <div class="meta">Type: ${comparison.componentType || 'Unknown'}</div>
          
          ${this.generateDeviationsList(comparison.deviations)}
          ${this.generateMatchesList(comparison.matches)}
        </div>
      `;
    }
    
    return html;
  }

  /**
   * Process a chunk of comparisons for JSON report
   */
  async processJSONChunk(chunk) {
    return chunk.map(comparison => ({
      ...comparison,
      chunkProcessedAt: new Date().toISOString()
    }));
  }

  /**
   * Helper method to chunk array
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Generate HTML header with metadata and summary
   */
  generateHTMLHeader(title, metadata, summary) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          /* Add your CSS styles here */
        </style>
        <script>
          // Add lazy loading for chunks
          document.addEventListener('DOMContentLoaded', function() {
            const observer = new IntersectionObserver((entries) => {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  entry.target.classList.add('visible');
                  observer.unobserve(entry.target);
                }
              });
            });

            document.querySelectorAll('.comparison-item').forEach(item => {
              observer.observe(item);
            });
          });
        </script>
      </head>
      <body>
        <div class="report">
          <h1>${title}</h1>
          ${this.generateMetadataSection(metadata)}
          ${this.generateSummarySection(summary)}
          <div class="comparisons">
    `;
  }

  /**
   * Generate HTML footer
   */
  generateHTMLFooter() {
    return `
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Export the ReportGenerator class
export default ReportGenerator; 