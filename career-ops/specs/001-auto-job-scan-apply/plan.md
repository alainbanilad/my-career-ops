# Implementation Plan: Auto-Job-Scan-Apply

**Branch**: `001-auto-job-scan-apply` | **Date**: 2026-05-12 | **Spec**: [specs/001-auto-job-scan-apply/spec.md](spec.md)
**Input**: Feature specification from `specs/001-auto-job-scan-apply/spec.md`

## Summary

**Primary Requirement**: Automate daily job search by scanning portals at 9 AM & 6 PM SGT, pre-filling application forms with AI assistance, logging sessions to Obsidian, and delivering real-time updates via console, Slack, and Obsidian. All automation orchestrates existing career-ops CLI modes (`scan.mjs`, batch evaluation, `/career-ops apply`) without duplicating core logic.

**Technical Approach**: 
- Build a scheduler abstraction supporting 4 backends (system cron/Task Scheduler, GitHub Actions, Node.js daemon, user-provided) configured via `config/profile.yml`
- Create a notification pipeline sending to console, Slack webhook, and Obsidian daily log (all optional/configurable)
- Extend existing session logging to write structured JSON to Obsidian vault at `D:\AI_BRAIN\Claude-Obsidian\claude-obsidian`
- Wrap existing CLI modes in a orchestration layer that handles dedup, filtering, and status updates
- Maintain human-in-the-loop: all forms pre-filled but never auto-submitted; all decisions reviewed by user before action

## Technical Context

**Language/Version**: Node.js 18+ (ES modules `.mjs`), existing career-ops codebase  
**Primary Dependencies**: 
  - `node-schedule` or `later.js` (Node.js scheduler backend)
  - Existing `scan.mjs` and batch evaluation modes (no new deps)
  - `axios` or `node-fetch` (HTTP for Slack webhooks)
  - `js-yaml` (already in career-ops)
  - Playwright (already in career-ops, for form filling)

**Storage**: File-based YAML config + Markdown session logs + TSV tracker entries  
**Testing**: Jest (for unit tests of scheduler, notifier, Obsidian logger)  
**Target Platform**: Windows (Task Scheduler), Linux/Mac (cron), cloud (GitHub Actions)  
**Project Type**: CLI automation orchestrator (wraps existing modes)  
**Performance Goals**: 
  - Scans complete in <5 minutes
  - Notifications delivered within 30 seconds of cycle completion
  - Form generation <2 minutes per posting

**Constraints**: 
  - No external hosted services (local-first)
  - Obsidian vault must be accessible via file I/O
  - All config changes via `config/profile.yml` (no manual scheduler setup needed)
  - Slack webhook requires pre-configured webhook URL
  
**Scale/Scope**: 
  - Single user (Alain) automation
  - 2 cycles per day (9 AM, 6 PM SGT)
  - 50–100 new postings per month
  - All processing on local machine (or GitHub Actions if configured)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Compliance with Career-Ops Constitution v1.0.0:

- [x] **I. Human-in-the-Loop** — Feature pre-fills forms but STOPS before submission; user reviews and clicks "Submit" themselves. Scans are fully automated (discovery), but form submission is user-gated. No auto-submit logic anywhere.
- [x] **II. Quality Over Quantity** — Feature reuses existing 4.0/5 score threshold; automation surfaces all postings but user still decides which to apply to. No volume pressure; quality-first filtering remains.
- [x] **III. Personalization-First** — Scheduler config read from `config/profile.yml` (automation.schedulers, automation.notifications). Form filling and CV customization read from `cv.md` and `modes/_profile.md` at runtime. No hardcoded archetypes or targets.
- [x] **IV. Pipeline Integrity** — New postings added to `data/pipeline.md` by existing `scan.mjs`. Form-fill entries written as TSV to `batch/tracker-additions/`, merged via `merge-tracker.mjs`. All statuses use canonical values from `templates/states.yml`. Health check gates maintained.
- [x] **V. Data Privacy & Local-First** — All user data stays on machine or in local Obsidian vault. Slack webhook is optional (user configures). GitHub Actions runs as user's own workflow (no SaaS data leakage). Obsidian vault is user's own filesystem.
- [x] **Data Contract** — Feature adds new `automation.schedulers` and `automation.notifications` sections to `config/profile.yml` (user layer). Creates `scripts/automation/` directory for orchestration scripts (system layer, safe to update). No modifications to system-layer modes or core scripts.

**RESULT**: All gates PASS ✅

## Project Structure

### Documentation (this feature)

