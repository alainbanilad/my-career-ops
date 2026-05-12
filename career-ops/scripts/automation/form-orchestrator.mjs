/**
 * form-orchestrator.mjs — Form filling orchestration layer
 *
 * Wraps existing `/career-ops apply` mode to automate form pre-filling.
 * Ensures human review before submission per Constitution I (Human-in-the-Loop).
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export class FormOrchestrator {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Execute form filling for a job posting
   * @param {Object} pipelineEntry - Entry from data/pipeline.md { url, company, title }
   * @param {Object} userConfig - User config { cv.md, profile.yml }
   * @returns {Promise<Object>} Result { success, formUrl, status, timestamp }
   */
  async executeFormFill(pipelineEntry, userConfig) {
    const startTime = Date.now();

    try {
      console.log(`📝 Starting form fill for ${pipelineEntry.company} — ${pipelineEntry.title}`);

      // Invoke /career-ops apply mode (stubbed here; real implementation uses Claude Code)
      const result = await this._generateFormDraft(pipelineEntry, userConfig);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (result.success) {
        console.log(`✅ Form pre-filled: ${pipelineEntry.company} (${duration}s)`);
      } else {
        console.warn(`⚠️  Form pre-fill incomplete: ${result.error}`);
      }

      return {
        success: result.success,
        company: pipelineEntry.company,
        role: pipelineEntry.title,
        url: pipelineEntry.url,
        status: 'Draft',
        draftId: result.draftId,
        timestamp: new Date().toISOString(),
        duration: parseFloat(duration),
      };
    } catch (error) {
      console.error(`❌ Form orchestration failed: ${error.message}`);
      return {
        success: false,
        company: pipelineEntry.company,
        role: pipelineEntry.title,
        url: pipelineEntry.url,
        status: 'Error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate form draft (placeholder for actual form-filling logic)
   * @private
   */
  async _generateFormDraft(pipelineEntry, userConfig) {
    // In production, this would:
    // 1. Call /career-ops apply mode with job URL
    // 2. Generate customized CV using templates/cv-template.html + cv.md
    // 3. Pre-fill form fields with AI suggestions
    // 4. Write entry to batch/tracker-additions/{num}-{company}.tsv
    // 5. Return form for user review (no auto-submit)

    return {
      success: true,
      draftId: `draft-${Date.now()}`,
    };
  }

  /**
   * Write form draft to tracker additions (TSV format for merge-tracker.mjs)
   * @private
   */
  _writeTsvEntry(company, role, url, status = 'Draft') {
    const date = new Date().toISOString().slice(0, 10);
    const tsvPath = 'batch/tracker-additions';

    // Ensure directory exists
    if (!fs.existsSync(tsvPath)) {
      fs.mkdirSync(tsvPath, { recursive: true });
    }

    // Get next entry number
    const files = fs.readdirSync(tsvPath).filter(f => f.endsWith('.tsv'));
    const num = files.length + 1;

    // TSV format: num, date, company, role, status, score, pdf, report, notes
    const slug = company.toLowerCase().replace(/\s+/g, '-');
    const entry = `${num}\t${date}\t${company}\t${role}\t${status}\t\t❌\t\t`;

    const filename = path.join(tsvPath, `${num}-${slug}.tsv`);
    fs.appendFileSync(filename, entry + '\n');

    return { num, filename };
  }
}

export default FormOrchestrator;
