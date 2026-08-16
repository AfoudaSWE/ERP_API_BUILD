import { createApp, setAcceptingTraffic } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/client.js';
import { closeJobPublisher } from './features/jobs/routes.js';

const server = createApp().listen(env.PORT, () => {
  console.log(`ERP API listening at http://localhost:${env.PORT}/api`);
});
server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.keepAliveTimeout = 5_000;

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  setAcceptingTraffic(false);
  console.log(`${signal} received, shutting down`);
  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timed out');
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();
  server.close(() => Promise.all([pool.end(), closeJobPublisher()]).then(() => {
    clearTimeout(forceExit);
    process.exit(0);
  }).catch((error) => {
    console.error('Shutdown failed', error);
    process.exit(1);
  }));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
