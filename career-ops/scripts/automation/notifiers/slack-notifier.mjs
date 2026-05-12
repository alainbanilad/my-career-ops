/**
 * slack-notifier.mjs — Slack webhook notification channel
 *
 * Sends formatted messages to Slack workspace via webhook.
 * Uses Block Kit for rich formatting.
 */

export class SlackNotifier {
  constructor(config = {}) {
    this.config = config;
    this.enabled = config.enabled || false;
    this.webhookUrl = config.webhook_url;
  }

  /**
   * Send notification to Slack
   * @param {Object} message - Message { title, message, type, metadata }
   * @returns {Promise<boolean>} Success
   */
  async notify(message) {
    try {
      if (!this.enabled || !this.webhookUrl) {
        console.warn('⚠️  Slack notifier not enabled or webhook_url not configured');
        return false;
      }

      const payload = this._formatSlackMessage(message);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }

      console.log('✅ Slack notification sent');
      return true;
    } catch (error) {
      console.error(`❌ Slack notifier failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Format message for Slack Block Kit
   * @private
   */
  _formatSlackMessage(message) {
    const blocks = [];
    const icon = this._getIcon(message.type);

    // Header
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${icon} ${message.title}`,
      },
    });

    // Message section
    if (message.message) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message.message,
        },
      });
    }

    // Metadata section
    if (message.metadata && Object.keys(message.metadata).length > 0) {
      const fields = Object.entries(message.metadata).map(([key, value]) => ({
        type: 'mrkdwn',
        text: `*${key}*: ${value}`,
      }));

      blocks.push({
        type: 'section',
        fields,
      });
    }

    // Timestamp footer
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_${new Date().toISOString()}_`,
        },
      ],
    });

    return { blocks };
  }

  /**
   * Get icon for message type
   * @private
   */
  _getIcon(type) {
    const icons = {
      scan: ':mag:',
      'form-fill': ':memo:',
      notification: ':bell:',
      error: ':x:',
      success: ':white_check_mark:',
    };
    return icons[type] || ':pin:';
  }
}

export default SlackNotifier;
