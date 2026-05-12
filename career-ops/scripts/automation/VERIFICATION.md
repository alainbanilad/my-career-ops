# Automation Verification Checklist

**Purpose**: Pre-deployment validation checklist. Run through each item before enabling automation in production.

## Pre-Deployment Verification (10 items)

- [ ] **1. Config Validation** — Run: `node cli.mjs validate-config`
  - All scheduler backends have required configuration
  - At least one backend is enabled
  - Timezone is valid (IANA format)

- [ ] **2. CV Sync** — Run: `npm run sync-check`
  - cv.md is up-to-date with recent experience
  - No duplicate entries or stale content

- [ ] **3. Pipeline Integrity** — Run: `npm run verify`
  - data/pipeline.md is readable and well-formed
  - data/applications.md has no duplicate entries
  - All statuses are canonical (from templates/states.yml)

- [ ] **4. Doctor Checkup** — Run: `npm run doctor`
  - All data files are valid
  - No missing required fields
  - Obsidian vault is accessible (if configured)

- [ ] **5. Scheduler Test** — Run: `node cli.mjs run-once`
  - Orchestrator starts without errors
  - Scan completes successfully
  - Session log created (if Obsidian configured)

- [ ] **6. Notification Channels** — Manually verify:
  - Console output appears in terminal
  - Slack message received (if enabled)
  - Obsidian session file created (if enabled)

- [ ] **7. Cron Setup** (if using system scheduler)
  - `node cli.mjs start` runs in background
  - Cron logs show successful triggers
  - Verify: `crontab -l` (Linux/Mac) or Task Scheduler (Windows)

- [ ] **8. Obsidian Vault** (if using Obsidian logging)
  - Vault path is correct in config
  - Career-Ops/Sessions/ folder exists
  - Daily session files are created with backlinks

- [ ] **9. Config Backup** — Save current config:
  - `cp config/profile.yml config/profile.yml.backup`
  - Store backup in secure location

- [ ] **10. Dry Run 24 Hours** — Enable automation and monitor:
  - Run in background for 24 hours
  - Verify both 9 AM and 6 PM cycles execute
  - Check all outputs (console, Slack, Obsidian)
  - Monitor for any errors or missed runs

## Post-Deployment Monitoring (ongoing)

- [ ] **Metrics Dashboard** — Run: `node scripts/automation/metrics.mjs`
  - Check uptime percentage (target: 99% over 30 days)
  - Review average cycle duration
  - Alert if uptime drops below 95%

- [ ] **Weekly Health Check** — Run: `npm run verify && npm run doctor`
  - Catch silent pipeline corruption early
  - Verify tracker entries are canonical
  - Check for orphaned files

- [ ] **Log Review** — Check `logs/automation/` for:
  - Error patterns or recurring failures
  - Performance degradation
  - Rate limiting or webhook issues

## Troubleshooting

**Issue: Scheduler doesn't trigger at configured time**
- [ ] Verify system time is correct (cron uses system clock)
- [ ] Verify config timezone matches system timezone
- [ ] Check logs for errors: `tail logs/automation/*.log`
- [ ] Test manually: `node cli.mjs run-once`

**Issue: Slack notifications not received**
- [ ] Verify webhook URL is correct and active
- [ ] Test: `curl -X POST -H 'Content-Type: application/json' -d '{"text":"test"}' $WEBHOOK_URL`
- [ ] Check Slack workspace for disabled webhooks

**Issue: Obsidian sessions not created**
- [ ] Verify vault_path points to correct Obsidian vault
- [ ] Check file permissions on vault folder
- [ ] Verify Career-Ops/Sessions/ folder exists
- [ ] Check for disk full errors in logs

**Issue: Scans not finding new jobs**
- [ ] Verify portals.yml has enabled companies
- [ ] Check title_filter includes target roles
- [ ] Test scan manually: `npm run scan`
- [ ] Verify company career pages are still accessible

## Success Criteria

✅ **All pre-deployment items checked**
✅ **Dry run 24 hours with zero failures**
✅ **Uptime >= 95% in first week**
✅ **All three notification channels working (console, Slack, Obsidian)**
✅ **No orphaned files or pipeline corruption detected**

**Ready for long-term production use**
