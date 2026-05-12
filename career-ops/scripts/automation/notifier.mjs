/**
 * notifier.mjs — Notification pipeline for automation events
 *
 * Sends notifications to configured channels (console, Slack, Obsidian).
 * Implements notification-interface.md contract.
 * All channels are optional; console is always enabled.
 */

import fs from 'fs';
import path from 'path';

export class NotificationPipeline {
  constructor(config = {}) {
    this.config = config;
    this.enabledChannels = this._detectEnabledChannels();
  }

  /**
   * Detect which notification channels are enabled
   * @private
   */
  _detectEnabledChannels() {
    const channels = [];

    // Console is always enabled
    if (this.config.console?.enabled !== false) {
      channels.push('console');
    }

    if (this.config.slack?.enabled) {
      channels.push('slack');
    }

    if (this.config.obsidian?.enabled) {
      channels.push('obsidian');
    }

    return channels;
  }

  /**
   * Send notification to all enabled channels
   * @param {Object} event - Event object { type, data, timestamp }
   * @returns {Promise<Object>} Results { channel: status }
   */
  async notify(event) {
    const normalizedEvent = this._normalizeEvent(event);
    const results = {};

    for (const channel of this.enabledChannels) {
      try {
        if (channel === 'console') {
          this._notifyConsole(normalizedEvent);
          results.console = 'sent';
        } else if (channel === 'slack') {
          await this._notifySlack(normalizedEvent);
          results.slack = 'sent';
        } else if (channel === 'obsidian') {
          await this._notifyObsidian(normalizedEvent);
          results.obsidian = 'sent';
        }
      } catch (error) {
        results[channel] = `error: ${error.message}`;
        console.error(`❌ Notification to ${channel} failed: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Normalize message payload to event contract
   * @private
   */
  _normalizeEvent(event) {
    if (event && event.data) {
      return {
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
      };
    }

    return {
      type: event?.type || 'notification',
      timestamp: event?.timestamp || new Date().toISOString(),
      data: {
        message: event?.message || event?.title || 'Automation update',
        details: event?.metadata || {},
      },
    };
  }

  /**
   * Send console notification
   * @private
   */
  _notifyConsole(event) {
    const timestamp = new Date().toISOString();
    const color = {
      scan: '🔍',
      'form-fill': '📝',
      notification: '📢',
      error: '❌',
      success: '✅',
    };

    const icon = color[event.type] || '📌';
    const message = event.data.message || '';
    const details = event.data.details ? JSON.stringify(event.data.details, null, 2) : '';

    console.log(`${icon} [${timestamp}] ${message}`);
    if (details) console.log(details);
  }

  /**
   * Send Slack notification
   * @private
   */
  async _notifySlack(event) {
    if (!this.config.slack?.webhook_url) {
      throw new Error('Slack webhook_url is not configured');
    }

    const message = this._formatSlackMessage(event);

    const response = await fetch(this.config.slack.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }
  }

  /**
   * Format message for Slack
   * @private
   */
  _formatSlackMessage(event) {
    const blocks = [];

    // Header block
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${event.type.toUpperCase()} — Career-Ops Automation`,
      },
    });

    // Message block
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: event.data.message,
      },
    });

    // Details block (if present)
    if (event.data.details) {
      const detailsText = Object.entries(event.data.details)
        .map(([key, value]) => `*${key}*: ${value}`)
        .join('\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: detailsText,
        },
      });
    }

    // Timestamp block
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_${new Date(event.timestamp).toISOString()}_`,
        },
      ],
    });

    return { blocks };
  }

  /**
   * Send Obsidian notification (write to vault)
   * @private
   */
  async _notifyObsidian(event) {
    if (!this.config.obsidian?.vault_path) {
      throw new Error('Obsidian vault_path is not configured');
    }

    const vaultPath = this.config.obsidian.vault_path;
    const sessionFolder = this.config.obsidian.session_folder || 'Career-Ops/Sessions';
    const fullSessionPath = path.join(vaultPath, sessionFolder);

    // Create folder if doesn't exist
    if (!fs.existsSync(fullSessionPath)) {
      fs.mkdirSync(fullSessionPath, { recursive: true });
    }

    // Generate daily session filename
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const sessionFile = path.join(fullSessionPath, `${dateStr}.md`);

    // Format session entry
    const entry = this._formatObsidianEntry(event);

    // Append to session file
    if (fs.existsSync(sessionFile)) {
      fs.appendFileSync(sessionFile, '\n' + entry);
    } else {
      // Create new file with header
      const header = `---\ndate: ${today.toISOString()}\ntype: daily-session\n---\n\n# Career-Ops Session — ${dateStr}\n\n`;
      fs.writeFileSync(sessionFile, header + entry);
    }
  }

  /**
   * Format entry for Obsidian
   * @private
   */
  _formatObsidianEntry(event) {
    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    const icon = event.type === 'scan' ? '🔍' : '📝';

    let entry = `## ${icon} ${timestamp} — ${event.type.toUpperCase()}\n`;

    if (event.data.message) {
      entry += `\n${event.data.message}\n`;
    }

    if (event.data.details) {
      entry += '\n| Key | Value |\n| --- | --- |\n';
      for (const [key, value] of Object.entries(event.data.details)) {
        entry += `| ${key} | ${value} |\n`;
      }
    }

    return entry;
  }
}

export default NotificationPipeline;
