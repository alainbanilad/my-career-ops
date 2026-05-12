#!/usr/bin/env node

/**
 * index.mjs — Auto-Job-Scan-Apply Orchestration Entry Point
 *
 * Exports scheduler abstraction and notification pipeline for automation workflow.
 * All backends and notifiers are loaded dynamically based on config.automation settings.
 *
 * Usage:
 *   import { SchedulerFactory, NotificationPipeline } from './index.mjs';
 *   const schedulers = await SchedulerFactory.create(config);
 *   const notifier = new NotificationPipeline(config);
 */

import { SchedulerFactory } from './scheduler-factory.mjs';
import { NotificationPipeline } from './notifier.mjs';

export { SchedulerFactory, NotificationPipeline };

/**
 * Initialize automation from config
 * @param {Object} config - Config object from config/profile.yml (config.automation)
 * @returns {Promise<Object>} { schedulers: [], notifier: NotificationPipeline }
 */
export async function initializeAutomation(config) {
  if (!config.automation || !config.automation.enabled) {
    console.warn('⚠️  Automation is disabled in config.automation.enabled');
    return null;
  }

  try {
    const schedulers = await SchedulerFactory.create(config.automation);
    const notifier = new NotificationPipeline(config.automation.notifications);

    console.log(`✅ Automation initialized: ${schedulers.length} scheduler(s) active`);
    return { schedulers, notifier };
  } catch (error) {
    console.error(`❌ Automation initialization failed: ${error.message}`);
    throw error;
  }
}

export default {
  SchedulerFactory,
  NotificationPipeline,
  initializeAutomation,
};
