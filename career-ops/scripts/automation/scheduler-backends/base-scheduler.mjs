/**
 * base-scheduler.mjs — Abstract base class for scheduler backends
 *
 * All scheduler backends (cron, GitHub Actions, Node.js, external) inherit from this class
 * and implement the required interface defined in contracts/scheduler-interface.md.
 */

export class BaseScheduler {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.running = false;
    this.lastRun = null;
    this.nextRun = null;
    this.errorCount = 0;
    this.lastError = null;
  }

  /**
   * Get scheduler backend name
   * @returns {string} Backend name (system, github_actions, nodejs, external)
   */
  getName() {
    return this.name;
  }

  /**
   * Start the scheduler
   * Must be implemented by subclass
   * @returns {Promise<void>}
   */
  async start() {
    throw new Error('start() must be implemented by subclass');
  }

  /**
   * Stop the scheduler
   * Must be implemented by subclass
   * @returns {Promise<void>}
   */
  async stop() {
    throw new Error('stop() must be implemented by subclass');
  }

  /**
   * Get current status
   * Must be implemented by subclass
   * @returns {Object} Status object with running, lastRun, nextRun, errorCount, lastError
   */
  getStatus() {
    throw new Error('getStatus() must be implemented by subclass');
  }

  /**
   * Validate scheduler configuration
   * Must be implemented by subclass
   * @returns {boolean} True if config is valid
   */
  validateConfig() {
    throw new Error('validateConfig() must be implemented by subclass');
  }

  /**
   * Mark scheduler as running
   * @protected
   */
  _setRunning(state) {
    this.running = state;
  }

  /**
   * Record successful run
   * @protected
   */
  _recordRun() {
    this.lastRun = new Date();
    this.errorCount = 0;
    this.lastError = null;
  }

  /**
   * Record error
   * @protected
   * @param {Error} error - Error object
   */
  _recordError(error) {
    this.errorCount += 1;
    this.lastError = {
      message: error.message,
      timestamp: new Date(),
      stackTrace: error.stack,
    };
  }

  /**
   * Reset error state
   * @protected
   */
  _resetErrors() {
    this.errorCount = 0;
    this.lastError = null;
  }

  /**
   * Log message with backend name prefix
   * @protected
   * @param {string} level - Log level (info, warn, error)
   * @param {string} message - Message to log
   */
  _log(level, message) {
    const prefix = `[${this.name}]`;
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${prefix} [${level.toUpperCase()}] ${message}`);
  }

  /**
   * Convert SGT time to local time for system scheduler
   * @protected
   * @param {string} sgtTime - Time in SGT (HH:MM format)
   * @param {string} localTimezone - Local timezone (IANA format)
   * @returns {string} Time in local timezone (HH:MM format)
   */
  _convertSgtToLocal(sgtTime, localTimezone) {
    const [hours, minutes] = sgtTime.split(':').map(Number);

    // Create a date with SGT time
    const sgtDate = new Date();
    sgtDate.setHours(hours, minutes, 0, 0);

    // Get SGT offset (Singapore is UTC+8, no DST)
    const SGT_OFFSET = 8 * 60; // 480 minutes

    // Get local timezone offset
    const localFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: localTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // Parse local time
    const parts = localFormatter.formatToParts(sgtDate);
    const localDateString = parts.slice(0, 3).map(p => p.value).join('-');
    const [localHours, localMinutes] = parts.slice(3, 5).map(p => p.value);

    // Calculate offset difference and adjust time
    const utcDate = new Date(sgtDate);
    const utcOffsetMinutes = -(SGT_OFFSET - utcDate.getTimezoneOffset());
    const offsetDiffMinutes = utcOffsetMinutes + (SGT_OFFSET - utcDate.getTimezoneOffset());

    const adjustedHours = (hours - Math.floor(offsetDiffMinutes / 60) + 24) % 24;
    const adjustedMinutes = (minutes - (offsetDiffMinutes % 60) + 60) % 60;

    return `${String(adjustedHours).padStart(2, '0')}:${String(adjustedMinutes).padStart(2, '0')}`;
  }

  /**
   * Convert cron expression from SGT to UTC
   * @protected
   * @param {string} sgtCron - Cron expression in SGT (format: "0 9 * * *" for 9 AM)
   * @returns {string} Cron expression in UTC
   */
  _convertSgtCronToUtc(sgtCron) {
    // Parse cron: "0 minute hour day month day-of-week"
    const [minute, hour] = sgtCron.split(' ');

    // SGT is UTC+8
    const utcHour = (parseInt(hour) - 8 + 24) % 24;

    return `${minute} ${utcHour} * * *`;
  }
}

export default BaseScheduler;
