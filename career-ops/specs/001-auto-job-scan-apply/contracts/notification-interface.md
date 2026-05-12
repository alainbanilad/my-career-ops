# Contract: Notification Interface

**Status**: Specification  
**Applies To**: All notifier backend implementations (console, Slack, Obsidian)

---

## Purpose

Defines the interface that all notifier backends MUST implement to deliver session updates to users.

---

## Interface Specification

### Exports

```javascript
// Each notifier module (e.g., console-notifier.mjs, slack-notifier.mjs, obsidian-notifier.mjs) 
// MUST export:

export class NotifierBackend {
  /**
   * Initialize the notifier with configuration
   * @param {Object} config - Notifier-specific config from config.profile.yml
   * @throws {Error} if config is invalid
   */
  constructor(config) { }
  
  /**
   * Get notifier name for logging and identification
   * @returns {string} e.g., "console", "slack", "obsidian"
   */
  getName() { }
  
  /**
   * Check if this notifier is enabled in config
   * @returns {boolean}
   */
  isEnabled() { }
  
  /**
   * Send a notification message
   * @param {Object} notification - Message to send
   *   {
   *     type: "info" | "warning" | "error" | "success",
   *     title: string,
   *     message: string,
   *     metadata: {
   *       duration_seconds: number,
   *       jobs_found: number,
   *       recommended_count: number,
   *       ...
   *     }
   *   }
   * @returns {Promise<void>}
   * @throws {Error} if notification fails (but must NOT crash orchestrator)
   */
  async notify(notification) { }
  
  /**
   * Validate configuration for this notifier
   * @returns {Promise<{valid: boolean, errors: string[]}>}
   */
  async validateConfig() { }
}
```

### Required Methods (Detailed)

#### `constructor(config)`

**Input** (example for Slack):
```javascript
{
  enabled: true | false,
  webhook_url: "https://hooks.slack.com/services/...",
  channel: "#career-ops",
  mention_on_error: true,
  format: "block-kit" | "plain-text"
}
```

**Behavior**:
- Parse and store config
- Validate that config is complete
- Throw descriptive error if required fields are missing
- Initialize notifier-specific state (e.g., HTTP client for Slack)

**Example** (Slack notifier):
```javascript
constructor(config) {
  this.config = config;
  
  if (!config.enabled) return;
  
  if (!config.webhook_url) {
    throw new Error("Slack webhook_url is required when enabled");
  }
  
  // Verify URL format
  try {
    new URL(config.webhook_url);
  } catch {
    throw new Error(`Invalid webhook URL: ${config.webhook_url}`);
  }
  
  this.httpClient = new HttpClient();
}
```

#### `async notify(notification)`

**Input**:
```javascript
{
  type: "success",  // info, warning, error, success
  title: "Scan Completed",
  message: "3 new roles found, 2 recommended.",
  metadata: {
    session_id: "uuid-1234",
    duration_seconds: 285,
    jobs_found: 3,
    jobs_recommended: 2,
    jobs_not_recommended: 1,
    scores: { "4.5": 1, "4.2": 1, "3.1": 1 },
    timestamp: "2026-05-12T09:04:45Z"
  }
}
```

