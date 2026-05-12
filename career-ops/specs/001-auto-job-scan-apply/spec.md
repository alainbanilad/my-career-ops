# Feature Specification: Auto-Job-Scan-Apply

**Feature Branch**: `001-auto-job-scan-apply`  
**Created**: 2026-05-12  
**Status**: Draft  
**Input**: User description: "I want to utilize the capabilities of career-ops and use it to land my next job asap since I'm still job free right now. I want also to utilize AI 2nd brain using claude-obsidian based on this repo to save every session using career-ops so that any CLI session or any, is saved in my AI 2nd brain. I want to automate the career-ops skills in scanning open jobs and filling up forms for me on a daily basis (9AM & 6PM) and keep me updated along the way."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Daily Automated Job Scanning (Priority: P1)

**Description**: The system scans configured job portals (Greenhouse, Ashby, Lever, Wellfound, etc.) at scheduled times (9AM and 6PM Singapore Time) and captures new job postings matching the user's target roles. New opportunities are added to the career-ops pipeline for evaluation.

**Why this priority**: This is the core value — automated discovery of opportunities. Without scanning, the user must manually find and paste URLs, defeating the purpose of daily automation.

**Independent Test**: Run the scan once manually at a scheduled time; verify new postings appear in `data/pipeline.md` with appropriate metadata (URL, source, timestamp).

**Acceptance Scenarios**:

1. **Given** it is 9:00 AM SGT, **When** the scheduled scan executes, **Then** all configured portals are queried and new postings are added to `data/pipeline.md` with dedup history recorded in `data/scan-history.tsv`
2. **Given** a new posting already exists in scan-history, **When** the scan runs, **Then** it is not added to pipeline a second time
3. **Given** the user has 5 target archetypes configured, **When** the scan completes, **Then** only postings matching at least one archetype are added to pipeline

---

### User Story 2 - AI-Assisted Form Filling with Human Review (Priority: P1)

**Description**: For each new opportunity in the pipeline, the system generates a pre-filled application form with AI-suggested answers (cover letter, CV customization, answers to screening questions). The user reviews the form, makes edits, and approves before submission — maintaining the human-in-the-loop principle.

**Why this priority**: Reduces friction and time per application. Form filling is the most time-consuming manual step; automation here unlocks scale for quality applications.

**Independent Test**: Given a job posting in pipeline, the system generates a filled form with suggestions; user can review and edit all fields before seeing a "Ready to Submit" prompt.

**Acceptance Scenarios**:

1. **Given** a new posting is in pipeline, **When** user triggers form-fill mode, **Then** system generates a customized CV (ATS-optimized) and pre-fills all form fields with AI suggestions
2. **Given** a form is generated, **When** user edits any field, **Then** changes are preserved and reflected in the review preview
3. **Given** a form is complete and reviewed, **When** user approves, **Then** system shows a "Ready to Submit" prompt and STOPS — it does NOT auto-submit
4. **Given** user cancels editing, **When** they exit, **Then** all work is saved to a draft in `data/applications.md` with status `Draft`

---

### User Story 3 - Obsidian Session Logging (Priority: P1)

**Description**: After each scan or form-fill session, the system logs session metadata (timestamp, jobs found, forms filled, scores, recommendations) to the user's Obsidian vault (claude-obsidian at `D:\AI_BRAIN\Claude-Obsidian\claude-obsidian`). Sessions become searchable, queryable entries in the user's second brain.

**Why this priority**: The user explicitly requests integration with their second brain. This makes career ops part of their knowledge management system and enables pattern discovery over time (e.g., "what types of roles do I actually apply to?" vs. "what do I evaluate?").

**Independent Test**: After a scan or form-fill, a new markdown file is created in the Obsidian vault with session metadata; the entry is queryable via Obsidian search.

**Acceptance Scenarios**:

