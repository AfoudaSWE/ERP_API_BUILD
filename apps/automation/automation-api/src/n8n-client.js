export class N8nError extends Error {
  constructor(message, { code = 'N8N_ERROR', status = 502, retryable = false } = {}) {
    super(message);
    this.name = 'N8nError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export class N8nClient {
  constructor(config, fetchImpl = fetch) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  async request(path, { method = 'GET', body, webhook = false, correlationId, idempotencyKey } = {}) {
    if (!this.config.n8nEnabled) throw new N8nError('Automation integration is disabled', { code: 'AUTOMATION_DISABLED', status: 503 });
    if (!webhook && !this.config.n8nApiKey) throw new N8nError('Automation API is not configured', { code: 'AUTOMATION_UNCONFIGURED', status: 503 });
    if (webhook && !this.config.n8nWebhookSecret) throw new N8nError('Automation webhook is not configured', { code: 'AUTOMATION_UNCONFIGURED', status: 503 });
    const base = webhook ? this.config.n8nWebhookBaseUrl : `${this.config.n8nBaseUrl}/api/v1`;
    const headers = { accept: 'application/json', 'x-correlation-id': correlationId || crypto.randomUUID() };
    if (body) headers['content-type'] = 'application/json';
    if (webhook) headers['x-realtwin-webhook-secret'] = this.config.n8nWebhookSecret;
    else headers['x-n8n-api-key'] = this.config.n8nApiKey;
    if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;

    const attempts = method === 'GET' ? 2 : 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const response = await this.fetchImpl(`${base}${path}`, {
          method, headers, body: body ? JSON.stringify(body) : undefined, signal: controller.signal,
        });
        const data = await readJson(response);
        if (!response.ok) throw mapHttpError(response.status);
        return data;
      } catch (error) {
        const mapped = mapTransportError(error);
        if (attempt + 1 < attempts && mapped.retryable) {
          await delay(100);
          continue;
        }
        throw mapped;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  health() { return this.request('/workflows?limit=1'); }
  workflows(query = '') { return this.request(`/workflows${query}`); }
  workflow(id) { return this.request(`/workflows/${encodeURIComponent(id)}`); }
  executions(query = '') { return this.request(`/executions${query}`); }
  execution(id) { return this.request(`/executions/${encodeURIComponent(id)}?includeData=true`); }
  trigger(path, payload, context) {
    return this.request(`/${path}`, { method: 'POST', body: payload, webhook: true, ...context });
  }
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { throw new N8nError('Automation service returned an invalid response', { code: 'N8N_INVALID_RESPONSE' }); }
}

function mapHttpError(status) {
  if (status === 401 || status === 403) return new N8nError('Automation service authentication failed', { code: 'N8N_AUTH_FAILED', status: 502 });
  if (status === 404) return new N8nError('Automation resource was not found', { code: 'N8N_NOT_FOUND', status: 404 });
  if (status === 429) return new N8nError('Automation service rate limit reached', { code: 'N8N_RATE_LIMITED', status: 503, retryable: true });
  return new N8nError('Automation service request failed', { code: 'N8N_UPSTREAM_ERROR', retryable: status >= 500 });
}

function mapTransportError(error) {
  if (error instanceof N8nError) return error;
  if (error?.name === 'AbortError') return new N8nError('Automation service timed out', { code: 'N8N_TIMEOUT', status: 504, retryable: true });
  return new N8nError('Automation service is unavailable', { code: 'N8N_UNAVAILABLE', status: 503, retryable: true });
}

export function sanitizeExecution(execution) {
  const data = execution?.data?.resultData || {};
  return {
    id: String(execution?.id || ''),
    workflowId: String(execution?.workflowId || ''),
    workflowName: execution?.workflowData?.name || execution?.workflowName || 'Unknown workflow',
    status: normalizeStatus(execution?.status || (execution?.finished ? 'success' : 'running')),
    startedAt: execution?.startedAt || null,
    stoppedAt: execution?.stoppedAt || null,
    durationMs: duration(execution?.startedAt, execution?.stoppedAt),
    triggerSource: execution?.mode || 'unknown',
    errorSummary: safeMessage(data?.error?.message),
    inputSummary: summarize(data?.runData, 'Workflow input is retained in n8n and is not exposed here.'),
    outputSummary: summarize(data?.lastNodeExecuted, 'No output summary is available.'),
    retryAvailable: ['error', 'crashed'].includes(execution?.status),
  };
}

const normalizeStatus = value => ({ error: 'failed', crashed: 'failed', new: 'running', waiting: 'running' }[value] || value || 'unknown');
const duration = (start, end) => start && end ? Math.max(0, new Date(end) - new Date(start)) : null;
const safeMessage = value => value ? String(value).replace(/(bearer|token|password|secret|authorization|api[-_ ]?key)\s*[:=]\s*\S+/gi, '$1=[REDACTED]').slice(0, 300) : null;
const summarize = (value, fallback) => typeof value === 'string' && value ? safeMessage(value) : fallback;
