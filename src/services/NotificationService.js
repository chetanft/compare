/**
 * Notification Service
 * Handles alerts and notifications for comparison events
 */

/**
 * Notification Channel Types
 */
export const NotificationChannel = {
    WEBHOOK: 'webhook',
    EMAIL: 'email',
    SLACK: 'slack',
    CONSOLE: 'console'
};

/**
 * Notification Event Types
 */
export const NotificationEvent = {
    COMPARISON_COMPLETE: 'comparison.complete',
    SCORE_DROP: 'score.drop',
    SCORE_IMPROVE: 'score.improve',
    CRITICAL_DEVIATION: 'deviation.critical',
    SCHEDULED_CAPTURE: 'capture.scheduled',
    ERROR: 'error'
};

/**
 * Notification Service Class
 */
export class NotificationService {
    constructor(config = {}) {
        this.channels = new Map();
        this.subscriptions = new Map();
        this.config = {
            defaultChannel: NotificationChannel.CONSOLE,
            scoreDropThreshold: 10,
            criticalScoreThreshold: 50,
            ...config
        };

        // Register default console channel
        this.registerChannel(NotificationChannel.CONSOLE, async (notification) => {
            console.log(`📢 [${notification.event}]`, notification.message);
            if (notification.data) {
                console.log('   Data:', JSON.stringify(notification.data, null, 2));
            }
        });
    }

    /**
     * Register a notification channel
     * @param {string} channelId - Channel identifier
     * @param {Function} handler - Async handler function
     */
    registerChannel(channelId, handler) {
        this.channels.set(channelId, {
            id: channelId,
            handler,
            enabled: true,
            registeredAt: new Date().toISOString()
        });
        console.log(`📡 Registered notification channel: ${channelId}`);
    }

