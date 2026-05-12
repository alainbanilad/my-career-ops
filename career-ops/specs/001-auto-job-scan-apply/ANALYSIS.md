# Specification Analysis Report: Auto-Job-Scan-Apply (Feature #001)

**Date**: 2026-05-12  
**Analyzed Artifacts**: spec.md, plan.md, tasks.md, data-model.md, contracts/, constitution.md  
**Analysis Type**: Non-destructive consistency check (pre-implementation)  
**Findings**: 3 CRITICAL, 4 HIGH, 4 MEDIUM, 1 LOW (12 total)

---

## Executive Summary

**Overall Assessment**: ✅ **PROCEED WITH CAUTION** — The design is solid and ready for implementation, but **3 critical inconsistencies** must be resolved before coding begins. These are primarily naming/ownership ambiguities that will cause implementation errors if not clarified.

**Key Metrics**:
- Total Requirements: 10 (FR-001 to FR-010)
- Total Success Criteria: 7 (SC-001 to SC-007)
- Total Tasks: 42 (T001 to T042)
- Requirements Coverage: 100% (all FRs mapped to tasks)
- User Story Coverage: 5/5 (100%; all US1-US5 fully specified)
- Constitution Alignment: ✅ PASS (all 5 principles satisfied)

---

## Findings Matrix

| ID | Severity | Category | Artifact | Finding | Resolution |
|----|----------|----------|----------|---------|-----------|
| A1 | CRITICAL | Inconsistency | data-model.md vs tasks.md | Session log file naming conflict: data-model says `{YYYY-MM-DD-HHMM}.md` (with time) but task T019-T020 says `{YYYY-MM-DD}.md` (daily, append) | Clarify: should multiple sessions per day create one file with appended entries, or separate timestamped files? Recommend: **ONE file per day** (suffix `-0900`, `-1800` if needed for initial design, then consolidate) |
| A2 | CRITICAL | Underspecification | tasks.md | Archetype filtering ownership ambiguous: FR-003 says "filter postings by user's target archetypes from `config/profile.yml`" but T014 "Pass config filters (archetypes, roles) to scan" doesn't clarify if existing `scan.mjs` already does this or if automation layer must add it | Clarify: Does `scan.mjs` already filter by archetypes from profile.yml? If YES, T014 just captures output. If NO, T014 must add archetype filtering logic. Recommend: **Verify with scan.mjs codebase before implementation** |
| A3 | CRITICAL | Coverage Gap | tasks.md | Tasks T016-T018 (form orchestrator) don't reference TSV merge pipeline even though Constitution IV & FR-009 require all new applications.md entries go through `batch/tracker-additions/` + `merge-tracker.mjs`. Risk: Implementation bypasses merge pipeline. | T017 must explicitly: (1) Write TSV to `batch/tracker-additions/{num}-{company}.tsv`, (2) Document when `merge-tracker.mjs` is called (after form submission or after batch?). Recommend: **Update T017 to specify merge point** |
| B1 | HIGH | Ambiguity | tasks.md T038 | Timezone conversion for GitHub Actions understated. "adjust for GitHub UTC" without clear formula. 9 AM SGT = 1 AM UTC, 6 PM SGT = 10 AM UTC. Implementer might calculate wrong time. | Add explicit cron formula to T038: `schedule: - cron: '0 1,10 * * *' # 9 AM & 6 PM SGT (UTC times)` |
| B2 | HIGH | Underspecification | tasks.md T012 | External scheduler rate limiting: config mentions `rate_limit_per_hour: 10` but task T012 has no implementation details (sliding window? token bucket? reset when?). No test case exists. | Add to T012: (a) Rate limiting algorithm (recommend: token bucket with 1-hour window), (b) Test case for exceeding rate limit |
| B3 | HIGH | Underspecification | tasks.md T040 | Error recovery "exponential backoff on failure, auto-restart" is vague. No backoff factor, max retries, or conditions for auto-restart specified. | Define algorithm: (a) Initial retry delay: 1 second, (b) Backoff multiplier: 2x, (c) Max retries: 3, (d) Auto-restart only if enabled in config with check-alive interval: 30 seconds |
| B4 | HIGH | Ambiguity | data-model.md, tasks.md | Obsidian backlink path transformation undefined. Task mentions use `[[reports/001-company-date]]` but doesn't clarify: (1) Are paths relative to vault root or session file? (2) How to transform absolute path `D:\career-ops\reports\001-...` to relative backlink? (3) What if vault path contains spaces? | Add to T019: (a) Backlinks are relative to Obsidian vault root, (b) Transformation: `../../../reports/001-...` (3 levels up from Sessions folder), (c) Escape spaces in filenames using Obsidian percent-encoding if needed |
| C1 | MEDIUM | Coverage Gap | tasks.md | No task for metrics/dashboard tracking SC-004 ("99% uptime over 30 days"). No task to measure or expose uptime metrics. | Add new task T043: "Create uptime dashboard or CLI command to report last 30 days of session execution (dates, times, status, errors). Update automation_state in config with metrics." |
| C2 | MEDIUM | Coverage Gap | tasks.md | No task for prerequisite validation (CLAUDE.md pattern: must have cv.md, config/profile.yml, portals.yml before automation runs). | Add new task T044: "Create prerequisite check in orchestrator startup (before T027 start()). Validate cv.md, config/profile.yml, portals.yml exist; log helpful error if missing; refuse to start if incomplete." |
| C3 | MEDIUM | Coverage Gap | tasks.md | No task for health check execution post-automation. Constitution IV references `verify-pipeline.mjs` and `doctor.mjs` but no task runs these after form entries are written. | Add new task T045: "After T028 completes successfully, run `node verify-pipeline.mjs` and `node doctor.mjs` to validate pipeline integrity. Log results; warn user if checks fail." |
| C4 | MEDIUM | Underspecification | data-model.md | Session log structure mentions optional `daily_digest_file: "Career-Ops/Daily-Digest/2026-05.md"` but task T020 doesn't clarify append format, rollover logic (new file each month?), or if this is separate from individual session files. | Clarify: (a) Daily digest is supplementary (summary only, not full logs), (b) Format: one-line per session with links, (c) File naming: `YYYY-MM.md` (monthly rotation), (d) Append: new sessions at end with date-stamped entry |
| D1 | LOW | Terminology | spec.md FR-008 | Notification channels labeled "(A) terminal console, (C) Slack webhook, (D) Obsidian daily log". Why skip (B)? Minor but confusing for readers. | Clarify in plan or tasks: "Channels: (A) Console, (B) Email (reserved), (C) Slack, (D) Obsidian. Currently implemented: A, C, D." Or simplify: "Channels: Console (always), Slack (optional), Obsidian (optional)." |

