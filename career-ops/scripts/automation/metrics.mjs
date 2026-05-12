/**
 * metrics.mjs — Metrics and uptime tracking
 *
 * Tracks automation execution metrics for uptime verification (SC-004).
 * Provides CLI reporting for last 30 days of automation performance.
 */

import fs from 'fs';
import path from 'path';

export class MetricsTracker {
  constructor(logPath = 'logs/automation/metrics.json') {
    this.logPath = logPath;
  }

  /**
   * Record execution metric
   * @param {Object} metric - Metric { timestamp, backend, success, duration, jobsFound, jobsAdded }
   */
  recordMetric(metric) {
    try {
      const logDir = path.dirname(this.logPath);

      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const entry = {
        timestamp: new Date().toISOString(),
        ...metric,
      };

      if (fs.existsSync(this.logPath)) {
        const existing = JSON.parse(fs.readFileSync(this.logPath, 'utf-8'));
        existing.push(entry);
        fs.writeFileSync(this.logPath, JSON.stringify(existing, null, 2));
      } else {
        fs.writeFileSync(this.logPath, JSON.stringify([entry], null, 2));
      }
    } catch (error) {
      console.error(`Failed to record metric: ${error.message}`);
    }
  }

  /**
   * Get uptime metrics for last N days
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Object} Metrics { totalRuns, successfulRuns, failedRuns, uptime, avgDuration }
   */
  getUptimeMetrics(days = 30) {
    try {
      if (!fs.existsSync(this.logPath)) {
        return { totalRuns: 0, successfulRuns: 0, failedRuns: 0, uptime: '0%', avgDuration: 0 };
      }

      const metrics = JSON.parse(fs.readFileSync(this.logPath, 'utf-8'));
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentMetrics = metrics.filter(m => new Date(m.timestamp) > cutoffDate);

      const totalRuns = recentMetrics.length;
      const successfulRuns = recentMetrics.filter(m => m.success).length;
      const failedRuns = totalRuns - successfulRuns;
      const uptime = totalRuns > 0 ? ((successfulRuns / totalRuns) * 100).toFixed(2) : '0';
      const avgDuration = totalRuns > 0
        ? (recentMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / totalRuns).toFixed(2)
        : 0;

      return {
        totalRuns,
        successfulRuns,
        failedRuns,
        uptime: uptime + '%',
        avgDuration: parseFloat(avgDuration),
        days,
      };
    } catch (error) {
      console.error(`Failed to get metrics: ${error.message}`);
      return null;
    }
  }

  /**
   * Print formatted metrics report
   */
  printReport(days = 30) {
    const metrics = this.getUptimeMetrics(days);

    if (!metrics) {
      console.log('No metrics available');
      return;
    }

    console.log(`\n📊 Automation Metrics (Last ${metrics.days} days):`);
    console.log(`   Total Runs: ${metrics.totalRuns}`);
    console.log(`   Successful: ${metrics.successfulRuns}`);
    console.log(`   Failed: ${metrics.failedRuns}`);
    console.log(`   Uptime: ${metrics.uptime}`);
    console.log(`   Avg Duration: ${metrics.avgDuration}s\n`);
  }
}

export default MetricsTracker;
