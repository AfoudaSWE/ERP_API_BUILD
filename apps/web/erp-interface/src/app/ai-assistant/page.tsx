import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Bot, Boxes, CheckCircle2, CircleDollarSign, Lightbulb, RefreshCw, Send, Sparkles, TrendingUp, User, Users, WalletCards } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Link from '@/components/router/Link';
import { AppLayout } from '@/components/layout/AppLayout';
import { apiGet, apiRequest } from '@/lib/api-client';
import { useApiData } from '@/lib/api-data';
import { formatCurrency } from '@/lib/utils';

interface Message { id: string; role: 'user' | 'assistant'; content: string }
interface AIStatus { connected: boolean; installed: boolean; model: string }

const suggestions = {
  ar: ['لخص أداء الشركة اليوم', 'ما مبيعات هذا الشهر؟', 'ما أفضل المنتجات مبيعاً؟', 'ما المنتجات منخفضة المخزون؟', 'كيف أحسن التحصيل؟', 'ما أهم إجراء يجب اتخاذه الآن؟'],
  en: ['Summarize company performance today', "What are this month's sales?", 'What are the best-selling products?', 'Which products are low in stock?', 'How can I improve collections?', 'What is the most important action now?'],
};

export default function AIAssistantPage() {
  const { i18n } = useTranslation();
  const { dashboardStats: stats, dashboardAnalytics: analytics, customers } = useApiData();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const ar = locale === 'ar';
  const money = (value: number) => formatCurrency(Number(value || 0), 'EGP', ar ? 'ar-EG' : 'en-EG');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadStatus = useCallback(async () => {
    try {
      const result = await apiGet<AIStatus>('/ai/status');
      setStatus(result); setError('');
    } catch (cause) {
      setStatus(null);
      setError(cause instanceof Error ? cause.message : 'Unable to check Ollama');
    } finally { setStatusLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadStatus(); }, [loadStatus]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, isLoading]);

  const ready = Boolean(status?.connected && status.installed);
  const chooseQuestion = (question: string) => {
    setInput(question);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };
  const send = async (event: FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || isLoading || !ready) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content };
    const history = [...messages, userMessage].slice(-20);
    setMessages(history); setInput(''); setError(''); setIsLoading(true);
    try {
      const result = await apiRequest<{ content: string; model: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ locale, messages: history.map(({ role, content: text }) => ({ role, content: text })) }),
      });
      setStatus((current) => ({ connected: true, installed: true, model: result.model || current?.model || 'qwen2.5-coder:7b' }));
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', content: result.content.trim() }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (ar ? 'تعذر الاتصال بالمساعد.' : 'Unable to contact the assistant.'));
      void loadStatus();
    } finally { setIsLoading(false); }
  };

  const overview = [
    { label: ar ? 'مبيعات الشهر' : 'Monthly sales', value: money(stats.salesThisMonth), icon: CircleDollarSign, tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
    { label: ar ? 'الذمم المستحقة' : 'Receivables', value: money(stats.receivables), icon: WalletCards, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    { label: ar ? 'مخزون يحتاج انتباه' : 'Stock needing attention', value: String(stats.lowStockCount), icon: Boxes, tone: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
    { label: ar ? 'العملاء' : 'Customers', value: String(customers.length), icon: Users, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  ];
  const recommendations = [
    ...(stats.overdueAmount > 0 ? [{ title: ar ? 'تابع التحصيل المتأخر' : 'Follow up overdue collections', detail: money(stats.overdueAmount), href: '/sales', dot: 'bg-amber-500' }] : []),
    ...(analytics.inventoryHealth.low + analytics.inventoryHealth.out > 0 ? [{ title: ar ? 'أنشئ طلب إعادة توريد' : 'Create a replenishment order', detail: ar ? `${analytics.inventoryHealth.low + analytics.inventoryHealth.out} أصناف` : `${analytics.inventoryHealth.low + analytics.inventoryHealth.out} products`, href: '/inventory', dot: 'bg-rose-500' }] : []),
    ...(analytics.bestSellers[0] ? [{ title: ar ? 'حافظ على توافر المنتج الأفضل' : 'Keep the best seller available', detail: ar ? analytics.bestSellers[0].nameAr || analytics.bestSellers[0].name : analytics.bestSellers[0].name, href: '/products', dot: 'bg-emerald-500' }] : []),
  ].slice(0, 3);

  return <AppLayout><section className="mx-auto max-w-7xl">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ai-100 text-ai-600 dark:bg-ai-900/30"><Sparkles className="h-6 w-6" /></div><div><h1 className="text-2xl font-bold text-navy-900 dark:text-white">{ar ? 'المساعد الذكي' : 'AI Assistant'}</h1><p className="text-sm text-navy-500">{ar ? 'إجابات محلية مبنية فقط على بيانات شركتك المصرح بها' : 'Local answers based only on your authorized company data'}</p></div></div><button type="button" onClick={() => { setStatusLoading(true); void loadStatus(); }} className={`badge gap-2 ${ready ? 'badge-success' : 'badge-warning'}`}><RefreshCw className={`h-3.5 w-3.5 ${statusLoading ? 'animate-spin' : ''}`} /><span dir="ltr">Ollama · {status?.model || 'qwen2.5-coder:7b'}</span></button></header>
    {!statusLoading && !ready && <div className="mb-4 flex items-start gap-3 rounded-xl border border-warning-500/30 bg-warning-50 p-4 text-warning-800 dark:bg-warning-900/20 dark:text-yellow-200"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">{ar ? 'نموذج Ollama غير جاهز' : 'Ollama model is not ready'}</p><p className="mt-1 text-sm">{status?.connected ? (ar ? `شغّل: ollama pull ${status.model}` : `Run: ollama pull ${status.model}`) : (ar ? 'شغّل تطبيق Ollama ثم أعد المحاولة.' : 'Start Ollama, then retry the connection.')}</p></div></div>}
    {error && <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl bg-danger-50 p-3 text-sm text-danger-700"><AlertCircle className="h-4 w-4" />{error}</div>}

    <div className="grid gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        <section className="card p-5"><div className="mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-ai-600" /><h2 className="font-semibold text-navy-900 dark:text-white">{ar ? 'أسئلة مقترحة' : 'Suggested questions'}</h2></div><div className="flex flex-wrap gap-2">{suggestions[locale].map((question) => <button key={question} type="button" className="rounded-full border border-ai-200 bg-ai-50 px-3 py-2 text-xs font-medium text-ai-700 transition hover:border-ai-400 hover:bg-ai-100 disabled:opacity-50 dark:border-ai-800 dark:bg-ai-950/30 dark:text-ai-300" onClick={() => chooseQuestion(question)} disabled={!ready}>{question}</button>)}</div></section>
        <div className="card flex min-h-[560px] flex-col overflow-hidden"><div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">{messages.length === 0 && <div className="empty-state py-16"><Bot className="empty-state-icon" /><h2 className="empty-state-title">{ar ? 'ابدأ بسؤال عن أعمالك' : 'Ask a question about your business'}</h2><p className="empty-state-description">{ar ? 'يحلل Qwen بيانات الشركة المتاحة دون تعديل أي سجلات.' : 'Qwen analyzes available company data without changing records.'}</p></div>}{messages.map((message) => <article key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>{message.role === 'assistant' && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ai-100 text-ai-600"><Bot className="h-4 w-4" /></span>}<div className={`max-w-2xl whitespace-pre-wrap rounded-2xl p-4 text-sm leading-6 ${message.role === 'user' ? 'bg-primary-600 text-white' : 'bg-navy-100 text-navy-800 dark:bg-navy-800 dark:text-navy-100'}`}>{message.content}</div>{message.role === 'user' && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600"><User className="h-4 w-4" /></span>}</article>)}{isLoading && <div className="flex items-center gap-3 text-sm text-navy-500"><Bot className="h-5 w-5 animate-pulse" />{ar ? 'يحلّل بيانات شركتك…' : 'Analyzing your company data…'}</div>}<div ref={endRef} /></div><form onSubmit={send} className="flex gap-3 border-t border-navy-200 p-4 dark:border-navy-700"><input ref={inputRef} className="input flex-1" value={input} onChange={(event) => setInput(event.target.value)} maxLength={4000} placeholder={ready ? (ar ? 'اكتب سؤالك…' : 'Type your question…') : (ar ? 'تحقق من اتصال Ollama أولاً' : 'Check the Ollama connection first')} disabled={!ready || isLoading} /><button className="btn btn-primary btn-icon" disabled={!ready || isLoading || !input.trim()} aria-label={ar ? 'إرسال' : 'Send'}>{isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</button></form></div>
      </div>
      <aside className="space-y-5">
        <section className="card"><header className="card-header flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary-600" /><h2 className="font-semibold text-navy-900 dark:text-white">{ar ? 'نظرة سريعة' : 'Quick overview'}</h2></header><div className="grid grid-cols-2 gap-3 p-4 xl:grid-cols-1">{overview.map((item) => { const Icon = item.icon; return <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-navy-50 p-3 dark:bg-navy-800/60"><span className={`rounded-xl p-2.5 ${item.tone}`}><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-xs text-navy-500">{item.label}</p><p className="mt-0.5 truncate text-sm font-bold text-navy-900 dark:text-white">{item.value}</p></div></div>; })}</div></section>
        <section className="card"><header className="card-header flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /><h2 className="font-semibold text-navy-900 dark:text-white">{ar ? 'توصيات' : 'Recommendations'}</h2></header><div className="space-y-3 p-4">{recommendations.map((item) => <Link key={item.title} href={item.href} className="flex items-start gap-3 rounded-xl border border-navy-100 p-3 transition hover:border-primary-300 hover:bg-primary-50/40 dark:border-navy-700 dark:hover:bg-primary-950/20"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.dot}`} /><div className="min-w-0"><p className="text-sm font-semibold text-navy-800 dark:text-white">{item.title}</p><p className="mt-1 truncate text-xs text-navy-500">{item.detail}</p></div></Link>)}{!recommendations.length && <p className="py-8 text-center text-sm text-navy-500">{ar ? 'لا توجد توصيات عاجلة الآن.' : 'No urgent recommendations right now.'}</p>}</div></section>
        {ready && <p className="flex items-center justify-center gap-2 text-xs text-success-600"><CheckCircle2 className="h-4 w-4" />{ar ? 'Ollama متصل والنموذج مثبت' : 'Ollama is connected and the model is installed'}</p>}
      </aside>
    </div>
  </section></AppLayout>;
}
