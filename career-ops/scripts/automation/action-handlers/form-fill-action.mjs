import { FormOrchestrator } from '../form-orchestrator.mjs';

export async function runFormFillAction(config = {}, pipelineEntry = null, userConfig = {}) {
  if (!pipelineEntry) {
    return {
      success: true,
      skipped: true,
      reason: 'No pipeline entry provided',
      timestamp: new Date().toISOString(),
    };
  }

  const formOrchestrator = new FormOrchestrator(config);
  return formOrchestrator.executeFormFill(pipelineEntry, userConfig);
}

export default runFormFillAction;
