import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ExternalLink, Loader2, MessageSquare, Send, Wifi, WifiOff, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { getAIWorkspace } from '../../services/aiIntelligenceService';
import { checkOllama, getOllamaConfig, streamChatWithOllama } from '../../services/ollamaService';

const STARTER_PROMPTS = [
  'Summarize store operations now.',
  'What needs my attention first?',
  'Which inventory action has the highest impact?',
];

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: 'Hello! I am your RetailTwin Copilot, powered locally by Ollama. Ask me about sales, queues, inventory, staffing, or store operations.',
};

export default function CopilotChat() {
  const navigate = useNavigate();
  const storeId = useAppStore(state => state.selectedStoreId);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [workspace, setWorkspace] = useState(null);
  const [connection, setConnection] = useState({ checking: false, online: false, available: false });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const config = getOllamaConfig();

  const connect = useCallback(async () => {
    setConnection({ checking: true, online: false, available: false });
    try {
      const [nextWorkspace, result] = await Promise.all([getAIWorkspace(storeId), checkOllama()]);
      setWorkspace(nextWorkspace);
      setConnection({ ...result, checking: false });
    } catch (error) {
      setConnection({ checking: false, online: false, available: false, error: error.message });
      try {
        setWorkspace(await getAIWorkspace(storeId));
      } catch {
        setWorkspace(null);
      }
    }
  }, [storeId]);

  useEffect(() => {
    if (!open) return undefined;
    connect();
    inputRef.current?.focus();
    const closeOnEscape = event => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [connect, open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async prompt => {
    const text = (prompt ?? question).trim();
    if (!text || loading || !workspace || !connection.online || !connection.available) return;
    const userMessage = { role: 'user', content: text };
    const responseId = `global-copilot-${Date.now()}`;
    const history = [...messages.filter(message => message.role !== 'error').slice(-8), userMessage];
    setMessages(previous => [...previous, userMessage, { role: 'assistant', content: '', id: responseId }]);
    setQuestion('');
    setLoading(true);
    try {
      const answer = await streamChatWithOllama(history, workspace.context, fullText => {
        setMessages(previous => previous.map(message => message.id === responseId ? { ...message, content: fullText } : message));
      });
      setMessages(previous => previous.map(message => message.id === responseId ? { ...message, content: answer } : message));
    } catch (error) {
      setMessages(previous => previous.map(message => message.id === responseId ? { role: 'error', id: responseId, content: error.message } : message));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [connection.available, connection.online, loading, messages, question, workspace]);

  const ready = connection.online && connection.available && workspace;

  return (
    <>
      {open && (
        <section role="dialog" aria-label="RetailTwin Copilot" aria-modal="false" className="fixed bottom-20 right-3 z-[70] flex h-[min(39rem,calc(100dvh-6rem))] w-[min(25rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--popover)] text-[var(--foreground)] shadow-2xl sm:bottom-24 sm:right-6">
          <header className="flex items-center gap-3 border-b border-[var(--border)] bg-gradient-to-r from-orange-500/10 to-transparent px-4 py-3">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/20"><Bot size={19} />{connection.online && connection.available && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--popover)] bg-emerald-400" />}</span>
            <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">RetailTwin Copilot</h2><ConnectionStatus connection={connection} model={config.model} /></div>
            <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]" aria-label="Close copilot"><X size={16} /></button>
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
            {messages.map((message, index) => (
              <div key={message.id ?? `${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role !== 'user' && <span className="mr-2 mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-orange-500/10 text-orange-500"><Bot size={13} /></span>}
                <div className={`max-w-[82%] whitespace-pre-wrap rounded-xl px-3 py-2.5 text-[11px] leading-5 ${message.role === 'user' ? 'bg-orange-500 text-white' : message.role === 'error' ? 'border border-red-500/20 bg-red-500/10 text-red-500' : 'bg-[var(--muted)]'}`}>
                  {message.content || <span className="inline-flex items-center gap-1.5 text-[var(--muted-foreground)]"><Loader2 size={11} className="animate-spin" />Thinking…</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--border)] p-3">
            {!ready && !connection.checking && (
              <div className="mb-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-[10px] leading-4 text-amber-600">
                {connection.online && !connection.available ? `Model ${config.model} is not installed. Run: ollama pull ${config.model}` : 'Ollama is offline. Start it with: ollama serve'}
                <div className="mt-2 flex gap-2"><button onClick={connect} className="font-semibold underline">Retry</button><button onClick={() => { setOpen(false); navigate('/ai-intelligence'); }} className="inline-flex items-center gap-1 font-semibold underline">Configure <ExternalLink size={10} /></button></div>
              </div>
            )}
            <div className="mb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
              {STARTER_PROMPTS.map(prompt => <button key={prompt} onClick={() => send(prompt)} disabled={!ready || loading} className="whitespace-nowrap rounded-full border border-[var(--border)] px-2.5 py-1 text-[9px] text-[var(--muted-foreground)] hover:border-orange-500/30 hover:text-orange-500 disabled:opacity-40">{prompt}</button>)}
            </div>
            <form onSubmit={event => { event.preventDefault(); send(); }} className="flex items-end gap-2">
              <label className="sr-only" htmlFor="global-copilot-question">Ask RetailTwin Copilot</label>
              <textarea ref={inputRef} id="global-copilot-question" rows={1} value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder={connection.checking ? 'Connecting to Ollama…' : 'Ask about retail operations…'} disabled={!ready || loading} className="max-h-24 min-h-10 flex-1 resize-none rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 py-2.5 text-xs outline-none focus:border-orange-500 disabled:opacity-60" />
              <button type="submit" disabled={!ready || loading || !question.trim()} className="ui-button ui-button-primary h-10 w-10 shrink-0 disabled:opacity-40" aria-label="Send message">{loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}</button>
            </form>
            <p className="mt-2 text-center text-[8px] text-[var(--muted-foreground)]">Local Ollama · Aggregated anonymous store data only</p>
          </div>
        </section>
      )}

      <button onClick={() => setOpen(value => !value)} className="fixed bottom-4 right-4 z-[69] grid h-13 w-13 place-items-center rounded-2xl bg-orange-500 text-white shadow-xl shadow-orange-500/30 transition-transform hover:scale-105 sm:bottom-6 sm:right-6" aria-label={open ? 'Close RetailTwin Copilot' : 'Open RetailTwin Copilot'} aria-expanded={open}>
        {open ? <MessageSquare size={22} /> : <Bot size={24} />}
        {!open && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-[var(--background)] bg-emerald-500 px-1 text-[8px] font-bold text-white">AI</span>}
      </button>
    </>
  );
}

function ConnectionStatus({ connection, model }) {
  if (connection.checking) return <p className="mt-0.5 flex items-center gap-1 text-[9px] text-[var(--muted-foreground)]"><Loader2 size={9} className="animate-spin" />Connecting to Ollama…</p>;
  if (!connection.online) return <p className="mt-0.5 flex items-center gap-1 text-[9px] text-red-500"><WifiOff size={9} />Ollama offline</p>;
  if (!connection.available) return <p className="mt-0.5 flex items-center gap-1 text-[9px] text-amber-500"><WifiOff size={9} />{model} unavailable</p>;
  return <p className="mt-0.5 flex items-center gap-1 text-[9px] text-emerald-500"><Wifi size={9} />Connected · {model}</p>;
}
