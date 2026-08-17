import { Router } from 'express';
import { z, type ZodObject, type ZodRawShape } from 'zod';
import { query } from '../../db/client.js';
import { HttpError, validate } from '../../lib/http.js';
import { serializeRow, serializeRows } from '../../lib/rows.js';
import { authorizeAny } from '../auth/middleware.js';

interface CrudConfig<T extends ZodRawShape> {
  table: 'customers' | 'suppliers' | 'products' | 'categories' | 'brands';
  schema: ZodObject<T>;
  columns: Record<string, string>;
  searchColumns: string[];
  permissionBase: 'products' | 'customers' | 'suppliers';
}

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().max(100).default(''),
});

export function createCrudRouter<T extends ZodRawShape>({ table, schema, columns, searchColumns, permissionBase }: CrudConfig<T>) {
  const router = Router();

  router.get('/', authorizeAny(`${permissionBase}.view`, `${permissionBase}.read`, ...(permissionBase === 'products' || permissionBase === 'customers' ? ['pos.use'] : [])), async (request, response) => {
    const { page, pageSize, search } = validate(paginationSchema, request.query);
    const values: unknown[] = [request.auth!.companyId];
    let where = 'company_id = $1';
    if (search) {
      values.push(`%${search}%`);
      where += ` AND (${searchColumns.map((column) => `${column} ILIKE $2`).join(' OR ')})`;
    }
    const count = await query<{ count: string }>(`SELECT count(*) FROM ${table} WHERE ${where}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const rows = await query(`SELECT * FROM ${table} WHERE ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    response.json({ data: serializeRows(rows.rows), meta: { page, pageSize, total: Number(count.rows[0].count) } });
  });

  router.get('/:id', authorizeAny(`${permissionBase}.view`, `${permissionBase}.read`, ...(permissionBase === 'products' || permissionBase === 'customers' ? ['pos.use'] : [])), async (request, response) => {
    const result = await query(`SELECT * FROM ${table} WHERE id = $1 AND company_id = $2`, [request.params.id, request.auth!.companyId]);
    if (!result.rows[0]) throw new HttpError(404, 'NOT_FOUND', 'Record not found');
    response.json({ data: serializeRow(result.rows[0]) });
  });

  router.post('/', authorizeAny(`${permissionBase}.create`, `${permissionBase}.write`), async (request, response) => {
    const input = validate(schema, request.body) as Record<string, unknown>;
    const entries = Object.entries(input).filter(([key]) => columns[key]);
    const dbColumns = ['company_id', ...entries.map(([key]) => columns[key])];
    const values = [request.auth!.companyId, ...entries.map(([, value]) => value)];
    const placeholders = values.map((_, index) => `$${index + 1}`);
    const result = await query(`INSERT INTO ${table} (${dbColumns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`, values);
    response.status(201).json({ data: serializeRow(result.rows[0]) });
  });

  router.patch('/:id', authorizeAny(`${permissionBase}.update`, `${permissionBase}.write`), async (request, response) => {
    const input = validate(schema.partial(), request.body) as Record<string, unknown>;
    const entries = Object.entries(input).filter(([key]) => columns[key]);
    if (!entries.length) throw new HttpError(400, 'EMPTY_UPDATE', 'No update fields were provided');
    const values = entries.map(([, value]) => value);
    const set = entries.map(([key], index) => `${columns[key]} = $${index + 1}`);
    values.push(request.params.id, request.auth!.companyId);
    const result = await query(
      `UPDATE ${table} SET ${set.join(', ')}, updated_at = now() WHERE id = $${values.length - 1} AND company_id = $${values.length} RETURNING *`,
      values,
    );
    if (!result.rows[0]) throw new HttpError(404, 'NOT_FOUND', 'Record not found');
    response.json({ data: serializeRow(result.rows[0]) });
  });

  router.delete('/:id', authorizeAny(`${permissionBase}.delete`, `${permissionBase}.write`), async (request, response) => {
    const result = await query(`DELETE FROM ${table} WHERE id = $1 AND company_id = $2 RETURNING id`, [request.params.id, request.auth!.companyId]);
    if (!result.rows[0]) throw new HttpError(404, 'NOT_FOUND', 'Record not found');
    response.status(204).send();
  });

  return router;
}