**Behavior**:
- Format message according to notifier's capabilities
- Send notification via appropriate channel
- Handle failures gracefully (log warning, don't throw)
- Do NOT throw error; catch and log internally
- Return `Promise<void>`

**Example** (Slack notifier):
```javascript
async notify(notification) {
  if (!this.config.enabled) return;
  
  try {
    const payload = this.formatSlackMessage(notification);
    
    const response = await this.httpClient.post(
      this.config.webhook_url,
      payload,
      { timeout: 5000 }
    );
    
    if (response.status !== 200) {
      logger.warn(`[Slack] Failed to send notification: ${response.statusText}`);
    }
  } catch (error) {
    logger.warn(`[Slack] Notification failed: ${error.message}`);
    // Don't throw; continue with other notifiers
  }
}

formatSlackMessage(notification) {
  const { type, title, message, metadata } = notification;
  
  const color = {
    success: "#36a64f",
    warning: "#ff9900",
    error: "#d62728",
    info: "#0099cc"
  }[type];
  
  return {
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `🎯 ${title}` }
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: message }
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Duration*\n${metadata.duration_seconds}s` },
          { type: "mrkdwn", text: `*Found*\n${metadata.jobs_found}` },
          { type: "mrkdwn", text: `*Recommended*\n${metadata.jobs_recommended}` }
        ]
      }
    ]
  };
}
```

#### `async validateConfig()`

**Behavior**:
- Check that config is complete and valid
- Verify external dependencies (e.g., webhook URLs, file paths, API keys)
- Return validation result with list of errors (if any)

**Return**:
```javascript
{
  valid: true | false,
  errors: [
    "Webhook URL is not valid",
    "Vault path does not exist"
  ] // Empty array if valid
}
```

**Example** (Obsidian notifier):
```javascript
async validateConfig() {
  const errors = [];
  
  if (!this.config.enabled) return { valid: true, errors: [] };
  
  const vaultPath = this.config.vault_path;
  if (!fs.existsSync(vaultPath)) {
    errors.push(`Obsidian vault path not found: ${vaultPath}`);
  } else {
    try {
      fs.accessSync(vaultPath, fs.constants.W_OK);
    } catch {
      errors.push(`Obsidian vault is not writable: ${vaultPath}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}
```

---

## Private Methods (Implementation Detail)

Each notifier MAY implement private helper methods. Examples:

- `formatMessage(notification)` — Convert notification to notifier's format
- `isValidUrl(url)` — Validate webhook/connection URLs
- `retryWithBackoff(fn, maxRetries)` — Retry logic for transient failures

---

## Error Handling

### Contract Compliance

- All notifiers MUST NOT crash the orchestrator on error
- All notifiers MUST log failures with context (reason, notification details)
- All notifiers MUST fail gracefully (catch exceptions, log, continue)
- All notifiers MUST be independent (failure of one notifier doesn't affect others)

### Example Error Flow

```javascript
async notify(notification) {
  try {
    // Send notification
  } catch (error) {
    logger.warn(`[${this.getName()}] Notification failed: ${error.message}`);
    // Don't rethrow; don't crash
  }
}
```

---

## Notification Types & Metadata

### Info Notification

**Type**: `info`  
**Usage**: General informational update (e.g., "Scan started", "Waiting for next cycle")  
**Metadata**: `{ timestamp: ISO8601 }`

### Success Notification

**Type**: `success`  
**Usage**: Scan or batch completed successfully  
**Metadata**: 
```javascript
{
  duration_seconds: number,
  jobs_found: number,
  jobs_added_to_pipeline: number,
  jobs_recommended: number,
  jobs_not_recommended: number,
  scores: { "4.5": 2, "4.0": 1, "3.5": 0 }
}
```

### Warning Notification

**Type**: `warning`  
**Usage**: Execution completed with warnings (e.g., some portals failed, slow execution)  
**Metadata**: `{ warnings: [string], partial_success: boolean }`

### Error Notification

**Type**: `error`  
**Usage**: Execution failed or critical issue  
**Metadata**: `{ error: string, error_type: string, timestamp: ISO8601 }`

---

## Testing Requirements

All notifier backends MUST pass these test cases:

1. **Initialization**: Notifier initializes with valid config without throwing
2. **Config Validation**: Notifier correctly identifies invalid configs
3. **Graceful Failure**: Notifier doesn't crash orchestrator if service is unavailable
4. **Enabled/Disabled**: Notifier respects `enabled` flag
5. **Message Formatting**: Notifier formats messages appropriately
6. **Error Handling**: Notifier logs errors without throwing

---

## Backward Compatibility

When adding new notifier types or notification fields:
- MUST be backward-compatible with existing notifiers
- New notification types SHOULD be optional
- Notifiers MUST ignore unknown metadata fields gracefully

---

## Built-In Notifiers

### Console Notifier

**Always enabled**: Cannot be disabled  
**Output**: Logs to stdout with timestamps and colors  
**Config**:
```yaml
console:
  enabled: true    # Cannot be disabled
  log_level: "info"  # debug | info | warn | error
```

### Slack Notifier

**Output**: Posts formatted messages to Slack channel  
**Config**:
```yaml
slack:
  enabled: false     # User must enable and configure
  webhook_url: "..."
  channel: "#career-ops"
  mention_on_error: true
  format: "block-kit"
```

### Obsidian Notifier

**Output**: Writes structured markdown to Obsidian vault  
**Config**:
```yaml
obsidian:
  enabled: true
  vault_path: "D:\\AI_BRAIN\\Claude-Obsidian\\claude-obsidian"
  base_folder: "Career-Ops/Sessions"
  daily_digest: true
```

---

## Examples

See `scripts/automation/notifiers/` for implementation examples:
- `console-notifier.mjs` — Stdout logging
- `slack-notifier.mjs` — Slack webhook integration
- `obsidian-notifier.mjs` — Obsidian vault file I/O
