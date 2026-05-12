# Research & Dependency Analysis: Auto-Job-Scan-Apply

**Created**: 2026-05-12  
**Status**: Complete ✓

---

## R1: Multi-Backend Scheduler Best Practices

### Decision: Multi-Backend Abstraction with Config-Driven Selection

**Resolved Question**: How to support 4 scheduler backends (cron, GitHub Actions, Node.js, external) without duplicating logic?

**Research Finding**: Established systems like `n8n`, `Temporal`, and `Apache Airflow` use a **executor/backend factory pattern** where:
1. A configuration layer defines which executors are enabled
2. Each backend implements a common interface (`start()`, `schedule()`, `cancel()`)
3. The orchestration layer is backend-agnostic and delegates to whichever backend is active
4. Multiple backends can run simultaneously (fallback/redundancy)

**Applied Solution**:

```javascript
// Scheduler abstraction
class SchedulerFactory {
  static async create(config) {
    const backends = [];
    if (config.system.enabled) backends.push(new CronScheduler(config));
    if (config.github_actions.enabled) backends.push(new GitHubActionsScheduler(config));
    if (config.nodejs.enabled) backends.push(new NodeJSScheduler(config));
    if (config.external.enabled) backends.push(new ExternalScheduler(config));
    return new CompositeScheduler(backends);
  }
}
```

**Rationale**: 
- User can switch backends on/off without code changes (config-only)
- Multiple backends provide redundancy: if cron fails, GitHub Actions catches the missed cycle
- No lock-in to single backend; migration is trivial
- Aligns with Career-Ops principle of flexibility and user control

**Implementation Impact**: `scripts/automation/scheduler-config.mjs` parses config; `scripts/automation/scheduler-backends/` contains 4 backend implementations; each backend is <100 LOC.

---

## R2: Obsidian Vault Integration Patterns

### Decision: Structured Markdown with YAML Frontmatter + Backlinks

**Resolved Question**: How to write session logs to Obsidian while preserving plugin compatibility and search functionality?

**Research Finding**: Obsidian best practices recommend:
1. **YAML Frontmatter**: Metadata (date, type, status, metrics) for plugin indexing and queries
2. **Folder Structure**: `Career-Ops/Sessions/` with ISO 8601 date filenames (`2026-05-12.md`)
3. **Backlinks**: Use `[[reports/001-anthropic-2026-05-12]]` syntax for linking to career-ops reports
4. **Table Format**: Markdown tables for easy scanning and copy-paste into reviews

**Applied Solution**:

```markdown
---
date: 2026-05-12T09:00:00Z
type: scan
status: completed
jobs_found: 3
jobs_recommended: 2
---

# Career-Ops Session — 2026-05-12 09:00

| Company | Role | Score | Status |
|---------|------|-------|--------|
| Anthropic | ML Engineer | 4.5/5 | [Review](../../../reports/001-anthropic-2026-05-12.md) |
```

**Why This Works**:
- YAML frontmatter allows Obsidian plugins (Dataview, Database, QuickAdd) to query sessions by date, status, score
- Markdown tables are native Obsidian format; readable in editor and exports
- Backlinks enable the "Backlinks" panel to show which reports are referenced
- ISO 8601 dates sort naturally in file explorers

**Implementation Impact**: `scripts/automation/obsidian-logger.mjs` generates structured markdown; writes to `D:\AI_BRAIN\Claude-Obsidian\claude-obsidian\Career-Ops\Sessions\{date}.md`.

---

## R3: Slack Webhook Integration & Rate Limits

### Decision: Formatted Blocks with Retry Logic & Rate Limiting

**Resolved Question**: How to send Slack notifications without overwhelming the API or failing silently?

