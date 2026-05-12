/**
 * obsidian-notifier.mjs — Obsidian daily digest notification channel
 *
 * Appends summary to daily digest file in Obsidian vault.
 * Creates backlinks to detailed session logs.
 */

import fs from 'fs';
import path from 'path';

export class ObsidianNotifier {
  constructor(config = {}) {
    this.config = config;
    this.enabled = config.enabled || false;
    this.vaultPath = config.vault_path;
    this.sessionFolder = config.session_folder || 'Career-Ops/Sessions';
  }

  /**
   * Send notification to Obsidian
   * @param {Object} message - Message { title, message, type, metadata }
   * @returns {Promise<boolean>} Success
   */
  async notify(message) {
    try {
      if (!this.enabled || !this.vaultPath) {
        return false;
      }

      // Validate vault exists
      if (!fs.existsSync(this.vaultPath)) {
        console.warn(`⚠️  Obsidian vault not found at ${this.vaultPath}`);
        return false;
      }

      // Write to daily digest
      const result = await this._writeToDigest(message);

      if (result) {
        console.log('✅ Obsidian notification appended');
      }

      return result;
    } catch (error) {
      console.error(`❌ Obsidian notifier failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Write message to daily digest file
   * @private
   */
  async _writeToDigest(message) {
    try {
      const sessionFolder = path.join(this.vaultPath, this.sessionFolder);

      if (!fs.existsSync(sessionFolder)) {
        fs.mkdirSync(sessionFolder, { recursive: true });
      }

      // Daily digest filename: YYYY-MM.md (monthly file)
      const now = new Date();
      const digestFile = path.join(
        sessionFolder,
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.md`
      );

      const entry = this._formatDigestEntry(message);

      if (fs.existsSync(digestFile)) {
        fs.appendFileSync(digestFile, '\n' + entry);
      } else {
        const header = `---\ntype: digest\nmonth: ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}\n---\n\n# Career-Ops Digest\n\n`;
        fs.writeFileSync(digestFile, header + entry);
      }

      return true;
    } catch (error) {
      console.error(`Failed to write to Obsidian digest: ${error.message}`);
      return false;
    }
  }

  /**
   * Format digest entry
   * @private
   */
  _formatDigestEntry(message) {
    const timestamp = new Date().toISOString();
    const icon = message.type === 'scan' ? '🔍' : '📝';

    let entry = `- ${icon} **${message.title}** _(${timestamp})_\n`;

    if (message.message) {
      entry += `  ${message.message}\n`;
    }

    if (message.metadata && Object.keys(message.metadata).length > 0) {
      for (const [key, value] of Object.entries(message.metadata)) {
        entry += `  - ${key}: ${value}\n`;
      }
    }

    return entry;
  }
}

export default ObsidianNotifier;
