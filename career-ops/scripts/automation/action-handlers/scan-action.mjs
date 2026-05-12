import { ScanOrchestrator } from '../scan-orchestrator.mjs';

export async function runScanAction(config = {}) {
  const scanner = new ScanOrchestrator(config);
  return scanner.executeScan();
}

export default runScanAction;
