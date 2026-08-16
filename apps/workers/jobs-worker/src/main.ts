import { readWorkerEnvironment } from './config.js';
import { startWorker } from './runtime.js';

const runtime = startWorker(readWorkerEnvironment());
let shutdownStarted = false;
async function shutdown(signal: string) {
  if (shutdownStarted) return; shutdownStarted = true; console.info('worker.shutdown', { signal });
  try { await runtime.close(); process.exitCode = 0; } catch (error) { console.error('worker.shutdown.failed', { error: error instanceof Error ? error.message : 'Unknown error' }); process.exitCode = 1; }
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
