/**
 * scheduler-config.mjs — Configuration parser and validator
 *
 * Loads automation configuration from config/profile.yml and validates it against schema.
 * Provides methods to query enabled backends and validate settings.
 */

import fs from 'fs';
import yaml from 'js-yaml';

export class SchedulerConfig {
  constructor(configPath = 'config/profile.yml') {
    this.configPath = configPath;
    this.config = null;
    this.automationConfig = null;
  }

  /**
   * Load and parse YAML configuration file
   * @returns {Object} Full config object
   */
  load() {
    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Config file not found: ${this.configPath}`);
      }

      const fileContent = fs.readFileSync(this.configPath, 'utf-8');
      this.config = yaml.load(fileContent);

      if (!this.config.automation) {
        throw new Error('config.automation section not found in profile.yml');
      }

      this.automationConfig = this.config.automation;
      this.validateConfig();
      return this.automationConfig;
    } catch (error) {
      console.error(`❌ Failed to load config: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate configuration against schema
   * @throws {Error} If validation fails
   */
  validateConfig() {
    const config = this.automationConfig;

    // Check if automation is enabled
    if (!config.enabled) {
      console.warn('⚠️  Automation is disabled (config.automation.enabled = false)');
    }

    // Validate timezone is valid IANA format
    if (config.timezone) {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: config.timezone });
      } catch {
        throw new Error(`Invalid timezone: ${config.timezone}`);
      }
    }

    // Validate at least one scheduler backend is enabled
    const enabledBackends = this.getActiveBackends();
    if (enabledBackends.length === 0) {
      console.warn('⚠️  No scheduler backends are enabled. Automation will not run.');
    }

    // Validate backend-specific configs
    if (config.schedulers.github_actions?.enabled) {
      if (!config.schedulers.github_actions.personal_access_token) {
        console.warn('⚠️  GitHub Actions enabled but personal_access_token is empty');
      }
      if (!config.schedulers.github_actions.repository) {
        console.warn('⚠️  GitHub Actions enabled but repository is empty (format: owner/repo)');
      }
    }

    if (config.schedulers.external?.enabled) {
      if (!config.schedulers.external.webhook_secret) {
        console.warn('⚠️  External scheduler enabled but webhook_secret is empty');
      }
    }

    // Validate notification channels
    if (config.notifications.slack?.enabled) {
      if (!config.notifications.slack.webhook_url) {
        console.warn('⚠️  Slack notifications enabled but webhook_url is empty');
      }
    }

    if (config.notifications.obsidian?.enabled) {
      if (!config.notifications.obsidian.vault_path) {
        console.warn('⚠️  Obsidian logging enabled but vault_path is empty');
      }
    }
  }

  /**
   * Get list of enabled scheduler backends
   * @returns {string[]} Array of enabled backend names (system, github_actions, nodejs, external)
   */
  getActiveBackends() {
    const backends = [];
    const { schedulers } = this.automationConfig;

    if (schedulers.system?.enabled) backends.push('system');
    if (schedulers.github_actions?.enabled) backends.push('github_actions');
    if (schedulers.nodejs?.enabled) backends.push('nodejs');
    if (schedulers.external?.enabled) backends.push('external');

    return backends;
  }

  /**
   * Get enabled notification channels
   * @returns {string[]} Array of enabled channel names (console, slack, obsidian)
   */
  getActiveNotificationChannels() {
    const channels = [];
    const { notifications } = this.automationConfig;

    if (notifications.console?.enabled !== false) channels.push('console'); // console defaults to true
    if (notifications.slack?.enabled) channels.push('slack');
    if (notifications.obsidian?.enabled) channels.push('obsidian');

    return channels;
  }

  /**
   * Get scheduler config for specific backend
   * @param {string} backendName - Backend name (system, github_actions, nodejs, external)
   * @returns {Object} Backend-specific config
   */
  getBackendConfig(backendName) {
    const { schedulers } = this.automationConfig;
    return schedulers[backendName] || null;
  }

  /**
   * Get notification config for specific channel
   * @param {string} channelName - Channel name (console, slack, obsidian)
   * @returns {Object} Channel-specific config
   */
  getNotificationConfig(channelName) {
    const { notifications } = this.automationConfig;
    return notifications[channelName] || null;
  }

  /**
   * Get global automation settings (timezone, enabled, etc.)
   * @returns {Object} Global settings
   */
  getGlobalSettings() {
    return {
      enabled: this.automationConfig.enabled,
      timezone: this.automationConfig.timezone || 'UTC',
      concurrentRunsAllowed: this.automationConfig.concurrent_runs_allowed || false,
    };
  }
}

export default SchedulerConfig;
