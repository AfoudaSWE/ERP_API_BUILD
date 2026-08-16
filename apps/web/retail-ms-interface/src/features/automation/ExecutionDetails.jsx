import { X } from 'lucide-react';

export default function ExecutionDetails({ execution, loading, onClose }) {
  if (!execution && !loading) return null;
  return <div className="fixed inset-0 z-50 bg-black/50" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <aside className="ml-auto h-full w-full max-w-lg overflow-y-auto border-l border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="execution-title">
      <div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-wide text-orange-500">Sanitized execution record</p><h2 id="execution-title" className="mt-1 text-lg font-bold">{execution?.workflowName || 'Loading execution…'}</h2></div><button className="ui-button p-2" onClick={onClose} aria-label="Close details"><X size={16}/></button></div>
      {loading ? <div className="mt-6 h-48 animate-pulse rounded-xl bg-[var(--muted)]" /> : <dl className="mt-6 grid grid-cols-[9rem_1fr] gap-3 text-xs">
        {[
          ['Execution ID', execution.id], ['Status', execution.status], ['Started', formatDate(execution.startedAt)],
          ['Completed', formatDate(execution.stoppedAt)], ['Duration', execution.durationMs == null ? '—' : `${execution.durationMs} ms`],
          ['Trigger source', execution.triggerSource], ['Input summary', execution.inputSummary],
          ['Output summary', execution.outputSummary], ['Error summary', execution.errorSummary || 'None'],
          ['Retry available', execution.retryAvailable ? 'Yes' : 'No'],
        ].map(([term, value]) => <div className="contents" key={term}><dt className="text-[var(--muted-foreground)]">{term}</dt><dd className="break-words font-medium">{value}</dd></div>)}
      </dl>}
      <p className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-[10px] leading-relaxed text-emerald-600">Credentials, headers, tokens, and raw workflow payloads are intentionally excluded.</p>
    </aside>
  </div>;
}
const formatDate = value => value ? new Date(value).toLocaleString() : '—';