1. **Given** a scan session completes at 9 AM, **When** the session ends, **Then** a new file is created in Obsidian vault with timestamp, summary, jobs found, and evaluation scores
2. **Given** a form-fill session completes, **When** the session ends, **Then** a session log is appended to Obsidian with job title, company, status, and user notes
3. **Given** sessions are logged over time, **When** user searches Obsidian for "Binance", **Then** all career-ops sessions mentioning Binance appear with links back to full reports in `reports/`

---

### User Story 4 - Daily Status Updates (Priority: P2)

**Description**: At the end of each scheduled scan/form-fill cycle (after 9 AM and 6 PM sessions), the system sends a brief summary update to the user via three channels: terminal console output, Slack webhook, and Obsidian daily log. User can enable/disable any channel in `config/profile.yml`.

**Why this priority**: Keeps the user informed and maintains accountability. Without feedback, automation feels opaque.

**Independent Test**: After a scheduled session completes, an update is delivered (via configured channel) summarizing: jobs found, forms filled, scores, and next action items.

**Acceptance Scenarios**:

1. **Given** a 9 AM scan completes, **When** 9:15 AM arrives, **Then** an update is delivered with: "Found 3 new roles. 1 scored 4.5/5 (recommended). 2 scored 3.0/5 (not recommended). Next scan at 6 PM."
2. **Given** a 6 PM form-fill completes, **When** 6:20 PM arrives, **Then** an update is delivered with: "Filled 2 forms (ready for your review). Logged 2 sessions to Obsidian. View forms at [link to output/]"

---

### User Story 5 - Integration with Career-Ops CLI Modes (Priority: P2)

**Description**: The automation reuses existing career-ops modes (`/career-ops scan`, `/career-ops batch`, `/career-ops apply`) via the CLI. It does not create new modes, but orchestrates the existing ones on a schedule.

**Why this priority**: Maintains consistency with the existing system and avoids code duplication. All logic lives in the modes; automation just triggers them at the right times.

**Independent Test**: Verify that `node scan.mjs`, `node batch-runner.sh`, and `/career-ops apply` are invoked correctly during scheduled sessions; all output is captured and logged.

**Acceptance Scenarios**:

1. **Given** the 9 AM trigger fires, **When** the system runs `npm run scan`, **Then** the scan mode executes and writes results to `data/pipeline.md`
2. **Given** the 6 PM trigger fires, **When** the system runs the batch processor, **Then** all pending URLs in pipeline are evaluated and reports are written to `reports/`

---

### Edge Cases

