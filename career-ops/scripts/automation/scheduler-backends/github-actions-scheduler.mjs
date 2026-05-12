/**
 * github-actions-scheduler.mjs — GitHub Actions backend
 *
 * Triggers automation via GitHub Actions workflow dispatcher API.
 * Requires GitHub Personal Access Token and repository in format: owner/repo
 */

import { BaseScheduler } from './base-scheduler.mjs';

export class GitHubActionsScheduler extends BaseScheduler {
  constructor(config) {
    super('github_actions', config);
    this.pollInterval = null;
    this.POLL_INTERVAL_MS = 3600000; // Poll once per hour
  }

  /**
   * Validate GitHub Actions configuration
   * @returns {boolean} True if config is valid
   */
  validateConfig() {
    if (!this.config.personal_access_token) {
      throw new Error('GitHub Actions requires personal_access_token');
    }

    if (!this.config.repository || !this.config.repository.includes('/')) {
      throw new Error('GitHub Actions requires repository in format: owner/repo');
    }

    return true;
  }

  /**
   * Start GitHub Actions scheduler
   * @returns {Promise<void>}
   */
  async start() {
    try {
      this.validateConfig();
      this._log('info', `Starting GitHub Actions scheduler for ${this.config.repository}`);

      // Validate GitHub credentials
      await this._validateGitHubAccess();

      // Start polling for scheduled times
      this._startPolling();

      this._setRunning(true);
      this._log('info', 'GitHub Actions scheduler started');
    } catch (error) {
      this._recordError(error);
      throw error;
    }
  }

  /**
   * Stop GitHub Actions scheduler
   * @returns {Promise<void>}
   */
  async stop() {
    try {
      this._log('info', 'Stopping GitHub Actions scheduler...');

      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }

      this._setRunning(false);
      this._log('info', 'GitHub Actions scheduler stopped');
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
      type: 'github_actions',
      repository: this.config.repository,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      errorCount: this.errorCount,
      lastError: this.lastError,
    };
  }

  /**
   * Validate GitHub API access
   * @private
   */
  async _validateGitHubAccess() {
    try {
      const [owner, repo] = this.config.repository.split('/');
      const url = `https://api.github.com/repos/${owner}/${repo}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${this.config.personal_access_token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      this._log('info', 'GitHub API access validated');
    } catch (error) {
      this._log('error', `GitHub API validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start polling for scheduled times
   * @private
   */
  _startPolling() {
    // Check if it's time to trigger at configured schedule
    const checkSchedule = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

      // Check if currentTime matches configured schedules (with 1-minute tolerance)
      if (this.config.schedule) {
        for (const scheduledTime of this.config.schedule) {
          if (Math.abs(this._timeToMinutes(currentTime) - this._timeToMinutes(scheduledTime)) < 2) {
            this._log('info', `Schedule time matched: ${scheduledTime}`);
            this._triggerWorkflow();
            break;
          }
        }
      }
    };

    // Poll every minute
    this.pollInterval = setInterval(checkSchedule, 60000);
    this._log('info', 'Started polling for scheduled times (every 60 seconds)');
  }

  /**
   * Convert time string to minutes since midnight
   * @private
   */
  _timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Trigger GitHub Actions workflow
   * @private
   */
  async _triggerWorkflow() {
    try {
      const [owner, repo] = this.config.repository.split('/');
      const workflowFile = this.config.workflow_file || '.github/workflows/auto-job-scan-apply.yml';

      // Extract workflow name from file path
      const workflowName = workflowFile.split('/').pop().replace('.yml', '');

      const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowName}/dispatches`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `token ${this.config.personal_access_token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: { trigger: 'github-actions-scheduler' },
        }),
      });

      if (response.ok) {
        this._recordRun();
        this._log('info', `Workflow dispatched: ${workflowName}`);

        if (this.onTrigger) {
          this.onTrigger({ backend: this.name, timestamp: new Date() });
        }
      } else {
        throw new Error(`Workflow dispatch failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      this._recordError(error);
      this._log('error', `Failed to trigger workflow: ${error.message}`);
    }
  }
}

export default GitHubActionsScheduler;
