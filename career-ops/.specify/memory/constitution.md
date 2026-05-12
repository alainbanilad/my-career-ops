<!--
## Sync Impact Report

- **Version change**: (none) → 1.0.0 (initial ratification)
- **Modified principles**: N/A (initial document)
- **Added sections**: Core Principles (I–V), Data Contract & File Boundaries, Workflow & Quality Gates, Governance
- **Removed sections**: N/A
- **Templates requiring updates**:
  - `.specify/templates/plan-template.md` ✅ — Constitution Check gates aligned below
  - `.specify/templates/spec-template.md` ✅ — No mandatory new sections required
  - `.specify/templates/tasks-template.md` ✅ — Task types reflect pipeline integrity work
- **Deferred TODOs**: none
-->

# Career-Ops Constitution

## Core Principles

### I. Human-in-the-Loop (NON-NEGOTIABLE)

The system MUST never submit an application, send a message, or take any
irreversible action on the user's behalf without explicit confirmation.
The AI's role is to evaluate, generate, and recommend — the user decides and acts.

- AI fills forms, drafts messages, and generates PDFs, then STOPS.
- "Submit", "Send", and "Apply" buttons are the user's alone to click.
- Any mode that reaches an action boundary MUST surface a clear review prompt
  before proceeding.

**Rationale**: Employment decisions are high-stakes and irreversible. Automation
that bypasses human judgment exposes the user to reputational risk and wastes
recruiter time — both are unacceptable.

### II. Quality Over Quantity

The pipeline is a filter, not a firehose. Volume is not a success metric.

- Roles scoring below 4.0/5 on the A-F evaluation MUST receive an explicit
  "not recommended" flag; the agent MUST discourage applying.
- Batch processing MUST NOT relax evaluation standards; each offer receives
  the full 6-block analysis regardless of throughput pressure.
- The interview story bank (STAR+R) accumulates only high-quality, evidence-backed
  entries — never filler.

**Rationale**: A well-targeted application to 5 companies beats a generic blast
to 50. Every application a human reads costs someone's attention; only send
what is worth reading.

### III. Personalization-First

`cv.md` is the canonical CV. `config/profile.yml` and `modes/_profile.md` are
the canonical sources of user identity, targets, archetypes, comp range, and
narrative. All evaluation logic MUST read from these files at runtime — never
from hardcoded metrics or stale assumptions.

- Proof points, hero metrics, and compensation figures come from `cv.md` and
  `config/profile.yml` only.
- User-specific customizations (archetypes, negotiation scripts, deal-breakers,
  narrative framing) MUST be written to `modes/_profile.md` or `config/profile.yml`.
  They MUST NOT be written to `modes/_shared.md` or any system-layer file.
- After every evaluation where the user corrects a score or adds context, the
  agent MUST update the relevant user-layer file so the system improves over time.

**Rationale**: Generic evaluations produce generic CVs. The system gets valuable
only when it knows the user deeply — their story, their constraints, their
superpowers.

### IV. Pipeline Integrity

The tracker (`data/applications.md`) is the single source of truth for
application state. All writes to it MUST be made through the established
integrity pipeline.

- New entries MUST be written as TSV files to `batch/tracker-additions/`
  and merged via `node merge-tracker.mjs`. Direct edits to `applications.md`
  to ADD rows are forbidden.
- Existing entries MAY be updated directly (status, notes).
- All statuses MUST use canonical values from `templates/states.yml`. No
  markdown bold, no inline dates, no free-form text in the status column.
- After each batch of evaluations, `node merge-tracker.mjs` MUST be run.
- All reports MUST include `**URL:**` and `**Legitimacy:** {tier}` in their header.
- Health checks (`node verify-pipeline.mjs`) MUST pass before any deployment
  or system update.

**Rationale**: Duplicate entries, non-canonical statuses, and missing metadata
corrupt the pattern-analysis and follow-up cadence tools that depend on a
clean tracker.

### V. Data Privacy & Local-First

Career-Ops is a local tool. The user's CV, contact info, proof points, and
application history stay on their machine and are transmitted only to the
AI provider they have explicitly configured.

