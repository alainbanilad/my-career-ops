# Career-Ops Auto-Job-Scan-Apply (Automation Subsystem)

**Status**: ✅ Phase 1-8 Implementation Complete  
**Version**: 1.0.0  
**Last Updated**: 2025

## Overview

This subsystem automates the job application pipeline: periodic scanning of career portals → form pre-filling → Obsidian session logging → multi-channel notifications. Runs continuously in background using configurable scheduler backends (cron, GitHub Actions, Node.js daemon, webhooks).

## Quick Start

### 1. Configure Automation

Edit `config/profile.yml`:

```yaml
automation:
  enabled: true
  timezone: 'America/Los_Angeles'  # IANA timezone

  schedulers:
    system:  # Windows Task Scheduler / Linux cron
      enabled: true
      schedule:
        - '09:00'  # Run at 9 AM
        - '18:00'  # Run at 6 PM

    nodejs:  # Node.js HTTP daemon
      enabled: true
      port: 3000
      schedule:
        - '09:00'
        - '18:00'

    github_actions:  # GitHub Actions workflow dispatcher
      enabled: false
      personal_access_token: 'ghp_...'
      repository: 'your-org/your-repo'

    external:  # Webhook endpoint (for external schedulers)
      enabled: false
      port: 4000
      webhook_secret: 'your-secret-key'

  notifications:
    console:
      enabled: true
    slack:
      enabled: false
      webhook_url: 'https://hooks.slack.com/services/...'
    obsidian:
      enabled: true
      vault_path: 'D:\AI_BRAIN\Claude-Obsidian\claude-obsidian'
      session_folder: 'Career-Ops/Sessions'
```

### 2. Start Automation

```bash
# Start all schedulers in background
node scripts/automation/cli.mjs start

# Or run single cycle
node scripts/automation/cli.mjs run-once

# Check status
node scripts/automation/cli.mjs status

# Validate configuration
node scripts/automation/cli.mjs validate-config
```

### 3. Verify Setup

Before deploying to production, complete the verification checklist:

```bash
cat scripts/automation/VERIFICATION.md
```

Run pre-deployment checks:

```bash
# All in one
npm run automation:verify
```

## Architecture

### Multi-Backend Scheduler

Four concurrent scheduler backends can run simultaneously:

```
┌─────────────────────────────────────────────┐
│          Orchestrator (CLI/Entry)           │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┼──────────┬────────────┐
        ▼          ▼          ▼            ▼
   ┌────────┐ ┌─────────┐ ┌────────┐ ┌────────┐
   │ Cron   │ │ GitHub  │ │ Node.js│ │External│
   │Scheduler│ │ Actions │ │Daemon  │ │Webhook │
   └────────┘ └─────────┘ └────────┘ └────────┘
        │          │          │            │
        └──────────┴──────────┴────────────┘
                   │
        ┌──────────▼──────────┐
        │ Trigger Handler     │
        │ (handles concurrency│
        │  & prevents duplicates)
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────────────────────────────┐
        │   Full Automation Cycle                     │
        │  ┌─────────────────────────────────────┐  │
        │  │ 1. ScanOrchestrator (scan portals)  │  │
        │  │ 2. FormOrchestrator (pre-fill forms)│  │
        │  │ 3. ObsidianLogger (session logs)    │  │
        │  │ 4. NotificationPipeline (notify)    │  │
        │  └─────────────────────────────────────┘  │
        └──────────────────────────────────────────────┘
```

### Component Layers

**Layer 1: Scheduler Backends** (scripts/automation/scheduler-backends/)
- `base-scheduler.mjs` — Abstract base class
- `cron-scheduler.mjs` — Windows Task Scheduler / Linux cron
- `github-actions-scheduler.mjs` — GitHub Actions API
- `nodejs-scheduler.mjs` — HTTP daemon + node-schedule
- `external-scheduler.mjs` — Webhook endpoint

**Layer 2: Orchestrators** (scripts/automation/)
- `scan-orchestrator.mjs` — Wraps scan.mjs, returns { success, jobsFound, jobsAdded }
- `form-orchestrator.mjs` — Pre-fills forms, writes TSV per Constitution IV
- `obsidian-logger.mjs` — Session logging to Obsidian vault
- `notifier.mjs` — Aggregates console/Slack/Obsidian channels

**Layer 3: Core Orchestrator** (scripts/automation/orchestrator.mjs)
- Coordinates all components
- Manages session lifecycle
- Prevents concurrent runs
- Handles errors gracefully

**Layer 4: CLI** (scripts/automation/cli.mjs)
- User-facing commands: start, stop, status, validate-config, run-once
- Entry point for npm scripts

## Full Automation Cycle

Each scheduler trigger executes this cycle:

```
1. SCAN PHASE
   ├─ Spawn scan.mjs
   ├─ Parse output for metrics
   └─ Return { success, jobsFound, jobsAdded }

2. FORM-FILL PHASE (if jobs found)
   ├─ Load pipeline.md entries
   ├─ Pre-fill forms for new jobs
   ├─ Write TSV entry to batch/tracker-additions/
   └─ Return { success, formsCreated }

3. OBSIDIAN LOGGING PHASE
   ├─ Create session data
   ├─ Append to daily digest in vault
   ├─ Format markdown with tables
   └─ Return { success, logFile }

4. NOTIFICATION PHASE
   ├─ Console output (always)
   ├─ Slack message (if configured)
   ├─ Obsidian digest update (if configured)
   └─ Return { success, channelsNotified }

CLEANUP
├─ Run health-check (verify-pipeline.mjs + doctor.mjs)
├─ Record metrics (SC-004 uptime tracking)
└─ End session
```

