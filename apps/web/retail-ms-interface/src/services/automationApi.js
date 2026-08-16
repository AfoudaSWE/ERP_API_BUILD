const API_BASE = (import.meta.env.VITE_AUTOMATION_API_URL || 'http://localhost:3334').replace(/\/$/, '');

export class AutomationApiError extends Error {
  constructor(message, code, correlationId) {
    super(message);
    this.name = 'AutomationApiError';
    this.code = code;
    this.correlationId = correlationId;
  }
}

async function request(path, { user, method = 'GET', body, idempotencyKey, signal } = {}) {
  const correlationId = crypto.randomUUID();
  const response = await fetch(`${API_BASE}/api/automation${path}`, {
    method,
    signal,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-correlation-id': correlationId,
      'x-realtwin-user-id': user?.id || '',
      'x-realtwin-role': user?.role || '',
      'x-realtwin-permissions': (user?.permissions || []).filter(item => item.startsWith('automation:')).join(','),
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new AutomationApiError(data?.error?.message || 'Automation request failed', data?.error?.code || 'REQUEST_FAILED', data?.error?.correlationId || correlationId);
  return data;
}

export const automationApi = {
  status: (user, signal) => request('/status', { user, signal }),
  workflows: (user, params, signal) => request(`/workflows?${new URLSearchParams(params)}`, { user, signal }),
  executions: (user, params, signal) => request(`/executions?${new URLSearchParams(params)}`, { user, signal }),
  execution: (user, id, signal) => request(`/executions/${encodeURIComponent(id)}`, { user, signal }),
  execute: (user, id, body, idempotencyKey) => request(`/workflows/${encodeURIComponent(id)}/execute`, { user, method: 'POST', body, idempotencyKey }),
};
