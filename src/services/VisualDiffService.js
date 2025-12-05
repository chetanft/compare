/**
 * Visual Diff Service
 * AI-powered visual comparison using GPT-4 Vision or similar
 */

/**
 * Visual Diff Analysis Configuration
 */
const DEFAULT_CONFIG = {
    model: 'gpt-4-vision-preview',
    maxTokens: 4096,
    temperature: 0.3,
    compareAspects: [
        'layout',
        'colors',
        'typography',
        'spacing',
        'components',
        'icons',
        'images',
        'responsive'
    ]
};

/**
 * Visual Diff Service Class
 * Compares screenshots using AI vision models
 */
export class VisualDiffService {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    }

    /**
     * Compare two screenshots using AI vision
     * @param {string} figmaScreenshot - Base64 Figma screenshot
     * @param {string} webScreenshot - Base64 web screenshot
     * @param {Object} options - Comparison options
     * @returns {Object} AI analysis result
     */
    async compare(figmaScreenshot, webScreenshot, options = {}) {
        if (!this.apiKey) {
            return this.fallbackComparison(figmaScreenshot, webScreenshot);
        }

        const aspects = options.aspects || this.config.compareAspects;

        const prompt = this.buildPrompt(aspects);

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.model,
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature,
                    messages: [
                        {
                            role: 'system',
                            content: `You are a UI/UX design expert analyzing visual differences between a Figma design and a web implementation. Provide detailed, actionable feedback.`
                        },
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: prompt
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: `data:image/png;base64,${figmaScreenshot}`,
                                        detail: 'high'
                                    }
                                },
                                {
                                    type: 'image_url',
                                    image_url: {
                                        url: `data:image/png;base64,${webScreenshot}`,
                                        detail: 'high'
                                    }
                                }
                            ]
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const analysis = data.choices[0]?.message?.content;

            return this.parseAnalysis(analysis);

        } catch (error) {
            console.error('AI visual diff failed:', error);
            return this.fallbackComparison(figmaScreenshot, webScreenshot);
        }
    }

    /**
     * Build the comparison prompt
     */
    buildPrompt(aspects) {
        return `Compare these two images:
- Image 1: Figma design (source of truth)
- Image 2: Web implementation

Analyze the following aspects and rate each from 1-10:
${aspects.map(a => `- ${a}`).join('\n')}

For each aspect, provide:
1. Score (1-10)
2. Issues found (specific differences)
3. Recommendations (how to fix)

Also provide:
- Overall match score (0-100%)
- Top 3 most critical issues
- Pixel-level observations if visible

Format your response as JSON with this structure:
{
  "overallScore": number,
  "aspects": {
    "<aspect>": {
      "score": number,
      "issues": string[],
      "recommendations": string[]
    }
  },
  "criticalIssues": string[],
  "pixelObservations": string[]
}`;
    }

    /**
     * Parse AI analysis response
     */
    parseAnalysis(analysisText) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return {
                    success: true,
                    analysis: JSON.parse(jsonMatch[0]),
                    raw: analysisText
                };
            }
        } catch (e) {
            console.warn('Failed to parse AI response as JSON');
        }

        // Return raw analysis if JSON parsing fails
        return {
            success: true,
            analysis: {
                overallScore: null,
                rawAnalysis: analysisText
            },
            raw: analysisText
        };
    }

    /**
     * Fallback pixel-based comparison when AI is not available
     */
    async fallbackComparison(figmaScreenshot, webScreenshot) {
        // Return a placeholder that indicates AI comparison is not available
        return {
            success: false,
            error: 'AI visual diff not available (no API key)',
            fallback: {
                message: 'Use pixel-based comparison instead',
                suggestion: 'Set OPENAI_API_KEY environment variable to enable AI visual diff'
            }
        };
    }

    /**
     * Generate a visual diff report
     */
    generateReport(analysis, metadata = {}) {
        const report = {
            generatedAt: new Date().toISOString(),
            metadata,
            summary: {
                overallScore: analysis.analysis?.overallScore || 'N/A',
                status: this.getStatusFromScore(analysis.analysis?.overallScore)
            },
            details: analysis.analysis?.aspects || {},
            criticalIssues: analysis.analysis?.criticalIssues || [],
            recommendations: this.extractRecommendations(analysis.analysis?.aspects)
        };

        return report;
    }

    /**
     * Get status label from score
     */
    getStatusFromScore(score) {
        if (score === null || score === undefined) return 'unknown';
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 50) return 'needs-improvement';
        return 'critical';
    }

    /**
     * Extract all recommendations from aspects
     */
    extractRecommendations(aspects) {
        if (!aspects) return [];

        const recommendations = [];
        for (const [aspect, data] of Object.entries(aspects)) {
            if (data.recommendations) {
                recommendations.push(...data.recommendations.map(r => ({
                    aspect,
                    recommendation: r,
                    priority: data.score < 5 ? 'high' : data.score < 7 ? 'medium' : 'low'
                })));
            }
        }

        return recommendations.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
}

/**
 * Create a visual diff service instance
 */
export function createVisualDiffService(config = {}) {
    return new VisualDiffService(config);
}

export default VisualDiffService;