- No user-layer files may be committed to public repositories.
  `data/`, `reports/`, `output/`, `jds/`, `batch/logs/` are gitignored
  by default and MUST remain so.
- Playwright-based offer verification MUST be used in interactive mode
  (not WebFetch) to respect the user's privacy and avoid third-party data
  collection. Batch mode (headless) may fall back to WebFetch and MUST mark
  reports `**Verification:** unconfirmed (batch mode)`.
- The system MUST comply with the Terms of Service of career portals it
  interacts with. Spamming ATS systems or overwhelming job boards is forbidden.

**Rationale**: The user trusts the system with sensitive career data. Leaking
that data or violating portal ToS exposes them to account restrictions and
reputational harm.

## Data Contract & File Boundaries

The data contract enforces a strict two-layer separation:

**User Layer** (NEVER auto-updated by system upgrades):
`cv.md`, `config/profile.yml`, `modes/_profile.md`, `article-digest.md`,
`portals.yml`, `data/*`, `reports/*`, `output/*`, `interview-prep/*`, `jds/*`

**System Layer** (safe to auto-update via `node update-system.mjs apply`):
`modes/_shared.md`, all `modes/*.md` (except `_profile.md`), `CLAUDE.md`,
`AGENTS.md`, `*.mjs` scripts, `batch/batch-prompt.md`, `batch/batch-runner.sh`,
`dashboard/*`, `templates/*`, `fonts/*`, `.claude/skills/*`, `docs/*`, `VERSION`

Any feature or task that modifies a system-layer file MUST ensure the change
does not overwrite or conflict with user-layer content. Updates MUST be
backward-compatible with existing user customizations in `modes/_profile.md`
and `config/profile.yml`.

## Workflow & Quality Gates

All feature work on Career-Ops must pass these gates in order:

1. **Onboarding Gate**: `cv.md`, `config/profile.yml`, `modes/_profile.md`,
   and `portals.yml` MUST exist before any evaluation, scan, or batch mode runs.
   The agent MUST guide the user through setup if any file is missing.
2. **Evaluation Gate**: Every offer evaluation MUST produce a report in
   `reports/` (format: `{###}-{company-slug}-{YYYY-MM-DD}.md`), a TSV entry
   in `batch/tracker-additions/`, and optionally a PDF in `output/`.
3. **Merge Gate**: After a batch of evaluations, `node merge-tracker.mjs`
   MUST be run to fold TSV additions into `data/applications.md`.
4. **Health Gate**: `node verify-pipeline.mjs` and `node doctor.mjs` MUST
   pass after any structural change to the pipeline.
5. **Score Threshold Gate**: Offers scoring below 4.0/5 MUST be flagged;
   the agent MUST recommend against applying unless the user explicitly overrides.

**Stack constraints**: Node.js (ES modules, `.mjs`), Playwright (PDF + scraping),
YAML (config), HTML/CSS (CV template), Markdown (data), Go (dashboard TUI).
No new runtime dependencies may be introduced without updating `package.json`
and documenting the rationale.

## Governance

This constitution supersedes all other practices documented in `CLAUDE.md`,
`modes/_shared.md`, and individual mode files when conflicts arise.

**Amendment procedure**:
- PATCH: Clarifications, wording fixes — any contributor may propose; no
  approval gate required.
- MINOR: New principle section or material expansion — document rationale
  in the Sync Impact Report; update dependent templates.
- MAJOR: Removal or redefinition of a principle — requires explicit user
  confirmation; a migration plan MUST be written before the change takes effect.

**Versioning**: `MAJOR.MINOR.PATCH` following semantic versioning semantics
as defined above.

**Compliance review**: Every `/speckit.plan` run MUST include a Constitution
Check section in the generated `plan.md`, verifying that the proposed feature
does not violate Principles I–V. See `.specify/templates/plan-template.md`.

**Runtime guidance**: `CLAUDE.md` serves as the primary runtime guidance file
for the AI agent. When in doubt, `CLAUDE.md` provides operational detail;
this constitution provides the non-negotiable constraints that `CLAUDE.md`
must never contradict.

**Version**: 1.0.0 | **Ratified**: 2026-05-12 | **Last Amended**: 2026-05-12
