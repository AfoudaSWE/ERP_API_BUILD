import { useState } from 'react';
import {
  Server, Plus, RefreshCw, Trash2, CheckCircle2, X, Shield,
  WifiOff, Wrench, ExternalLink, Copy, Check,
} from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import { discoverMcpServer, validateMcpEndpoint } from '../domain/mcpClient';
import { checkOllama } from '../../../services/ollamaService';

const TEST_ENDPOINT = 'http://127.0.0.1:7331/mcp';

export default function ConnectionsPage() {
  const connections = useWorkflowStore(state => state.connections);
  const addConnection = useWorkflowStore(state => state.addConnection);
  const updateConnection = useWorkflowStore(state => state.updateConnection);
  const removeConnection = useWorkflowStore(state => state.removeConnection);
  const [testing, setTesting] = useState(null);
  const [results, setResults] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const testConnection = async connection => {
    setTesting(connection.id);
    setResults(current => ({ ...current, [connection.id]: null }));
    try {
      if (connection.type === 'ollama') {
        const value = await checkOllama();
        const result = value.available
          ? { ok: true, text: `Connected · ${value.models.length} models` }
          : { ok: false, text: 'Model qwen2.5-coder:7b is not available. Run: ollama pull qwen2.5-coder:7b' };
        setResults(current => ({ ...current, [connection.id]: result }));
        updateConnection(connection.id, { status: result.ok ? 'connected' : 'error', lastTestedAt: new Date().toISOString() });
        return;
      }

      const discovery = await discoverMcpServer(connection.endpoint);
      const updates = {
        status: 'connected',
        tools: discovery.tools,
        toolCount: discovery.tools.length,
        serverInfo: discovery.serverInfo,
        protocolVersion: discovery.protocolVersion,
        lastTestedAt: new Date().toISOString(),
      };
      updateConnection(connection.id, updates);
      setResults(current => ({
        ...current,
        [connection.id]: {
          ok: true,
          text: `Connected to ${discovery.serverInfo.name} · ${discovery.tools.length} tool${discovery.tools.length === 1 ? '' : 's'} discovered`,
        },
      }));
    } catch (error) {
      updateConnection(connection.id, { status: 'error', lastTestedAt: new Date().toISOString() });
      setResults(current => ({
        ...current,
        [connection.id]: { ok: false, text: mcpErrorMessage(error, connection.type) },
      }));
    } finally {
      setTesting(null);
    }
  };

  const addMcp = values => {
    const endpoint = validateMcpEndpoint(values.endpoint);
    const connection = {
      id: `mcp_${crypto.randomUUID().slice(0, 8)}`,
      type: 'mcp',
      name: values.name.trim(),
      status: 'unknown',
      transport: 'Streamable HTTP',
      endpoint,
      tools: [],
      toolCount: 0,
      lastTestedAt: null,
    };
    addConnection(connection);
    setDialogOpen(false);
    queueMicrotask(() => testConnection(connection));
  };

  const copyCommand = async () => {
    await navigator.clipboard.writeText('npm run mcp:test-server');
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div data-tour="agent-connections" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Agent Connections</h1>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Connect local Ollama and Streamable HTTP MCP servers, then discover their tools.</p>
        </div>
        <button onClick={() => setDialogOpen(true)} className="ui-button ui-button-primary px-3 py-2 text-xs">
          <Plus size={14} /> Add MCP server
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-500">
          <Shield size={14} className="mr-2 inline" />
          Browser demo: only public/local endpoints without credentials are supported. Production URLs and secrets belong in an authenticated server gateway.
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-[10px]">
          <span><strong>Test server:</strong> npm run mcp:test-server</span>
          <button onClick={copyCommand} className="rounded p-1 text-indigo-500 hover:bg-indigo-500/10" aria-label="Copy test server command">{copied ? <Check size={13} /> : <Copy size={13} />}</button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {connections.map(connection => (
          <ConnectionCard
            key={connection.id}
            connection={connection}
            result={results[connection.id]}
            testing={testing === connection.id}
            onTest={() => testConnection(connection)}
            onRemove={() => removeConnection(connection.id)}
          />
        ))}
      </div>

      {dialogOpen && <AddMcpDialog onAdd={addMcp} onClose={() => setDialogOpen(false)} />}
    </div>
  );
}