    /**
     * Register a webhook channel
     * @param {string} webhookUrl - Webhook URL
     * @param {Object} options - Webhook options
     */
    registerWebhook(webhookUrl, options = {}) {
        const channelId = `webhook_${Date.now()}`;

        this.registerChannel(channelId, async (notification) => {
            try {
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(options.headers || {})
                    },
                    body: JSON.stringify({
                        event: notification.event,
                        message: notification.message,
                        data: notification.data,
                        timestamp: notification.timestamp,
                        ...(options.additionalData || {})
                    })
                });
            } catch (error) {
                console.error(`Webhook notification failed:`, error);
            }
        });

        return channelId;
    }

    /**
     * Register a Slack channel
     * @param {string} webhookUrl - Slack webhook URL
     */
    registerSlack(webhookUrl) {
        const channelId = `slack_${Date.now()}`;

        this.registerChannel(channelId, async (notification) => {
            const emoji = this.getSlackEmoji(notification.event);
            const color = this.getSlackColor(notification.event, notification.data);

            try {
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: `${emoji} ${notification.message}`,
                        attachments: [{
                            color,
                            fields: this.formatSlackFields(notification.data),
                            footer: 'Figma Comparison Tool',
                            ts: Math.floor(Date.now() / 1000)
                        }]
                    })
                });
            } catch (error) {
                console.error('Slack notification failed:', error);
            }
        });

        return channelId;
    }

    /**
     * Subscribe to events on a channel
     * @param {string} channelId - Channel to subscribe
     * @param {string|string[]} events - Events to subscribe to
     */
    subscribe(channelId, events) {
        const eventList = Array.isArray(events) ? events : [events];

        eventList.forEach(event => {
            if (!this.subscriptions.has(event)) {
                this.subscriptions.set(event, new Set());
            }
            this.subscriptions.get(event).add(channelId);
        });

        console.log(`📬 Subscribed ${channelId} to: ${eventList.join(', ')}`);
    }

    /**
     * Send a notification
     * @param {string} event - Event type
     * @param {string} message - Notification message
     * @param {Object} data - Additional data
     */
    async notify(event, message, data = {}) {
        const notification = {
            event,
            message,
            data,
            timestamp: new Date().toISOString()
        };

        // Get subscribed channels for this event
        const subscribedChannels = this.subscriptions.get(event) || new Set();

        // Also notify default channel if configured
        if (this.config.notifyDefault && !subscribedChannels.has(this.config.defaultChannel)) {
            subscribedChannels.add(this.config.defaultChannel);
        }

        // If no subscriptions, use default channel
        if (subscribedChannels.size === 0) {
            subscribedChannels.add(this.config.defaultChannel);
        }

        // Send to all subscribed channels
        const promises = Array.from(subscribedChannels).map(async channelId => {
            const channel = this.channels.get(channelId);
            if (channel?.enabled) {
                try {
                    await channel.handler(notification);
                } catch (error) {
                    console.error(`Notification failed on ${channelId}:`, error);
                }
            }
        });

        await Promise.all(promises);
    }

    /**
     * Notify about comparison completion
     * @param {Object} comparison - Comparison result
     */
    async notifyComparisonComplete(comparison) {
        const score = comparison.overallScore;
        const status = score >= 90 ? 'Excellent' :
            score >= 75 ? 'Good' :
                score >= 50 ? 'Needs Improvement' : 'Critical';

        await this.notify(
            NotificationEvent.COMPARISON_COMPLETE,
            `Comparison completed with ${status} score: ${score}%`,
            {
                score,
                status,
                figmaUrl: comparison.figmaUrl,
                webUrl: comparison.webUrl,
                deviations: comparison.deviations?.length || 0,
                matches: comparison.matches?.length || 0
            }
        );

        // Check for score thresholds
        if (score < this.config.criticalScoreThreshold) {
            await this.notify(
                NotificationEvent.CRITICAL_DEVIATION,
                `⚠️ Critical: Score dropped below ${this.config.criticalScoreThreshold}%`,
                { score, threshold: this.config.criticalScoreThreshold }
            );
        }
    }

    /**
     * Notify about score changes
     * @param {number} previousScore - Previous score
     * @param {number} currentScore - Current score
     * @param {Object} context - Additional context
     */
    async notifyScoreChange(previousScore, currentScore, context = {}) {
        const difference = currentScore - previousScore;

        if (Math.abs(difference) >= this.config.scoreDropThreshold) {
            const event = difference > 0 ? NotificationEvent.SCORE_IMPROVE : NotificationEvent.SCORE_DROP;
            const emoji = difference > 0 ? '📈' : '📉';

            await this.notify(
                event,
                `${emoji} Score ${difference > 0 ? 'improved' : 'dropped'} by ${Math.abs(difference)} points`,
                {
                    previousScore,
                    currentScore,
                    difference,
                    ...context
                }
            );
        }
    }

    /**
     * Get Slack emoji for event
     */
    getSlackEmoji(event) {
        const emojis = {
            [NotificationEvent.COMPARISON_COMPLETE]: '✅',
            [NotificationEvent.SCORE_DROP]: '📉',
            [NotificationEvent.SCORE_IMPROVE]: '📈',
            [NotificationEvent.CRITICAL_DEVIATION]: '🚨',
            [NotificationEvent.SCHEDULED_CAPTURE]: '📸',
            [NotificationEvent.ERROR]: '❌'
        };
        return emojis[event] || '📢';
    }

    /**
     * Get Slack color for event
     */
    getSlackColor(event, data) {
        if (event === NotificationEvent.ERROR || event === NotificationEvent.CRITICAL_DEVIATION) {
            return 'danger';
        }
        if (event === NotificationEvent.SCORE_DROP) {
            return 'warning';
        }
        if (data?.score >= 90 || event === NotificationEvent.SCORE_IMPROVE) {
            return 'good';
        }
        return '#3498db';
    }

    /**
     * Format data as Slack fields
     */
    formatSlackFields(data) {
        if (!data) return [];

        return Object.entries(data)
            .filter(([_, v]) => v !== undefined && v !== null)
            .slice(0, 10)
            .map(([key, value]) => ({
                title: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
                value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                short: String(value).length < 30
            }));
    }

    /**
     * Disable a channel
     */
    disableChannel(channelId) {
        const channel = this.channels.get(channelId);
        if (channel) {
            channel.enabled = false;
        }
    }

    /**
     * Enable a channel
     */
    enableChannel(channelId) {
        const channel = this.channels.get(channelId);
        if (channel) {
            channel.enabled = true;
        }
    }
}

/**
 * Create notification service instance
 */
export function createNotificationService(config = {}) {
    return new NotificationService(config);
}

export default NotificationService;
