import { createServer } from 'node:http';
import { loadConfig } from './config.js';
import { AuditRepository } from './audit-repository.js';
import { N8nClient, N8nError, sanitizeExecution } from './n8n-client.js';

const PERMISSIONS = new Set(['automation:read', 'automation:execute', 'automation:manage']);
const buckets = new Map();

export function createAutomationServer(options = {}) {
  const config = options.config || loadConfig();
  const client = options.client || new N8nClient(config);
  const audits = options.audits || new AuditRepository(config.auditFile);
  return createServer(async (request, response) => {
    const correlationId = validId(request.headers['x-correlation-id']) || crypto.randomUUID();
    response.setHeader('x-correlation-id', correlationId);
    try {
      cors(request, response, config);
      if (request.method === 'OPTIONS') return send(response, 204);
      const url = new URL(request.url, 'http://realtwin.local');
      if (!url.pathname.startsWith('/api/automation')) return error(response, 404, 'NOT_FOUND', 'Route not found', correlationId);
      const user = authenticate(request);

      if (request.method === 'GET' && url.pathname === '/api/automation/status') {
        authorize(user, 'automation:read');
        const started = Date.now();
        try {
          await client.health();
          return json(response, 200, {
            enabled: config.n8nEnabled, configured: true, connected: true,
            latencyMs: Date.now() - started, checkedAt: new Date().toISOString(),
            editorUrl: user.permissions.includes('automation:manage') ? config.n8nEditorUrl || null : null,
          });
        } catch (upstreamError) {
          return json(response, 200, {
            enabled: config.n8nEnabled,
            configured: !['AUTOMATION_UNCONFIGURED', 'AUTOMATION_DISABLED'].includes(upstreamError.code),
            connected: false, latencyMs: null, checkedAt: new Date().toISOString(),
            errorCode: upstreamError.code || 'N8N_UNAVAILABLE', editorUrl: null,
          });
        }
      }

      if (request.method === 'GET' && url.pathname === '/api/automation/workflows') {
        authorize(user, 'automation:read');
        const page = positive(url.searchParams.get('page'), 1);
        const pageSize = Math.min(100, positive(url.searchParams.get('pageSize'), 10));
        const result = await client.workflows('?limit=250');
        let workflows = (result?.data || []).map(item => mapWorkflow(item, config.workflowMap));
        const search = (url.searchParams.get('search') || '').toLowerCase();
        const active = url.searchParams.get('active');
        const category = url.searchParams.get('category');
        if (search) workflows = workflows.filter(item => item.name.toLowerCase().includes(search));
        if (active === 'true' || active === 'false') workflows = workflows.filter(item => item.active === (active === 'true'));
        if (category) workflows = workflows.filter(item => item.category === category);
        const total = workflows.length;
        workflows = workflows.slice((page - 1) * pageSize, page * pageSize);
        return json(response, 200, { data: workflows, page, pageSize, total });
      }

      const workflowMatch = url.pathname.match(/^\/api\/automation\/workflows\/([^/]+)$/);
      if (request.method === 'GET' && workflowMatch) {
        authorize(user, 'automation:read');
        const result = await client.workflow(workflowMatch[1]);
        return json(response, 200, mapWorkflow(result, config.workflowMap));
      }

      const executeMatch = url.pathname.match(/^\/api\/automation\/workflows\/([^/]+)\/execute$/);
      if (request.method === 'POST' && executeMatch) {
        authorize(user, 'automation:execute');
        rateLimit(user.id, config.rateLimitPerMinute);
        const alias = decodeURIComponent(executeMatch[1]);
        const workflow = config.workflowMap[alias] || Object.values(config.workflowMap).find(item => item.n8nId === alias);
        if (!workflow?.webhookPath) throw apiError(403, 'WORKFLOW_NOT_ALLOWED', 'This workflow is not configured for manual execution');
        if (!workflow.allowedRoles.includes(user.role)) throw apiError(403, 'FORBIDDEN', 'Your role cannot execute this workflow');
        const body = await readBody(request, config.maxBodyBytes);
        const idempotencyKey = validId(request.headers['idempotency-key']) || validId(body.idempotencyKey);
        if (!idempotencyKey) throw apiError(400, 'IDEMPOTENCY_REQUIRED', 'A valid idempotency key is required');
        const existing = await audits.findByIdempotencyKey(idempotencyKey);
        if (existing) return json(response, 200, { accepted: true, duplicate: true, auditId: existing.id, correlationId: existing.correlationId });
        const payload = validatePayload(body, workflow);
        const startedAt = new Date().toISOString();
        try {
          const result = await client.trigger(workflow.webhookPath, payload, { correlationId, idempotencyKey });
          const completedAt = new Date().toISOString();
          const audit = await audits.append({
            workflowId: alias, workflowName: workflow.name, n8nExecutionId: result?.executionId,
            triggerSource: 'manual', storeId: payload.storeId, branchId: payload.branchId,
            status: 'accepted', startedAt, completedAt, durationMs: new Date(completedAt) - new Date(startedAt),
            correlationId, idempotencyKey, requestedBy: user.id,
          });
          return json(response, 202, { accepted: true, workflow: alias, auditId: audit.id, correlationId, result: sanitizeResult(result) });
        } catch (upstreamError) {
          await audits.append({
            workflowId: alias, workflowName: workflow.name, triggerSource: 'manual', storeId: payload.storeId,
            branchId: payload.branchId, status: 'failed', startedAt, completedAt: new Date().toISOString(),
            correlationId, idempotencyKey, requestedBy: user.id, errorCode: upstreamError.code, errorMessage: upstreamError.message,
          });
          throw upstreamError;
        }
      }

      if (request.method === 'GET' && url.pathname === '/api/automation/executions') {
        authorize(user, 'automation:read');
        const page = positive(url.searchParams.get('page'), 1);
        const pageSize = Math.min(100, positive(url.searchParams.get('pageSize'), 10));
        const query = new URLSearchParams({ limit: String(pageSize) });
        if (url.searchParams.get('workflowId')) query.set('workflowId', url.searchParams.get('workflowId'));
        if (url.searchParams.get('status')) query.set('status', url.searchParams.get('status'));
        const result = await client.executions(`?${query}`);
        const data = (result?.data || []).map(sanitizeExecution);
        return json(response, 200, { data, page, pageSize, total: result?.count ?? data.length, nextCursor: result?.nextCursor || null });
      }

      const executionMatch = url.pathname.match(/^\/api\/automation\/executions\/([^/]+)$/);
      if (request.method === 'GET' && executionMatch) {
        authorize(user, 'automation:read');
        return json(response, 200, sanitizeExecution(await client.execution(executionMatch[1])));
      }

      return error(response, 404, 'NOT_FOUND', 'Route not found', correlationId);
    } catch (caught) {
      const status = caught.status && Number.isInteger(caught.status) ? caught.status : 500;
      const code = caught.code || 'INTERNAL_ERROR';
      const message = status === 500 ? 'An unexpected error occurred' : caught.message;
      return error(response, status, code, message, correlationId);
    }
  });
}

