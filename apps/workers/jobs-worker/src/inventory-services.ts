import type { Pool } from 'pg';
import type { IdempotencyStore, InventoryJobService } from '@erp/jobs-processors';

export class PgInventoryJobServices implements InventoryJobService, IdempotencyStore {
  constructor(private readonly pool: Pool) {}
  async checkLowStock(companyId: string) {
    const result = await this.pool.query<{ id: string }>(`SELECT id FROM products WHERE company_id=$1 AND is_active=true AND type <> 'service' AND total_stock <= reorder_level ORDER BY id`, [companyId]);
    return { checked: result.rowCount ?? result.rows.length, lowStockProductIds: result.rows.map((row) => row.id) };
  }
  async runOnce<T>(key: string, context: { queue: string; name: string }, work: () => Promise<T>) {
    const claim = await this.pool.query(`INSERT INTO job_executions(job_id,queue_name,job_name,status,locked_until)
      VALUES($1,$2,$3,'processing',now()+interval '15 minutes')
      ON CONFLICT(job_id) DO UPDATE SET status='processing',attempts=job_executions.attempts+1,locked_until=now()+interval '15 minutes',last_error=NULL
      WHERE job_executions.status='failed' OR job_executions.locked_until < now()
      RETURNING job_id`, [key, context.queue, context.name]);
    if (!claim.rowCount) return { executed: false };
    try {
      const value = await work();
      await this.pool.query(`UPDATE job_executions SET status='completed',completed_at=now(),locked_until=now() WHERE job_id=$1`, [key]);
      return { executed: true, value };
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : 'Unknown processor error';
      await this.pool.query(`UPDATE job_executions SET status='failed',last_error=$2,locked_until=now() WHERE job_id=$1`, [key, message]);
      throw error;
    }
  }
}
