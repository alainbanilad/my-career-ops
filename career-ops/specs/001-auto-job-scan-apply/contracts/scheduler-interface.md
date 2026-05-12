# Contract: Scheduler Backend Interface

**Status**: Specification  
**Applies To**: All scheduler backend implementations (cron, GitHub Actions, Node.js, external)

---

## Purpose

Defines the interface that all scheduler backends MUST implement to integrate with the orchestration layer.

---

## Interface Specification

### Exports

```javascript
// Each backend module (e.g., cron-scheduler.mjs, github-actions-scheduler.mjs) MUST export:

export class SchedulerBackend {
  /**
   * Initialize the backend with configuration
   * @param {Object} config - Scheduler-specific config from config.profile.yml
   * @throws {Error} if config is invalid
   */
  constructor(config) { }
  
  /**
   * Get backend name for logging and identification
   * @returns {string} e.g., "cron", "github-actions", "nodejs", "external"
   */
  getName() { }
  
  /**
   * Check if this backend is enabled in config
   * @returns {boolean}
   */
  isEnabled() { }
  
  /**
   * Start the scheduler (begin listening for triggers)
   * @returns {Promise<void>}
   * @throws {Error} if startup fails
   */
  async start() { }
  
  /**
   * Stop the scheduler gracefully
   * @returns {Promise<void>}
   */
  async stop() { }
  
  /**
   * Get current status of scheduler
   * @returns {Promise<Object>} 
   *   { 
   *     running: boolean,
   *     lastRun: ISO8601 timestamp or null,
   *     nextRun: ISO8601 timestamp or null,
   *     errorCount: number,
   *     lastError: string or null
   *   }
   */
  async getStatus() { }
  
  /**
   * Validate configuration for this backend
   * @returns {Promise<{valid: boolean, errors: string[]}>}
   */
  async validateConfig() { }
}
```

### Required Methods (Detailed)

#### `constructor(config)`

**Input**:
```javascript
{
  enabled: true|false,
  timezone: "Asia/Singapore",  // All backends must respect user's timezone
  schedule: [
    { time: "09:00", action: "scan", timeout_minutes: 10 }
  ]
}
```

**Behavior**:
- Parse and store config
- Validate that config is complete and correct
- Throw descriptive error if config is invalid
- Store timezone for later use (convert to local time if needed)

**Example** (Cron backend):
```javascript
constructor(config) {
  this.config = config;
  this.scheduler = null;
  this.jobs = new Map();
  
  if (!config.enabled) return;
  if (!config.schedule || !Array.isArray(config.schedule)) {
    throw new Error("Schedule must be an array");
  }
}
```

#### `async start()`

**Behavior**:
- Initialize scheduler
- Register all scheduled tasks from `config.schedule`
- Begin listening for triggers
- Do NOT throw if starting a second time (idempotent)
- Log start event with timestamp

**Return**: `Promise<void>`

**Example** (Cron backend):
```javascript
async start() {
  if (this.scheduler) return; // Already running
  
  this.scheduler = new CronScheduler();
  
  for (const task of this.config.schedule) {
    const { time, action, timeout_minutes } = task;
    this.scheduler.schedule(time, async () => {
      await this.executeAction(action, timeout_minutes);
    });
  }
  
  logger.info(`[${this.getName()}] Scheduler started with ${this.config.schedule.length} tasks`);
}
```

#### `async stop()`

**Behavior**:
- Stop listening for triggers
- Cancel any pending scheduled jobs
- Clean up resources gracefully
- Do NOT throw if not running (idempotent)
- Log stop event

**Return**: `Promise<void>`

**Example** (Cron backend):
```javascript
async stop() {
  if (!this.scheduler) return; // Not running
  
  this.scheduler.stop();
  this.scheduler = null;
  
  logger.info(`[${this.getName()}] Scheduler stopped`);
}
```

#### `async getStatus()`

**Return**:
```javascript
{
  running: boolean,              // Is scheduler currently active?
  lastRun: "2026-05-12T09:04:45Z" | null,  // ISO8601 of last execution
  nextRun: "2026-05-13T09:00:00Z" | null,  // ISO8601 of next scheduled execution
  errorCount: number,            // Total errors since startup
  lastError: string | null       // Most recent error message
}
```

**Behavior**:
- Return current state snapshot
- If not running, set `running: false`, `lastRun: null`, `nextRun: null`
- If running, calculate next scheduled run time based on config
- Track error count and most recent error for troubleshooting

**Example** (Cron backend):
```javascript
async getStatus() {
  if (!this.scheduler) {
    return {
      running: false,
      lastRun: this.lastRun || null,
      nextRun: null,
      errorCount: this.errorCount,
      lastError: this.lastError || null
    };
  }
  
  const nextRun = this.calculateNextRun();
  return {
    running: true,
    lastRun: this.lastRun || null,
    nextRun,
    errorCount: this.errorCount,
    lastError: this.lastError || null
  };
}
```

#### `async validateConfig()`

**Behavior**:
- Check that config is complete and valid
- Verify external dependencies (e.g., API keys, file paths)
- Return validation result with list of errors (if any)

**Return**:
```javascript
{
  valid: true | false,
  errors: [
    "PAT token is missing",
    "Webhook URL is not valid"
  ] // Empty array if valid
}
```

**Example** (GitHub Actions backend):
```javascript
async validateConfig() {
  const errors = [];
  
  if (!this.config.pat_token) {
    errors.push("GitHub PAT token is missing (set GITHUB_PAT env var)");
  }
  
  if (!this.config.repo) {
    errors.push("GitHub repo is not configured (format: owner/repo)");
  }
  
  return { valid: errors.length === 0, errors };
}
```

---

## Private Methods (Implementation Detail)

Each backend MAY implement private helper methods. Examples:

- `async executeAction(action, timeoutMinutes)` — Invoke the orchestrator with action name
- `convertTimeToLocalTimezone(time)` — Handle timezone conversions
- `logExecution(action, duration, success, error)` — Write execution log

---

## Error Handling

### Contract Compliance

- All backends MUST NOT crash the orchestrator on error
- All backends MUST log errors with context (action, time, reason)
- All backends MUST continue attempting scheduled tasks even if one fails
- All backends MUST provide detailed error messages in `lastError` field

### Example Error Flow

```javascript
try {
  await this.executeAction("scan", 10);
} catch (error) {
  this.errorCount++;
  this.lastError = error.message;
  logger.error(`[${this.getName()}] Action failed: ${error.message}`);
  // Continue; don't crash
}
```

---

## Testing Requirements

All scheduler backends MUST pass these test cases:

1. **Initialization**: Backend initializes with valid config without throwing
2. **Start/Stop**: Backend can start and stop idempotently (start twice doesn't error)
3. **Status**: Backend returns correct status at all times
4. **Config Validation**: Backend correctly identifies invalid configs
5. **Execution**: Backend correctly invokes actions at scheduled times
6. **Timezone**: Backend respects user's configured timezone
7. **Error Recovery**: Backend handles errors gracefully and continues

---

## Backward Compatibility

When adding new fields to the scheduler interface:
- MUST be backward-compatible with existing backends
- New methods SHOULD have default implementations in base class
- Config schema MUST allow optional new fields with sensible defaults

---

## Examples

See `scripts/automation/scheduler-backends/` for implementation examples:
- `cron-scheduler.mjs` — System cron/Task Scheduler
- `github-actions-scheduler.mjs` — GitHub Actions API
- `nodejs-scheduler.mjs` — Node.js embedded scheduler (node-schedule)
- `external-scheduler.mjs` — Webhook-based external trigger
