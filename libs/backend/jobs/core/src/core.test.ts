import { describe, expect, it } from 'vitest';
import { DEFAULT_JOB_OPTIONS, readRedisEnvironment } from './index.js';

describe('job core configuration', () => {
  it('validates and coerces Redis configuration', () => { expect(readRedisEnvironment({ REDIS_PORT: '6380', REDIS_TLS: 'true' })).toMatchObject({ REDIS_PORT: 6380, REDIS_TLS: true }); });
  it('uses bounded exponential retries and retention', () => { expect(DEFAULT_JOB_OPTIONS).toMatchObject({ attempts: 4, backoff: { type: 'exponential' }, removeOnComplete: expect.any(Object), removeOnFail: expect.any(Object) }); });
});