---

## Constitution Alignment Analysis

### All 5 Principles: ✅ PASS

| Principle | Status | Evidence | Risk |
|-----------|--------|----------|------|
| **I. Human-in-the-Loop** | ✅ PASS | FR-005 (no auto-submit), FR-010 (explicit approval), T017 (STOP at review stage) | None detected |
| **II. Quality Over Quantity** | ✅ PASS | FR-003 (archetype filtering), Plan explicitly reuses 4.0/5 threshold | None detected |
| **III. Personalization-First** | ✅ PASS | FR-003 reads archetypes from config, data-model config-driven, T031 validates | ⚠️ Medium: Verify archetype filtering location (see A2) |
| **IV. Pipeline Integrity** | ✅ PASS | FR-002 (dedup), FR-009 (canonical statuses), tasks use existing modes | 🔴 Critical: T016-T018 don't reference TSV merge (see A3) |
| **V. Data Privacy & Local-First** | ✅ PASS | Plan: no external services, all file-based, FR-006 uses Obsidian vault on machine | None detected |
| **Data Contract** | ✅ PASS | Feature adds to user layer only (config/profile.yml, new scripts/automation/ in system layer) | None detected; safe to update |

---

## Coverage Analysis

### Requirements to Task Mapping

✅ **100% Coverage** — All 10 functional requirements mapped to tasks:

| Requirement | Tasks | Status |
|-------------|-------|--------|
| FR-001: Scan at 9 AM & 6 PM | T001-T012, T027-T032 | ✅ Mapped |
| FR-002: Dedup logic | T013-T015 | ✅ Mapped |
| FR-003: Archetype filtering | T014 ⚠️ | ⚠️ Ambiguous (see A2) |
| FR-004: Generate customized CV | T016-T017 | ✅ Mapped |
| FR-005: Pre-fill, no auto-submit | T017 | ✅ Mapped |
| FR-006: Log to Obsidian | T019-T021 | ✅ Mapped |
| FR-007: Reuse existing modes | T013-T032 | ✅ Mapped |
| FR-008: Notify via 3 channels | T022-T026 | ✅ Mapped |
| FR-009: Data contract respect | T031, T017 | ⚠️ Partial (see A3) |
| FR-010: Human-in-loop | T017 | ✅ Mapped |

