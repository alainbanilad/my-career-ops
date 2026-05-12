# Data Model: Auto-Job-Scan-Apply

**Created**: 2026-05-12  
**Status**: Specification Complete  

---

## 1. Scheduler Configuration Schema

### File Location
`config/profile.yml` under `automation` section (user layer)

### Schema Definition

```yaml
automation:
  # Global settings
  enabled: true                               # Boolean: enable/disable entire automation
  timezone: "Asia/Singapore"                  # Timezone for schedule times (IANA format)
  concurrent_runs_allowed: false              # Boolean: prevent overlapping cycles
  
  # Per-backend scheduler configuration
  schedulers:
    
    # Backend A: System Scheduler (cron/Task Scheduler)
    system:
      enabled: true                           # Boolean: enable this backend
      timezone: "Asia/Singapore"              # Override global timezone for this backend
      schedule:
        - time: "09:00"                       # HH:MM format, SGT
          action: "scan"                      # scan | batch | form-fill
          timeout_minutes: 10                 # Max duration before timeout
        - time: "18:00"
          action: "batch"
          timeout_minutes: 15
    
    # Backend B: GitHub Actions
    github_actions:
      enabled: false                          # Set true to enable
      repo: "alainbanilad/my-career-ops"     # GitHub repo (owner/repo format)
      pat_token: "${GITHUB_PAT}"              # GitHub Personal Access Token (env var ref)
      workflow_file: ".github/workflows/auto-job-scan-apply.yml"
      concurrency_key: "auto-job-scan"        # Prevent duplicate runs
    
    # Backend C: Node.js Daemon
    nodejs:
      enabled: false
      port: 3000                              # Port to listen on
      host: "127.0.0.1"                       # Localhost only (for security)
      daemon_log_file: "logs/automation/daemon.log"
      restart_on_failure: true                # Automatically restart if crash detected
      max_retries: 3                          # Retry failed cycles N times before alerting
    
    # Backend D: External/User-Provided Trigger
    external:
      enabled: false
      webhook_path: "/webhook/auto-job-scan"  # Relative path (full URL: http://localhost:3000/webhook/...)
      secret_token: "${WEBHOOK_SECRET}"       # Shared secret for validation (env var)
      rate_limit_per_hour: 10                 # Max triggers per hour (prevent abuse)
  
  # Notification configuration
  notifications:
    console:
      enabled: true                           # Always on; cannot disable
      log_level: "info"                       # debug | info | warn | error
      
    slack:
      enabled: false                          # Set true to enable
      webhook_url: "${SLACK_WEBHOOK_URL}"    # Slack incoming webhook (env var ref)
      channel: "#career-ops"                  # Channel name (optional override in webhook)
      mention_on_error: true                  # @mention user if cycle fails
      format: "block-kit"                     # block-kit | plain-text
      
    obsidian:
      enabled: true
      vault_path: "D:\\AI_BRAIN\\Claude-Obsidian\\claude-obsidian"  # Absolute path to vault
      base_folder: "Career-Ops/Sessions"      # Relative path within vault
      daily_digest: true                      # Append to daily digest file
      daily_digest_file: "Career-Ops/Daily-Digest/2026-05.md"
      frontmatter_metadata: true              # Include YAML frontmatter in session logs
  
  # Runtime state (auto-managed, read-only for user)
  automation_state:
    last_scan: "2026-05-12T09:00:00Z"        # ISO 8601 timestamp
    last_batch: "2026-05-12T18:00:00Z"
    last_notify: "2026-05-12T18:05:00Z"
    active_session_id: "uuid-1234-5678"     # UUID for correlating logs
    active_action: null                      # Current action or null
```

### Validation Rules

1. **At least one scheduler backend must be enabled**
   - Constraint: `sum(schedulers[*].enabled) >= 1`
   - Rationale: System cannot run without at least one trigger mechanism

2. **If GitHub Actions enabled, PAT must be set**
   - Constraint: `if github_actions.enabled then pat_token must not be empty`
   - Rationale: GitHub Actions requires authentication

3. **If Slack enabled, webhook_url must be set**
   - Constraint: `if notifications.slack.enabled then webhook_url must not be empty`
   - Rationale: Slack notifications require valid webhook

4. **Obsidian vault_path must exist and be writable**
   - Constraint: `fs.existsSync(vault_path) && fs.accessSync(vault_path, fs.constants.W_OK)`
   - Rationale: Cannot log to vault if path is inaccessible