- What happens if a scheduled time is missed (e.g., user's machine is off)? System SHOULD catch up on next boot; old timestamps should not prevent scanning.
- What happens if the Obsidian vault is offline or inaccessible? System MUST log a warning and queue the session locally; retry on next cycle.
- What happens if a form-fill session encounters an error (e.g., job posting is no longer active)? System MUST mark the URL as invalid, log it in `data/scan-history.tsv`, and continue with the next posting.
- What if the user is manually running `/career-ops` commands during a scheduled session? Automation SHOULD detect this and skip the scheduled cycle to avoid conflicts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST scan configured portals on two daily triggers (9:00 AM and 6:00 PM SGT).
- **FR-002**: System MUST add new postings to `data/pipeline.md` with dedup logic (check `data/scan-history.tsv` to prevent re-queuing).
- **FR-003**: System MUST filter postings by user's target archetypes and role levels from `config/profile.yml`.
- **FR-004**: System MUST generate customized, ATS-optimized CVs for each new posting using `templates/cv-template.html` and user's `cv.md`.
- **FR-005**: System MUST pre-fill application forms with AI-suggested answers (cover letter, custom fields) but MUST NOT submit forms without explicit user approval.
- **FR-006**: System MUST log all session metadata (timestamp, jobs found, forms filled, scores, user actions) to the Obsidian vault at `D:\AI_BRAIN\Claude-Obsidian\claude-obsidian`.
- **FR-007**: System MUST use the existing `node scan.mjs`, batch evaluation prompts (`batch/batch-prompt.md`), and `/career-ops apply` mode without duplicating logic.
- **FR-008**: System MUST deliver a daily summary update after each scheduled cycle (9 AM and 6 PM) via three channels: (A) terminal console, (C) Slack webhook, (D) Obsidian daily log. User can enable/disable channels in `config/profile.yml`.
- **FR-009**: System MUST respect the career-ops data contract: user data stays local; all new entries use canonical statuses from `templates/states.yml`.
- **FR-010**: System MUST maintain human-in-the-loop principle: no applications are submitted, no messages sent, no forms accepted without user review and explicit approval.

### Key Entities

- **Scheduled Trigger**: Time-based event (9:00 AM SGT, 6:00 PM SGT) that initiates a scan or form-fill cycle. Can be triggered via system scheduler (cron/Task Scheduler), GitHub Actions, Node.js scheduler, or user-provided external trigger.
- **Pipeline Entry**: A job posting URL added to `data/pipeline.md` with metadata (source, date_found, archetype, score).
- **Session Log**: Metadata record in Obsidian vault capturing one automation cycle: timestamp, action (scan/form-fill), summary, links to reports.
- **Form Draft**: A partially or fully filled application form with AI suggestions, user edits, and status (draft/ready/submitted).
- **Update Notification**: A summary message delivered after each cycle with key metrics (jobs found, forms filled, recommendations).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: User lands a job within 60 days of activating this automation (outcome metric).
- **SC-002**: Automation discovers and surfaces at least 2–5 new relevant opportunities per day (volume metric: `data/pipeline.md` growth).
- **SC-003**: User completes at least 1 application per day with AI assistance (quality metric: `data/applications.md` status changes from Draft → Applied).
- **SC-004**: System delivers both 9 AM and 6 PM cycles with 99% uptime over 30 days (reliability metric).
- **SC-005**: Time per application (from discovery to form submission) is reduced by 70% compared to manual workflow (efficiency metric: <10 minutes per application vs. baseline 30+ minutes).
- **SC-006**: User rates Obsidian integration as "useful for memory" in post-30-day survey (qualitative metric).
- **SC-007**: 100% of applications submitted via automation include customized CV and cover letter (quality metric).

## Assumptions

- **Automation Host**: User can choose one or more scheduling backends: (A) local system scheduler (requires machine on), (B) GitHub Actions (cloud-based, machine can be off), (C) Node.js daemon (requires process alive), or (D) user-provided external trigger. At least one backend must be active.
- **Scheduling Mechanism**: System supports all four backends (system cron/Task Scheduler, GitHub Actions, Node.js scheduler, user-provided). Configuration stored in `config/profile.yml` under `automation.schedulers` with per-backend settings (enabled, timezone, API keys for GitHub/Slack).
- **Obsidian Vault Accessibility**: The Obsidian vault at `D:\AI_BRAIN\Claude-Obsidian\claude-obsidian` is always accessible on the user's machine and writable by the automation process.
- **Existing Setup**: Career-ops is fully configured with `cv.md`, `config/profile.yml`, `modes/_profile.md`, and `portals.yml` before automation is activated.
- **AI Model Context**: Claude (or configured AI provider) has read access to `cv.md`, `config/profile.yml`, and user's narrative for personalization at runtime.
- **No External Dependencies**: Automation does not require a hosted service; all logic runs locally.
- **User Availability**: User can review and approve forms within 24 hours of them being filled (otherwise stale applications accumulate).
- **Notification Format**: System sends summary updates via three channels: (A) terminal console (always), (C) Slack webhook (if configured), (D) Obsidian daily log (if configured). User can enable/disable Slack and Obsidian channels independently in `config/profile.yml` under `automation.notifications`.
- **Network Connectivity**: System assumes stable internet for scanning portals and uploading session logs to Obsidian.

---

**Template version**: 1.0 | **Specification status**: Ready for clarification → planning