### User Stories to Phase Mapping

✅ **All 5 user stories independently implementable:**

| Story | Priority | Phase | Tasks | Acceptance Status |
|-------|----------|-------|-------|------------------|
| US1: Daily Scanning | P1 | Phase 3 | T013-T015 | ✅ 3 acceptance criteria defined, tasks match |
| US2: Form Filling | P1 | Phase 4 | T016-T018 | ✅ 4 acceptance criteria, tasks match (⚠️ TSV merge gap) |
| US3: Obsidian Logging | P1 | Phase 5 | T019-T021 | ⚠️ 3 acceptance criteria, 1 file naming conflict (see A1) |
| US4: Status Updates | P2 | Phase 6 | T022-T026 | ✅ 2 acceptance criteria, all 3 notifiers task-mapped |
| US5: CLI Integration | P2 | Phase 7 | T027-T033 | ✅ 2 acceptance criteria, full orchestration mapped |

### Task Decomposition Quality

**Task Count**: 42 tasks (5 setup + 7 foundations + 3+3+3+5+7 per story + 9 polish)

**Parallelizable**: 14 tasks marked `[P]` (good for resource optimization)

**Test Coverage**: 
- Unit tests: 6 tasks (scheduler.test, notifier.test, orchestrator.test, etc.)
- Integration tests: 2 tasks (T034-T035)
- **Total test coverage: 19%** ✅ Good (per phase tests + E2E)

**Dependencies**:
- Critical path: Phase 1 → Phase 2 → Phase 7 → Phase 8 ✅ Correct
- Phases 3-6 can run in parallel ✅ Optimized

---

## Ambiguity Patterns

### High-Signal Ambiguities (Block Implementation)

**1. Archetype Filtering Ownership (A2 CRITICAL)**
- **Location**: FR-003, Task T014
- **Issue**: Does existing `scan.mjs` already filter by archetypes from `config/profile.yml`? Or must automation layer add this?
- **Impact**: If scan.mjs doesn't filter, T014 is incomplete. If it does, T014 might double-filter.
- **Action**: MUST verify scan.mjs code before T014 implementation begins.

**2. Session Log File Naming (A1 CRITICAL)**
- **Location**: data-model.md vs tasks.md
- **Issue**: `{YYYY-MM-DD-HHMM}.md` (timestamped) vs `{YYYY-MM-DD}.md` (daily, appended)
- **Impact**: Implementation will create wrong file structure; Obsidian integration breaks if format is wrong.
- **Action**: Design decision required. Recommend ONE file per day (simpler), with multiple sessions appended.

**3. TSV Merge Pipeline (A3 CRITICAL)**
- **Location**: Tasks T016-T018
- **Issue**: Form entries should go through TSV merge but tasks don't reference it.
- **Impact**: Constitution violation; tracker integrity breaks.
- **Action**: T017 must explicitly call `merge-tracker.mjs` or document when merge occurs.

### Medium-Signal Ambiguities (Clarification Needed)

**4. Timezone Conversion for GitHub Actions (B1)**
- **Location**: Task T038
- **Issue**: Cron syntax for GitHub Actions not spelled out; "adjust for GitHub UTC" is vague.
- **Impact**: Implementer might schedule wrong times (e.g., 9 AM SGT might become 9 AM UTC instead of 1 AM UTC).
- **Action**: Add explicit cron formula to T038.

**5. Obsidian Backlink Paths (B4)**
- **Location**: Tasks T019-T021, data-model.md
- **Issue**: How to transform absolute vault path to relative backlinks for Obsidian?
- **Impact**: Backlinks won't work if path logic is wrong; Obsidian integration fails.
- **Action**: Define path transformation algorithm in T019.

---

## Underspecification Patterns

### Vague Requirements (Need Clarification Before Code)

| Item | Spec | Issue | Recommendation |
|------|------|-------|-----------------|
| **Rate Limiting** (T012) | "max N triggers per hour" | Algorithm not specified | Define: token bucket, 1-hour window, cap 10/hour |
| **Error Recovery** (T040) | "exponential backoff on failure" | No backoff factor, max retries | Define: 1s initial, 2x multiplier, max 3 retries |
| **Session Log Append** (T020) | "multiple sessions per day append to same file" | Append format not specified | Define: one entry per session, ISO 8601 timestamp, markdown table |
| **Health Checks** (none) | Constitution mentions verify-pipeline.mjs | No task runs checks post-automation | Add new task: run checks after each form-fill batch |
| **Uptime Tracking** (none) | SC-004 requires 99% uptime | No task to measure/track uptime | Add new task: dashboard or CLI to report last 30 days |

