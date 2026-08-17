import { pool } from './client.js';
import { seedAccounting } from './chart-of-accounts.js';

if (require.main === module) seedAccounting().then(() => pool.end()).catch((error) => { console.error(error); process.exitCode = 1; });
