#!/usr/bin/env node

/**
 * export-dashboard.mjs — Static HTML dashboard generator
 *
 * Reads applications.md + pipeline.md and generates docs/index.html
 * for GitHub Pages hosting. Accessible on mobile via browser.
 *
 * Usage:
 *   node export-dashboard.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const APPLICATIONS_PATH = join(__dirname, 'data/applications.md');
const PIPELINE_PATH = join(__dirname, 'data/pipeline.md');
const DOCS_DIR = join(__dirname, 'docs');
const OUTPUT_PATH = join(DOCS_DIR, 'index.html');

// ── Parsers ──────────────────────────────────────────────────────────

function parseApplications(content) {
  const rows = [];
  const lines = content.split('\n');
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) { inTable = false; continue; }
    if (trimmed.startsWith('| #') || trimmed.startsWith('|#') || trimmed.startsWith('|---|')) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;

    const parts = trimmed.split('|').map(s => s.trim()).filter((_, i) => i > 0 && i < trimmed.split('|').length - 1);
    if (parts.length < 8) continue;

    const [num, date, company, role, score, status, pdf, report, ...notesParts] = parts;
    if (!num || !company) continue;

    // Extract report link number
    const reportMatch = report && report.match(/\[(\d+)\]\(([^)]+)\)/);

    rows.push({
      num: parseInt(num) || 0,
      date: date || '',
      company: company || '',
      role: role || '',
      score: score || '',
      status: status || '',
      pdf: pdf || '',
      reportNum: reportMatch ? reportMatch[1] : '',
      reportPath: reportMatch ? reportMatch[2] : '',
      notes: notesParts.join(' | ').trim(),
    });
  }

  return rows.sort((a, b) => b.num - a.num);
}

function parsePipeline(content) {
  const pending = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('- [ ]')) continue;

    const withoutPrefix = trimmed.replace(/^- \[ \]\s*/, '');
    const parts = withoutPrefix.split('|').map(s => s.trim());
    const url = parts[0] || '';
    const company = parts[1] || '';
    const role = parts[2] || '';

    pending.push({ url, company, role });
  }

  return pending;
}

// ── Stats ──────────────────────────────────────────────────────────

function computeStats(apps) {
  const total = apps.length;
  const byStatus = {};
  for (const app of apps) {
    const s = app.status || 'Unknown';
    byStatus[s] = (byStatus[s] || 0) + 1;
  }

  const scores = apps
    .map(a => parseFloat(a.score))
    .filter(s => !isNaN(s));
  const avgScore = scores.length
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : 'N/A';

  return { total, byStatus, avgScore };
}

// ── HTML Builders ──────────────────────────────────────────────────

function statusBadge(status) {
  const map = {
    'Applied':   { bg: '#3b82f6', text: '#fff' },
    'Interview': { bg: '#8b5cf6', text: '#fff' },
    'Offer':     { bg: '#10b981', text: '#fff' },
    'Rejected':  { bg: '#ef4444', text: '#fff' },
    'Evaluated': { bg: '#f59e0b', text: '#000' },
    'Responded': { bg: '#06b6d4', text: '#fff' },
    'Discarded': { bg: '#6b7280', text: '#fff' },
    'SKIP':      { bg: '#374151', text: '#9ca3af' },
  };
  const style = map[status] || { bg: '#374151', text: '#d1d5db' };
  return `<span class="badge" style="background:${style.bg};color:${style.text}">${escHtml(status)}</span>`;
}