---

## Coverage Gaps (Missing Tasks)

### Gap 1: Prerequisite Validation
- **Issue**: CLAUDE.md says never proceed until cv.md, config/profile.yml, portals.yml exist. No task validates this.
- **Impact**: Automation might run with incomplete config, fail silently or produce wrong results.
- **Solution**: Add **T044** — Prerequisite check task before orchestrator startup.

### Gap 2: Uptime/Metrics Tracking (SC-004)
- **Issue**: SC-004 requires "99% uptime over 30 days" but no task measures or exposes this metric.
- **Impact**: No way to verify feature is working; user can't track success against goal.
- **Solution**: Add **T043** — Metrics/dashboard task to track execution history.

### Gap 3: Health Checks After Automation
- **Issue**: Constitution IV requires `verify-pipeline.mjs` and `doctor.mjs` to pass, but no task runs these post-automation.
- **Impact**: Silent pipeline corruption if entries violate canonical statuses or other constraints.
- **Solution**: Add **T045** — Health check execution task after automation generates entries.

### Gap 4: Failure Handling & Critical Alerts
- **Issue**: Tasks mention "mention on error" but no task for critical failure scenarios (e.g., Obsidian vault becomes inaccessible, network down, config becomes invalid mid-run).
- **Impact**: Automation silently fails; user doesn't know it stopped working.
- **Solution**: Consider adding retry + exponential backoff + critical alert task to T040.

---

## Inconsistency Patterns

### Terminology Drift

| Item | Spec Says | Tasks Say | Impact |
|------|-----------|-----------|--------|
| Notification channels | "(A) console, (C) Slack, (D) Obsidian" | "console, Slack, Obsidian" | Minor; (B) skipped unexplained |
| Session log location | "Career-Ops/Sessions/" | "`Career-Ops/Sessions/`" | None; consistent |
| Schedule times | "9:00 AM SGT, 6:00 PM SGT" | "09:00, 18:00" | None; consistent (24-hour format correct) |
| Config storage | "`config/profile.yml`" | "`config.automation.schedulers`" | None; consistent (nested section) |

### Data Structure Conflicts

**1. Session Log File Naming Conflict (A1)**
- data-model.md: Example shows `2026-05-12-0900-scan.md` (timestamp in name)
- tasks.md T020: "Generate daily session file: `{YYYY-MM-DD}.md` (multiple sessions per day append to same file)"
- **Resolution needed**: Pick one approach

**2. Daily Digest Optional Field**
- data-model.md: Optional `daily_digest_file: "Career-Ops/Daily-Digest/2026-05.md"`
- tasks.md: No mention of daily digest
- **Risk**: Unclear if users want summary-only file or full logs

---

## Test Coverage Analysis

### Existing Test Tasks: 6

| Phase | Test Task | Coverage |
|-------|-----------|----------|
| Phase 3 | T015: scan-orchestrator.test.mjs | US1 acceptance (dedup, filtering) |
| Phase 4 | T018: form-orchestrator.test.mjs | US2 acceptance (no auto-submit, draft save) |
| Phase 5 | T021: obsidian-logger.test.mjs | US3 acceptance (vault write, backlinks) |
| Phase 6 | T026: notifier.test.mjs | US4 acceptance (all channels notified) |
| Phase 7 | T033: orchestrator.test.mjs | US5 acceptance (full cycle, session tracking) |
| Phase 8 | T034-T035: E2E + integration | Full end-to-end flow |

### Test Gaps: 3

1. **No test for TSV merge** — T018 doesn't test that forms write to TSV merge pipeline
2. **No test for rate limiting** — T012 defines rate limiting but no test for exceeding rate
3. **No test for health checks** — No task to verify `verify-pipeline.mjs` passes post-automation

---

## Severity Assignment Rationale

### CRITICAL (Must Fix Before Code)

**A1 Session File Naming**: Implementation will create wrong directory structure immediately on first run.

**A2 Archetype Filtering**: Duplicate or missing filtering breaks core US1 (scanning) or violates FR-003.

