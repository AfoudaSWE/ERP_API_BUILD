const parseBoolean = (value, fallback) => value == null ? fallback : value === 'true';
const parseInteger = (value, fallback, name) => {
  const parsed = value == null ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
};

export function loadConfig(env = process.env) {
  const baseUrl = env.N8N_BASE_URL || 'http://localhost:5678';
  const webhookBaseUrl = env.N8N_WEBHOOK_BASE_URL || `${baseUrl.replace(/\/$/, '')}/webhook`;
  for (const [name, value] of [['N8N_BASE_URL', baseUrl], ['N8N_WEBHOOK_BASE_URL', webhookBaseUrl]]) {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      throw new Error(`${name} must be a valid HTTP(S) URL`);
    }
  }
  return Object.freeze({
    port: parseInteger(env.AUTOMATION_API_PORT, 3334, 'AUTOMATION_API_PORT'),
    n8nEnabled: parseBoolean(env.N8N_ENABLED, true),
    n8nBaseUrl: baseUrl.replace(/\/$/, ''),
    n8nWebhookBaseUrl: webhookBaseUrl.replace(/\/$/, ''),
    n8nEditorUrl: env.N8N_EDITOR_PUBLIC_URL || '',
    n8nApiKey: env.N8N_API_KEY || '',
    n8nWebhookSecret: env.N8N_WEBHOOK_SECRET || '',
    timeoutMs: parseInteger(env.N8N_REQUEST_TIMEOUT_MS, 10000, 'N8N_REQUEST_TIMEOUT_MS'),
    auditFile: env.AUTOMATION_AUDIT_FILE || 'data/automation-audit.jsonl',
    allowedOrigins: (env.AUTOMATION_ALLOWED_ORIGINS || 'http://localhost:4200,http://localhost:5173').split(',').map(v => v.trim()),
    maxBodyBytes: parseInteger(env.AUTOMATION_MAX_BODY_BYTES, 32768, 'AUTOMATION_MAX_BODY_BYTES'),
    rateLimitPerMinute: parseInteger(env.AUTOMATION_RATE_LIMIT_PER_MINUTE, 10, 'AUTOMATION_RATE_LIMIT_PER_MINUTE'),
    workflowMap: parseWorkflowMap(env.N8N_WORKFLOW_MAP || ''),
  });
}

function parseWorkflowMap(value) {
  if (!value) return {};
  let parsed;
  try { parsed = JSON.parse(value); } catch { throw new Error('N8N_WORKFLOW_MAP must be valid JSON'); }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('N8N_WORKFLOW_MAP must be an object');
  const result = {};
  for (const [alias, item] of Object.entries(parsed)) {
    if (!/^[a-z0-9-]+$/.test(alias) || !item || typeof item !== 'object') throw new Error('N8N_WORKFLOW_MAP contains an invalid entry');
    if (item.webhookPath && (!/^[a-zA-Z0-9/_-]+$/.test(item.webhookPath) || item.webhookPath.includes('..'))) throw new Error(`Invalid webhookPath for ${alias}`);
    result[alias] = {
      n8nId: item.n8nId == null ? null : String(item.n8nId),
      name: String(item.name || alias),
      category: String(item.category || 'Operations'),
      webhookPath: item.webhookPath || null,
      allowedRoles: Array.isArray(item.allowedRoles) ? item.allowedRoles.map(String) : ['ADMIN'],
      allowedPayloadFields: Array.isArray(item.allowedPayloadFields) ? item.allowedPayloadFields.map(String) : [],
    };
  }
  return result;
}