5. **Timezone must be valid IANA zone**
   - Constraint: `Intl.DateTimeFormat().resolvedOptions().timeZone === timezone`
   - Rationale: Invalid timezone causes scheduler failures

---

## 2. Session Log Data Model

### File Location
`D:\AI_BRAIN\Claude-Obsidian\claude-obsidian\Career-Ops\Sessions\{DATE}.md`

Example: `2026-05-12.md` (YYYY-MM-DD format, daily file with multiple sessions appended)

### Schema: YAML Frontmatter + Markdown Body

```markdown
---
# Frontmatter (YAML)
# ==================

# Metadata
date: 2026-05-12T09:00:00Z              # ISO 8601 timestamp (UTC)
timezone: Asia/Singapore                # User's configured timezone
session_id: uuid-1234-5678              # UUID for log correlation
session_type: scan                      # scan | batch | form-fill

# Status & Duration
status: completed                       # completed | failed | interrupted | timeout
started_at: 2026-05-12T09:00:00Z       # ISO 8601
ended_at: 2026-05-12T09:04:45Z
duration_seconds: 285                  # Total execution time

# Scan Metrics (if session_type: scan)
scan_portals_total: 11                 # Total portals queried
scan_portals_successful: 11            # Portals that returned results
scan_portals_failed: 0                 # Portals that errored
jobs_discovered_total: 47              # Total postings found across all portals
jobs_already_scanned: 44               # Postings in dedup history
jobs_added_to_pipeline: 3              # New postings added to pipeline.md

# Score Distribution (if session_type: scan or batch)
scores_5_0_to_5_0: 0                   # Postings with 5.0/5 score
scores_4_5_to_4_9: 2                   # Postings with 4.5-4.9/5
scores_4_0_to_4_4: 1                   # Postings with 4.0-4.4/5
scores_below_4_0: 0                    # Postings below 4.0/5 (not recommended)

# Notification Status (if notifications enabled)
notified_console: true                 # Console output sent
notified_slack: false                  # Slack webhook sent (or not enabled)
notified_obsidian: true                # Session log written to Obsidian

# Error Tracking (if status: failed)
error_type: timeout                    # Type of error: timeout | network | disk | permission | other
error_message: "Scan exceeded 10 minute timeout"
error_code: E_TIMEOUT_EXCEEDED
error_count: 1                         # Number of errors in this session

# Tags for Obsidian queries
tags: [automation, scan, success]      # success | failed | slow | network-error
---

# Career-Ops Session: Scan

**Session ID**: `uuid-1234-5678`  
**Timestamp**: 2026-05-12 09:00 SGT | **Duration**: 4:45 min | **Status**: ✅ Completed

---

## Summary

- **Portals Scanned**: 11 (Greenhouse, Ashby, Lever, Wellfound, etc.)
- **New Opportunities**: 3 found, 3 added to pipeline
- **Already Scanned**: 44 postings (dedup-skipped)
- **Recommended** (≥4.0/5): 3 opportunities
- **Not Recommended** (<4.0/5): 0 opportunities

---

## Opportunities Added to Pipeline

| # | Company | Role | Score | Archetype | Source | Added |
|---|---------|------|-------|-----------|--------|-------|
| 1 | Anthropic | ML Infrastructure Engineer | 4.5/5 | LLMOps | Greenhouse | [Report](../../../reports/001-anthropic-2026-05-12.md) |
| 2 | OpenAI | Applied Researcher | 4.2/5 | Agentic | Ashby | [Report](../../../reports/002-openai-2026-05-12.md) |
| 3 | Mistral AI | Senior QA Engineer | 4.1/5 | QA Lead | Lever | [Report](../../../reports/003-mistral-2026-05-12.md) |

---

## Portal Coverage

| Portal | Status | Count | Errors |
|--------|--------|-------|--------|
| Greenhouse | ✅ OK | 15 | 0 |
| Ashby | ✅ OK | 12 | 0 |
| Lever | ✅ OK | 8 | 0 |
| Wellfound | ✅ OK | 5 | 0 |
| Workable | ✅ OK | 3 | 0 |
| RemoteFront | ✅ OK | 4 | 0 |

**Total**: 47 postings scanned, 44 deduplicated, 3 new

---

## Next Actions

1. ✅ Review 3 opportunities in Career-Ops (6 PM batch cycle)
2. ⏳ Batch evaluation scheduled for 6 PM SGT
3. ⏳ Form-fill (if scores ≥4.0/5) at user discretion

---

## Logs & Debugging

- **Scan Log**: `logs/automation/scan-2026-05-12-0900.log`
- **Error Log**: (none)
- **Full Session Report**: [View in Career-Ops](../../../specs/001-auto-job-scan-apply/plan.md)

---

*Logged at 2026-05-12 09:04:45 SGT by Career-Ops Automation v1.0.0*
```

