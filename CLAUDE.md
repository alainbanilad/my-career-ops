# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace Structure

This workspace (`d:/career-ops`) contains a single project:

```
career-ops/          ← The career-ops job search automation system
  CLAUDE.md          ← Authoritative guide for the career-ops system (read this first)
  cv.md              ← User's canonical CV (source of truth)
  config/            ← profile.yml, profile.example.yml
  modes/             ← Skill mode definitions (_shared.md, _profile.md, oferta.md, pdf.md, etc.)
  data/              ← applications.md tracker, pipeline.md inbox, scan-history.tsv
  reports/           ← Per-offer evaluation reports ({###}-{slug}-{YYYY-MM-DD}.md)
  output/            ← Generated PDF CVs (gitignored)
  batch/             ← Batch processing scripts and state
  dashboard/         ← Go TUI for browsing the tracker
  *.mjs              ← Node.js utility scripts
```

**Before doing any work, read `career-ops/CLAUDE.md`.** It contains the full data contract, onboarding flow, skill modes, scoring system, canonical statuses, TSV format rules, and update-check instructions.

## Key Commands

All commands run from `career-ops/`:

```bash
npm run doctor        # Validate setup (run first)
npm run verify        # Check pipeline integrity
npm run normalize     # Fix non-canonical statuses
npm run dedup         # Deduplicate tracker entries
npm run merge         # Merge batch/tracker-additions/ into applications.md
npm run scan          # Run portal scanner standalone
node update-system.mjs check   # Check for system updates
```

Dashboard (Go TUI):
```bash
cd career-ops/dashboard && go build -o career-dashboard . && ./career-dashboard --path ..
```

## Memory

User preferences, feedback, and project context are stored in `C:/Users/alain/.claude/projects/d--career-ops/memory/`. Consult `MEMORY.md` there at session start for user-specific context.
