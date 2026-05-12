<!-- SPECKIT START -->
## Current Implementation Plan

**Feature**: Auto-Job-Scan-Apply (Feature #001)  
**Status**: Phase 1 Design Complete ✓  
**Plan**: [specs/001-auto-job-scan-apply/plan.md](../../specs/001-auto-job-scan-apply/plan.md)

### Quick Reference

- **Technical Design**: Multi-backend scheduler (cron, GitHub Actions, Node.js, webhooks) + notification pipeline (console, Slack, Obsidian)
- **Data Model**: Config schema in `config/profile.yml`, session logs in Obsidian vault
- **Contracts**: See `specs/001-auto-job-scan-apply/contracts/`
- **Quickstart**: [specs/001-auto-job-scan-apply/quickstart.md](../../specs/001-auto-job-scan-apply/quickstart.md)

For additional context about technologies to be used, project structure,
shell commands, and other important information, read:
- **Plan**: [specs/001-auto-job-scan-apply/plan.md](../../specs/001-auto-job-scan-apply/plan.md)
- **Data Model**: [specs/001-auto-job-scan-apply/data-model.md](../../specs/001-auto-job-scan-apply/data-model.md)
- **Research**: [specs/001-auto-job-scan-apply/research.md](../../specs/001-auto-job-scan-apply/research.md)
<!-- SPECKIT END -->