### Frontmatter Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | ISO 8601 | Yes | Session start time (UTC) |
| `timezone` | IANA zone | Yes | User's configured timezone |
| `session_id` | UUID | Yes | Unique identifier for this session |
| `session_type` | enum | Yes | `scan`, `batch`, `form-fill` |
| `status` | enum | Yes | `completed`, `failed`, `interrupted`, `timeout` |
| `duration_seconds` | integer | Yes | Total execution time |
| `jobs_discovered_total` | integer | Conditional (scan) | Total postings found |
| `jobs_added_to_pipeline` | integer | Conditional (scan) | New postings added |
| `scores_5_0_to_5_0` | integer | Conditional (scan/batch) | Count of 5.0/5 scores |
| `error_type` | enum | Conditional (failed) | Type of error encountered |
| `tags` | array | No | For Obsidian queries (success, failed, slow, etc.) |

---

## 3. Pipeline Entry Data Model

### File Location
`data/pipeline.md` (extended by scan automation)

### Schema

```markdown
| # | Date Found | URL | Company | Role | Source | Archetype | Score | Status |
|---|------------|-----|---------|------|--------|-----------|-------|--------|
| 1 | 2026-05-12 | https://... | Anthropic | ML Infra Eng | Greenhouse | LLMOps | 4.5/5 | Pending |
```

### New Columns Added by Automation

| Column | Type | Source | Description |
|--------|------|--------|-------------|
| `Date Found` | YYYY-MM-DD | Session metadata | When posting was discovered |
| `Source` | string | Job board portal | Where posting was found (Greenhouse, Ashby, etc.) |
| `Archetype` | string | Career-Ops classifier | Which archetype matches this role |
| `Score` | decimal/5 | Batch evaluation | A-F score (computed by `/career-ops batch`) |

---

## 4. Deduplication Data Model

### File Location
`data/scan-history.tsv`

### Schema

```
URL	DiscoveredDate	LastScannedDate	PortalName	Company	Role	Status	Notes
https://example.com/jobs/123	2026-05-12	2026-05-12	Greenhouse	Anthropic	ML Eng	added	First discovery
https://example.com/jobs/456	2026-04-15	2026-05-12	Ashby	OpenAI	Researcher	skipped	Seen 27 days ago
```

### Fields

| Field | Type | Purpose |
|-------|------|---------|
| `URL` | string | Posting URL (primary key) |
| `DiscoveredDate` | ISO 8601 | First discovery date |
| `LastScannedDate` | ISO 8601 | Last time this URL was encountered |
| `PortalName` | string | Job board it was found on |
| `Company` | string | Hiring company |
| `Role` | string | Job title |
| `Status` | enum | `added` = new pipeline entry; `skipped` = already known |
| `Notes` | string | Additional info (e.g., "Posting closed", "Already applied") |

---

## 5. Notification Message Template

### Console Output

```
[2026-05-12 09:04:45 SGT] ✅ Career-Ops Scan Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary
  • Duration: 4:45 min
  • Portals: 11/11 successful
  • Jobs Found: 47 (3 new, 44 dedup-skipped)
  • Recommended: 3 (≥4.0/5)
  
📝 Opportunities
  1. Anthropic — ML Infrastructure Engineer (4.5/5) ⭐⭐⭐
  2. OpenAI — Applied Researcher (4.2/5) ⭐⭐⭐
  3. Mistral — QA Engineer (4.1/5) ⭐⭐⭐

⏳ Next Step: Batch evaluation at 6 PM SGT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Session Log] Career-Ops/Sessions/2026-05-12-0900.md
```

### Slack Block Kit Format

```json
{
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "🎯 Career-Ops Scan Update" }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Scan Completed* ✅\n3 new roles found (2 recommended)\nNext: Batch evaluation at 6 PM SGT"
      }
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Duration*\n4:45 min" },
        { "type": "mrkdwn", "text": "*Portals*\n11/11 ✅" },
        { "type": "mrkdwn", "text": "*New Roles*\n3 found" },
        { "type": "mrkdwn", "text": "*Recommended*\n2 ⭐⭐⭐" }
      ]
    }
  ]
}
```

---

## Summary

**Data Model Complete**: 5 primary data structures defined with validation rules, field definitions, and example outputs. Ready for Phase 2 (implementation).
