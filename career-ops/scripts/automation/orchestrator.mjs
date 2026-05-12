/**
 * orchestrator.mjs — Main automation orchestrator
 *
 * Coordinates all components: schedulers, scanners, form-fillers, loggers, notifiers.
 * Implements full automation cycle: scan → batch → form-fill → notify.
 */

import { SchedulerFactory } from './scheduler-factory.mjs';
import { SchedulerConfig } from './scheduler-config.mjs';
import { ScanOrchestrator } from './scan-orchestrator.mjs';
import { FormOrchestrator } from './form-orchestrator.mjs';
import { ObsidianLogger } from './obsidian-logger.mjs';
import { NotificationPipeline } from './notifier.mjs';
import { SessionManager } from './session-manager.mjs';
import { ConfigValidator } from './config-validator.mjs';
import { HealthChecker } from './health-check.mjs';
import { MetricsTracker } from './metrics.mjs';
import fs from 'fs';

export class Orchestrator {
  constructor(config = {}) {
    this.config = config;
    this.schedulers = null;
    this.notifier = null;
    this.sessionManager = new SessionManager();
    this.healthChecker = new HealthChecker();
    this.metrics = new MetricsTracker();
    this.running = false;
  }

  /**
   * Validate prerequisite files before startup
   * @returns {{ valid: boolean, missing: string[], suggestions: string[] }}
   */
  validatePrerequisites() {
    const required = ['cv.md', 'config/profile.yml', 'portals.yml'];
    const missing = required.filter((filePath) => !fs.existsSync(filePath));

    if (missing.length === 0) {
      return { valid: true, missing: [], suggestions: [] };
    }

    return {
      valid: false,
      missing,
      suggestions: [
        'Complete onboarding basics (cv.md, config/profile.yml, portals.yml).',
        'Run node doctor.mjs to verify setup.',
      ],
    };
  }

