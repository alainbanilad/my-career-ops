# Quickstart: Auto-Job-Scan-Apply Automation

**Created**: 2026-05-12  
**Target**: Get your first scheduled job scan running in <30 minutes  

---

## Prerequisites

1. ✅ Career-Ops configured: `cv.md`, `config/profile.yml`, `modes/_profile.md`, `portals.yml`
2. ✅ Obsidian vault: `D:\AI_BRAIN\Claude-Obsidian\claude-obsidian` (accessible, writable)
3. ✅ Node.js 18+ installed
4. ✅ Dependencies installed: `npm install`

---

## Setup: Choose Your Scheduler Backend(s)

You can use **one or more** backends simultaneously. Pick your preference:

---

## Option A: System Scheduler (Windows Task Scheduler / Linux cron)

**Best for**: Local machine always on or regular boot schedule | **Setup time**: 5 minutes

### Windows Task Scheduler Setup

1. **Create batch file** (`scripts/automation/windows-task.bat`):

```batch
@echo off
REM Career-Ops Auto-Job-Scan-Apply
cd /d D:\career-ops\career-ops
npm run scan
npm run batch
node scripts/automation/notifier.mjs
```

2. **Open Task Scheduler**:
   - Press `Win + R`, type `taskschd.msc`, press Enter
   - Click "Create Basic Task"

3. **Configure Task**:
   - **Name**: `Career-Ops Scan (9 AM)`
   - **Trigger**: Daily, 09:00 AM
   - **Action**: Start a program → `D:\career-ops\career-ops\scripts\automation\windows-task.bat`
   - **Run whether user is logged in or not**: ✅ Check

4. **Repeat for 6 PM cycle**:
   - Create another task `Career-Ops Batch (6 PM)` with same script, time 18:00

5. **Update `config/profile.yml`**:

```yaml
automation:
  schedulers:
    system:
      enabled: true
      timezone: "Asia/Singapore"
      schedule:
        - time: "09:00"
          action: "scan"
        - time: "18:00"
          action: "batch"
```

6. **Test**: Right-click task → "Run" to execute manually and verify it works.

### Linux/Mac cron Setup

1. **Create shell script** (`scripts/automation/cron-task.sh`):

```bash
#!/bin/bash
cd ~/career-ops
npm run scan
npm run batch
node scripts/automation/notifier.mjs
```

2. **Make executable**:

```bash
chmod +x scripts/automation/cron-task.sh
```

3. **Edit crontab**:

```bash
crontab -e
```

Add these lines:

```crontab
# Career-Ops Scan at 9 AM SGT (UTC+8), so 1 AM UTC
0 1 * * * cd ~/career-ops && bash scripts/automation/cron-task.sh >> logs/automation/scan-9am.log 2>&1

# Career-Ops Batch at 6 PM SGT, so 10 AM UTC
0 10 * * * cd ~/career-ops && bash scripts/automation/cron-task.sh >> logs/automation/batch-6pm.log 2>&1
```

4. **Verify crontab is set**:

```bash
crontab -l
```

5. **Test**: 

```bash
bash scripts/automation/cron-task.sh
```

---

## Option B: GitHub Actions (Cloud-Based, Machine Can Be Off)

**Best for**: Always-on automation without running local server | **Setup time**: 10 minutes

### GitHub Setup

1. **Create GitHub workflow** (`.github/workflows/auto-job-scan-apply.yml`):

```yaml
name: Auto-Job-Scan-Apply

on:
  schedule:
    # 9 AM SGT = 1 AM UTC
    - cron: '0 1 * * *'
    # 6 PM SGT = 10 AM UTC
    - cron: '0 10 * * *'
  workflow_dispatch:  # Allow manual trigger from UI

concurrency:
  group: auto-job-scan-${{ github.ref }}
  cancel-in-progress: false

jobs:
  scan-and-apply:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run scan & batch
        run: |
          npm run scan
          npm run batch
      
      - name: Notify Obsidian
        run: node scripts/automation/obsidian-logger.mjs
        env:
          OBSIDIAN_VAULT: ${{ secrets.OBSIDIAN_VAULT_PATH }}
```

