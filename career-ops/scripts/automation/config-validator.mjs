/**
 * config-validator.mjs — Configuration validation utility
 *
 * Validates automation configuration against schema.
 * Ensures all required fields are present and valid.
 */

export class ConfigValidator {
  /**
   * Validate automation configuration
   * @param {Object} automationConfig - Config object from config.automation
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  static validate(automationConfig) {
    const errors = [];

    if (!automationConfig) {
      errors.push('automation section not found in config');
      return { valid: false, errors };
    }

    // Check at least one backend enabled
    const enabledBackends = [
      automationConfig.schedulers?.system?.enabled,
      automationConfig.schedulers?.github_actions?.enabled,
      automationConfig.schedulers?.nodejs?.enabled,
      automationConfig.schedulers?.external?.enabled,
    ].filter(b => b);

    if (enabledBackends.length === 0) {
      errors.push('At least one scheduler backend must be enabled');
    }

    // Validate timezone
    if (automationConfig.timezone) {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: automationConfig.timezone });
      } catch {
        errors.push(`Invalid timezone: ${automationConfig.timezone}`);
      }
    }

    // Validate scheduler configs
    if (automationConfig.schedulers?.system?.enabled) {
      if (!automationConfig.schedulers.system.schedule || !Array.isArray(automationConfig.schedulers.system.schedule)) {
        errors.push('system scheduler requires schedule array (HH:MM format)');
      }
    }

    if (automationConfig.schedulers?.github_actions?.enabled) {
      if (!automationConfig.schedulers.github_actions.personal_access_token) {
        errors.push('GitHub Actions requires personal_access_token');
      }
      if (!automationConfig.schedulers.github_actions.repository) {
        errors.push('GitHub Actions requires repository (owner/repo)');
      }
    }

    if (automationConfig.schedulers?.external?.enabled) {
      if (!automationConfig.schedulers.external.webhook_secret) {
        errors.push('External scheduler requires webhook_secret');
      }
    }

    // Validate notification configs
    if (automationConfig.notifications?.slack?.enabled) {
      if (!automationConfig.notifications.slack.webhook_url) {
        errors.push('Slack notifications require webhook_url');
      }
    }

    if (automationConfig.notifications?.obsidian?.enabled) {
      if (!automationConfig.notifications.obsidian.vault_path) {
        errors.push('Obsidian notifications require vault_path');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default ConfigValidator;
