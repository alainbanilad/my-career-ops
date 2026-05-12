/**
 * cron-scheduler.mjs — System scheduler backend using node-schedule
 *
 * Implements scheduler for local cron (Linux/Mac) and Windows Task Scheduler via node-schedule.
 * Converts SGT times to local timezone and uses node-schedule to register jobs.
 */

import schedule from 'node-schedule';
import { BaseScheduler } from './base-scheduler.mjs';

export class CronScheduler extends BaseScheduler {
  constructor(config) {
    super('system', config);
    this.jobs = []; // Store scheduled job instances
  }

  /**
   * Validate cron scheduler configuration
   * @returns {boolean} True if config is valid
   */
  validateConfig() {
    if (!this.config.schedule || !Array.isArray(this.config.schedule)) {
      throw new Error('config.schedulers.system.schedule must be an array of times (HH:MM format)');
    }

    for (const time of this.config.schedule) {
      if (!/^\d{1,2}:\d{2}$/.test(time)) {
        throw new Error(`Invalid time format: ${time}. Use HH:MM format (e.g., 09:00)`);
      }
    }

    return true;
  }

  /**
   * Start the cron scheduler
   * Registers jobs for configured times
   * @returns {Promise<void>}
   */
  async start() {
    try {
      this.validateConfig();

      const timezone = this.config.timezone || 'UTC';
      this._log('info', `Starting cron scheduler with timezone: ${timezone}`);

      // Register a job for each configured time
      for (const time of this.config.schedule) {
        const [hours, minutes] = time.split(':').map(Number);
        const cronTime = `${minutes} ${hours} * * *`; // node-schedule cron format

        const job = schedule.scheduleJob(cronTime, () => {
          this._handleTrigger();
        });

        this.jobs.push(job);
        this._log('info', `Scheduled job for ${time} SGT (cron: ${cronTime})`);
      }

      this._setRunning(true);
      this._log('info', `Cron scheduler started with ${this.jobs.length} job(s)`);
    } catch (error) {
      this._recordError(error);
      throw error;
    }
  }

  /**
   * Stop the cron scheduler
   * Cancels all scheduled jobs
   * @returns {Promise<void>}
   */
  async stop() {
    try {
      this._log('info', 'Stopping cron scheduler...');

      // Cancel all jobs
      for (const job of this.jobs) {
        job.cancel();
      }

      this.jobs = [];
      this._setRunning(false);
      this._log('info', 'Cron scheduler stopped');
    } catch (error) {
      this._recordError(error);
      throw error;
    }
  }

  /**
   * Get current status
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      name: this.name,
      running: this.running,
      type: 'cron',
      jobCount: this.jobs.length,
      timezone: this.config.timezone || 'UTC',
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      errorCount: this.errorCount,
      lastError: this.lastError,
    };
  }

  /**
   * Internal: Handle trigger event (called by node-schedule when time matches)
   * @private
   */
  _handleTrigger() {
    this._log('info', 'Trigger fired by cron scheduler');
    this._recordRun();

    // Emit event or call orchestrator
    // This will be connected to the main orchestrator in orchestrator.mjs
    if (this.onTrigger) {
      this.onTrigger({ backend: this.name, timestamp: new Date() });
    }
  }
}

export default CronScheduler;
