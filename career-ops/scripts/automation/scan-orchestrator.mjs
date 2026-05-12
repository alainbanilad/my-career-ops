/**
 * scan-orchestrator.mjs — Scanning orchestration layer
 *
 * Wraps existing scan.mjs to automate daily job scanning.
 * Captures results, logs metrics, applies archetype filtering if configured.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export class ScanOrchestrator {
  constructor(config = {}) {
    this.config = config;
    this.scanExecutable = 'scan.mjs';
  }

  /**
   * Execute scan operation
   * @param {Object} options - Scan options { company?: string, dryRun?: boolean }
   * @returns {Promise<Object>} Result { success, jobsFound, jobsAdded, duration, errors }
   */
  async executeScan(options = {}) {
    const startTime = Date.now();

    try {
      console.log(`🔍 Starting scan orchestration...`);

      // Build scan.mjs arguments
      const args = [];
      if (options.company) {
        args.push('--company', options.company);
      }
      if (options.dryRun) {
        args.push('--dry-run');
      }

      // Spawn scan.mjs process
      const result = await this._runScanProcess(args);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      // Parse results from scan output
      const summary = {
        success: result.exitCode === 0,
        jobsFound: result.jobsFound || 0,
        jobsAdded: result.jobsAdded || 0,
        duration: parseFloat(duration),
        timestamp: new Date().toISOString(),
        errors: result.errors || [],
      };

      if (summary.success) {
        console.log(`✅ Scan completed: ${summary.jobsFound} found, ${summary.jobsAdded} added (${duration}s)`);
      } else {
        console.warn(`⚠️  Scan completed with errors: ${result.errors.join(', ')}`);
      }

      return summary;
    } catch (error) {
      console.error(`❌ Scan orchestration failed: ${error.message}`);
      return {
        success: false,
        jobsFound: 0,
        jobsAdded: 0,
        duration: ((Date.now() - startTime) / 1000).toFixed(2),
        timestamp: new Date().toISOString(),
        errors: [error.message],
      };
    }
  }

  /**
   * Run scan.mjs as child process
   * @private
   */
  _runScanProcess(args) {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const child = spawn('node', [this.scanExecutable, ...args], {
        cwd: globalThis.process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        const result = {
          exitCode,
          stdout,
          stderr,
          jobsFound: this._parseJobsFound(stdout),
          jobsAdded: this._parseJobsAdded(stdout),
          errors: stderr ? [stderr] : [],
        };

        resolve(result);
      });

      child.on('error', (error) => {
        resolve({
          exitCode: 1,
          errors: [error.message],
          jobsFound: 0,
          jobsAdded: 0,
        });
      });
    });
  }

  /**
   * Parse jobs found from scan output
   * @private
   */
  _parseJobsFound(output) {
    const match = output.match(/found: (\d+)|(\d+) found/i);
    return match ? parseInt(match[1] || match[2]) : 0;
  }

  /**
   * Parse jobs added from scan output
   * @private
   */
  _parseJobsAdded(output) {
    const match = output.match(/added: (\d+)|(\d+) added/i);
    return match ? parseInt(match[1] || match[2]) : 0;
  }

  /**
   * Count pipeline entries by checking data/pipeline.md
   * @private
   */
  _countPipelineEntries() {
    const pipelinePath = 'data/pipeline.md';

    try {
      if (!fs.existsSync(pipelinePath)) {
        return 0;
      }

      const content = fs.readFileSync(pipelinePath, 'utf-8');
      const matches = content.match(/^- \[ \]/gm);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }
}

export default ScanOrchestrator;