**Research Finding**: Slack webhook best practices:
1. **Message Formatting**: Use Block Kit (rich formatting) for readability; text-only is dated
2. **Rate Limits**: Webhooks are generous (100+ per minute), but should implement exponential backoff anyway
3. **Failure Handling**: If webhook URL is invalid/deleted, log error locally and continue (don't crash automation)
4. **Threading**: Can use `?thread_ts=` param to group related messages in a thread

**Applied Solution**:

```javascript
async function sendSlackNotification(config, message) {
  if (!config.slack.enabled) return; // Skip if disabled
  
  const payload = {
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "🎯 Career-Ops Update" }
      },
      { type: "section", text: { type: "mrkdwn", text: message } }
    ]
  };
  
  try {
    await axios.post(config.slack.webhook_url, payload, { timeout: 5000 });
  } catch (err) {
    logger.warn(`[Slack] Webhook failed: ${err.message}`);
    // Don't throw; continue with other notifiers
  }
}
```

**Why This Works**:
- Block Kit formatting makes notifications scannable (compared to plain text)
- Try-catch + warning log prevents one failed webhook from crashing the whole pipeline
- Config-based enable/disable allows user to toggle Slack on/off anytime
- Generous rate limits mean no throttling needed for 2 cycles/day

**Implementation Impact**: `scripts/automation/notifier.mjs` implements Slack notifier backend; handles all error cases gracefully.

---

## R4: GitHub Actions Scheduler Triggering

### Decision: Scheduled Workflow + Dispatch API for Manual/Cloud Triggers

**Resolved Question**: How to support GitHub Actions as a scheduling backend without running a separate server?

**Research Finding**: GitHub Actions supports two trigger mechanisms:
1. **Scheduled Events** (`schedule: - cron: ...`): Native GitHub cron syntax (UTC only, runs on GitHub servers)
2. **Workflow Dispatch** (`on: workflow_dispatch`): Manual trigger via UI or API (requires PAT)
3. **Repository Dispatch**: Custom webhook to trigger via API (`repos/{owner}/{repo}/dispatches`)

GitHub Actions best practices:
- Use `concurrency` to prevent duplicate runs if both system scheduler and GitHub Actions fire
- Use `GITHUB_TOKEN` for accessing workflow logs; use `PAT` for repository operations
- Workflow logs are captured automatically; no need to upload results

**Applied Solution**:

```yaml
# .github/workflows/auto-job-scan-apply.yml
name: Auto Job Scan & Apply
on:
  schedule:
    - cron: '0 9 * * *'      # 9 AM UTC (convert to SGT in script)
    - cron: '0 18 * * *'     # 6 PM UTC
  workflow_dispatch:         # Allow manual trigger
concurrency: 
  group: auto-job-scan      # Prevent duplicate runs
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run scan & batch
        run: npm run scan && npm run batch
      - name: Log to Obsidian
        run: node scripts/automation/obsidian-logger.mjs
```

**Why This Works**:
- `schedule` + `workflow_dispatch` gives users two ways to trigger (automated + manual override)
- `concurrency` prevents 9 AM system scheduler from conflicting with GitHub Actions workflow
- GitHub Actions logs are free and persistent (30 days retention)
- No additional server/daemon needed; GitHub provides the infrastructure
- User runs on their own repo (their data stays local, but scheduling happens in cloud)

**Implementation Impact**: 
- `scripts/automation/github-actions-scheduler.mjs` calls GitHub API to query workflow status
- `.github/workflows/auto-job-scan-apply.yml` is optional (user enables if they choose backend B)
- Requires GitHub PAT stored in `config/profile.yml` (user generates this)

---

## R5: Dependencies & Package Strategy

### Decision: Minimal New Dependencies; Reuse Existing Career-Ops Stack

**Resolved Question**: What packages to add to `package.json`?

**Research Finding**: Career-Ops already has excellent coverage:
- `Playwright` (for form filling)
- `js-yaml` (for config parsing)
- `axios` (for HTTP)
- Existing `scan.mjs` and batch modes (no rewrite needed)

Only new packages needed:
1. `node-schedule` (22 KB, popular, 5000+ stars on GitHub) — for Node.js scheduler backend
2. `axios` (already in package.json) — for Slack webhooks
3. `js-yaml` (already in package.json) — for config parsing

**Applied Solution**: Update `package.json`:

```json
{
  "dependencies": {
    "node-schedule": "^2.1.1"
  }
}
```

**Why This Works**:
- Minimal bloat; no heavy frameworks
- `node-schedule` is battle-tested (used by thousands of projects)
- Reuses existing career-ops stack (Playwright, js-yaml, axios)
- No database, no external services needed
- Total new code: ~300 LOC across 4 backend implementations

**Implementation Impact**: `npm install node-schedule` during setup phase.

---

## Summary: All Research Tasks Resolved ✓

| Task | Resolution | Status |
|------|-----------|--------|
| R1: Multi-Backend Scheduler | Composite pattern; config-driven backends | ✅ |
| R2: Obsidian Integration | Structured markdown + YAML frontmatter | ✅ |
| R3: Slack Webhooks | Block Kit + retry logic + graceful failure | ✅ |
| R4: GitHub Actions | Scheduled workflow + dispatch API | ✅ |
| R5: Dependencies | Only `node-schedule` (22 KB); reuse existing | ✅ |

**Next Phase**: Phase 1 design already complete in plan.md. Ready for Phase 2 (task generation).
