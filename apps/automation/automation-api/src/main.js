import { loadConfig } from './config.js';
import { createAutomationServer } from './server.js';

try {
  const config = loadConfig();
  createAutomationServer({ config }).listen(config.port, '127.0.0.1', () => {
    console.log(`RealTwin automation API listening on http://127.0.0.1:${config.port}`);
  });
} catch (error) {
  console.error(`Automation API configuration error: ${error.message}`);
  process.exitCode = 1;
}
