/**
 * cli.mjs — Command-line interface for automation
 *
 * Commands: start, stop, status, validate-config, run-once
 */

import { Orchestrator } from './orchestrator.mjs';
import { SchedulerConfig } from './scheduler-config.mjs';
import { ConfigValidator } from './config-validator.mjs';
import { MetricsTracker } from './metrics.mjs';

const args = process.argv.slice(2);
const command = args[0] || 'help';

async function main() {
  try {
    // Load config
    const configLoader = new SchedulerConfig('config/profile.yml');
    const config = { automation: configLoader.load() };

    const orchestrator = new Orchestrator(config);

    switch (command) {
      case 'start':
        if (!(await orchestrator.initialize())) {
          process.exit(1);
        }
        if (!(await orchestrator.start())) {
          process.exit(1);
        }
        console.log('\n✅ Automation started. Press Ctrl+C to stop.');
        // Keep process alive
        await new Promise(resolve => {
          process.on('SIGINT', () => {
            console.log('\n\nStopping...');
            orchestrator.stop().then(() => resolve());
          });
        });
        break;

      case 'stop':
        if (!(await orchestrator.initialize())) {
          process.exit(1);
        }
        if (!(await orchestrator.stop())) {
          process.exit(1);
        }
        break;

      case 'status':
        console.log('📊 Orchestrator Status:');
        console.log(JSON.stringify(orchestrator.getStatus(), null, 2));
        break;

      case 'validate-config':
        const validation = ConfigValidator.validate(config.automation);
        if (validation.valid) {
          console.log('✅ Configuration is valid');
        } else {
          console.error('❌ Configuration validation failed:');
          validation.errors.forEach(e => console.error(`   - ${e}`));
          process.exit(1);
        }
        break;

      case 'run-once':
        const action = args[1] || 'full';
        if (!(await orchestrator.initialize())) {
          process.exit(1);
        }
        console.log(`Running action: ${action}`);
        // Trigger one cycle manually
        if (orchestrator.schedulers) {
          await orchestrator._handleTrigger({ backend: 'cli' });
        }
        break;

      case 'metrics':
        new MetricsTracker().printReport(30);
        break;

      case 'help':
      default:
        console.log(`
Career-Ops Automation CLI

Usage: node cli.mjs <command>

Commands:
  start              Start automation orchestrator (runs indefinitely)
  stop               Stop automation orchestrator
  status             Show current status
  validate-config    Validate configuration
  run-once           Run single automation cycle
  metrics            Show uptime metrics (last 30 days)
  help               Show this help message

Examples:
  node cli.mjs start
  node cli.mjs status
  node cli.mjs validate-config
  node cli.mjs metrics
        `);
        break;
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
