import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import PageHeader from '../../components/common/PageHeader.jsx';
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx';
import { getAIWorkspace } from '../../services/aiIntelligenceService';
import {
  streamChatWithOllama, checkOllama, generateOperationsBrief,
  getOllamaConfig, saveOllamaConfig, warmOllama,
} from '../../services/ollamaService';
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Bot, Boxes, BrainCircuit,
  CircleDollarSign, Cpu, Footprints,
  Gauge, LayoutGrid, Loader2, MessageSquare, PackageSearch, RefreshCw,
  Send, Settings2, ShieldCheck, Sparkles, Store, Users, WandSparkles, Wifi, WifiOff, Zap,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const ICONS = {
  footfall: Footprints,
  queue: Users,
  movement: Activity,
  placement: LayoutGrid,
  inventory: PackageSearch,
  anomaly: AlertTriangle,
  staffing: Users,
  layout: Boxes,
  promotion: CircleDollarSign,
  energy: Zap,
  loss: ShieldCheck,
  alerts: Gauge,
  benchmark: Store,
};

const QUICK_PROMPTS = [
  'Why could conversion drop today?',
  'Build a staffing plan for the next four hours.',
  'Which inventory actions have the highest revenue impact?',
  'Recommend a safer store layout experiment.',
];

export default function AIIntelligence() {
  const storeId = useAppStore(state => state.selectedStoreId);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState({ checking: true, online: false, available: false });
  const [config, setConfig] = useState(getOllamaConfig);
  const [showSettings, setShowSettings] = useState(false);
  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'I am your local RetailTwin copilot. Ask me about operations, queues, stock, layout, promotions, energy, or portfolio performance.' },
  ]);
  const [question, setQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      setWorkspace(await getAIWorkspace(storeId));
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  const testConnection = useCallback(async () => {
    setConnection(previous => ({ ...previous, checking: true, error: '' }));
    try {
      const result = await checkOllama();
      setConnection({ ...result, checking: false, warming: result.available });
      if (result.available) {
        warmOllama()
          .then(() => setConnection(previous => ({ ...previous, warming: false, warmed: true })))
          .catch(error => setConnection(previous => ({ ...previous, warming: false, warmError: error.message })));
      }
    } catch (error) {
      setConnection({ checking: false, online: false, available: false, error: error.message });
    }
  }, []);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);
  useEffect(() => { testConnection(); }, [testConnection]);

  const categories = useMemo(() => ['All', ...new Set(workspace?.features.map(item => item.category) || [])], [workspace]);
  const visibleFeatures = useMemo(() => (
    activeFilter === 'All' ? workspace?.features : workspace?.features.filter(item => item.category === activeFilter)
  ), [activeFilter, workspace]);

  const runCopilot = useCallback(async prompt => {
    const text = (prompt || question).trim();
    if (!text || !workspace || chatLoading) return;
    const userMessage = { role: 'user', content: text };
    const responseId = `qwen-${Date.now()}`;
    setMessages(previous => [...previous, userMessage, { role: 'assistant', content: '', id: responseId, streaming: true }]);
    setQuestion('');
    setChatLoading(true);
    try {
      const history = [...messages.filter(item => item.role !== 'system').slice(-6), userMessage];
      const answer = await streamChatWithOllama(history, workspace.context, fullText => {
        setMessages(previous => previous.map(message => message.id === responseId ? { ...message, content: fullText } : message));
      });
      setMessages(previous => previous.map(message => message.id === responseId ? { ...message, content: answer, streaming: false } : message));
    } catch (error) {
      setMessages(previous => previous.map(message => message.id === responseId ? { role: 'error', content: error.message, id: responseId } : message));
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, messages, question, workspace]);

  const createBrief = async () => {
    if (!workspace || briefLoading) return;
    setBriefLoading(true);
    try {
      setBrief(await generateOperationsBrief(workspace.context));
    } catch (error) {
      setBrief(`Unable to generate with Ollama. ${error.message}`);
    } finally {
      setBriefLoading(false);
    }
  };

  const saveSettings = async () => {
    saveOllamaConfig(config);
    setShowSettings(false);
    await testConnection();
  };

  return (
    <div>
      <PageHeader
        title="AI Intelligence"
        subtitle="Predictive operations powered by local Qwen 3.5"
        actions={
          <button onClick={loadWorkspace} className="ui-button px-3 py-2 text-xs"><RefreshCw size={13} /> Refresh signals</button>
        }
      />

      <div data-tour="ai-runtime" className="mb-4 flex flex-col gap-3 rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-[var(--card)] to-[var(--card)] p-4 sm:flex-row sm:items-center">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
          <BrainCircuit size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Local AI runtime</h2>
            <ConnectionBadge connection={connection} model={config.model} />
          </div>
          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
            Forecasts run in the app. Briefs, explanations, and copilot answers run locally through Ollama; aggregated anonymous data only.
          </p>
        </div>
        <button onClick={() => setShowSettings(value => !value)} className="ui-button px-3 py-2 text-xs">
          <Settings2 size={13} /> Configure
        </button>
      </div>

      {showSettings && (
        <div className="glass mb-4 grid gap-3 rounded-xl p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Field label="Ollama endpoint" value={config.endpoint} onChange={value => setConfig(previous => ({ ...previous, endpoint: value }))} />
          <Field label="Model" value={config.model} onChange={value => setConfig(previous => ({ ...previous, model: value }))} />
          <button onClick={saveSettings} className="ui-button ui-button-primary h-10 px-4 text-xs font-semibold">Save & test</button>
          <p className="text-[10px] text-[var(--muted-foreground)] md:col-span-3">
            Required locally: <code className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-orange-500">ollama pull qwen2.5-coder:7b</code>. If the browser blocks access, start Ollama with this app origin allowed in <code>OLLAMA_ORIGINS</code>.
          </p>
          {connection.error && <p className="text-[10px] text-red-500 md:col-span-3">{connection.error}</p>}
        </div>
      )}

      {loading || !workspace ? (
        <LoadingSkeleton type="chart" />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_.85fr]">
            <div data-tour="ai-forecast" className="glass rounded-xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3.5">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]"><BarChart3 size={15} className="text-orange-500" /> Predictive footfall</h3>
                  <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">Eight-hour forecast with confidence interval</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-semibold text-emerald-500">92% confidence</span>
              </div>
              <div className="h-72 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={workspace.forecast}>
                    <defs>
                      <linearGradient id="aiForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.34} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} width={30} />
                    <Tooltip content={<ForecastTooltip />} />
                    <Area type="monotone" dataKey="upper" stroke="none" fill="#f97316" fillOpacity={0.08} />
                    <Area type="monotone" dataKey="lower" stroke="none" fill="var(--card)" fillOpacity={0.9} />
                    <Area type="monotone" dataKey="visitors" stroke="#f97316" fill="url(#aiForecast)" strokeWidth={2.5} dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div data-tour="ai-brief" className="glass flex min-h-[350px] flex-col rounded-xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3.5">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]"><WandSparkles size={15} className="text-orange-500" /> AI operations brief</h3>
                  <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">Generated locally by {config.model}</p>
                </div>
                <button onClick={createBrief} disabled={briefLoading} className="ui-button px-3 py-1.5 text-[10px] disabled:opacity-50">
                  {briefLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {brief ? 'Regenerate' : 'Generate brief'}
                </button>
              </div>
              <div className="flex-1 p-4">
                {brief ? (
                  <div className="whitespace-pre-wrap text-xs leading-6 text-[var(--foreground)]">{brief}</div>
                ) : (
                  <div className="flex h-full min-h-52 flex-col items-center justify-center text-center">
                    <Bot size={28} className="mb-3 text-orange-500" />
                    <p className="max-w-xs text-xs text-[var(--muted-foreground)]">Generate an executive summary, prioritized risks, opportunities, and a four-hour action plan from current store signals.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="mr-1">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">AI capability center</h2>
              <p className="text-[10px] text-[var(--muted-foreground)]">13 continuously evaluated decision engines</p>
            </div>
            <div className="ml-auto flex max-w-full gap-1 overflow-x-auto no-scrollbar">
              {categories.map(category => (
                <button key={category} onClick={() => setActiveFilter(category)} className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[10px] font-medium ${activeFilter === category ? 'bg-orange-500 text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div data-tour="ai-capabilities" className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleFeatures?.map(feature => (
              <FeatureCard key={feature.id} feature={feature} onExplain={() => runCopilot(`Explain this ${feature.title} insight and give me an implementation plan: ${feature.summary} Recommended action: ${feature.action}`)} />
            ))}
          </div>

          <div data-tour="ai-copilot" className="glass overflow-hidden rounded-xl">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500 text-white"><MessageSquare size={15} /></div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Retail operations copilot</h3>
                <p className="text-[10px] text-[var(--muted-foreground)]">Grounded in current store context · local inference</p>
              </div>
              <span className="ml-auto hidden rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[9px] text-emerald-500 sm:block">Privacy safe</span>
            </div>

            <div className="max-h-[420px] min-h-52 space-y-3 overflow-y-auto p-4 no-scrollbar">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-xs leading-5 ${
                    message.role === 'user'
                      ? 'bg-orange-500 text-white'
                      : message.role === 'error'
                        ? 'border border-red-500/20 bg-red-500/10 text-red-500'
                        : 'bg-[var(--muted)] text-[var(--foreground)]'
                  }`}>
                    {message.content}
                  </div>
                </div>
              ))}
              {chatLoading && <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]"><Loader2 size={12} className="animate-spin text-orange-500" /> Qwen is analyzing current operations…</div>}
            </div>

            <div className="border-t border-[var(--border)] p-3">
              <div className="mb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
                {QUICK_PROMPTS.map(prompt => <button key={prompt} onClick={() => runCopilot(prompt)} className="whitespace-nowrap rounded-full border border-[var(--border)] px-2.5 py-1 text-[9px] text-[var(--muted-foreground)] hover:border-orange-500/30 hover:text-orange-500">{prompt}</button>)}
              </div>
              <form onSubmit={event => { event.preventDefault(); runCopilot(); }} className="flex gap-2">
                <input value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask why, predict what happens next, or request an action plan…" className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus:border-orange-500/50" />
                <button disabled={!question.trim() || chatLoading} className="ui-button ui-button-primary h-10 w-10 disabled:opacity-40" aria-label="Send question"><Send size={14} /></button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ConnectionBadge({ connection, model }) {
  if (connection.checking) return <span className="flex items-center gap-1 rounded-full bg-[var(--muted)] px-2 py-1 text-[9px] text-[var(--muted-foreground)]"><Loader2 size={9} className="animate-spin" /> Checking</span>;
  if (!connection.online) return <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-[9px] text-red-500"><WifiOff size={9} /> Ollama offline</span>;
  if (!connection.available) return <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[9px] text-amber-500"><AlertTriangle size={9} /> Pull {model}</span>;
  if (connection.warming) return <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[9px] text-amber-500"><Loader2 size={9} className="animate-spin" /> Warming {model}</span>;
  return <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] text-emerald-500"><Wifi size={9} /> {model} ready</span>;
}

function FeatureCard({ feature, onExplain }) {
  const Icon = ICONS[feature.id] || Cpu;
  const severity = {
    high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-emerald-500',
  }[feature.severity] || 'bg-zinc-500';
  return (
    <article className="glass group rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:border-orange-500/25 hover:shadow-lg">
      <div className="mb-3 flex items-start justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-orange-500/10 text-orange-500"><Icon size={17} /></div>
        <div className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${severity}`} /><span className="text-[9px] text-[var(--muted-foreground)]">{feature.confidence}% confidence</span></div>
      </div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-orange-500">{feature.category}</p>
      <h3 className="mt-1 text-sm font-semibold text-[var(--foreground)]">{feature.title}</h3>
      <div className="mt-3 flex items-end justify-between rounded-lg bg-[var(--muted)] p-2.5">
        <span className="text-lg font-bold text-[var(--foreground)]">{feature.metric}</span>
        <span className="text-[9px] text-[var(--muted-foreground)]">{feature.trend}</span>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[var(--muted-foreground)]">{feature.summary}</p>
      <div className="mt-3 border-t border-[var(--border)] pt-3">
        <p className="text-[10px] leading-4 text-[var(--foreground)]"><span className="font-semibold text-orange-500">Action: </span>{feature.action}</p>
        <button onClick={onExplain} className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-orange-500 hover:text-orange-400">Explain with Qwen <ArrowRight size={11} /></button>
      </div>
    </article>
  );
}

function Field({ label, value, onChange }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-medium text-[var(--muted-foreground)]">{label}</span><input value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-xs text-[var(--foreground)] outline-none focus:border-orange-500/50" /></label>;
}

function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return <div className="popover-surface rounded-lg border px-3 py-2 shadow-xl"><p className="text-[10px] text-[var(--muted-foreground)]">{label}</p><p className="text-xs font-semibold text-orange-500">{row.visitors} visitors</p><p className="text-[9px] text-[var(--muted-foreground)]">Range {row.lower}-{row.upper} · {row.queueRisk} queue risk</p></div>;
}