function authenticate(request) {
  const id = validId(request.headers['x-realtwin-user-id']);
  const role = String(request.headers['x-realtwin-role'] || '');
  const permissions = String(request.headers['x-realtwin-permissions'] || '').split(',').filter(value => PERMISSIONS.has(value));
  if (!id || !role) throw apiError(401, 'UNAUTHENTICATED', 'Authentication is required');
  return { id, role, permissions };
}
function authorize(user, permission) { if (!user.permissions.includes(permission)) throw apiError(403, 'FORBIDDEN', 'You do not have permission to perform this action'); }
function rateLimit(key, maximum) {
  const now = Date.now(); const values = (buckets.get(key) || []).filter(value => now - value < 60000);
  if (values.length >= maximum) throw apiError(429, 'RATE_LIMITED', 'Too many automation requests');
  values.push(now); buckets.set(key, values);
}
async function readBody(request, maximum) {
  const chunks = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > maximum) throw apiError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw apiError(400, 'INVALID_JSON', 'Request body must be valid JSON'); }
}
function validatePayload(body, workflow) {
  const source = body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload) ? body.payload : {};
  const combined = { ...source };
  for (const key of ['storeId', 'branchId', 'cameraId']) if (body[key] != null) combined[key] = body[key];
  const allowed = new Set(workflow.allowedPayloadFields);
  const output = {};
  for (const [key, value] of Object.entries(combined)) {
    if (!allowed.has(key)) throw apiError(400, 'INVALID_PAYLOAD_FIELD', `Payload field "${key}" is not allowed`);
    if (typeof value === 'object' && value !== null) throw apiError(400, 'INVALID_PAYLOAD', `Payload field "${key}" must be a scalar value`);
    output[key] = value;
  }
  if (workflow.webhookPath === 'retail-occupancy-alert') {
    for (const key of ['storeId', 'currentOccupancy', 'capacity', 'timestamp']) if (output[key] == null) throw apiError(400, 'INVALID_PAYLOAD', `${key} is required`);
    for (const key of ['currentOccupancy', 'capacity', 'entered', 'exited']) if (output[key] != null && (!Number.isFinite(output[key]) || output[key] < 0)) throw apiError(400, 'INVALID_PAYLOAD', `${key} must be a non-negative number`);
    if (output.capacity <= 0 || output.currentOccupancy > output.capacity * 5) throw apiError(400, 'INVALID_PAYLOAD', 'Occupancy values are outside the permitted range');
    if (Number.isNaN(Date.parse(output.timestamp))) throw apiError(400, 'INVALID_PAYLOAD', 'timestamp must be ISO-8601');
    output.eventType = 'OCCUPANCY_THRESHOLD_EXCEEDED';
  }
  return output;
}
function mapWorkflow(item, workflowMap) {
  const configured = Object.entries(workflowMap).find(([, value]) => value.n8nId === String(item.id));
  return { id: String(item.id), alias: configured?.[0] || null, name: item.name || 'Unnamed workflow', active: Boolean(item.active), category: configured?.[1]?.category || 'Uncategorized', triggerType: configured?.[1]?.webhookPath ? 'Webhook' : 'n8n', executable: Boolean(configured?.[1]?.webhookPath), updatedAt: item.updatedAt || null, tags: (item.tags || []).map(tag => tag.name || tag).filter(Boolean) };
}
function sanitizeResult(result) {
  if (!result || typeof result !== 'object') return null;
  return { accepted: result.accepted === true, workflow: result.workflow ? String(result.workflow) : null, severity: result.severity ? String(result.severity) : null, message: result.message ? String(result.message).slice(0, 300) : null, correlationId: result.correlationId ? String(result.correlationId) : null };
}
function cors(request, response, config) {
  const origin = request.headers.origin;
  if (origin && config.allowedOrigins.includes(origin)) response.setHeader('access-control-allow-origin', origin);
  response.setHeader('vary', 'Origin');
  response.setHeader('access-control-allow-headers', 'content-type,x-correlation-id,x-realtwin-user-id,x-realtwin-role,x-realtwin-permissions,idempotency-key');
  response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
}
const positive = (value, fallback) => { const number = Number(value); return Number.isInteger(number) && number > 0 ? number : fallback; };
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,128}$/.test(value) ? value : null;
const apiError = (status, code, message) => Object.assign(new Error(message), { status, code });
const send = (response, status) => { response.statusCode = status; response.end(); };
const json = (response, status, body) => { response.statusCode = status; response.setHeader('content-type', 'application/json; charset=utf-8'); response.end(JSON.stringify(body)); };
const error = (response, status, code, message, correlationId) => json(response, status, { error: { code, message, correlationId } });

export { validatePayload };