```text
specs/001-auto-job-scan-apply/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output: dependencies, best practices for multi-backend scheduling
├── data-model.md        # Phase 1 output: scheduler config schema, notification config schema
├── quickstart.md        # Phase 1 output: setup guide for 4 scheduler backends
├── contracts/
│   ├── scheduler-interface.md     # Contract for scheduler backend implementations
│   └── notification-interface.md  # Contract for notifier backends (console, Slack, Obsidian)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
scripts/automation/                          # NEW: Orchestration layer
├── scheduler-config.mjs                     # Config parser + backend factory
├── scheduler-backends/
│   ├── cron-scheduler.mjs                   # System scheduler (cron/Task Scheduler)
│   ├── github-actions-scheduler.mjs         # GitHub Actions trigger via API
│   ├── nodejs-scheduler.mjs                 # Node.js daemon with node-schedule
│   └── external-scheduler.mjs               # Webhook endpoint for user-provided triggers
├── notifier.mjs                             # Notification pipeline (console, Slack, Obsidian)
├── obsidian-logger.mjs                      # Session logging to Obsidian vault
├── orchestrator.mjs                         # Main orchestration: scan → evaluate → form-fill → notify
└── tests/
    ├── scheduler.test.mjs
    ├── notifier.test.mjs
    └── orchestrator.test.mjs

config/profile.example.yml                   # UPDATED: Add automation.schedulers, automation.notifications
.github/workflows/                           # OPTIONAL: GitHub Actions workflow
└── auto-job-scan-apply.yml                  # GitHub Actions scheduler (if user chooses backend B)

```

### Data Files (no changes; uses existing)

```text
data/
├── pipeline.md          # Scan output (existing mode)
├── scan-history.tsv     # Dedup history (existing)
└── applications.md      # Form-fill entries (existing, updated via TSV merge)

reports/                 # Evaluation reports (existing)
output/                  # Generated PDFs (existing)

D:\AI_BRAIN\Claude-Obsidian\claude-obsidian/  # User's Obsidian vault
└── Career-Ops/
    └── Sessions/
    └── 2026-05-12.md                    # Daily session log (NEW)
```

---

## Phase 0: Research & Dependency Analysis

**Goal**: Resolve all research tasks and document findings.

### Research Tasks

1. **Task 0.1: Multi-Backend Scheduler Best Practices**
   - Research: How do production job schedulers handle multiple backends (cron, GitHub Actions, Node.js)?
   - Key questions: 
     - What is the canonical way to abstract scheduler backends in Node.js?
     - How do tools like `n8n` and `Zapier` support multiple execution environments?
     - Best practices for graceful fallback if primary scheduler fails?
   - Outcome: Best practices document → `research.md`

2. **Task 0.2: Obsidian Vault Integration Patterns**
   - Research: How to write structured markdown to Obsidian vault while preserving frontmatter, backlinks, and plugin compatibility?
   - Key questions:
     - Should session logs use YAML frontmatter (date, tags, status)?
     - How to link session logs back to `reports/` directory?
     - Best practice for organizing sessions (by date? by company? by status)?
   - Outcome: Obsidian integration specification → `research.md`

3. **Task 0.3: Slack Webhook Integration & Rate Limits**
   - Research: Slack webhook best practices for notification formatting, retry logic, rate limiting.
   - Key questions:
     - How to format Slack messages for maximum readability?
     - How to handle webhook failures (e.g., user deleted webhook)?
     - Are there any rate limits or throttling considerations?
   - Outcome: Slack integration specification → `research.md`

4. **Task 0.4: GitHub Actions Scheduler Triggering**
   - Research: How to trigger GitHub Actions workflows programmatically from local machine or as scheduled cron job in GitHub?
   - Key questions:
     - Can GitHub Actions be triggered via API call (vs. just scheduled events)?
     - How to handle authentication (PAT, GITHUB_TOKEN)?
     - How to capture output from GitHub Actions and log it locally?
   - Outcome: GitHub Actions integration pattern → `research.md`

**All research tasks are RESOLVED** — Clarifications from user specification lock down architectural decisions. Proceed to Phase 1.

---

## Phase 1: Design & Contracts

### Phase 1.1: Data Model

**Scheduler Configuration** (stored in `config/profile.yml`):