function scoreColor(scoreStr) {
  const score = parseFloat(scoreStr);
  if (isNaN(score)) return '#6b7280';
  if (score >= 4.0) return '#10b981';
  if (score >= 3.0) return '#f59e0b';
  return '#ef4444';
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildStatsSection(stats) {
  const statCards = [
    { label: 'Total', value: stats.total, color: '#60a5fa' },
    { label: 'Applied', value: stats.byStatus['Applied'] || 0, color: '#3b82f6' },
    { label: 'Interview', value: stats.byStatus['Interview'] || 0, color: '#8b5cf6' },
    { label: 'Offer', value: stats.byStatus['Offer'] || 0, color: '#10b981' },
    { label: 'Rejected', value: stats.byStatus['Rejected'] || 0, color: '#ef4444' },
    { label: 'Avg Score', value: stats.avgScore, color: '#f59e0b' },
  ];

  return `
    <div class="stats-grid">
      ${statCards.map(c => `
        <div class="stat-card">
          <div class="stat-value" style="color:${c.color}">${c.value}</div>
          <div class="stat-label">${c.label}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function buildApplicationsTable(apps) {
  const rows = apps.map(app => {
    const color = scoreColor(app.score);
    const scoreNum = parseFloat(app.score);
    const scoreBar = !isNaN(scoreNum)
      ? `<div class="score-bar"><div class="score-fill" style="width:${(scoreNum/5)*100}%;background:${color}"></div></div>`
      : '';

    return `
      <tr>
        <td class="num">#${escHtml(String(app.num))}</td>
        <td class="date">${escHtml(app.date)}</td>
        <td class="company"><strong>${escHtml(app.company)}</strong></td>
        <td class="role">${escHtml(app.role)}</td>
        <td class="score" style="color:${color}">
          ${escHtml(app.score)}
          ${scoreBar}
        </td>
        <td class="status">${statusBadge(app.status)}</td>
        <td class="pdf">${app.pdf === '✅' ? '<span class="pdf-yes">PDF</span>' : ''}</td>
        <td class="notes">${escHtml(app.notes)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-wrap">
      <table id="apps-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Company</th>
            <th>Role</th>
            <th>Score</th>
            <th>Status</th>
            <th>PDF</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function buildPipelineSection(pending) {
  if (!pending.length) {
    return `<p class="empty">No pending items in pipeline.</p>`;
  }

  const items = pending.map(p => `
    <div class="pipeline-item">
      <div class="pipeline-meta">
        <strong>${escHtml(p.company)}</strong>
        ${p.role ? `<span class="pipeline-role">${escHtml(p.role)}</span>` : ''}
      </div>
      <a class="pipeline-url" href="${escHtml(p.url)}" target="_blank" rel="noopener">
        ${escHtml(p.url.length > 60 ? p.url.slice(0, 60) + '…' : p.url)}
      </a>
    </div>
  `).join('');

  return `<div class="pipeline-list">${items}</div>`;
}

// ── Main HTML Template ──────────────────────────────────────────────

function buildHtml(apps, pipeline, stats) {
  const now = new Date().toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const statusOptions = ['All', 'Applied', 'Interview', 'Offer', 'Evaluated', 'Responded', 'Rejected', 'Discarded', 'SKIP'];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Career Dashboard — Alain</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      padding: 0 0 40px;
    }

    .header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-bottom: 1px solid #1e293b;
      padding: 20px 16px 16px;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .header h1 { font-size: 1.25rem; font-weight: 700; color: #f1f5f9; }
    .header .subtitle { font-size: 0.75rem; color: #64748b; margin-top: 2px; }

    .section { padding: 20px 16px 0; }
    .section-title {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      margin-bottom: 12px;
    }

    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .stat-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 12px 8px;
      text-align: center;
    }

    .stat-value { font-size: 1.5rem; font-weight: 700; line-height: 1; }
    .stat-label { font-size: 0.65rem; color: #94a3b8; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }

    /* Filter */
    .filter-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .filter-btn {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 20px;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.7rem;
      padding: 4px 10px;
      transition: all 0.15s;
    }

    .filter-btn.active {
      background: #3b82f6;
      border-color: #3b82f6;
      color: #fff;
    }

    /* Table */
    .table-wrap {
      overflow-x: auto;
      border-radius: 10px;
      border: 1px solid #1e293b;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
    }

    thead th {
      background: #1e293b;
      color: #64748b;
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      padding: 10px 12px;
      text-align: left;
      text-transform: uppercase;
      white-space: nowrap;
    }

    tbody tr {
      border-top: 1px solid #1e293b;
      transition: background 0.1s;
    }

    tbody tr:hover { background: #1e293b; }
    tbody tr.hidden { display: none; }

    td {
      padding: 10px 12px;
      vertical-align: top;
    }

    td.num { color: #64748b; font-size: 0.7rem; white-space: nowrap; }
    td.date { color: #64748b; font-size: 0.7rem; white-space: nowrap; }
    td.company { white-space: nowrap; }
    td.role { color: #cbd5e1; max-width: 200px; }
    td.score { white-space: nowrap; font-weight: 600; font-size: 0.75rem; }
    td.notes { color: #94a3b8; font-size: 0.7rem; max-width: 260px; line-height: 1.4; }

    .score-bar {
      height: 3px;
      background: #1e293b;
      border-radius: 2px;
      margin-top: 3px;
      width: 48px;
    }
    .score-fill { height: 100%; border-radius: 2px; }

    .badge {
      border-radius: 4px;
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 600;
      padding: 2px 7px;
      white-space: nowrap;
    }

    .pdf-yes {
      background: #065f46;
      border-radius: 4px;
      color: #6ee7b7;
      font-size: 0.6rem;
      font-weight: 600;
      padding: 2px 5px;
    }

    /* Pipeline */
    .pipeline-list { display: flex; flex-direction: column; gap: 8px; }

    .pipeline-item {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 10px 12px;
    }

    .pipeline-meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
    .pipeline-role { color: #64748b; font-size: 0.75rem; }
    .pipeline-url { color: #60a5fa; font-size: 0.7rem; word-break: break-all; text-decoration: none; }
    .pipeline-url:hover { text-decoration: underline; }

    .empty { color: #64748b; font-size: 0.85rem; padding: 12px 0; }

    .updated { color: #475569; font-size: 0.65rem; margin-top: 4px; }

    @media (min-width: 640px) {
      .header, .section { padding-left: 24px; padding-right: 24px; }
      .stats-grid { grid-template-columns: repeat(6, 1fr); }
    }
  </style>
</head>
<body>

<div class="header">
  <h1>Career Dashboard</h1>
  <div class="subtitle">Alain Rex Banilad · Senior QA / SDET · Singapore</div>
  <div class="updated">Updated ${now} SGT</div>
</div>

<div class="section">
  <div class="section-title">Overview</div>
  ${buildStatsSection(stats)}
</div>

<div class="section" style="margin-top:20px">
  <div class="section-title">Applications (${apps.length})</div>
  <div class="filter-row" id="filter-row">
    ${statusOptions.map((s, i) => `
      <button class="filter-btn${i === 0 ? ' active' : ''}" data-status="${s}" onclick="filterTable(this)">${s}</button>
    `).join('')}
  </div>
  ${buildApplicationsTable(apps)}
</div>

<div class="section" style="margin-top:24px">
  <div class="section-title">Pipeline — Pending Evaluation (${pipeline.length})</div>
  ${buildPipelineSection(pipeline)}
</div>

<script>
  function filterTable(btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const status = btn.dataset.status;
    document.querySelectorAll('#apps-table tbody tr').forEach(row => {
      if (status === 'All') {
        row.classList.remove('hidden');
      } else {
        const badge = row.querySelector('.badge');
        const rowStatus = badge ? badge.textContent.trim() : '';
        row.classList.toggle('hidden', rowStatus !== status);
      }
    });
  }
</script>

</body>
</html>`;
}

// ── Entry Point ──────────────────────────────────────────────────────

function main() {
  if (!existsSync(APPLICATIONS_PATH)) {
    console.error('ERROR: data/applications.md not found');
    process.exit(1);
  }

  const appsContent = readFileSync(APPLICATIONS_PATH, 'utf8');
  const pipelineContent = existsSync(PIPELINE_PATH)
    ? readFileSync(PIPELINE_PATH, 'utf8')
    : '';

  const apps = parseApplications(appsContent);
  const pipeline = parsePipeline(pipelineContent);
  const stats = computeStats(apps);

  if (!existsSync(DOCS_DIR)) {
    mkdirSync(DOCS_DIR, { recursive: true });
  }

  const html = buildHtml(apps, pipeline, stats);
  writeFileSync(OUTPUT_PATH, html, 'utf8');

  console.log(`✓ Dashboard exported → docs/index.html`);
  console.log(`  ${apps.length} applications · ${pipeline.length} pending in pipeline`);
  console.log(`  Stats: Applied=${stats.byStatus['Applied'] || 0} Interview=${stats.byStatus['Interview'] || 0} Offer=${stats.byStatus['Offer'] || 0}`);
}

main();
