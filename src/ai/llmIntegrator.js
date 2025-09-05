/**
 * LLM Integration Service
 * Connects to free LLM providers (Deepseek, Qwen) for enhanced comparison analysis
 */

import axios from 'axios';
import { getConfig } from '../config/index.js';

export class LLMIntegrator {
  constructor() {
    this.cache = new Map();
    this.requestQueue = [];
    this.isProcessing = false;
  }

  /**
   * Get LLM-powered summary of comparison differences
   * @param {Object} comparisonData - The comparison results to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<string>} AI-generated summary
   */
  async getLLMSummary(comparisonData, options = {}) {
    try {
      const config = await getConfig();
      const llmConfig = config.nextVersion?.llm;
      
      if (!llmConfig?.enabled || !llmConfig?.apiKey) {
        console.log('ℹ️ LLM integration disabled or no API key provided, using fallback');
        return this.generateFallbackSummary(comparisonData);
      }

      // Create cache key for deduplication
      const cacheKey = this.createCacheKey(comparisonData);
      if (this.cache.has(cacheKey)) {
        console.log('📋 Using cached LLM analysis');
        return this.cache.get(cacheKey);
      }

      // Prepare data for LLM analysis
      const analysisPrompt = this.prepareAnalysisPrompt(comparisonData, options);
      
      // Make LLM API call with timeout and retry
      const summary = await this.callLLMAPI(analysisPrompt, llmConfig);
      
      // Cache the result (with size limits)
      if (this.cache.size > 50) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(cacheKey, summary);
      
      return summary;
    } catch (error) {
      console.log('⚠️ LLM analysis failed, using fallback:', error.message);
      return this.generateFallbackSummary(comparisonData);
    }
  }

  /**
   * Call the LLM API with proper error handling and retries
   */
  async callLLMAPI(prompt, llmConfig, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 Calling ${llmConfig.provider} API (attempt ${attempt}/${maxRetries})...`);
        
        const response = await axios.post(llmConfig.apiUrl, {
          model: llmConfig.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert UI/UX designer analyzing differences between Figma designs and web implementations. Provide concise, actionable insights.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: llmConfig.maxTokens,
          temperature: 0.3,
          stream: false
        }, {
          headers: {
            'Authorization': `Bearer ${llmConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: llmConfig.timeout
        });

        const summary = response.data.choices[0]?.message?.content;
        if (!summary) {
          throw new Error('Empty response from LLM API');
        }

        console.log('✅ LLM analysis completed successfully');
        return summary.trim();
        
      } catch (error) {
        console.log(`⚠️ LLM API attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = 1000 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Prepare a structured prompt for LLM analysis
   */
  prepareAnalysisPrompt(comparisonData, options) {
    const sections = [];
    
    // Visual differences
    if (comparisonData.visual?.comparisons?.length > 0) {
      const visualDiffs = comparisonData.visual.comparisons.map(c => 
        `- ${c.metrics?.diffPercentage || 0}% difference, ${c.metrics?.similarity || 0}% similarity`
      ).join('\n');
      sections.push(`Visual Differences:\n${visualDiffs}`);
    }

    // Structural differences
    if (comparisonData.structuralDifferences?.length > 0) {
      const structuralDiffs = comparisonData.structuralDifferences.slice(0, 5).map(d => 
        `- ${d.type}: ${d.description || d.message}`
      ).join('\n');
      sections.push(`Structural Issues:\n${structuralDiffs}`);
    }

    // CSS differences
    if (comparisonData.cssDifferences?.length > 0) {
      const cssDiffs = comparisonData.cssDifferences.slice(0, 5).map(d => 
        `- ${d.property}: expected ${d.expected}, found ${d.actual}`
      ).join('\n');
      sections.push(`CSS Differences:\n${cssDiffs}`);
    }

    // Component matches
    if (comparisonData.componentMatches) {
      const matchRate = comparisonData.componentMatches.matchPercentage || 0;
      sections.push(`Component Match Rate: ${matchRate}%`);
    }

    const prompt = `Analyze this Figma vs Web comparison and provide a concise summary focusing on:
1. Key visual discrepancies
2. Most critical issues to fix
3. Priority recommendations (limit to top 3)

Data:
${sections.join('\n\n')}

Respond in under 200 words with actionable insights.`;

    return prompt;
  }

  /**
   * Generate fallback summary when LLM is unavailable
   */
  generateFallbackSummary(comparisonData) {
    const issues = [];
    let totalScore = 100;

    // Analyze visual differences
    if (comparisonData.visual?.summary?.avgSimilarity) {
      const similarity = comparisonData.visual.summary.avgSimilarity;
      if (similarity < 85) {
        issues.push(`Visual similarity is ${similarity}% (target: >85%)`);
        totalScore -= (85 - similarity);
      }
    }

    // Analyze structural issues
    if (comparisonData.structuralDifferences?.length > 0) {
      const count = comparisonData.structuralDifferences.length;
      issues.push(`${count} structural difference${count > 1 ? 's' : ''} found`);
      totalScore -= Math.min(count * 5, 20);
    }

    // Analyze CSS differences
    if (comparisonData.cssDifferences?.length > 0) {
      const count = comparisonData.cssDifferences.length;
      issues.push(`${count} CSS difference${count > 1 ? 's' : ''} detected`);
      totalScore -= Math.min(count * 3, 15);
    }

    const score = Math.max(totalScore, 0);
    const priority = score > 80 ? 'Low' : score > 60 ? 'Medium' : 'High';

    return `Comparison Score: ${score}/100 (${priority} Priority)

Key Issues:
${issues.length > 0 ? issues.map(i => `• ${i}`).join('\n') : '• No major issues detected'}

Recommendations:
${this.generateBasicRecommendations(comparisonData)}

Note: This is a basic analysis. Enable LLM integration for detailed AI insights.`;
  }

  /**
   * Generate basic recommendations without LLM
   */
  generateBasicRecommendations(comparisonData) {
    const recommendations = [];

    if (comparisonData.visual?.summary?.avgSimilarity < 85) {
      recommendations.push('Review visual elements for color and spacing consistency');
    }

    if (comparisonData.structuralDifferences?.length > 3) {
      recommendations.push('Audit component structure and hierarchy');
    }

    if (comparisonData.cssDifferences?.some(d => d.property?.includes('color'))) {
      recommendations.push('Standardize color palette implementation');
    }

    if (recommendations.length === 0) {
      recommendations.push('Implementation looks good! Consider minor polish improvements');
    }

    return recommendations.slice(0, 3).map((r, i) => `${i + 1}. ${r}`).join('\n');
  }

  /**
   * Create cache key for deduplication
   */
  createCacheKey(comparisonData) {
    const key = JSON.stringify({
      visualSimilarity: comparisonData.visual?.summary?.avgSimilarity,
      structuralCount: comparisonData.structuralDifferences?.length || 0,
      cssCount: comparisonData.cssDifferences?.length || 0,
      componentMatch: comparisonData.componentMatches?.matchPercentage
    });
    return Buffer.from(key).toString('base64').substring(0, 16);
  }
}

// Singleton instance
let llmIntegratorInstance = null;

/**
 * Get LLM integrator instance
 */
export function getLLMIntegrator() {
  if (!llmIntegratorInstance) {
    llmIntegratorInstance = new LLMIntegrator();
  }
  return llmIntegratorInstance;
}

export default LLMIntegrator; 