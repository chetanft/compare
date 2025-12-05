/**
 * Comparison History Service
 * Tracks comparison history and trends over time
 */

/**
 * Comparison History Manager
 */
export class ComparisonHistory {
    constructor(supabase = null) {
        this.supabase = supabase;
        this.localHistory = [];
        this.maxLocalHistory = 100;
    }

    /**
     * Record a comparison result
     * @param {Object} comparison - Comparison data
     * @returns {Object} Saved record
     */
    async record(comparison) {
        const record = {
            id: this.generateId(),
            figmaUrl: comparison.figmaUrl,
            webUrl: comparison.webUrl,
            overallScore: comparison.overallScore,
            scores: comparison.scores,
            deviationCount: comparison.deviations?.length || 0,
            matchCount: comparison.matches?.length || 0,
            createdAt: new Date().toISOString(),
            metadata: comparison.metadata || {}
        };

        // Save to Supabase if available
        if (this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from('comparisons')
                    .insert({
                        figma_url: record.figmaUrl,
                        web_url: record.webUrl,
                        result: comparison,
                        status: 'completed',
                        duration_ms: record.metadata.duration
                    })
                    .select()
                    .single();

                if (!error) {
                    record.supabaseId = data.id;
                }
            } catch (e) {
                console.warn('Failed to save to Supabase:', e);
            }
        }

        // Always save locally too
        this.localHistory.unshift(record);
        if (this.localHistory.length > this.maxLocalHistory) {
            this.localHistory.pop();
        }

        return record;
    }

    /**
     * Get comparison history
     * @param {Object} options - Query options
     * @returns {Array} Comparison records
     */
    async getHistory(options = {}) {
        const { limit = 50, offset = 0, url = null, fromDate = null, toDate = null } = options;

        // Try Supabase first
        if (this.supabase) {
            try {
                let query = this.supabase
                    .from('comparisons')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1);

                if (url) {
                    query = query.or(`figma_url.ilike.%${url}%,web_url.ilike.%${url}%`);
                }
                if (fromDate) {
                    query = query.gte('created_at', fromDate);
                }
                if (toDate) {
                    query = query.lte('created_at', toDate);
                }

                const { data, error } = await query;
                if (!error && data) {
                    return data;
                }
            } catch (e) {
                console.warn('Supabase query failed, using local history');
            }
        }

        // Fallback to local history
        let filtered = [...this.localHistory];

        if (url) {
            filtered = filtered.filter(r =>
                r.figmaUrl?.includes(url) || r.webUrl?.includes(url)
            );
        }
        if (fromDate) {
            filtered = filtered.filter(r => new Date(r.createdAt) >= new Date(fromDate));
        }
        if (toDate) {
            filtered = filtered.filter(r => new Date(r.createdAt) <= new Date(toDate));
        }

        return filtered.slice(offset, offset + limit);
    }

    /**
     * Get comparison trends over time
     * @param {string} url - URL to analyze (figma or web)
     * @param {Object} options - Trend options
     * @returns {Object} Trend analysis
     */
    async getTrends(url, options = {}) {
        const { days = 30 } = options;
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);

        const history = await this.getHistory({
            url,
            fromDate: fromDate.toISOString(),
            limit: 1000
        });

        if (history.length === 0) {
            return { trend: 'no-data', data: [] };
        }

        // Calculate trends
        const scores = history.map(h => ({
            score: h.overallScore || h.result?.overallScore,
            date: h.createdAt || h.created_at
        })).filter(s => s.score !== undefined);

        if (scores.length < 2) {
            return { trend: 'insufficient-data', data: scores };
        }

        // Calculate moving average
        const movingAvg = this.calculateMovingAverage(scores.map(s => s.score), 3);

        // Determine trend direction
        const recentAvg = movingAvg.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const oldAvg = movingAvg.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const trendDirection = recentAvg > oldAvg + 5 ? 'improving' :
            recentAvg < oldAvg - 5 ? 'declining' : 'stable';

        return {
            trend: trendDirection,
            currentScore: scores[0]?.score,
            averageScore: Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length),
            minScore: Math.min(...scores.map(s => s.score)),
            maxScore: Math.max(...scores.map(s => s.score)),
            totalComparisons: scores.length,
            data: scores.slice(0, 30), // Last 30 data points
            movingAverage: movingAvg
        };
    }

    /**
     * Calculate moving average
     */
    calculateMovingAverage(data, windowSize) {
        const result = [];
        for (let i = windowSize - 1; i < data.length; i++) {
            const sum = data.slice(i - windowSize + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(Math.round(sum / windowSize));
        }
        return result;
    }

    /**
     * Get comparison statistics
     * @returns {Object} Statistics summary
     */
    async getStatistics() {
        const history = await this.getHistory({ limit: 1000 });

        if (history.length === 0) {
            return { totalComparisons: 0 };
        }

        const scores = history
            .map(h => h.overallScore || h.result?.overallScore)
            .filter(s => s !== undefined);

        const deviations = history
            .map(h => h.deviationCount || h.result?.summary?.totalDeviations || 0);

        return {
            totalComparisons: history.length,
            averageScore: scores.length > 0
                ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                : 0,
            averageDeviations: deviations.length > 0
                ? Math.round(deviations.reduce((a, b) => a + b, 0) / deviations.length)
                : 0,
            scoreDistribution: {
                excellent: scores.filter(s => s >= 90).length,
                good: scores.filter(s => s >= 75 && s < 90).length,
                needsWork: scores.filter(s => s >= 50 && s < 75).length,
                critical: scores.filter(s => s < 50).length
            },
            mostComparedUrls: this.getMostFrequent(
                history.map(h => h.webUrl || h.web_url).filter(Boolean)
            )
        };
    }

    /**
     * Get most frequently appearing items
     */
    getMostFrequent(items, limit = 5) {
        const counts = {};
        items.forEach(item => {
            counts[item] = (counts[item] || 0) + 1;
        });

        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([url, count]) => ({ url, count }));
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `cmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clear local history
     */
    clearLocalHistory() {
        this.localHistory = [];
    }
}

/**
 * Create comparison history instance
 */
export function createComparisonHistory(supabase = null) {
    return new ComparisonHistory(supabase);
}

export default ComparisonHistory;
