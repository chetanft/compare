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
        // Skip comparisons with no deviations or "matches" status
        if (comparison.status === 'matches' || !comparison.deviations || comparison.deviations.length === 0) {
          return;
        }
        
        // Process each deviation in the deviations array
        comparison.deviations.forEach(deviation => {
          // Determine deviation type and create appropriate issue
          const deviationType = this.detectDeviationType(deviation);
          
          switch (deviationType) {
            case 'color':
              issues.push(this.createColorIssue(issueId++, deviation, comparison, metadata));
              break;
            case 'typography':
              issues.push(this.createTypographyIssue(issueId++, deviation, comparison, metadata));
              break;
            case 'spacing':
              issues.push(this.createSpacingIssue(issueId++, deviation, comparison, metadata));
              break;
            case 'existence':
              issues.push(this.createExistenceIssue(issueId++, deviation, comparison, metadata));
              break;
            default:
              issues.push(this.createGenericIssue(issueId++, deviation, comparison, metadata));
          }
        });
      });
      
      logger.info(`Generated ${issues.length} DevRev issues from comparison results`);
      return issues;
      
    } catch (error) {
      logger.error('Failed to transform comparison results', error);
      return [];
    }
  }
  
  /**
   * Detect deviation type from deviation object
   */
  detectDeviationType(deviation) {
    const property = (deviation.property || '').toLowerCase();
    
    // Check for existence issues (missing components)
    if (property === 'existence') {
      return 'existence';
    }
    
    // Check for color-related properties
    if (property.includes('color') || property.includes('fill') || property.includes('background')) {
      return 'color';
    }
    
    // Check for typography properties
    if (property.includes('font') || property.includes('text') || property.includes('typography')) {
      return 'typography';
    }
    
    // Check for spacing/layout properties
    if (property.includes('padding') || property.includes('margin') || property.includes('spacing') || 
        property.includes('gap') || property.includes('size') || property.includes('width') || property.includes('height')) {
      return 'spacing';
    }
    
    return 'generic';
  }
  
  /**
   * Create issue for color deviation
   */
  createColorIssue(issueId, deviation, comparison, metadata) {
    const componentName = comparison.componentName || comparison.figmaComponent?.name || 'Unknown Component';
    const componentId = comparison.componentId || comparison.figmaComponent?.id || 'N/A';
    const componentType = comparison.componentType || comparison.figmaComponent?.type || 'N/A';
    const webElement = this.formatWebElement(comparison.webElement);
    
    const figmaValue = deviation.figmaValue || deviation.expected || 'N/A';
    const webValue = deviation.webValue || deviation.actual || 'N/A';
    const difference = deviation.difference || 'N/A';
    
    return {
      issueId,
      title: `Color mismatch in ${componentName}`,
      description: deviation.message || `Expected ${deviation.property || 'color'} to be ${figmaValue} but found ${webValue}. ${typeof difference === 'number' ? `Color difference: ${difference.toFixed(1)}%` : ''}`,
      module: this.extractModule(metadata),
      frameComponentName: componentName,
      figmaComponentId: componentId,
      figmaComponentType: componentType,
      webElement,
      severity: this.calculateColorSeverity(deviation),
      priority: this.calculatePriority(this.calculateColorSeverity(deviation), 'color', componentName),
      reportedBy: 'Figma Comparison Tool',
      assignedTo: '',
      status: 'Open',
      stepsToReproduce: this.generateSteps(metadata, componentName),
      expectedResult: `${deviation.property || 'Color'}: ${figmaValue}`,
      actualResult: `${deviation.property || 'Color'}: ${webValue}`,
      environment: this.extractEnvironment(metadata),
      createdDate: new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0],
      remarks: typeof difference === 'number' ? `Color difference: ${difference.toFixed(1)}%. Check if this variation is intentional.` : 'Check if this color variation is intentional.'
    };
  }
  
  /**
   * Create issue for typography deviation
   */
  createTypographyIssue(issueId, deviation, comparison, metadata) {
    const componentName = comparison.componentName || comparison.figmaComponent?.name || 'Unknown Component';
    const componentId = comparison.componentId || comparison.figmaComponent?.id || 'N/A';
    const componentType = comparison.componentType || comparison.figmaComponent?.type || 'N/A';
    const webElement = this.formatWebElement(comparison.webElement);
    
    const figmaValue = deviation.figmaValue || deviation.expected || 'N/A';
    const webValue = deviation.webValue || deviation.actual || 'N/A';
    
    return {
      issueId,
      title: `Typography mismatch in ${componentName}`,
      description: deviation.message || `Font ${deviation.property || 'style'} mismatch: Expected ${figmaValue} but found ${webValue}`,
      module: this.extractModule(metadata),
      frameComponentName: componentName,
      figmaComponentId: componentId,
      figmaComponentType: componentType,
      webElement,
      severity: 'Major',
      priority: this.calculatePriority('Major', 'typography', componentName),
      reportedBy: 'Figma Comparison Tool',
      assignedTo: '',
      status: 'Open',
      stepsToReproduce: this.generateSteps(metadata, componentName),
      expectedResult: `${deviation.property || 'Font'}: ${figmaValue}`,
      actualResult: `${deviation.property || 'Font'}: ${webValue}`,
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
    const componentName = comparison.componentName || comparison.figmaComponent?.name || 'Unknown Component';
    const componentId = comparison.componentId || comparison.figmaComponent?.id || 'N/A';
    const componentType = comparison.componentType || comparison.figmaComponent?.type || 'N/A';
    const webElement = this.formatWebElement(comparison.webElement);
    
    const figmaValue = deviation.figmaValue || deviation.expected || 'N/A';
    const webValue = deviation.webValue || deviation.actual || 'N/A';
    
    return {
      issueId,
      title: `Spacing issue in ${componentName}`,
      description: deviation.message || `${deviation.property || 'Spacing'} deviation: Expected ${figmaValue} but found ${webValue}`,
      module: this.extractModule(metadata),
      frameComponentName: componentName,
      figmaComponentId: componentId,
      figmaComponentType: componentType,
      webElement,
      severity: 'Minor',
      priority: this.calculatePriority('Minor', 'spacing', componentName),
      reportedBy: 'Figma Comparison Tool',
      assignedTo: '',
      status: 'Open',
      stepsToReproduce: this.generateSteps(metadata, componentName),
      expectedResult: `${deviation.property || 'Spacing'}: ${figmaValue}`,
      actualResult: `${deviation.property || 'Spacing'}: ${webValue}`,
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
    const componentName = comparison.figmaComponent?.name || comparison.componentName || 'Unknown Component';
    const componentId = comparison.figmaComponent?.id || comparison.componentId || 'N/A';
    const webElement = this.formatWebElement(comparison.webElement);
    const deviation = comparison.overallDeviation || {};
    
    return {
      issueId,
      title: `${this.capitalizeFirst(deviation.severity || 'medium')} discrepancy in ${componentName}`,
      description: `Component has ${deviation.severity || 'medium'} severity discrepancies. Match percentage: ${deviation.matchPercentage?.toFixed(1)}%`,
      module: this.extractModule(metadata),
      frameComponentName: componentName,
      figmaComponentId: componentId,
      figmaComponentType: comparison.figmaComponent?.type || comparison.componentType || 'N/A',
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
   * Create issue for existence/missing component
   */
  createExistenceIssue(issueId, deviation, comparison, metadata) {
    const componentName = comparison.componentName || comparison.figmaComponent?.name || 'Unknown Component';
    const componentId = comparison.componentId || comparison.figmaComponent?.id || 'N/A';
    const componentType = comparison.componentType || comparison.figmaComponent?.type || 'N/A';
    
    return {
      issueId,
      title: `Missing component: ${componentName}`,
      description: deviation.message || `Component "${componentName}" exists in Figma but was not found in the web implementation.`,
      module: this.extractModule(metadata),
      frameComponentName: componentName,
      figmaComponentId: componentId,
      figmaComponentType: componentType,
      webElement: 'Not found',
      severity: this.mapSeverity(deviation.severity) || 'Critical',
      priority: 'High',
      reportedBy: 'Figma Comparison Tool',
      assignedTo: '',
      status: 'Open',
      stepsToReproduce: this.generateSteps(metadata, componentName),
      expectedResult: `Component "${componentName}" should be present in the web implementation`,
      actualResult: 'Component not found',
      environment: this.extractEnvironment(metadata),
      createdDate: new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0],
      remarks: 'This component is present in the Figma design but missing from the web implementation. Verify if this is intentional or needs to be implemented.'
    };
  }
  
  /**
   * Create issue for generic deviations
   */
  createGenericIssue(issueId, deviation, comparison, metadata) {
    const componentName = comparison.componentName || comparison.figmaComponent?.name || 'Unknown Component';
    const componentId = comparison.componentId || comparison.figmaComponent?.id || 'N/A';
    const componentType = comparison.componentType || comparison.figmaComponent?.type || 'N/A';
    const webElement = this.formatWebElement(comparison.webElement);
    const property = deviation.property || 'property';
    
    return {
      issueId,
      title: `${this.capitalizeFirst(property)} mismatch in ${componentName}`,
      description: deviation.message || `${this.capitalizeFirst(property)} does not match design specifications.`,
      module: this.extractModule(metadata),
      frameComponentName: componentName,
      figmaComponentId: componentId,
      figmaComponentType: componentType,
      webElement,
      severity: this.mapSeverity(deviation.severity) || 'Minor',
      priority: this.calculatePriority(this.mapSeverity(deviation.severity) || 'Minor', 'generic', componentName),
      reportedBy: 'Figma Comparison Tool',
      assignedTo: '',
      status: 'Open',
      stepsToReproduce: this.generateSteps(metadata, componentName),
      expectedResult: deviation.figmaValue || 'Match Figma design specifications',
      actualResult: deviation.webValue || 'Does not match design',
      environment: this.extractEnvironment(metadata),
      createdDate: new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0],
      remarks: `${this.capitalizeFirst(property)} difference detected. Review if this variation is acceptable.`
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