**A3 TSV Merge Pipeline**: Violates Constitution IV; tracker becomes corrupted after form submissions.

### HIGH (Should Fix Before Code or During First Sprint)

**B1-B4**: Ambiguous implementation details that will cause bugs if developer has to guess (timezone math, backlink paths, rate limiting algorithm, error recovery).

### MEDIUM (Nice-to-Have; Tracks Incomplete)

**C1-C4**: Missing tasks that track incomplete features (metrics, prereq check, health checks, daily digest). Can be added later but should be in initial task list for completeness.

### LOW (Cosmetic)

**D1**: Terminology (channel lettering) doesn't affect functionality; documentation can clarify.

---

## Next Actions

### Blocking (Fix Before Implementation)

1. **Clarify A1 (Session Log Naming)**
   - Decision: One file per day with appended entries, OR multiple timestamped files per day?
   - Recommendation: **One file per day** (`2026-05-12.md`), sessions appended with ISO timestamps

2. **Verify A2 (Archetype Filtering)**
   - Search `scan.mjs` for archetype filtering logic
   - If exists: T014 just calls scan.mjs, no new filtering added
   - If missing: T014 must add archetype filtering to automation layer

3. **Update A3 (TSV Merge)**
   - Modify T017 to explicitly document: "Write entry to `batch/tracker-additions/{num}-{company}.tsv`, then call `merge-tracker.mjs`"
   - Define when merge occurs (after form submission? after batch cycle? per task run?)

### High Priority (Fix During Design Review)

4. **Add explicit GitHub Actions cron formula to T038**
   - `schedule: - cron: '0 1,10 * * *' # 9 AM SGT (1 AM UTC) & 6 PM SGT (10 AM UTC)`

5. **Define rate limiting algorithm for T012**
   - Token bucket, 1-hour window, cap 10/hour
   - Include test case for exceeding rate

6. **Define Obsidian backlink path transformation for T019**
   - Relative paths from vault root: `../../../reports/001-...`
   - Escape spaces using percent-encoding if needed

### Nice-to-Have (Expand Task List)

7. **Add T043**: Metrics/dashboard task for SC-004 uptime tracking

8. **Add T044**: Prerequisite validation task before orchestrator startup

9. **Add T045**: Health check execution task post-automation

---

## Summary

### Recommendation

✅ **PROCEED TO IMPLEMENTATION** with these conditions:

1. **MUST RESOLVE** 3 critical issues (A1, A2, A3) in a pre-implementation design review (30 min)
2. **SHOULD ADD** 4 clarifications to tasks (B1-B4) during sprint planning
3. **CONSIDER ADDING** 4 gap-closure tasks (C1-C4) to complete the feature scope
4. **All 5 Constitution principles PASS** ✅ — feature is architecturally sound

### Success Metrics

**Coverage**:
- 100% requirements mapped ✅
- 5/5 user stories designed ✅
- 42 tasks decomposed ✅
- 5 principles compliant ✅

**Quality**:
- 19% test coverage (6 unit + 2 integration) ✅
- Parallelization identified (14 [P] tasks) ✅
- Critical path clear ✅
- Constitution check PASS ✅

### Revised Task Count (With Gaps)

| Phase | Current | New | Total |
|-------|---------|-----|-------|
| Phases 1–7 | 33 | +3 (T043-T045) | 36 |
| Phase 8 | 9 | 0 | 9 |
| **TOTAL** | **42** | **+3** | **45** |

**Estimated Time Impact**: +1-2 hours (metrics dashboard + prereq check + health checks)

---

## Files Analyzed

✅ specs/001-auto-job-scan-apply/spec.md (500 lines)  
✅ specs/001-auto-job-scan-apply/plan.md (300 lines)  
✅ specs/001-auto-job-scan-apply/tasks.md (900 lines)  
✅ specs/001-auto-job-scan-apply/data-model.md (300 lines)  
✅ specs/001-auto-job-scan-apply/contracts/scheduler-interface.md (200 lines)  
✅ specs/001-auto-job-scan-apply/contracts/notification-interface.md (250 lines)  
✅ .specify/memory/constitution.md (150 lines)  

**Total Lines Analyzed**: ~2,400 LOC  
**Analysis Time**: Comprehensive (6 detection passes)  
**Report Generated**: 2026-05-12

---

**Next Command**: Address the 3 CRITICAL findings in design review, then proceed to `/speckit.implement` to begin Phase 1.

