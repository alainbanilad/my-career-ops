# Tasks: Auto-Job-Scan-Apply (Feature #001)

**Input**: Specification from `spec.md` | Design from `plan.md` | Data Model from `data-model.md` | Research from `research.md`  
**Prerequisites**: ✅ All completed  
**Status**: Phase 2 — Task Breakdown COMPLETE  
**Date**: 2026-05-12

---

## Task Organization

Tasks are grouped by **phase** and mapped to **user stories** (US1–US5 from spec.md). Each user story phase is independently implementable and testable.

**Format**: `- [ ] [ID] [P?] [Story?] Description with file path`

- `[ID]`: Sequential task number (T001, T002, etc.)
- `[P]`: Parallelizable (can run simultaneously)
- `[Story]`: User story (US1, US2, US3, US4, US5)
- **File paths**: Exact locations for implementation

---

## Dependency Graph

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational: Scheduler Abstraction)
    ├→ Phase 3 (US1: Scanning)
    ├→ Phase 4 (US2: Form Filling)
    ├→ Phase 5 (US3: Obsidian Logging)
    ├→ Phase 6 (US4: Status Updates)
    └→ Phase 7 (US5: CLI Integration & Orchestration)
        ↓
Phase 8 (Polish & Tests)
```

**Critical Path**: Phase 1 → Phase 2 → Phase 7 (orchestrator is blocking for E2E)  
**Parallel Opportunities**: Phases 3–6 can run in parallel after Phase 2 completes

---

## Phase 1: Setup & Project Initialization

**Purpose**: Initialize project structure, configure dependencies, extend config schema

### Setup Tasks

- [ ] T001 Create `scripts/automation/` directory structure per plan.md

- [ ] T002 [P] Install Node.js dependency `node-schedule` and verify package.json updated

- [ ] T003 [P] Create config template in `config/profile.example.yml` with `automation` section per data-model.md (scheduler backends + notification channels)

- [ ] T004 Create `scripts/automation/index.mjs` as entry point exporting `SchedulerFactory` and `NotificationPipeline` classes (stubs)

- [ ] T005 [P] Create `.github/workflows/auto-job-scan-apply.yml` GitHub Actions template (optional backend B; reference quickstart.md)

**Acceptance**: 
- Directory structure exists and matches plan.md
- package.json includes `node-schedule`
- config/profile.example.yml has automation section with all backends
- Workflow template ready for user configuration

---

## Phase 2: Foundational — Scheduler Abstraction Layer & Config Validation

**Purpose**: Build backend-agnostic scheduler abstraction; enable all 4 backends via configuration

### Scheduler Abstraction & Config

- [ ] T006 [P] Create `scripts/automation/scheduler-config.mjs` implementing:
  - `SchedulerConfig` class: loads YAML from `config/profile.yml`, validates against schema
  - `validateConfig()`: verifies at least one backend is enabled; validates API keys/URLs
  - `getActiveBackends()`: returns list of enabled backends from config
  - Handle missing/invalid config gracefully with helpful error messages

- [ ] T007 Create `scripts/automation/scheduler-factory.mjs` implementing:
  - `SchedulerFactory` class with static `createBackends(config)` method
  - Returns array of enabled scheduler backend instances (composite pattern)
  - Backend instances conform to scheduler-interface.md contract
  - Handle initialization errors per backend (one failure doesn't crash others)

- [ ] T008 [P] Create `scripts/automation/scheduler-backends/base-scheduler.mjs` abstract base class:
  - Abstract methods: `getName()`, `start()`, `stop()`, `getStatus()`, `validateConfig()`
  - Shared logging utilities and error handling patterns
  - See contracts/scheduler-interface.md for full contract

**Acceptance**:
- Config loader parses profile.yml and validates per data-model.md schema
- Factory creates correct backend instances based on enabled flags
- All backends inherit from base class and implement interface
- Error handling: single backend failure doesn't crash orchestrator

---

## Phase 2 (continued): Individual Scheduler Backends

### Backend A: System Scheduler (Cron/Task Scheduler)

- [ ] T009 [P] Create `scripts/automation/scheduler-backends/cron-scheduler.mjs` implementing:
  - Constructor: parse system config, validate schedule times
  - `start()`: Use `node-schedule` library to register jobs for configured times (convert SGT → local time)
  - `stop()`: Cancel all scheduled jobs
  - `getStatus()`: Return running state, last run, next scheduled run, error count
  - Respect `concurrent_runs_allowed` flag (prevent overlapping cycles)
  - See research.md R1 for multi-backend pattern

- [ ] T010 [P] Create `scripts/automation/scheduler-backends/github-actions-scheduler.mjs` implementing:
  - Constructor: validate GitHub PAT token and repo format (owner/repo)
  - `start()`: Set up GitHub Actions workflow dispatcher (polls for schedule or allows manual dispatch)
  - Can trigger workflow via GitHub API using PAT token
  - Implement concurrency key to prevent duplicate runs
  - `getStatus()`: Poll GitHub Actions API for last workflow run timestamp
  - See research.md R4 for GitHub Actions pattern

- [ ] T011 [P] Create `scripts/automation/scheduler-backends/nodejs-scheduler.mjs` implementing:
  - Constructor: validate port, initialize HTTP server
  - `start()`: Start express server on configured port listening for trigger requests
  - `stop()`: Gracefully shut down server
  - `getStatus()`: Return server state, request count, last trigger timestamp
  - Optional PM2 daemonization documentation
  - See quickstart.md Option C for setup

- [ ] T012 [P] Create `scripts/automation/scheduler-backends/external-scheduler.mjs` implementing:
  - Constructor: validate webhook secret, rate limit config
  - `start()`: Initialize webhook endpoint validation (HMAC-SHA256 signature check)
  - `stop()`: Close webhook listener
  - `getStatus()`: Return webhook stats (requests received, last trigger, errors)
  - Rate limiting: max N triggers per hour (configurable)
  - See quickstart.md Option D for webhook integration

**Acceptance**:
- Each backend independently passes validation tests (can start/stop idempotently)
- All backends respect timezone and schedule configuration
- Concurrent run prevention works (no duplicate cycles)
- Error handling: backend failure doesn't crash other backends

---

## Phase 3: User Story 1 — Daily Automated Job Scanning

**Acceptance Criteria** (from spec.md US1):
- New postings appear in `data/pipeline.md` at scheduled times
- Dedup logic prevents re-adding existing URLs
- Archetype filtering applied (only matching postings added)

### Scanning Orchestration

- [ ] T013 [US1] Create `scripts/automation/scan-orchestrator.mjs` stub:
  - Export `executeScan(config)` async function
  - Placeholder: will invoke `node scan.mjs` with proper environment
  - Return: { success, jobsFound, jobsAdded, errors }

- [ ] T014 [US1] Implement scan orchestrator in `scripts/automation/scan-orchestrator.mjs`:
  - Call existing `scan.mjs` via child_process.spawn() or import scan logic
  - Verify: `scan.mjs` applies title filters from `portals.yml` (FR-003 archetype filtering is role-based title matching, not separate archetype config)
  - Capture output; parse new entries added to `data/pipeline.md`
  - Log execution to local state (duration, count, errors)
  - Return structured result for notifier pipeline
  - Note: If additional archetype filtering is needed beyond portals.yml title_filter, add post-scan filter step (defer to requirements clarification)

- [ ] T015 [US1] Create `scripts/automation/tests/scan-orchestrator.test.mjs`:
  - Test: `executeScan()` returns { success, jobsFound, jobsAdded }
  - Test: Dedup works (calling scan twice doesn't double-add URLs)
  - Test: Archetype filtering respected (only matching roles added)
  - Mock: `data/pipeline.md` writes, `data/scan-history.tsv` reads

**Acceptance**:
- Scan can be triggered at 9 AM and 6 PM per schedule
- New postings added to pipeline with dedup applied
- Archetype and role filtering respected
- Execution logs captured

---

## Phase 4: User Story 2 — AI-Assisted Form Filling with Human Review

**Acceptance Criteria** (from spec.md US2):
- Forms pre-filled with AI suggestions (CV, cover letter, screening answers)
- User can review and edit all fields
- Forms NOT auto-submitted (user clicks Submit)
- Drafts saved to `data/applications.md`

### Form Filling Orchestration

- [ ] T016 [US2] Create `scripts/automation/form-orchestrator.mjs` stub:
  - Export `executeFormFill(pipelineEntry, config)` async function
  - Input: job posting URL and metadata from `data/pipeline.md`
  - Placeholder: will invoke `/career-ops apply` mode

- [ ] T017 [US2] Implement form orchestrator in `scripts/automation/form-orchestrator.mjs`:
  - Invoke existing `/career-ops apply` mode with job URL
  - Generate customized CV using `templates/cv-template.html` + `cv.md`
  - Pre-fill form fields with AI suggestions (cover letter, custom answers)
  - Return form state for user review (HTML or JSON representation)
  - **CRITICAL**: Write entry to `batch/tracker-additions/{num}-{company-slug}.tsv` per Constitution IV pipeline (TSV + merge-tracker.mjs)
  - Do NOT write directly to `data/applications.md`; merge-tracker.mjs will consolidate TSV entries
  - Set status field to `Draft` (canonical status from templates/states.yml)
  - Ensure NO auto-submit logic (user must explicitly trigger Submit)
  - See CLAUDE.md ethical rules: NEVER submit without user review

- [ ] T018 [US2] Create `scripts/automation/tests/form-orchestrator.test.mjs`:
  - Test: `executeFormFill()` returns pre-filled form without submitting
  - Test: Form contains user's CV and customized cover letter
  - Test: Screening question fields are populated with suggestions
  - Test: Draft saved to applications.md with correct status
  - Mock: `generate-pdf.mjs`, `/career-ops apply` mode

**Acceptance**:
- Forms pre-filled with AI suggestions
- User can review before submission
- No auto-submission (manual user trigger required)
- Drafts tracked in applications.md

---

## Phase 5: User Story 3 — Obsidian Session Logging

**Acceptance Criteria** (from spec.md US3):
- Sessions logged to Obsidian vault with timestamp, metadata, job details
- Sessions are queryable via Obsidian search
- Backlinks to reports in `reports/` directory

### Obsidian Session Logging

- [ ] T019 [US3] Create `scripts/automation/obsidian-logger.mjs` implementing:
  - Export `SessionLogger` class with `logSession(sessionData)` method
  - Input: `{ type: "scan"|"form-fill", status, duration, jobsFound, jobsAdded, scores, timestamp }`
  - Output: Write structured markdown to Obsidian vault at configured path
  - YAML frontmatter: date, type, status, metrics (per data-model.md)
  - Markdown table: company, role, score, link to report
  - Use backlinks syntax: `[[reports/001-company-date]]`
  - Handle missing vault gracefully (warn, don't crash)

- [ ] T020 [US3] Implement Obsidian path validation and file I/O in `obsidian-logger.mjs`:
  - Validate vault exists at `config.automation.notifications.obsidian.vault_path`
  - Create folder structure if missing (`Career-Ops/Sessions/`)
  - Generate daily session file: `{YYYY-MM-DD}.md` (multiple sessions per day append to same file)
  - Optional: append to daily digest file (configurable via `daily_digest` flag)
  - Handle file write errors (disk full, permission denied) gracefully

- [ ] T021 [US3] Create `scripts/automation/tests/obsidian-logger.test.mjs`:
  - Test: Session logged with correct frontmatter and metadata
  - Test: Multiple sessions on same day append to same file
  - Test: Backlinks formatted correctly for Obsidian syntax
  - Test: Missing vault handled gracefully (logged warning, no crash)
  - Mock: File system I/O

**Acceptance**:
- Session metadata logged to Obsidian vault
- Sessions are queryable via Obsidian plugins (Dataview, etc.)
- Backlinks to reports work
- Vault inaccessibility doesn't crash automation

---

## Phase 6: User Story 4 — Daily Status Updates (Notifications)

**Acceptance Criteria** (from spec.md US4):
- Updates delivered via console, Slack, Obsidian
- User can enable/disable channels in config
- Updates summarize: jobs found, forms filled, scores, next action

### Notification Pipeline

- [ ] T022 [US4] Create `scripts/automation/notifier.mjs` implementing:
  - Export `NotificationPipeline` class
  - Constructor: load notifier backends based on `config.automation.notifications`
  - Method: `async notify(message, { type, title, metadata })` — send to all enabled channels
  - Implement graceful degradation: one notifier failure doesn't crash others
  - Conform to contracts/notification-interface.md

- [ ] T023 [P] [US4] Create console notifier in `scripts/automation/notifiers/console-notifier.mjs`:
  - Always enabled (cannot disable)
  - Output to stdout with colored text (per log_level: debug|info|warn|error)
  - Format: timestamp, type emoji, title, message, metadata table
  - Implement ANSI color codes for terminal output

- [ ] T024 [P] [US4] Create Slack notifier in `scripts/automation/notifiers/slack-notifier.mjs`:
  - Validate webhook URL from config
  - Format message using Slack Block Kit (rich formatting)
  - Include metrics: duration, jobs found, recommended count, scores
  - Optional @mention on error (if configured)
  - Handle webhook failures gracefully (log warning, continue)
  - See research.md R3 for Slack patterns

- [ ] T025 [P] [US4] Create Obsidian notifier in `scripts/automation/notifiers/obsidian-notifier.mjs`:
  - Append summary to daily digest file in Obsidian vault
  - Format: markdown with key metrics (jobs found, forms filled, recommendations)
  - Link back to session log in `Career-Ops/Sessions/`
  - Handle missing vault gracefully (log warning, continue)

- [ ] T026 [US4] Create `scripts/automation/tests/notifier.test.mjs`:
  - Test: All enabled notifiers receive message
  - Test: Slack Block Kit formatting is valid JSON
  - Test: Console output is correctly colored
  - Test: Single notifier failure doesn't crash pipeline
  - Mock: Slack webhook, file I/O

**Acceptance**:
- Notifications delivered to all configured channels
- Console output always present
- Slack and Obsidian optional and configurable
- Failures don't crash automation

---

## Phase 7: User Story 5 — Full Orchestration & CLI Integration

**Acceptance Criteria** (from spec.md US5):
- Automation orchestrates existing CLI modes (scan, batch, apply)
- No new modes created; reuses existing ones
- All triggers via configured schedulers
- Session logs and notifications delivered

### Main Orchestration Layer

- [ ] T027 [US5] Create `scripts/automation/orchestrator.mjs` implementing:
  - Export `Orchestrator` class (main entry point)
  - Constructor: load scheduler, notifiers, orchestrators (scan, form, log)
  - Method: `async start()` — start all enabled scheduler backends
  - Method: `async stop()` — stop all backends gracefully
  - Method: `async executeAction(action, timeout)` — invoke action (scan|batch|form-fill)
  - Handle concurrent run prevention (skip cycle if one is running)
  - See plan.md for full orchestration flow: scan → batch → form-fill → notify

- [ ] T028 [US5] Implement full orchestration cycle in `orchestrator.mjs`:
  - Execution flow: `executeScan() → executeBatch() → executeFormFill() → executeNotify()`
  - Each step captures results and passes to next step
  - Session log created with all metrics
  - Notifications sent with summary
  - Error handling: log errors, continue with next steps, notify user of failures

- [ ] T029 [US5] Create action handlers in `scripts/automation/action-handlers/`:
  - `scripts/automation/action-handlers/scan-action.mjs` — wraps scan-orchestrator
  - `scripts/automation/action-handlers/batch-action.mjs` — wraps batch processor
  - `scripts/automation/action-handlers/form-fill-action.mjs` — wraps form orchestrator
  - Each handler: capture output, log metrics, return structured result

- [ ] T030 [US5] Create session manager in `scripts/automation/session-manager.mjs`:
  - Generate unique session IDs (UUID v4)
  - Store active session info in `config.automation.automation_state`
  - Track: `last_scan`, `last_batch`, `last_notify`, `active_session_id`
  - Prevent concurrent sessions (return error if one is running)
  - Update state after each action completes

- [ ] T031 [P] [US5] Create configuration validation utility in `scripts/automation/config-validator.mjs`:
  - Validate `automation` section in `config/profile.yml`
  - Check: at least one backend enabled
  - Check: all enabled backends have required fields (PAT for GitHub, webhook for Slack, etc.)
  - Check: timezone is valid IANA format
  - Check: schedule times are valid HH:MM format
  - Return: `{ valid: boolean, errors: [string] }`

- [ ] T032 [US5] Create CLI entry point `scripts/automation/cli.mjs`:
  - Commands: `start`, `stop`, `status`, `validate-config`, `run-once {action}`
  - Usage: `node scripts/automation/cli.mjs start` — start all backends
  - Usage: `node scripts/automation/cli.mjs run-once scan` — trigger scan manually
  - Usage: `node scripts/automation/cli.mjs status` — show backend statuses
  - Add to `package.json` scripts: `"automation:start"`, `"automation:stop"`, `"automation:status"`

- [ ] T033 [US5] Create `scripts/automation/tests/orchestrator.test.mjs`:
  - Test: Full cycle: scan → batch → notify
  - Test: Session tracking works (session IDs, timestamps)
  - Test: Concurrent run prevention (second call returns error if first is running)
  - Test: Error in one step doesn't crash others
  - Mock: all sub-orchestrators

**Acceptance**:
- All existing CLI modes (scan, batch, apply) called correctly
- Session metadata captured and logged
- Notifications delivered
- CLI commands work for start/stop/status/validate

---

## Phase 8: Polish, Testing & Documentation

### Integration Tests

- [ ] T034 Create `scripts/automation/tests/e2e.test.mjs` end-to-end test:
  - Setup: Create temporary test vault, config, pipeline
  - Flow: Start orchestrator → trigger scan → verify pipeline updated → trigger batch → verify reports created → check Obsidian logs → stop orchestrator
  - Verify: All artifacts created, metadata logged, no crashes
  - Cleanup: Remove test files
  - Run: `npm test -- --testPathPattern=e2e`

- [ ] T035 Create `scripts/automation/tests/integration.test.mjs`:
  - Test: Scheduler backends can be started/stopped without errors
  - Test: Config validation catches invalid configs
  - Test: Notifier pipeline gracefully handles failures
  - Test: Session logs created correctly with backlinks
  - Run: `npm test -- --testPathPattern=integration`

### Documentation

- [ ] T036 Create `scripts/automation/README.md` with:
  - Quick start guide
  - Configuration reference (all config.automation.* options)
  - Architecture overview (scheduler abstraction, notifiers, orchestrator)
  - CLI command reference
  - Troubleshooting guide (common issues, logs)

- [ ] T037 Update main `README.md` with:
  - Link to `scripts/automation/README.md`
  - Highlight Feature #001 status: Implementation phase
  - Add automation to feature list

### Optional: GitHub Actions Workflow

- [ ] T038 [P] Finalize `.github/workflows/auto-job-scan-apply.yml`:
  - Triggers: `schedule: - cron: '0 9,18 * * *'` (9 AM and 6 PM SGT → adjust for GitHub UTC)
  - Steps: 
    1. Checkout code
    2. Setup Node.js 18+
    3. Install dependencies
    4. Run `npm run automation:start`
    5. Wait for completion
    6. Commit and push results (optional; keep results local for security)
  - Concurrency key: prevent duplicate runs

### Error Handling & Logging

- [ ] T039 Create centralized logger in `scripts/automation/logger.mjs`:
  - Wrapper around console with timestamp, level, context
  - Write logs to `logs/automation/` directory (gitignored)
  - Format: JSON for parseable output, human-readable in console
  - Levels: debug, info, warn, error
  - Used by all modules

- [ ] T040 [P] Add error recovery in key modules:
  - Scheduler backends: exponential backoff on failure, auto-restart (if enabled)
  - Notifiers: retry logic for transient failures (HTTP 429, timeout)
  - File I/O: handle disk full, permission errors gracefully
  - API calls: timeout on slow responses, retry on 5xx errors

### Dependencies & Verification

- [ ] T041 Verify all dependencies installed and working:
  - `npm install` completes without errors
  - `node-schedule` imported successfully in tests
  - Playwright installed and functional
  - All test files run without import errors
  - Run: `npm run test` to confirm

- [ ] T042 Create verification checklist in `scripts/automation/VERIFICATION.md`:
  - 10-point checklist for post-implementation validation
  - Each item links to test case or manual step
  - Before automation goes live, user runs checklist

### Gap-Closure Tasks (Identified in Analysis)

- [ ] T043 [P] Create metrics/uptime dashboard in `scripts/automation/metrics.mjs`:
  - Purpose: Track SC-004 (99% uptime over 30 days)
  - Implement: CLI command `node scripts/automation/cli.mjs metrics` to report:
    - Last 30 days of session execution (dates, times, status)
    - Uptime percentage (successful / total sessions)
    - Error count and most recent errors
  - Store metrics in `config.automation.automation_state` (append-only log in `logs/automation/metrics.json`)
  - Output: JSON (programmatic) and formatted table (human-readable console)
  - Use case: User can verify automation is reliable before deploying

- [ ] T044 [P] Add prerequisite validation to orchestrator startup in `scripts/automation/orchestrator.mjs`:
  - Purpose: Implement CLAUDE.md onboarding pattern (never proceed without cv.md, config, portals)
  - Implement: Before `Orchestrator.start()`, call `validatePrerequisites()`
  - Check: `cv.md` exists and is readable, `config/profile.yml` exists with automation section, `portals.yml` exists
  - Return: `{ valid: boolean, missing: [string], suggestions: [string] }`
  - Behavior: If invalid, log helpful error and refuse to start; suggest onboarding steps
  - Test: Unit test for each missing file scenario

- [ ] T045 [P] Add health check execution after automation generates entries in `scripts/automation/health-check.mjs`:
  - Purpose: Implement Constitution IV requirement (verify-pipeline.mjs + doctor.mjs after writes)
  - Implement: After T028 completes successfully, call `runHealthChecks()`
  - Steps:
    1. Execute `node verify-pipeline.mjs` and capture exit code
    2. Execute `node doctor.mjs` and capture exit code
    3. Log results to `logs/automation/health-check.{date}.json`
    4. If either fails: log WARNING and include in notification to user
    5. If both pass: log INFO "Pipeline integrity verified"
  - Use case: Catch silent corruption of tracker (canonical statuses, duplicate entries, etc.)

**Acceptance** (Phase 8, including gap-closure):
- All tests passing (unit, integration, e2e)
- Documentation complete and accurate
- Error handling covers all known failure modes
- No external dependencies beyond plan.md
- Prerequisite validation prevents incomplete starts
- Health checks ensure pipeline integrity after automation runs
- Metrics dashboard available for uptime tracking (SC-004)
- Ready for user to enable in config and run

---

## Parallel Execution Examples

### Example 1: Fast Path (Minimal Config)
1. **Phase 1**: Setup (T001–T005) — 30 min
2. **Phase 2**: Scheduler abstraction + cron backend (T006–T009) — 1 hour
3. **Phase 7**: Orchestration (T027–T032) — 1 hour
4. **Phase 8**: Basic tests (T034) — 30 min
5. **Total**: ~3 hours
6. **Result**: User can run `npm run automation:start` with cron backend

### Example 2: Full Implementation (All Backends + Notifications)
1. **Phase 1**: Setup (T001–T005) — 30 min
2. **Phase 2**: All backends in parallel (T006–T007, then T009–T012 in parallel) — 1.5 hours
3. **Phases 3–6** in parallel: Scanning (T013–T015), Form Filling (T016–T018), Obsidian (T019–T021), Notifications (T022–T026) — 2 hours
4. **Phase 7**: Orchestration (T027–T032) — 1 hour
5. **Phase 8**: All tests (T034–T042) — 1 hour
6. **Total**: ~5 hours
7. **Result**: Full automation with all 4 backends and 3 notification channels

---

## Implementation Strategy

### MVP (Minimum Viable Product)
- **Scope**: Phase 1 + Phase 2 (cron only) + Phase 7 (core orchestrator) + basic tests
- **Time**: ~3 hours
- **User gets**: Daily scans at 9 AM and 6 PM SGT with console output
- **Can extend**: Add backends and notifiers incrementally after MVP

### Incremental Delivery
- Sprint 1: Phases 1–2 + cron backend
- Sprint 2: Add GitHub Actions and Node.js backends (Phase 2 continues)
- Sprint 3: Add Obsidian logging (Phase 5)
- Sprint 4: Add Slack and console notifiers (Phase 6)
- Sprint 5: Full E2E tests and documentation (Phase 8)

### Key Milestones
- **T032 Complete** = Orchestrator fully functional, can trigger via CLI
- **T034 Passing** = Full E2E flow works (scan → batch → notify → log)
- **T041 Passing** = All dependencies resolved, ready for production
- **T042 Complete** = User checklist available for deployment

---

## Success Criteria (Feature Level)

✅ **SC-001**: User can run `npm run automation:start` and system begins scanning at 9 AM and 6 PM SGT  
✅ **SC-002**: At least 2–5 new opportunities surface per day in `data/pipeline.md`  
✅ **SC-003**: User completes at least 1 application per day (tracked in `data/applications.md`)  
✅ **SC-004**: System delivers 99% uptime over 30 days (tracked via `last_scan` timestamp)  
✅ **SC-005**: Time per application reduced from 30+ min → <10 min with automation  
✅ **SC-006**: Session logs in Obsidian are useful for reflection and pattern discovery  
✅ **SC-007**: 100% of applications include customized CV and cover letter  

---

## Task Summary

| Phase | Count | Tasks | Status |
|-------|-------|-------|--------|
| 1: Setup | 5 | T001–T005 | ⏳ Not started |
| 2: Foundations | 7 | T006–T012 | ⏳ Not started |
| 3: US1 Scanning | 3 | T013–T015 | ⏳ Not started |
| 4: US2 Form Filling | 3 | T016–T018 | ⏳ Not started |
| 5: US3 Obsidian | 3 | T019–T021 | ⏳ Not started |
| 6: US4 Notifications | 5 | T022–T026 | ⏳ Not started |
| 7: US5 Orchestration | 7 | T027–T033 | ⏳ Not started |
| 8: Polish & Tests | 12 | T034–T045 | ⏳ Not started |
| **TOTAL** | **45** | **T001–T045** | ⏳ |

---

## Notes for Implementation

### Important Constraints
- **Human-in-the-loop**: NEVER auto-submit forms. Stop at review stage.
- **Graceful degradation**: Failure of one backend/notifier shouldn't crash others.
- **Configuration-driven**: All behavior controlled via `config/profile.yml`; no hardcoded paths or credentials.
- **Reuse existing modes**: Use `scan.mjs`, batch evaluation, `/career-ops apply` CLI modes; don't duplicate logic.
- **Data integrity**: New entries to `data/applications.md` must go through TSV merge (not direct edits); use canonical statuses from `templates/states.yml`.
- **Local-first**: No external services; all data stays on user's machine or Obsidian vault.

### Testing Strategy
- **Unit tests**: Each module tested independently (scheduler, notifier, orchestrator)
- **Integration tests**: Backends work together (scheduler + orchestrator + notifier)
- **E2E tests**: Full cycle from trigger to Obsidian log
- **All tests mock external dependencies** (Slack, file I/O, GitHub API)

### Code Quality
- ESLint with career-ops style guide
- Consistent error messages with context (action, file, reason)
- All async functions have timeout handling
- All user-facing strings have descriptive logging

---

**Next Action**: Proceed to implementation per phase order or parallel execution strategy. Track progress by marking tasks completed.

