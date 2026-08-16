import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export class AuditRepository {
  constructor(file) { this.file = file; }

  async append(record) {
    const safe = {
      id: record.id || crypto.randomUUID(),
      workflowId: String(record.workflowId),
      workflowName: String(record.workflowName),
      n8nExecutionId: record.n8nExecutionId ? String(record.n8nExecutionId) : null,
      triggerSource: String(record.triggerSource || 'manual'),
      storeId: record.storeId ? String(record.storeId) : null,
      branchId: record.branchId ? String(record.branchId) : null,
      status: String(record.status),
      startedAt: record.startedAt || null,
      completedAt: record.completedAt || null,
      durationMs: Number.isFinite(record.durationMs) ? record.durationMs : null,
      correlationId: String(record.correlationId),
      idempotencyKey: record.idempotencyKey ? String(record.idempotencyKey) : null,
      requestedBy: String(record.requestedBy),
      errorCode: record.errorCode ? String(record.errorCode) : null,
      errorMessage: record.errorMessage ? String(record.errorMessage).slice(0, 300) : null,
      createdAt: new Date().toISOString(),
    };
    await mkdir(dirname(this.file), { recursive: true });
    await appendFile(this.file, `${JSON.stringify(safe)}\n`, { encoding: 'utf8', mode: 0o600 });
    return safe;
  }

  async findByIdempotencyKey(key) {
    if (!key) return null;
    try {
      const content = await readFile(this.file, 'utf8');
      return content.trim().split('\n').reverse().map(line => JSON.parse(line)).find(item => item.idempotencyKey === key) || null;
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }
}
