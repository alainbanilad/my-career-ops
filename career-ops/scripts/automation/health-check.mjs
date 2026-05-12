/**
 * health-check.mjs — Health check executor
 *
 * Implements Constitution IV requirement: verify-pipeline.mjs + doctor.mjs checks
 * after automation runs to ensure pipeline integrity.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export class HealthChecker {
  constructor(logPath = 'logs/automation/health-check.json') {
    this.logPath = logPath;
  }

  /**
   * Run all health checks
   * @returns {Promise<Object>} Results { verify_pipeline, doctor }
   */
  async runHealthChecks() {
    console.log('🏥 Running health checks...');

    const results = {
      timestamp: new Date().toISOString(),
      checks: {},
    };

    // Run verify-pipeline.mjs
    results.checks.verify_pipeline = await this._runCheck('verify-pipeline.mjs');

    // Run doctor.mjs
    results.checks.doctor = await this._runCheck('doctor.mjs');

    // Write results to log
    this._logResults(results);

    // Log warnings/errors
    const failed = Object.entries(results.checks).filter(([, result]) => result.exitCode !== 0);
    if (failed.length > 0) {
      console.warn(`⚠️  ${failed.length} health check(s) failed`);
      failed.forEach(([name, result]) => {
        console.warn(`   ${name}: exit code ${result.exitCode}`);
      });
    } else {
      console.log('✅ All health checks passed');
    }

    return results;
  }

  /**
   * Run individual health check script
   * @private
   */
  _runCheck(scriptName) {
    return new Promise((resolve) => {
      const process = spawn('node', [scriptName], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (exitCode) => {
        resolve({
          script: scriptName,
          exitCode,
          stdout: stdout.slice(0, 1000), // First 1000 chars
          stderr: stderr.slice(0, 1000),
        });
      });

      process.on('error', (error) => {
        resolve({
          script: scriptName,
          exitCode: 1,
          error: error.message,
        });
      });
    });
  }

  /**
   * Log health check results
   * @private
   */
  _logResults(results) {
    try {
      const logDir = path.dirname(this.logPath);

      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Append to log file (daily)
      const dateStr = new Date().toISOString().slice(0, 10);
      const dailyLog = path.join(logDir, `health-check-${dateStr}.json`);

      if (fs.existsSync(dailyLog)) {
        const existing = JSON.parse(fs.readFileSync(dailyLog, 'utf-8'));
        existing.push(results);
        fs.writeFileSync(dailyLog, JSON.stringify(existing, null, 2));
      } else {
        fs.writeFileSync(dailyLog, JSON.stringify([results], null, 2));
      }
    } catch (error) {
      console.error(`Failed to log health check results: ${error.message}`);
    }
  }
}

export default HealthChecker;
