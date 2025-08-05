/**
 * Enhanced Report Generator
 * Advanced reporting with confidence scores, algorithm insights, and performance data
 * Following rapid-prototyper agent methodology
 */

import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { performanceMonitor } from '../monitoring/performanceMonitor.js';

export class EnhancedReportGenerator {
  constructor() {
    this.templatesPath = path.join(process.cwd(), 'src', 'reporting', 'templates');
    this.outputPath = path.join(process.cwd(), 'output', 'reports');
    
    // Ensure output directory exists
    this.ensureOutputDirectory();
  }

  async ensureOutputDirectory() {
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create output directory', { error: error.message });
    }
  }

  /**
   * Generate enhanced HTML report with advanced features
   */
  async generateEnhancedReport(comparison, options = {}) {
    try {
      logger.info('Generating enhanced report');
      const startTime = Date.now();

      // Load the enhanced template
      const template = await this.loadTemplate('enhanced-report.html');
      
      // Prepare enhanced data
      const enhancedData = await this.prepareEnhancedData(comparison, options);
      
      // Generate report content
      const reportContent = this.populateTemplate(template, enhancedData);
      
      // Save report
      const filename = `enhanced-comparison-${Date.now()}.html`;
      const filepath = path.join(this.outputPath, filename);
      await fs.writeFile(filepath, reportContent);
      
      const duration = Date.now() - startTime;
      logger.performance('Enhanced report generation', duration);
      
      return {
        success: true,
        filename,
        filepath,
        url: `/output/reports/${filename}`,
        features: enhancedData.features,
        duration
      };
      
    } catch (error) {
      logger.error('Enhanced report generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Prepare enhanced data with algorithm insights and confidence scores
   */
  async prepareEnhancedData(comparison, options) {
    const performanceSummary = performanceMonitor.getPerformanceSummary();
    
    const enhancedData = {
      // Basic comparison data
      ...comparison,
      
      // Enhanced insights
      insights: {
        confidence: this.calculateOverallConfidence(comparison),
        algorithms: this.getAlgorithmInsights(comparison),
        performance: this.getPerformanceInsights(performanceSummary),
        recommendations: this.generateAdvancedRecommendations(comparison)
      },
      
      // Visual enhancements
      charts: {
        confidenceChart: this.generateConfidenceChart(comparison),
        performanceChart: this.generatePerformanceChart(performanceSummary),
        algorithmChart: this.generateAlgorithmChart(comparison)
      },
      
      // Metadata
      metadata: {
        ...comparison.metadata,
        generatedAt: new Date().toISOString(),
        version: '2.0.0',
        features: ['advanced-algorithms', 'confidence-scoring', 'performance-tracking']
      },
      
      // Feature flags
      features: {
        showConfidenceScores: options.showConfidenceScores !== false,
        showAlgorithmDetails: options.showAlgorithmDetails !== false,
        showPerformanceData: options.showPerformanceData !== false,
        enableInteractivity: options.enableInteractivity !== false
      }
    };

    return enhancedData;
  }

  /**
   * Calculate overall confidence score
   */
  calculateOverallConfidence(comparison) {
    const confidenceScores = [];
    
    // Color confidence
    if (comparison.colors?.averageConfidence !== undefined) {
      confidenceScores.push(comparison.colors.averageConfidence);
    }
    
    // Typography confidence
    if (comparison.typography?.averageConfidence !== undefined) {
      confidenceScores.push(comparison.typography.averageConfidence);
    }
    
    // Component confidence (if available)
    if (comparison.components?.matches) {
      const componentConfidences = comparison.components.matches
        .map(match => match.confidence)
        .filter(conf => conf !== undefined);
      
      if (componentConfidences.length > 0) {
        const avgComponentConfidence = componentConfidences.reduce((a, b) => a + b, 0) / componentConfidences.length;
        confidenceScores.push(avgComponentConfidence);
      }
    }
    
    if (confidenceScores.length === 0) return { score: 0, level: 'unknown' };
    
    const overallScore = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
    
    return {
      score: Math.round(overallScore * 100) / 100,
      percentage: Math.round(overallScore * 100),
      level: this.getConfidenceLevel(overallScore),
      breakdown: {
        colors: comparison.colors?.averageConfidence || 0,
        typography: comparison.typography?.averageConfidence || 0,
        components: comparison.components?.averageConfidence || 0
      }
    };
  }

  /**
   * Get algorithm insights
   */
  getAlgorithmInsights(comparison) {
    const insights = {
      colorsAlgorithm: comparison.colors?.algorithm || 'basic',
      typographyAlgorithm: comparison.typography?.algorithm || 'basic',
      componentsAlgorithm: comparison.components?.algorithm || 'basic',
      
      advanced: {
        deltaE: comparison.colors?.algorithm === 'deltaE',
        fuzzyMatching: comparison.typography?.algorithm === 'fuzzyMatch',
        structuralSimilarity: comparison.components?.algorithm === 'structuralSimilarity'
      },
      
      benefits: []
    };
    
    // Add algorithm-specific benefits
    if (insights.advanced.deltaE) {
      insights.benefits.push('Perceptually accurate color matching using Delta E');
    }
    
    if (insights.advanced.fuzzyMatching) {
      insights.benefits.push('Intelligent font family matching with similarity scoring');
    }
    
    if (insights.advanced.structuralSimilarity) {
      insights.benefits.push('Component matching based on structure and properties');
    }
    
    return insights;
  }

  /**
   * Get performance insights
   */
  getPerformanceInsights(performanceSummary) {
    return {
      totalComparisons: performanceSummary.comparisons.total,
      averageComparisonTime: performanceSummary.comparisons.avgDuration,
      slowComparisons: performanceSummary.comparisons.slow,
      systemHealth: performanceSummary.system.currentMemory,
      uptime: Math.round(performanceSummary.system.uptime / 3600), // hours
      
      status: this.getPerformanceStatus(performanceSummary)
    };
  }

  /**
   * Generate advanced recommendations
   */
  generateAdvancedRecommendations(comparison) {
    const recommendations = [];
    const confidence = this.calculateOverallConfidence(comparison);
    
    // Confidence-based recommendations
    if (confidence.score < 0.7) {
      recommendations.push({
        type: 'warning',
        category: 'Accuracy',
        title: 'Low Confidence Score',
        message: 'The comparison shows low confidence. Consider reviewing the design-to-implementation alignment.',
        priority: 'high'
      });
    }
    
    // Algorithm-specific recommendations
    if (comparison.colors?.algorithm === 'basic') {
      recommendations.push({
        type: 'info',
        category: 'Enhancement',
        title: 'Color Matching Enhancement',
        message: 'Enable advanced Delta E color matching for more accurate color comparisons.',
        priority: 'medium'
      });
    }
    
    // Performance recommendations
    const performanceSummary = performanceMonitor.getPerformanceSummary();
    if (performanceSummary.comparisons.avgDuration > 5000) {
      recommendations.push({
        type: 'warning',
        category: 'Performance',
        title: 'Slow Comparisons Detected',
        message: 'Consider optimizing the comparison process or reducing the dataset size.',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  /**
   * Generate confidence chart data
   */
  generateConfidenceChart(comparison) {
    const confidence = this.calculateOverallConfidence(comparison);
    
    return {
      type: 'donut',
      data: {
        labels: ['Colors', 'Typography', 'Components'],
        datasets: [{
          data: [
            Math.round((confidence.breakdown.colors || 0) * 100),
            Math.round((confidence.breakdown.typography || 0) * 100),
            Math.round((confidence.breakdown.components || 0) * 100)
          ],
          backgroundColor: ['#F24E1E', '#0ACF83', '#1ABCFE']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    };
  }

  /**
   * Generate performance chart data
   */
  generatePerformanceChart(performanceSummary) {
    return {
      type: 'line',
      data: {
        labels: ['Extraction', 'Comparison', 'Report Generation'],
        datasets: [{
          label: 'Duration (ms)',
          data: [
            performanceSummary.extractions.avgDuration,
            performanceSummary.comparisons.avgDuration,
            1000 // Placeholder for report generation
          ],
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)'
        }]
      }
    };
  }

  /**
   * Generate algorithm comparison chart
   */
  generateAlgorithmChart(comparison) {
    return {
      type: 'bar',
      data: {
        labels: ['Colors', 'Typography', 'Components'],
        datasets: [
          {
            label: 'Basic Algorithm',
            data: [
              comparison.colors?.algorithm === 'basic' ? comparison.colors.score : 0,
              comparison.typography?.algorithm === 'basic' ? comparison.typography.score : 0,
              comparison.components?.algorithm === 'basic' ? comparison.components.score : 0
            ],
            backgroundColor: 'rgba(156, 163, 175, 0.7)'
          },
          {
            label: 'Advanced Algorithm',
            data: [
              comparison.colors?.algorithm !== 'basic' ? comparison.colors.score : 0,
              comparison.typography?.algorithm !== 'basic' ? comparison.typography.score : 0,
              comparison.components?.algorithm !== 'basic' ? comparison.components.score : 0
            ],
            backgroundColor: 'rgba(139, 92, 246, 0.7)'
          }
        ]
      }
    };
  }

  /**
   * Helper methods
   */
  getConfidenceLevel(score) {
    if (score >= 0.9) return 'excellent';
    if (score >= 0.8) return 'very-good';
    if (score >= 0.7) return 'good';
    if (score >= 0.6) return 'fair';
    if (score >= 0.4) return 'poor';
    return 'very-poor';
  }

  getPerformanceStatus(summary) {
    if (summary.comparisons.slow > 0 || summary.system.currentMemory.used > 500) {
      return 'warning';
    }
    return 'healthy';
  }

  async loadTemplate(templateName) {
    try {
      const templatePath = path.join(this.templatesPath, templateName);
      return await fs.readFile(templatePath, 'utf8');
    } catch (error) {
      // Fallback to basic template
      logger.warn(`Enhanced template not found, using basic template`, { templateName });
      return await this.createBasicTemplate();
    }
  }

  async createBasicTemplate() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Comparison Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 32px; }
        .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; margin-bottom: 32px; }
        .confidence-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; }
        .excellent { background: #d1fae5; color: #065f46; }
        .good { background: #dbeafe; color: #1e40af; }
        .fair { background: #fef3c7; color: #92400e; }
        .poor { background: #fee2e2; color: #991b1b; }
        .chart-container { margin: 24px 0; height: 400px; }
        .recommendation { padding: 16px; margin: 12px 0; border-radius: 8px; border-left: 4px solid; }
        .recommendation.warning { background: #fef3c7; border-color: #f59e0b; }
        .recommendation.info { background: #dbeafe; border-color: #3b82f6; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Enhanced Comparison Report</h1>
            <p>Generated: {{generatedAt}}</p>
            <div class="confidence-badge {{confidenceLevel}}">
                Overall Confidence: {{confidencePercentage}}%
            </div>
        </div>
        
        <div class="insights">
            <h2>Algorithm Insights</h2>
            <p>Advanced algorithms used: {{algorithmBenefits}}</p>
            
            <div class="chart-container">
                <canvas id="confidenceChart"></canvas>
            </div>
        </div>
        
        <div class="recommendations">
            <h2>Recommendations</h2>
            {{recommendations}}
        </div>
        
        <div class="performance">
            <h2>Performance Data</h2>
            <div class="chart-container">
                <canvas id="performanceChart"></canvas>
            </div>
        </div>
    </div>
    
    <script>
        // Chart initialization would go here
        {{chartScript}}
    </script>
</body>
</html>`;
  }

  populateTemplate(template, data) {
    let content = template;
    
    // Replace placeholders
    content = content.replace(/{{generatedAt}}/g, new Date(data.metadata.generatedAt).toLocaleString());
    content = content.replace(/{{confidenceLevel}}/g, data.insights.confidence.level);
    content = content.replace(/{{confidencePercentage}}/g, data.insights.confidence.percentage);
    content = content.replace(/{{algorithmBenefits}}/g, data.insights.algorithms.benefits.join(', '));
    
    // Generate recommendations HTML
    const recommendationsHtml = data.insights.recommendations
      .map(rec => `<div class="recommendation ${rec.type}"><strong>${rec.title}</strong><br>${rec.message}</div>`)
      .join('');
    content = content.replace(/{{recommendations}}/g, recommendationsHtml);
    
    // Generate chart script
    const chartScript = this.generateChartScript(data.charts);
    content = content.replace(/{{chartScript}}/g, chartScript);
    
    return content;
  }

  generateChartScript(charts) {
    return `
    // Confidence Chart
    new Chart(document.getElementById('confidenceChart'), ${JSON.stringify(charts.confidenceChart)});
    
    // Performance Chart  
    new Chart(document.getElementById('performanceChart'), ${JSON.stringify(charts.performanceChart)});
    `;
  }
}

// Export singleton instance
export const enhancedReportGenerator = new EnhancedReportGenerator();
export default enhancedReportGenerator; 