const PROTOCOL_VERSION = '2025-06-18';

function parseEventStream(text) {
  const data = text
    .split(/\r?\n/)
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trim())
    .find(Boolean);
  if (!data) throw new Error('The MCP server returned an empty event stream.');
  return JSON.parse(data);
}

async function readResponse(response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (response.status === 202 || response.status === 204) return null;
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}${text ? `: ${text.slice(0, 180)}` : ''}`);
  if (!text) return null;
  return contentType.includes('text/event-stream') ? parseEventStream(text) : JSON.parse(text);
}

async function postRpc(endpoint, body, { sessionId, signal } = {}) {
  const headers = {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
    'MCP-Protocol-Version': PROTOCOL_VERSION,
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
    credentials: 'omit',
  });
  const payload = await readResponse(response);
  if (payload?.error) throw new Error(payload.error.message ?? 'MCP JSON-RPC request failed.');
  return { payload, response };
}

export function validateMcpEndpoint(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Enter a valid HTTP or HTTPS MCP endpoint.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only Streamable HTTP endpoints are supported.');
  return url.toString();
}

export async function discoverMcpServer(endpoint, { signal } = {}) {
  const safeEndpoint = validateMcpEndpoint(endpoint);
  const initialize = await postRpc(safeEndpoint, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'retail-twin-connections', version: '1.0.0' },
    },
  }, { signal });
  const initialized = initialize.payload?.result;
  if (!initialized) throw new Error('The endpoint did not return an MCP initialize result.');
  const sessionId = initialize.response.headers.get('mcp-session-id');

  await postRpc(safeEndpoint, {
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  }, { sessionId, signal });

  const listed = await postRpc(safeEndpoint, {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {},
  }, { sessionId, signal });
  const tools = listed.payload?.result?.tools;
  if (!Array.isArray(tools)) throw new Error('The server did not return a valid tools list.');

  return {
    endpoint: safeEndpoint,
    protocolVersion: initialized.protocolVersion ?? PROTOCOL_VERSION,
    serverInfo: initialized.serverInfo ?? { name: 'Unknown MCP server', version: 'Unknown' },
    capabilities: initialized.capabilities ?? {},
    tools: tools.map(tool => ({ name: tool.name, description: tool.description ?? '', inputSchema: tool.inputSchema ?? {} })),
  };
}

export { PROTOCOL_VERSION };