```yaml
automation:
  schedulers:
    system:                    # System cron/Task Scheduler
      enabled: true            # boolean
      timezone: "Asia/Singapore"
      schedule:
        - time: "09:00"        # 9 AM SGT
          action: "scan"
        - time: "18:00"        # 6 PM SGT
          action: "batch"
    
    github_actions:            # GitHub Actions backend
      enabled: false
      repo: "alainbanilad/my-career-ops"
      pat_token: "..."         # GitHub Personal Access Token
      
    nodejs:                    # Node.js daemon
      enabled: false
      port: 3000               # Listen for manual triggers
      
    external:                  # User-provided trigger webhook
      enabled: false
      webhook_path: "/webhook/auto-job-scan"
      secret: "..."            # Shared secret for validation
  
  notifications:
    console: true              # Always enabled
    slack:
      enabled: false
      webhook_url: "..."       # Required if enabled
      channel: "#career-ops"
      mention_user: false
    obsidian:
      enabled: true
      vault_path: "D:\\AI_BRAIN\\Claude-Obsidian\\claude-obsidian"
      base_folder: "Career-Ops/Sessions"
      frontmatter_template: true

automation_state:              # Runtime state (auto-generated)
  last_scan: "2026-05-12T09:00:00Z"
  last_batch: "2026-05-12T18:00:00Z"
  active_session_id: "..."     # UUID for correlating logs
```

**Session Log Structure** (Obsidian markdown file):

```markdown
---
date: 2026-05-12T09:00:00Z
type: scan
action: scan
duration_seconds: 245
status: completed
jobs_found: 3
jobs_added_to_pipeline: 3
jobs_skipped_dedup: 0
scores_above_threshold: 2
scores_below_threshold: 1
---

# Career-Ops Scan Session — 2026-05-12 09:00

**Duration**: 4:05 min | **Status**: ✅ Completed

## Summary

- **Portals Scanned**: Greenhouse (5), Ashby (3), Lever (2), Wellfound (1)
- **New Opportunities**: 3 found, 3 added to pipeline, 0 dedup-skipped
- **Recommended**: 2 roles scored ≥4.0/5
- **Not Recommended**: 1 role scored <4.0/5

## Opportunities Found

| Company | Role | Score | Link |
|---------|------|-------|------|
| Anthropic | ML Infrastructure Engineer | 4.5/5 | [View Report](../../reports/001-anthropic-2026-05-12.md) |
| OpenAI | Applied Researcher | 4.2/5 | [View Report](../../reports/002-openai-2026-05-12.md) |
| Mistral | QA Engineer | 3.2/5 | [View Report](../../reports/003-mistral-2026-05-12.md) |

## Next Steps

1. Review recommended roles in career-ops
2. Pre-fill forms for 4.5+ roles at 6 PM batch cycle
3. Update this log after batch cycle completes
```

### Phase 1.2: Contracts

Create three contracts (in `specs/001-auto-job-scan-apply/contracts/`):

1. **scheduler-interface.md**: Backend implementation contract (all backends must export `schedule(config)` and `start()` functions)
2. **notification-interface.md**: Notifier backend contract (all notifiers must export `notify(message)` function)
3. **orchestrator-interface.md**: Orchestrator contract (entry point signature, input/output formats)

### Phase 1.3: Quickstart

Create `specs/001-auto-job-scan-apply/quickstart.md` with setup instructions for each backend:
- **Backend A**: Windows Task Scheduler or Linux cron setup
- **Backend B**: GitHub Actions repository setup + PAT configuration
- **Backend C**: Node.js daemon daemonization (e.g., PM2, systemd service)
- **Backend D**: User-provided trigger webhook integration

### Phase 1.4: Update Agent Context

Update `.github/copilot-instructions.md` to reference the plan:

```markdown
## Current Implementation Plan

**Feature**: Auto-Job-Scan-Apply (Feature #001)  
**Status**: Phase 1 Design Complete (in planning)  
**Plan**: [specs/001-auto-job-scan-apply/plan.md](specs/001-auto-job-scan-apply/plan.md)

See plan for:
- Technical architecture (multi-backend scheduler, notification pipeline)
- Data model (scheduler config schema, session logging format)
- Contracts (backend interfaces)
- Phase 2 tasks (implementation)
```

---

## Phase 2: Task Generation (deferred)

Phase 2 (task breakdown) will be executed via `/speckit.tasks` after Phase 1 design is approved.

Expected task categories:
- Scheduler abstraction layer (backend-agnostic API)
- Individual backend implementations (4 × cron/Actions/Node.js/webhook)
- Notifier implementations (console, Slack, Obsidian)
- Orchestration logic (scan → batch → form-fill → notify)
- Configuration schema validation
- Integration tests (full end-to-end cycles)
- GitHub Actions workflow template (if backend B enabled)

---

## Implementation Status

**[001-auto-job-scan-apply] Phase 1 Design: COMPLETE** ✅

- [x] Technical context defined
- [x] Constitution check passed
- [x] Project structure outlined
- [x] Multi-backend scheduler design documented
- [x] Data model (config schema, session log format) defined
- [x] Contracts specified (scheduler, notifier, orchestrator)
- [x] Agent context updated
- [x] Ready for Phase 2 (task generation via `/speckit.tasks`)

**Next Command**: `/speckit.tasks` to generate actionable implementation tasks