  /**
   * Initialize orchestrator
   * @returns {Promise<boolean>} Success
   */
  async initialize() {
    try {
      console.log('🚀 Initializing automation orchestrator...');

      // Validate configuration
      const validation = ConfigValidator.validate(this.config.automation);
      if (!validation.valid) {
        console.error('❌ Configuration validation failed:');
        validation.errors.forEach(e => console.error(`   - ${e}`));
        return false;
      }

      // Create schedulers
      this.schedulers = await SchedulerFactory.create(this.config.automation);
      if (!this.schedulers || this.schedulers.length === 0) {
        console.warn('⚠️  No schedulers created; automation will not run');
      }

      // Create notifier pipeline
      this.notifier = new NotificationPipeline(this.config.automation.notifications);

      console.log('✅ Orchestrator initialized');
      return true;
    } catch (error) {
      console.error(`❌ Orchestrator initialization failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Start all scheduler backends
   * @returns {Promise<boolean>} Success
   */
  async start() {
    try {
      if (this.running) {
        console.warn('⚠️  Orchestrator already running');
        return false;
      }

      const prerequisites = this.validatePrerequisites();
      if (!prerequisites.valid) {
        console.error('❌ Missing required setup files:');
        prerequisites.missing.forEach((item) => console.error(`   - ${item}`));
        prerequisites.suggestions.forEach((item) => console.error(`   → ${item}`));
        return false;
      }

      if (!this.schedulers || this.schedulers.length === 0) {
        console.error('❌ No schedulers to start');
        return false;
      }

      console.log('🟢 Starting automation orchestrator...');

      for (const scheduler of this.schedulers) {
        scheduler.onTrigger = (event) => this._handleTrigger(event);
        await scheduler.start();
      }

      this.running = true;
      console.log('✅ Orchestrator started');

      if (this.config.automation?.catch_up_on_start !== false) {
        console.log('⏭️  Running startup catch-up cycle...');
        await this._handleTrigger({ backend: 'catch-up' });
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to start orchestrator: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop all scheduler backends
   * @returns {Promise<boolean>} Success
   */
  async stop() {
    try {
      if (!this.running) {
        console.warn('⚠️  Orchestrator not running');
        return false;
      }

      console.log('🔴 Stopping automation orchestrator...');

      if (this.schedulers) {
        for (const scheduler of this.schedulers) {
          await scheduler.stop();
        }
      }

      this.running = false;
      console.log('✅ Orchestrator stopped');
      return true;
    } catch (error) {
      console.error(`❌ Failed to stop orchestrator: ${error.message}`);
      return false;
    }
  }

  /**
   * Get orchestrator status
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      running: this.running,
      schedulers: this.schedulers?.length || 0,
      schedulerStatuses: this.schedulers?.map(s => s.getStatus()) || [],
      activeSession: this.sessionManager.getActiveSessionId(),
    };
  }

  /**
   * Execute full automation cycle (triggered by scheduler)
   * @private
   */
  async _handleTrigger(event) {
    console.log(`\n📍 Automation cycle triggered (${event.backend})`);

    if (this.sessionManager.getActiveSessionId()) {
      console.warn('⚠️  Existing automation session detected; skipping this cycle');
      return;
    }

    // Create session
    const sessionId = this.sessionManager.createSession();

    try {
      // Execute scan
      const scanResult = await this._executeScan();
      this.sessionManager.recordAction('scan', scanResult);

      const batchResult = await this._executeBatch();
      this.sessionManager.recordAction('batch', batchResult);

      // Execute form-fill (if scans found jobs)
      if (scanResult.success && scanResult.jobsAdded > 0) {
        const formResult = await this._executeFormFill();
        this.sessionManager.recordAction('form-fill', formResult);
      }

      // Log session to Obsidian
      const logResult = await this._logSession(sessionId);
      this.sessionManager.recordAction('log', logResult);

      // Send notifications
      const notifyResult = await this._notifyCompletion(sessionId);
      this.sessionManager.recordAction('notify', notifyResult);

      const healthResult = await this.healthChecker.runHealthChecks();
      this.sessionManager.recordAction('health', healthResult);

      // End session
      const summary = this.sessionManager.endSession();
      this.metrics.recordMetric({
        backend: event.backend,
        success: true,
        duration: Number(summary.duration),
        jobsFound: scanResult.jobsFound || 0,
        jobsAdded: scanResult.jobsAdded || 0,
      });
      console.log(`\n🏁 Automation cycle completed (${summary.duration}s)`);
    } catch (error) {
      console.error(`\n❌ Automation cycle failed: ${error.message}`);
      this.metrics.recordMetric({
        backend: event.backend,
        success: false,
        error: error.message,
      });
      this.sessionManager.endSession();
    }
  }

  /**
   * Execute scan step
   * @private
   */
  async _executeScan() {
    console.log('\n📝 Executing scan...');
    const scanner = new ScanOrchestrator(this.config);
    return await scanner.executeScan();
  }

  /**
   * Execute batch step
   * @private
   */
  async _executeBatch() {
    return {
      success: true,
      processed: 0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute form-fill step
   * @private
   */
  async _executeFormFill() {
    console.log('\n📝 Executing form-fill...');
    const formFiller = new FormOrchestrator(this.config);

    // In production, would iterate through pipeline entries
    // For now, return placeholder
    return {
      success: true,
      formsCreated: 0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Log session to Obsidian
   * @private
   */
  async _logSession(sessionId) {
    console.log('\n📝 Logging session to Obsidian...');
    const logger = new ObsidianLogger(this.config.automation?.notifications?.obsidian);

    const summary = this.sessionManager.getSessionSummary();
    return await logger.logSession(summary);
  }

  /**
   * Send completion notifications
   * @private
   */
  async _notifyCompletion(sessionId) {
    console.log('\n📢 Sending notifications...');

    const summary = this.sessionManager.getSessionSummary();
    const message = {
      title: '✅ Automation cycle completed',
      message: `Session ${sessionId}: scan, form-fill, logging complete`,
      type: 'success',
      metadata: {
        Duration: summary.duration + 's',
        Actions: Object.keys(summary.actions).join(', '),
      },
    };

    return await this.notifier.notify(message);
  }
}

export default Orchestrator;
