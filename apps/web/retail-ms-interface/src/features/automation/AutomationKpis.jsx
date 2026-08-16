import { Activity, CheckCircle2, Clock3, Gauge, PlayCircle, Workflow, XCircle } from 'lucide-react';

export default function AutomationKpis({ metrics, loading }) {
  const cards = [
    ['Active workflows', metrics.active, Workflow],
    ['Executions today', metrics.today, Activity],
    ['Successful', metrics.successful, CheckCircle2],
    ['Failed', metrics.failed, XCircle],
    ['Running', metrics.running, PlayCircle],
    ['Success rate', metrics.successRate == null ? '—' : `${metrics.successRate.toFixed(1)}%`, Gauge],
    ['Average duration', metrics.averageDuration == null ? '—' : `${(metrics.averageDuration / 1000).toFixed(1)}s`, Clock3],
  ];
  return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7" aria-label="Automation metrics">
    {cards.map(([label, value, Icon]) => <article key={label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
      <div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p><Icon size={15} className="text-orange-500" /></div>
      <p className={`mt-2 text-xl font-bold ${loading ? 'animate-pulse text-transparent rounded bg-[var(--muted)]' : ''}`}>{loading ? '00' : value}</p>
    </article>)}
  </section>;
}
