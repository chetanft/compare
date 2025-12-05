/**
 * Screenshot Automation Service
 * Automated screenshot capture with scheduling and diffing
 */

import { getBrowserPool } from '../browser/BrowserPool.js';

/**
 * Screenshot Automation Service
 */
export class ScreenshotAutomation {
    constructor(config = {}) {
        this.browserPool = null;
        this.config = {
            defaultViewport: { width: 1920, height: 1080 },
            quality: 90,
            format: 'png',
            fullPage: true,
            ...config
        };
        this.scheduledJobs = new Map();
    }

    /**
     * Initialize the service
     */
    async initialize() {
        if (!this.browserPool) {
            this.browserPool = getBrowserPool();
        }
    }

    /**
     * Capture a screenshot of a URL
     * @param {string} url - URL to capture
     * @param {Object} options - Capture options
     * @returns {Object} Screenshot result
     */
    async capture(url, options = {}) {
        await this.initialize();

        const captureOptions = { ...this.config, ...options };
        const startTime = Date.now();

        try {
            const { page, pageId } = await this.browserPool.createPage({
                width: captureOptions.defaultViewport.width,
                height: captureOptions.defaultViewport.height
            });

            // Navigate to URL
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // Wait for any dynamic content
            if (captureOptions.waitForSelector) {
                await page.waitForSelector(captureOptions.waitForSelector, { timeout: 10000 });
            }

            // Additional wait for stability
            await new Promise(resolve => setTimeout(resolve, captureOptions.delay || 1000));

            // Capture screenshot
            const screenshot = await page.screenshot({
                fullPage: captureOptions.fullPage,
                type: captureOptions.format,
                quality: captureOptions.format === 'jpeg' ? captureOptions.quality : undefined,
                encoding: 'base64'
            });

            // Get page metadata
            const metadata = await page.evaluate(() => ({
                title: document.title,
                url: window.location.href,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                scrollHeight: document.documentElement.scrollHeight
            }));

            await this.browserPool.closePage(pageId);

            return {
                success: true,
                screenshot,
                metadata: {
                    ...metadata,
                    capturedAt: new Date().toISOString(),
                    duration: Date.now() - startTime
                }
            };

        } catch (error) {
            console.error('Screenshot capture failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Capture multiple viewport sizes
     * @param {string} url - URL to capture
     * @param {Array} viewports - Array of viewport configurations
     * @returns {Array} Screenshots for each viewport
     */
    async captureMultipleViewports(url, viewports = []) {
        const defaultViewports = viewports.length > 0 ? viewports : [
            { name: 'desktop', width: 1920, height: 1080 },
            { name: 'tablet', width: 768, height: 1024 },
            { name: 'mobile', width: 375, height: 812 }
        ];

        const results = [];

        for (const viewport of defaultViewports) {
            const result = await this.capture(url, {
                defaultViewport: { width: viewport.width, height: viewport.height }
            });

            results.push({
                viewport: viewport.name,
                width: viewport.width,
                height: viewport.height,
                ...result
            });
        }

        return results;
    }

    /**
     * Capture with authentication
     * @param {string} url - Target URL
     * @param {Object} auth - Authentication credentials
     * @param {string} loginUrl - Login page URL
     * @returns {Object} Screenshot result
     */
    async captureWithAuth(url, auth, loginUrl) {
        await this.initialize();

        try {
            const { page, pageId } = await this.browserPool.createPage(this.config.defaultViewport);

            // Navigate to login page
            await page.goto(loginUrl, { waitUntil: 'networkidle0' });

            // Fill login form
            const usernameSelectors = ['#username', '#email', 'input[name="username"]', 'input[type="email"]'];
            const passwordSelectors = ['#password', 'input[name="password"]', 'input[type="password"]'];

            for (const selector of usernameSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 2000 });
                    await page.type(selector, auth.username);
                    break;
                } catch (_) { }
            }

            for (const selector of passwordSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 2000 });
                    await page.type(selector, auth.password);
                    break;
                } catch (_) { }
            }

            // Submit form
            await page.keyboard.press('Enter');
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });

            // Navigate to target URL
            await page.goto(url, { waitUntil: 'networkidle0' });

            // Capture screenshot
            const screenshot = await page.screenshot({
                fullPage: this.config.fullPage,
                type: this.config.format,
                encoding: 'base64'
            });

            await this.browserPool.closePage(pageId);

            return {
                success: true,
                screenshot,
                authenticated: true
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Schedule periodic screenshot capture
     * @param {string} jobId - Unique job identifier
     * @param {string} url - URL to capture
     * @param {number} intervalMs - Interval in milliseconds
     * @param {Function} callback - Callback function for each capture
     */
    scheduleCapture(jobId, url, intervalMs, callback) {
        if (this.scheduledJobs.has(jobId)) {
            this.cancelSchedule(jobId);
        }

        const job = {
            url,
            intervalMs,
            callback,
            intervalId: setInterval(async () => {
                const result = await this.capture(url);
                callback(result, jobId);
            }, intervalMs),
            startedAt: new Date().toISOString()
        };

        this.scheduledJobs.set(jobId, job);
        console.log(`📸 Scheduled screenshot job: ${jobId} (every ${intervalMs}ms)`);

        return job;
    }

    /**
     * Cancel a scheduled job
     * @param {string} jobId - Job identifier
     */
    cancelSchedule(jobId) {
        const job = this.scheduledJobs.get(jobId);
        if (job) {
            clearInterval(job.intervalId);
            this.scheduledJobs.delete(jobId);
            console.log(`🛑 Cancelled screenshot job: ${jobId}`);
        }
    }

    /**
     * Get all scheduled jobs
     * @returns {Array} List of scheduled jobs
     */
    getScheduledJobs() {
        return Array.from(this.scheduledJobs.entries()).map(([id, job]) => ({
            id,
            url: job.url,
            intervalMs: job.intervalMs,
            startedAt: job.startedAt
        }));
    }

    /**
     * Compare two screenshots
     * @param {string} screenshot1 - Base64 screenshot 1
     * @param {string} screenshot2 - Base64 screenshot 2
     * @returns {Object} Comparison result
     */
    async compareScreenshots(screenshot1, screenshot2) {
        // This would typically use pixelmatch or similar
        // For now, return a placeholder
        return {
            identical: screenshot1 === screenshot2,
            diffPercentage: screenshot1 === screenshot2 ? 0 : null,
            message: 'Use pixelmatch for detailed pixel comparison'
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        // Cancel all scheduled jobs
        for (const jobId of this.scheduledJobs.keys()) {
            this.cancelSchedule(jobId);
        }
    }
}

/**
 * Create screenshot automation instance
 */
export function createScreenshotAutomation(config = {}) {
    return new ScreenshotAutomation(config);
}

export default ScreenshotAutomation;
