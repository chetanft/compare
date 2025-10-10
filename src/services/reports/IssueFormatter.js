import { logger } from '../../utils/logger.js';

/**
 * IssueFormatter - Transforms comparison discrepancies into DevRev-ready issues
 * 
 * Converts raw comparison data into structured issue format with:
 * - Frame/Component names from Figma
 * - Auto-calculated severity and priority
 * - DevRev-compatible field structure
 */
export class IssueFormatter {
  /**
   * Transform comparison results into DevRev-ready issues
   * @param {Object} comparisonResults - Full comparison results
   * @returns {Array<Object>} Array of formatted issues
   */
  transform(comparisonResults) {
    logger.info('Transforming comparison results into DevRev issues');
    
    const issues = [];
    let issueId = 1;
    
    try {
      // Extract all discrepancies from comparisons
      const comparisons = comparisonResults.comparisons || [];
      const metadata = comparisonResults.metadata || {};
      
      comparisons.forEach(comparison => {
        // Process color deviations
        if (comparison.colorDeviations && Array.isArray(comparison.colorDeviations)) {
          comparison.colorDeviations.forEach(deviation => {
            issues.push(this.createColorIssue(issueId++, deviation, comparison, metadata));
          });
        }
        
        // Process typography deviations
        if (comparison.typographyDeviations && Array.isArray(comparison.typographyDeviations)) {
          comparison.typographyDeviations.forEach(deviation => {
            issues.push(this.createTypographyIssue(issueId++, deviation, comparison, metadata));
          });
        }
        
        // Process spacing deviations
        if (comparison.spacingDeviations && Array.isArray(comparison.spacingDeviations)) {
          comparison.spacingDeviations.forEach(deviation => {
            issues.push(this.createSpacingIssue(issueId++, deviation, comparison, metadata));
          });
        }
        
        // Process overall deviations
        if (comparison.overallDeviation && comparison.overallDeviation.severity !== 'none') {
          issues.push(this.createOverallIssue(issueId++, comparison, metadata));
        }
      });
      
      logger.info(`Generated ${issues.length} DevRev issues from comparison results`);
      return issues;
      
    } catch (error) {
      logger.error('Failed to transform comparison results', error);
      return [];
    }
  }
  