2. **Add GitHub Secret** (Personal Access Token):
   - Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `GITHUB_PAT`
   - Value: [Generate new Personal Access Token](https://github.com/settings/tokens) with `repo` scope
   - Click **Add secret**

3. **Add another secret** (Obsidian vault path):
   - Name: `OBSIDIAN_VAULT_PATH`
   - Value: `D:\AI_BRAIN\Claude-Obsidian\claude-obsidian`

4. **Update `config/profile.yml`**:

```yaml
automation:
  schedulers:
    github_actions:
      enabled: true
      repo: "alainbanilad/my-career-ops"
      pat_token: ${GITHUB_PAT}
      workflow_file: ".github/workflows/auto-job-scan-apply.yml"
```

5. **Test**: 
   - Go to your repo → **Actions** tab → **Auto-Job-Scan-Apply**
   - Click **Run workflow** → **Run workflow** button
   - Watch logs in real time

---

## Option C: Node.js Daemon (Embedded Scheduler)

**Best for**: Development & testing | **Setup time**: 5 minutes

### Setup

1. **Update `config/profile.yml`**:

```yaml
automation:
  schedulers:
    nodejs:
      enabled: true
      port: 3000
      host: "127.0.0.1"
      restart_on_failure: true
```

2. **Start daemon**:

```bash
npm run automation:start
```

Or with PM2 for persistent background execution:

```bash
npm install -g pm2
pm2 start scripts/automation/daemon.mjs --name "career-ops-automation"
pm2 startup
pm2 save
```

3. **View logs**:

```bash
npm run automation:logs
# or with PM2:
pm2 logs career-ops-automation
```

4. **Test**: Daemon listens on `http://localhost:3000`. Trigger manually via:

```bash
curl -X POST http://localhost:3000/trigger/scan
curl -X POST http://localhost:3000/trigger/batch
```

---

## Option D: External/User-Provided Trigger

**Best for**: Integration with third-party automation (Zapier, n8n, IFTTT) | **Setup time**: 10 minutes

### Setup

1. **Enable Node.js daemon first** (Option C), which exposes webhook endpoint.

2. **Update `config/profile.yml`**:

```yaml
automation:
  schedulers:
    external:
      enabled: true
      webhook_path: "/webhook/auto-job-scan"
      secret_token: "your-secret-key-here"
      rate_limit_per_hour: 10
```

3. **Trigger webhook from external service**:

```bash
curl -X POST http://your-machine-ip:3000/webhook/auto-job-scan \
  -H "Authorization: Bearer your-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{"action":"scan"}'
```

Or use Zapier/n8n to schedule HTTP requests.

---

## Final Configuration in `config/profile.yml`

Enable your chosen backend(s):

```yaml
automation:
  enabled: true
  timezone: "Asia/Singapore"
  
  schedulers:
    system:
      enabled: true        # ✅ Use Windows Task Scheduler or cron
    github_actions:
      enabled: false       # ✅ Change to true if using GitHub Actions
    nodejs:
      enabled: false       # ✅ Change to true if using Node.js daemon
    external:
      enabled: false       # ✅ Change to true if using external webhooks
  
  notifications:
    console:
      enabled: true
    slack:
      enabled: false       # ✅ Change to true if you have Slack webhook
      webhook_url: ${SLACK_WEBHOOK_URL}
    obsidian:
      enabled: true
      vault_path: "D:\\AI_BRAIN\\Claude-Obsidian\\claude-obsidian"
```

---

## Verification Checklist

- [ ] At least **one scheduler backend** is enabled
- [ ] `config/profile.yml` is updated with `automation.schedulers` section
- [ ] **For Task Scheduler**: Task created and tested (ran manually)
- [ ] **For GitHub Actions**: PAT secret added; workflow file committed; test run passed
- [ ] **For Node.js daemon**: Daemon starts without errors (`npm run automation:start`)
- [ ] **For Obsidian**: Vault path is accessible (`ls -la "D:\AI_BRAIN\Claude-Obsidian\claude-obsidian"`)
- [ ] **For Slack** (optional): Webhook URL is valid (test via `curl`)
- [ ] First scheduled cycle runs and logs appear in console or Obsidian

---

## Troubleshooting

### "Task/cron doesn't execute"

1. Verify machine is on at scheduled time (or add wake-on-lan for Task Scheduler)
2. Check logs: `logs/automation/*.log`
3. Manually run script to test: `npm run scan`

### "Obsidian vault not found"

1. Verify path exists: `ls -la "D:\AI_BRAIN\Claude-Obsidian\claude-obsidian"`
2. Check write permissions: `node -e "require('fs').accessSync('...', 6)"`
3. Update `config/profile.yml` with correct absolute path

### "Slack webhook fails"

1. Verify webhook URL: `curl https://hooks.slack.com/services/...`
2. Check Slack app still has permission (webhook not revoked)
3. Temporarily disable Slack in config and try again

### "GitHub Actions job fails"

1. Check **Actions** tab → latest workflow run → logs
2. Verify PAT token has `repo` scope and hasn't expired
3. Manually run: `npm run scan` to debug locally first

---

## Next Steps

1. ✅ Choose backend(s) and complete setup above
2. ⏳ Wait for first scheduled cycle (9 AM SGT)
3. ⏳ Check Obsidian vault for session log
4. ⏳ Review opportunities in `data/pipeline.md`
5. ⏳ Batch evaluation runs at 6 PM; forms pre-filled for review

---

## Support

- **Plan**: [specs/001-auto-job-scan-apply/plan.md](../plan.md)
- **Data Model**: [specs/001-auto-job-scan-apply/data-model.md](../data-model.md)
- **Research**: [specs/001-auto-job-scan-apply/research.md](../research.md)