## Configuration Reference

### Scheduler Backends

#### System Scheduler (Windows Task Scheduler / cron)
```yaml
schedulers:
  system:
    enabled: true
    schedule:
      - '09:00'  # HH:MM format
      - '18:00'
```

#### GitHub Actions
Requires Personal Access Token with repo workflow permissions:
```yaml
schedulers:
  github_actions:
    enabled: true
    personal_access_token: 'ghp_xyz...'
    repository: 'owner/repo'
    schedule:
      - '09:00'
```

#### Node.js HTTP Daemon
Runs local HTTP server on configurable port:
```yaml
schedulers:
  nodejs:
    enabled: true
    port: 3000
    schedule:
      - '09:00'
```

#### External Webhook
Receive triggers from external schedulers (e.g., IFTTT, Zapier):
```yaml
schedulers:
  external:
    enabled: true
    port: 4000
    webhook_secret: 'your-secret'
    # Webhook: POST http://your-server:4000/automation/trigger
    # Headers: X-Webhook-Signature: HMAC-SHA256(body, secret)
```

### Notification Channels

#### Console (always enabled)
```yaml
notifications:
  console:
    enabled: true
```

#### Slack
```yaml
notifications:
  slack:
    enabled: true
    webhook_url: 'https://hooks.slack.com/services/T.../B.../...'
```

#### Obsidian
```yaml
notifications:
  obsidian:
    enabled: true
    vault_path: '/path/to/vault'
    session_folder: 'Career-Ops/Sessions'
```

## Monitoring & Metrics

### Uptime Tracking (SC-004)

```bash
node scripts/automation/metrics.mjs
```

Tracks over 30-day rolling window:
- Total runs
- Successful / failed
- Uptime percentage
- Average cycle duration

### Health Checks

```bash
node scripts/automation/health-check.mjs
```

Runs after each automation cycle:
- `verify-pipeline.mjs` — Check data integrity
- `doctor.mjs` — Check file health

Results logged to `logs/automation/health-check-{date}.json`

### Session Logging

Detailed logs in:
- `logs/automation/scheduler.log` — Scheduler events
- `logs/automation/metrics.json` — Execution metrics
- Obsidian vault — Human-readable session digest

## Compliance & Constitution

### Constitution Requirements

✅ **IV. Data Integrity** — TSV merge pipeline in form-orchestrator.mjs  
✅ **Human-in-the-loop** — Forms pre-filled (status: Draft), never auto-submitted  
✅ **No duplicates** — Session deduplication via scheduler  
✅ **Graceful degradation** — Single backend/notifier failure doesn't crash system  

### Supported Use Cases (User Stories)

1. **US-001**: Run locally with cron/Task Scheduler (System scheduler)
2. **US-002**: Run in cloud via GitHub Actions (GitHub Actions scheduler)
3. **US-003**: Run 24/7 daemon (Node.js scheduler)
4. **US-004**: Webhook integration (External scheduler)
5. **US-005**: Full automation: scan → form-fill → notify

## Common Tasks

### Enable Automation

```bash
# Update config
vim config/profile.yml
# Set automation.enabled: true

# Start
node scripts/automation/cli.mjs start
```

### Add Slack Notifications

```yaml
# config/profile.yml
notifications:
  slack:
    enabled: true
    webhook_url: 'https://hooks.slack.com/services/...'
```

### Connect Obsidian Vault

```yaml
# config/profile.yml
notifications:
  obsidian:
    enabled: true
    vault_path: '/path/to/my/vault'
```

### Verify Pipeline Integrity

```bash
npm run verify
npm run doctor
```

### Check Automation Status

```bash
node scripts/automation/cli.mjs status
```

## Testing

Placeholder test suites ready for actual test implementation:

- `scripts/automation/tests/orchestrator.test.mjs` — Full cycle tests
- `scripts/automation/tests/e2e.test.mjs` — End-to-end scenarios
- `scripts/automation/tests/integration.test.mjs` — Component integration
- `scripts/automation/tests/notifier.test.mjs` — Notification channels

Run all tests:
```bash
npm run automation:test
```

## Troubleshooting

### Scheduler not triggering

```bash
# Verify configuration
node scripts/automation/cli.mjs validate-config

# Test manual run
node scripts/automation/cli.mjs run-once

# Check logs
tail logs/automation/scheduler.log
```

### Forms not pre-filling

```bash
# Verify scan found jobs
npm run scan

# Check pipeline.md
cat data/pipeline.md

# Test form orchestrator directly
node -e "
  import('./scripts/automation/form-orchestrator.mjs')
  .then(m => new m.FormOrchestrator({}))
  .then(f => f.executeFormFill({/* test entry */}, {}))
  .then(r => console.log(r))
"
```

### Notifications not received

```bash
# Test console (always works)
node scripts/automation/cli.mjs run-once

# Test Slack webhook
curl -X POST -H 'Content-Type: application/json' \
  -d '{"text":"test"}' \
  $SLACK_WEBHOOK_URL

# Verify Obsidian vault path
ls -la "$(grep vault_path config/profile.yml | cut -d: -f2 | tr -d ' ')"
```

## Support

- **Issues**: Report in GitHub issues with tag `automation:`
- **Questions**: See [Career-Ops docs](../README.md)
- **Contributing**: See [CONTRIBUTING.md](../../CONTRIBUTING.md)

---

**Feature**: Auto-Job-Scan-Apply (Feature #001)  
**Status**: Phase 1-8 Complete ✅  
**Build**: Node.js 18+ with node-schedule, js-yaml, axios, playwright
