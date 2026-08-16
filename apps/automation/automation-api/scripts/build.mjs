import { cp, mkdir, rm } from 'node:fs/promises';

const output = 'dist/apps/automation/automation-api';
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp('apps/automation/automation-api/src', `${output}/src`, { recursive: true });
