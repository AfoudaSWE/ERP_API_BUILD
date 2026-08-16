import { describe, expect, it, vi } from 'vitest';
import { WorkerRuntime } from './runtime.js';

describe('WorkerRuntime graceful shutdown', () => {
  it('closes workers, events, Redis connections, and the database once', async () => {
    const close = vi.fn().mockResolvedValue(undefined); const quit = vi.fn().mockResolvedValue(undefined); const database = vi.fn().mockResolvedValue(undefined);
    const runtime = new WorkerRuntime([{ close }, { close }], [{ quit }], database); await runtime.close(); await runtime.close();
    expect(close).toHaveBeenCalledTimes(2); expect(quit).toHaveBeenCalledOnce(); expect(database).toHaveBeenCalledOnce();
  });
});
