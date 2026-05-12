/**
 * obsidian-logger.mjs — Obsidian session logging
 *
 * Logs automation sessions to Obsidian vault for searchability and reflection.
 * Implements YAML frontmatter, markdown tables, and backlinks per research.md R2.
 */

import fs from 'fs';
import path from 'path';

export class ObsidianLogger {
  constructor(config = {}) {
    this.config = config;
    this.vaultPath = config.vault_path;
    this.sessionFolder = config.session_folder || 'Career-Ops/Sessions';
    this.queuePath = 'logs/automation/obsidian-queue.json';
  }

  /**
   * Log a session to Obsidian vault
   * @param {Object} sessionData - Session metadata { type, status, duration, jobsFound, scores, timestamp }
   * @returns {Promise<Object>} Result { success, filePath }
   */
  async logSession(sessionData) {
    try {
      if (!this.vaultPath) {
        console.warn('⚠️  Obsidian vault_path not configured; skipping Obsidian logging');
        return { success: false, reason: 'vault_path not configured' };
      }

      // Validate vault exists
      if (!fs.existsSync(this.vaultPath)) {
        console.warn(`⚠️  Obsidian vault not found at ${this.vaultPath}`);
        this._enqueueSession(sessionData);
        return { success: false, reason: 'vault not found (queued for retry)' };
      }

      // Flush queued sessions when vault becomes available
      this._flushQueuedSessions();

      // Create session folder if missing
      const fullSessionPath = path.join(this.vaultPath, this.sessionFolder);
      if (!fs.existsSync(fullSessionPath)) {
        fs.mkdirSync(fullSessionPath, { recursive: true });
      }

      // Generate daily session filename
      const date = new Date(sessionData.timestamp || Date.now());
      const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
      const sessionFile = path.join(fullSessionPath, `${dateStr}.md`);

      // Format and write session entry
      const entry = this._formatSessionEntry(sessionData);

      if (fs.existsSync(sessionFile)) {
        fs.appendFileSync(sessionFile, '\n' + entry);
      } else {
        // Create new file with frontmatter
        const header = this._formatFileHeader(date);
        fs.writeFileSync(sessionFile, header + entry);
      }

      console.log(`✅ Session logged to Obsidian: ${sessionFile}`);
      return { success: true, filePath: sessionFile };
    } catch (error) {
      console.error(`❌ Obsidian logging failed: ${error.message}`);
      this._enqueueSession(sessionData);
      return { success: false, reason: `${error.message} (queued for retry)` };
    }
  }

  /**
   * Queue session payload when vault is unavailable
   * @private
   */
  _enqueueSession(sessionData) {
    try {
      const queueDir = path.dirname(this.queuePath);
      if (!fs.existsSync(queueDir)) {
        fs.mkdirSync(queueDir, { recursive: true });
      }

      const queue = fs.existsSync(this.queuePath)
        ? JSON.parse(fs.readFileSync(this.queuePath, 'utf-8'))
        : [];
      queue.push({ queuedAt: new Date().toISOString(), sessionData });
      fs.writeFileSync(this.queuePath, JSON.stringify(queue, null, 2));
    } catch (error) {
      console.error(`❌ Failed to queue Obsidian session: ${error.message}`);
    }
  }

  /**
   * Flush queued sessions to Obsidian vault
   * @private
   */
  _flushQueuedSessions() {
    if (!fs.existsSync(this.queuePath)) {
      return;
    }

    try {
      const queue = JSON.parse(fs.readFileSync(this.queuePath, 'utf-8'));
      if (!Array.isArray(queue) || queue.length === 0) {
        return;
      }

      const remaining = [];
      for (const item of queue) {
        try {
          this._writeSession(item.sessionData);
        } catch {
          remaining.push(item);
        }
      }

      if (remaining.length === 0) {
        fs.unlinkSync(this.queuePath);
      } else {
        fs.writeFileSync(this.queuePath, JSON.stringify(remaining, null, 2));
      }
    } catch (error) {
      console.error(`❌ Failed to flush queued Obsidian sessions: ${error.message}`);
    }
  }

  /**
   * Write a single session payload to daily file
   * @private
   */
  _writeSession(sessionData) {
    const fullSessionPath = path.join(this.vaultPath, this.sessionFolder);
    if (!fs.existsSync(fullSessionPath)) {
      fs.mkdirSync(fullSessionPath, { recursive: true });
    }

    const date = new Date(sessionData.timestamp || Date.now());
    const dateStr = date.toISOString().slice(0, 10);
    const sessionFile = path.join(fullSessionPath, `${dateStr}.md`);
    const entry = this._formatSessionEntry(sessionData);

    if (fs.existsSync(sessionFile)) {
      fs.appendFileSync(sessionFile, '\n' + entry);
    } else {
      const header = this._formatFileHeader(date);
      fs.writeFileSync(sessionFile, header + entry);
    }

    return sessionFile;
  }

  /**
   * Format file header with YAML frontmatter
   * @private
   */
  _formatFileHeader(date) {
    const isoDate = date.toISOString();
    const header = `---
date: ${isoDate}
type: daily-session
status: active
---

# Career-Ops Session Log — ${isoDate.slice(0, 10)}

\n`;
    return header;
  }

  /**
   * Format session entry for appending to daily log
   * @private
   */
  _formatSessionEntry(sessionData) {
    const time = new Date(sessionData.timestamp || Date.now()).toLocaleTimeString();
    const type = sessionData.type || 'automation';
    const icon = type === 'scan' ? '🔍' : '📝';
    const duration = Number(sessionData.duration || 0);
    const status = sessionData.status || (sessionData.success === false ? 'Error' : 'Completed');

    let entry = `## ${icon} ${time} — ${type.toUpperCase()}\n`;
    entry += `**Status**: ${status}\n`;
    entry += `**Duration**: ${duration.toFixed(2)}s\n`;

    if (sessionData.jobsFound || sessionData.jobsAdded) {
      entry += `\n| Metric | Value |\n| --- | --- |\n`;
      if (sessionData.jobsFound !== undefined) {
        entry += `| Jobs Found | ${sessionData.jobsFound} |\n`;
      }
      if (sessionData.jobsAdded !== undefined) {
        entry += `| Jobs Added | ${sessionData.jobsAdded} |\n`;
      }
      if (sessionData.scores && Object.keys(sessionData.scores).length > 0) {
        entry += `| Avg Score | ${(Object.values(sessionData.scores).reduce((a, b) => a + b, 0) / Object.keys(sessionData.scores).length).toFixed(1)}/5 |\n`;
      }
    }

    if (sessionData.errors && sessionData.errors.length > 0) {
      entry += `\n**Errors**: \n${sessionData.errors.map(e => `- ${e}`).join('\n')}\n`;
    }

    return entry;
  }
}

export default ObsidianLogger;
