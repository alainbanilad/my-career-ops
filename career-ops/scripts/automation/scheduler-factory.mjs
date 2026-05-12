/**
 * scheduler-factory.mjs — Factory for creating scheduler backend instances
 *
 * Dynamically loads and instantiates enabled scheduler backends based on configuration.
 * Implements composite scheduler pattern: all enabled backends run simultaneously.
 */

import { SchedulerConfig } from './scheduler-config.mjs';
import { CronScheduler } from './scheduler-backends/cron-scheduler.mjs';
import { GitHubActionsScheduler } from './scheduler-backends/github-actions-scheduler.mjs';
import { NodeJSScheduler } from './scheduler-backends/nodejs-scheduler.mjs';
import { ExternalScheduler } from './scheduler-backends/external-scheduler.mjs';

export class SchedulerFactory {
  /**
   * Create scheduler backend instances based on config
   * @param {string|Object} configPathOrObj - Path to config file OR config object
   * @returns {Promise<Array>} Array of enabled scheduler backend instances
   */
  static async create(configPathOrObj) {
    // Load configuration
    const config = typeof configPathOrObj === 'string'
      ? new SchedulerConfig(configPathOrObj).load()
      : configPathOrObj;

    const backends = [];

    try {
      // Backend A: System Scheduler (cron/Task Scheduler)
      if (config.schedulers?.system?.enabled) {
        console.log('📅 Initializing System Scheduler (cron/Task Scheduler)...');
        backends.push(new CronScheduler(config.schedulers.system));
      }

      // Backend B: GitHub Actions
      if (config.schedulers?.github_actions?.enabled) {
        console.log('🚀 Initializing GitHub Actions Scheduler...');
        backends.push(new GitHubActionsScheduler(config.schedulers.github_actions));
      }

      // Backend C: Node.js Daemon
      if (config.schedulers?.nodejs?.enabled) {
        console.log('⚙️  Initializing Node.js Scheduler Daemon...');
        backends.push(new NodeJSScheduler(config.schedulers.nodejs));
      }

      // Backend D: External Webhook
      if (config.schedulers?.external?.enabled) {
        console.log('🔗 Initializing External Webhook Scheduler...');
        backends.push(new ExternalScheduler(config.schedulers.external));
      }

      if (backends.length === 0) {
        console.warn('⚠️  No scheduler backends enabled in configuration');
      } else {
        console.log(`✅ Created ${backends.length} scheduler backend(s)`);
      }

      return backends;
    } catch (error) {
      console.error(`❌ Failed to create schedulers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a composite scheduler that wraps all backends
   * @param {Array} backends - Array of scheduler backend instances
   * @returns {Object} Composite scheduler with start/stop/status methods
   */
  static createComposite(backends) {
    return {
      backends,

      /**
       * Start all enabled backends
       */
      async start() {
        console.log(`🟢 Starting ${backends.length} scheduler(s)...`);
        const results = [];

        for (const backend of backends) {
          try {
            await backend.start();
            results.push({ name: backend.getName(), status: 'started' });
            console.log(`✅ ${backend.getName()} started`);
          } catch (error) {
            results.push({ name: backend.getName(), status: 'error', error: error.message });
            console.error(`❌ ${backend.getName()} failed to start: ${error.message}`);
          }
        }

        return results;
      },

      /**
       * Stop all backends
       */
      async stop() {
        console.log(`🔴 Stopping ${backends.length} scheduler(s)...`);
        const results = [];

        for (const backend of backends) {
          try {
            await backend.stop();
            results.push({ name: backend.getName(), status: 'stopped' });
            console.log(`✅ ${backend.getName()} stopped`);
          } catch (error) {
            results.push({ name: backend.getName(), status: 'error', error: error.message });
            console.error(`❌ ${backend.getName()} failed to stop: ${error.message}`);
          }
        }

        return results;
      },

      /**
       * Get status of all backends
       */
      getStatus() {
        return backends.map(backend => ({
          name: backend.getName(),
          status: backend.getStatus(),
        }));
      },

      /**
       * Get count of active backends
       */
      getActiveCount() {
        return backends.filter(b => b.running).length;
      },
    };
  }
}

export default SchedulerFactory;