function ConnectionCard({ connection, result, testing, onTest, onRemove }) {
  const toolCount = Array.isArray(connection.tools) ? connection.tools.length : connection.toolCount ?? Number(connection.tools) ?? 0;
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-start justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-500"><Server size={18} /></span>
        <StatusBadge status={connection.status} />
      </div>
      <h2 className="mt-3 text-sm font-semibold">{connection.name}</h2>
      <p className="mt-1 break-all text-[10px] text-[var(--muted-foreground)]">
        {connection.type === 'ollama' ? `Model: ${connection.model} · URL: ${connection.baseUrl}` : connection.endpoint}
      </p>
      {connection.type === 'mcp' && (
        <div className="mt-3 flex flex-wrap gap-2 text-[9px] text-[var(--muted-foreground)]">
          <span className="rounded-md bg-[var(--muted)] px-2 py-1">{connection.transport}</span>
          <span className="rounded-md bg-[var(--muted)] px-2 py-1">{toolCount} tools</span>
          {connection.protocolVersion && <span className="rounded-md bg-[var(--muted)] px-2 py-1">MCP {connection.protocolVersion}</span>}
        </div>
      )}
      {Array.isArray(connection.tools) && connection.tools.length > 0 && (
        <div className="mt-3 space-y-1.5 rounded-lg border border-[var(--border)] p-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Discovered tools</p>
          {connection.tools.map(tool => (
            <div key={tool.name} className="flex items-start gap-2 text-[10px]"><Wrench size={11} className="mt-0.5 shrink-0 text-indigo-500" /><span><strong>{tool.name}</strong>{tool.description ? ` — ${tool.description}` : ''}</span></div>
          ))}
        </div>
      )}
      {result && (
        <div role="status" className={`mt-3 flex items-start gap-2 rounded-lg p-2 text-[10px] ${result.ok ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
          {result.ok ? <CheckCircle2 size={13} className="shrink-0" /> : <WifiOff size={13} className="shrink-0" />}<span>{result.text}</span>
        </div>
      )}
      {connection.lastTestedAt && <p className="mt-2 text-[9px] text-[var(--muted-foreground)]">Last tested {new Date(connection.lastTestedAt).toLocaleString()}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={onTest} disabled={testing} className="ui-button flex-1 px-3 py-2 text-xs">
          <RefreshCw size={12} className={testing ? 'animate-spin' : ''} />{testing ? 'Connecting…' : connection.type === 'ollama' ? 'Test connection' : 'Test & discover'}
        </button>
        {connection.type === 'mcp' && <button onClick={onRemove} className="ui-button px-3 text-red-500" aria-label={`Remove ${connection.name}`}><Trash2 size={13} /></button>}
      </div>
    </article>
  );
}

function AddMcpDialog({ onAdd, onClose }) {
  const [name, setName] = useState('Local test MCP');
  const [endpoint, setEndpoint] = useState(TEST_ENDPOINT);
  const [error, setError] = useState('');
  const submit = event => {
    event.preventDefault();
    try {
      if (!name.trim()) throw new Error('Server name is required.');
      validateMcpEndpoint(endpoint);
      onAdd({ name, endpoint });
    } catch (submitError) {
      setError(submitError.message);
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="add-mcp-title">
        <div className="flex items-center justify-between"><div><h2 id="add-mcp-title" className="text-base font-semibold">Add MCP server</h2><p className="mt-1 text-[10px] text-[var(--muted-foreground)]">The connection is tested immediately after it is saved.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--muted)]" aria-label="Close"><X size={15} /></button></div>
        <label className="mt-5 block text-[10px] font-medium">Server name<input autoFocus value={name} onChange={event => setName(event.target.value)} className="workflow-input mt-1.5" placeholder="Inventory tools" /></label>
        <label className="mt-3 block text-[10px] font-medium">Streamable HTTP endpoint<input value={endpoint} onChange={event => setEndpoint(event.target.value)} className="workflow-input mt-1.5" placeholder="http://127.0.0.1:7331/mcp" /></label>
        <p className="mt-2 flex items-center gap-1 text-[9px] text-[var(--muted-foreground)]"><ExternalLink size={10} />The endpoint must allow this browser origin through CORS.</p>
        {error && <p className="mt-3 rounded-lg bg-red-500/10 p-2 text-[10px] text-red-500">{error}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="ui-button px-3 py-2 text-xs">Cancel</button><button type="submit" className="ui-button ui-button-primary px-3 py-2 text-xs"><Plus size={13} />Add and test</button></div>
      </form>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = status === 'connected' ? 'bg-emerald-500/10 text-emerald-600' : status === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-[var(--muted)] text-[var(--muted-foreground)]';
  return <span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase ${styles}`}>{status ?? 'unknown'}</span>;
}

function mcpErrorMessage(error, type) {
  if (type === 'ollama') return `Ollama unavailable: ${error.message}`;
  if (error instanceof TypeError && /fetch/i.test(error.message)) return 'Could not reach the MCP endpoint. Start the server and confirm its CORS origin settings.';
  return `MCP connection failed: ${error.message}`;
}
