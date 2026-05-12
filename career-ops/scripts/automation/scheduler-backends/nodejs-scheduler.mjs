/**
 * nodejs-scheduler.mjs — Node.js daemon backend
 *
 * Runs as a local daemon with built-in HTTP server for manual triggers.
 * Uses node-schedule for time-based scheduling.
 * Can be kept alive with PM2 or systemd on Linux.
 */

import schedule from 'node-schedule';
import http from 'http';
import { BaseScheduler } from './base-scheduler.mjs';

export class NodeJSScheduler extends BaseScheduler {
  constructor(config) {
    super('nodejs', config);
    this.server = null;
    this.jobs = [];
    this.requestCount = 0;
  }

  /**
   * Validate Node.js scheduler configuration
   * @returns {boolean} True if config is valid
   */
  validateConfig() {
    if (!this.config.port || this.config.port < 1024 || this.config.port > 65535) {
      throw new Error('config.schedulers.nodejs.port must be between 1024 and 65535');
    }

    if (!this.config.schedule || !Array.isArray(this.config.schedule)) {
      throw new Error('config.schedulers.nodejs.schedule must be an array of cron expressions');
    }

    return true;
  }

  /**
   * Start Node.js scheduler daemon
   * @returns {Promise<void>}
   */
  async start() {
    try {
      this.validateConfig();

      // Start HTTP server
      this._startHttpServer();

      // Schedule jobs using node-schedule
      this._scheduleJobs();

      this._setRunning(true);
      this._log('info', `Node.js scheduler daemon started on port ${this.config.port}`);
    } catch (error) {
      this._recordError(error);
      throw error;
    }
  }

  /**
   * Stop Node.js scheduler daemon
   * @returns {Promise<void>}
   */
  async stop() {
    return new Promise((resolve, reject) => {
      try {
        this._log('info', 'Stopping Node.js scheduler daemon...');

        // Cancel all scheduled jobs
        for (const job of this.jobs) {
          job.cancel();
        }
        this.jobs = [];

        // Close HTTP server
        if (this.server) {
          this.server.close(() => {
            this._setRunning(false);
            this._log('info', 'Node.js scheduler daemon stopped');
            resolve();
          });
        } else {
          resolve();
        }
      } catch (error) {
        this._recordError(error);
        reject(error);
      }
    });
  }

  /**
   * Get current status
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      name: this.name,
      running: this.running,
      type: 'nodejs',
      port: this.config.port,
      jobCount: this.jobs.length,
      requestCount: this.requestCount,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      errorCount: this.errorCount,
      lastError: this.lastError,
    };
  }

  /**
   * Start HTTP server for manual triggers
   * @private
   */
  _startHttpServer() {
    this.server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/trigger') {
        this.requestCount += 1;
        this._log('info', `HTTP trigger received from ${req.socket.remoteAddress}`);

        this._recordRun();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Automation cycle triggered',
          timestamp: new Date().toISOString(),
        }));

        if (this.onTrigger) {
          this.onTrigger({ backend: this.name, trigger: 'http', timestamp: new Date() });
        }
      } else if (req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.getStatus()));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    this.server.listen(this.config.port, this.config.host || 'localhost', () => {
      this._log('info', `HTTP server listening on http://${this.config.host || 'localhost'}:${this.config.port}`);
      this._log('info', `POST /trigger to manually trigger automation cycle`);
      this._log('info', `GET /status to check scheduler status`);
    });

    this.server.on('error', (error) => {
      this._recordError(error);
      this._log('error', `HTTP server error: ${error.message}`);
    });
  }

  /**
   * Schedule jobs using node-schedule
   * @private
   */
  _scheduleJobs() {
    for (const cronExpr of this.config.schedule) {
      try {
        const job = schedule.scheduleJob(cronExpr, () => {
          this._log('info', `Scheduled trigger (${cronExpr})`);
          this._recordRun();

          if (this.onTrigger) {
            this.onTrigger({ backend: this.name, trigger: 'schedule', cronExpr, timestamp: new Date() });
          }
        });

        this.jobs.push(job);
        this._log('info', `Scheduled job: ${cronExpr}`);
      } catch (error) {
        this._recordError(error);
        this._log('error', `Failed to schedule ${cronExpr}: ${error.message}`);
      }
    }
  }
}

export default NodeJSScheduler;