  /**
   * Create issue for color deviation
   */
  createColorIssue(issueId, deviation, comparison, metadata) {
    const componentName = comparison.figmaComponent?.name || 'Unknown Component';
    const componentId = comparison.figmaComponent?.id || 'N/A';
    const webElement = this.formatWebElement(comparison.webElement);
    
    return {
      issueId,
      title: `Color mismatch in ${componentName}`,
      description: `Expected ${deviation.property || 'color'} to be ${deviation.expected} but found ${deviation.actual}. Color difference: ${deviation.difference?.toFixed(1)}%`,
      module: this.extractModule(metadata),
      frameComponentName: componentName,
      figmaComponentId: componentId,
      figmaComponentType: comparison.figmaComponent?.type || 'N/A',
      webElement,
      severity: this.calculateColorSeverity(deviation),
      priority: this.calculatePriority(this.calculateColorSeverity(deviation), 'color', componentName),
      reportedBy: 'Figma Comparison Tool',
      assignedTo: '',
      status: 'Open',
      stepsToReproduce: this.generateSteps(metadata, componentName),
      expectedResult: `${deviation.property || 'Color'}: ${deviation.expected}`,
      actualResult: `${deviation.property || 'Color'}: ${deviation.actual}`,
      environment: this.extractEnvironment(metadata),
      createdDate: new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0],
      remarks: `Color difference: ${deviation.difference?.toFixed(1)}%. Check if this variation is intentional.`
    };
  }
  
  /**
   * Create issue for typography deviation
   */
  createTypographyIssue(issueId, deviation, comparison, metadata) {
    const componentName = comparison.figmaComponent?.name || 'Unknown Component';
    const componentId = comparison.figmaComponent?.id || 'N/A';
    const webElement = this.formatWebElement(comparison.webElement);
    
    return {
      issueId,
      title: `Typography mismatch in ${componentName}`,
      description: `Font ${deviation.property || 'style'} mismatch: Expected ${deviation.expected} but found ${deviation.actual}`,
      module: this.extractModule(metadata),
      frameComponentName: componentName,
      figmaComponentId: componentId,
      figmaComponentType: comparison.figmaComponent?.type || 'N/A',
      webElement,
      severity: 'Major',
      priority: this.calculatePriority('Major', 'typography', componentName),
      reportedBy: 'Figma Comparison Tool',
      assignedTo: '',
      status: 'Open',
      stepsToReproduce: this.generateSteps(metadata, componentName),
      expectedResult: `${deviation.property || 'Font'}: ${deviation.expected}`,
      actualResult: `${deviation.property || 'Font'}: ${deviation.actual}`,
      environment: this.extractEnvironment(metadata),
      createdDate: new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0],
      remarks: 'Typography consistency is important for brand identity.'
    };
  }
  
  /**
   * Create issue for spacing deviation
   */
  createSpacingIssue(issueId, deviation, comparison, metadata) {
    const componentName = comparison.figmaComponent?.name || 'Unknown Component';
    const componentId = comparison.figmaComponent?.id || 'N/A';
    const webElement = this.formatWebElement(comparison.webElement);
    
    return {
      issueId,
      title: `Spacing issue in ${componentName}`,
      description: `${deviation.property || 'Spacing'} deviation: Expected ${deviation.expected}px but found ${deviation.actual}px (difference: ${Math.abs((deviation.expected || 0) - (deviation.actual || 0))}px)`,
      module: this.extractModule(metadata),
      frameComponentName: componentName,
      figmaComponentId: componentId,
      figmaComponentType: comparison.figmaComponent?.type || 'N/A',
      webElement,
      severity: 'Minor',
      priority: this.calculatePriority('Minor', 'spacing', componentName),
      reportedBy: 'Figma Comparison Tool',
      assignedTo: '',
      status: 'Open',
      stepsToReproduce: this.generateSteps(metadata, componentName),
      expectedResult: `${deviation.property || 'Spacing'}: ${deviation.expected}px`,
      actualResult: `${deviation.property || 'Spacing'}: ${deviation.actual}px`,
      environment: this.extractEnvironment(metadata),
      createdDate: new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0],
      remarks: 'Minor spacing adjustments may be acceptable for responsive design.'
    };
  }
  
  /**
   * Create issue for overall component deviation
   */
  createOverallIssue(issueId, comparison, metadata) {
    const componentName = comparison.figmaComponent?.name || 'Unknown Component';
    const componentId = comparison.figmaComponent?.id || 'N/A';
    const webElement = this.formatWebElement(comparison.webElement);
    const deviation = comparison.overallDeviation || {};
    
    return {
      issueId,
      title: `${this.capitalizeFirst(deviation.severity || 'medium')} discrepancy in ${componentName}`,
      description: `Component has ${deviation.severity || 'medium'} severity discrepancies. Match percentage: ${deviation.matchPercentage?.toFixed(1)}%`,
      module: this.extractModule(metadata),
      frameComponentName: componentName,
      figmaComponentId: componentId,
      figmaComponentType: comparison.figmaComponent?.type || 'N/A',
      webElement,
      severity: this.mapSeverity(deviation.severity),
      priority: this.calculatePriority(this.mapSeverity(deviation.severity), 'overall', componentName),
      reportedBy: 'Figma Comparison Tool',
      assignedTo: '',
      status: 'Open',
      stepsToReproduce: this.generateSteps(metadata, componentName),
      expectedResult: 'Component should match Figma design specifications',
      actualResult: `Match percentage: ${deviation.matchPercentage?.toFixed(1)}%`,
      environment: this.extractEnvironment(metadata),
      createdDate: new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0],
      remarks: 'Review all component properties for alignment with design system.'
    };
  }
  
  /**
   * Calculate color severity based on difference percentage
   */
  calculateColorSeverity(deviation) {
    const difference = deviation.difference || 0;
    
    if (difference > 30) return 'Critical';
    if (difference > 10) return 'Major';
    return 'Minor';
  }
  
  /**
   * Map internal severity to DevRev severity
   */
  mapSeverity(internalSeverity) {
    const severityMap = {
      high: 'Critical',
      medium: 'Major',
      low: 'Minor'
    };
    
    return severityMap[internalSeverity?.toLowerCase()] || 'Minor';
  }
  
  /**
   * Calculate priority based on severity, type, and component
   */
  calculatePriority(severity, issueType, componentName) {
    // Start with severity-based priority
    let priority = 'Low';
    
    if (severity === 'Critical') priority = 'High';
    else if (severity === 'Major') priority = 'Medium';
    
    // Boost priority for interactive components (buttons, inputs, links)
    const interactiveKeywords = ['button', 'input', 'link', 'cta', 'submit', 'action'];
    if (interactiveKeywords.some(keyword => componentName.toLowerCase().includes(keyword))) {
      if (priority === 'Low') priority = 'Medium';
      else if (priority === 'Medium') priority = 'High';
      else if (priority === 'High') priority = 'Urgent';
    }
    
    // Boost priority for color issues (visual impact)
    if (issueType === 'color' && priority === 'Low') {
      priority = 'Medium';
    }
    
    return priority;
  }
  
  /**
   * Extract module/feature name from metadata
   */
  extractModule(metadata) {
    // Try to extract from Figma file name
    if (metadata.figmaFileName) {
      return metadata.figmaFileName.replace(/\.(fig|figma)$/i, '');
    }
    
    // Try to extract from web URL
    if (metadata.webUrl) {
      try {
        const url = new URL(metadata.webUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          return this.capitalizeFirst(pathParts[0].replace(/-/g, ' '));
        }
      } catch (e) {
        // Invalid URL, ignore
      }
    }
    
    return 'General';
  }
  
  /**
   * Format web element for display
   */
  formatWebElement(webElement) {
    if (!webElement) return 'N/A';
    
    const tag = webElement.tag || webElement.tagName || '';
    const className = webElement.className || webElement.class || '';
    const id = webElement.id || '';
    
    let formatted = tag;
    if (id) formatted += `#${id}`;
    if (className) formatted += `.${className.split(' ')[0]}`; // First class only
    
    return formatted || 'N/A';
  }
  
  /**
   * Generate steps to reproduce
   */
  generateSteps(metadata, componentName) {
    const steps = [];
    
    if (metadata.webUrl) {
      try {
        const url = new URL(metadata.webUrl);
        steps.push(`1. Navigate to ${url.pathname || url.href}`);
      } catch (e) {
        steps.push(`1. Navigate to ${metadata.webUrl}`);
      }
    } else {
      steps.push('1. Navigate to the application');
    }
    
    steps.push(`2. Locate the "${componentName}" component`);
    steps.push('3. Compare visual appearance with Figma design');
    steps.push('4. Note the discrepancy described in this issue');
    
    return steps.join('\n');
  }
  
  /**
   * Extract environment info
   */
  extractEnvironment(metadata) {
    const parts = [];
    
    if (metadata.webUrl) {
      try {
        const url = new URL(metadata.webUrl);
        if (url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1')) {
          parts.push('Development');
        } else if (url.hostname.includes('staging') || url.hostname.includes('dev')) {
          parts.push('Staging');
        } else {
          parts.push('Production');
        }
      } catch (e) {
        parts.push('Unknown');
      }
    }
    
    parts.push('Web / Chrome');
    
    return parts.join(' ');
  }
  
  /**
   * Capitalize first letter
   */
  capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export default IssueFormatter;

