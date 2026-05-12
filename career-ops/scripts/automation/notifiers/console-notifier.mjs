/**
 * console-notifier.mjs — Console notification channel
 *
 * Outputs formatted messages to stdout with colored ANSI codes.
 * Always enabled; cannot be disabled per spec.
 */

export class ConsoleNotifier {
  constructor(config = {}) {
    this.config = config;
    this.enabled = true; // Always enabled
  }

  /**
   * Send notification to console
   * @param {Object} message - Message { title, message, type, metadata }
   * @returns {Promise<boolean>} Success
   */
  async notify(message) {
    try {
      const timestamp = new Date().toISOString();
      const icon = this._getIcon(message.type);
      const level = message.level || 'info';

      const color = this._getColorCode(level);
      const reset = '\x1b[0m';

      const output = `${color}${icon} [${timestamp}] ${message.title}${reset}`;
      console.log(output);

      if (message.message) {
        console.log(`   ${message.message}`);
      }

      if (message.metadata && Object.keys(message.metadata).length > 0) {
        console.log('   ' + this._formatMetadata(message.metadata));
      }

      return true;
    } catch (error) {
      console.error(`❌ Console notifier failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get icon for message type
   * @private
   */
  _getIcon(type) {
    const icons = {
      scan: '🔍',
      'form-fill': '📝',
      notification: '📢',
      error: '❌',
      success: '✅',
      info: 'ℹ️',
      warn: '⚠️',
    };
    return icons[type] || '📌';
  }

  /**
   * Get ANSI color code for log level
   * @private
   */
  _getColorCode(level) {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    };
    return colors[level] || '';
  }

  /**
   * Format metadata as key-value pairs
   * @private
   */
  _formatMetadata(metadata) {
    return Object.entries(metadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n   ');
  }
}

export default ConsoleNotifier;
