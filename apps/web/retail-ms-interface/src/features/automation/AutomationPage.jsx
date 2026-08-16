import { useDeferredValue, useState } from 'react';
import { AlertTriangle, Bot, Boxes, CameraOff, ChevronLeft, ChevronRight, ExternalLink, Eye, Package, Play, RefreshCw, Search, ShoppingCart, Store, Users, Workflow, XCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { useAppStore } from '../../store/appStore';
import { automationApi } from '../../services/automationApi';
import AutomationKpis from './AutomationKpis';
import ExecutionDetails from './ExecutionDetails';
import { useAutomationData } from './useAutomationData';

const TEMPLATES = [
  ['Occupancy Alert', Users, 'retail-occupancy-alert'],
  ['Queue Congestion Alert', AlertTriangle, 'queue-congestion-alert'],
  ['Low Stock Alert', Package, 'low-stock-alert'],
  ['Camera Offline Alert', CameraOff, 'camera-offline-alert'],
  ['Daily Store Summary', Store, 'daily-store-summary'],
  ['AI Retail Insight', Bot, 'ai-retail-insight'],
  ['Inventory Synchronization', Boxes, 'inventory-synchronization'],
  ['Magento Order Synchronization', ShoppingCart, 'magento-order-synchronization'],
  ['Acumatica Invoice Creation', Workflow, 'acumatica-invoice-creation'],
  ['Store Manager Notification', Users, 'store-manager-notification'],
];

export default function AutomationPage() {
  const user = useAppStore(state => state.authUser);
  const selectedStoreId = useAppStore(state => state.selectedStoreId);
  const addNotification = useAppStore(state => state.addNotification);
  const [filters, setFilters] = useState({ search: '', active: '', category: '', page: 1, pageSize: 10 });
  const deferredSearch = useDeferredValue(filters.search);
  const queryFilters = { ...filters, search: deferredSearch };
  const data = useAutomationData(queryFilters);
  const [running, setRunning] = useState(null);
  const [details, setDetails] = useState({ execution: null, loading: false });
  const canExecute = user?.permissions?.includes('automation:execute');
  const canManage = user?.permissions?.includes('automation:manage');
  const pages = Math.max(1, Math.ceil(data.total / filters.pageSize));
  const categories = [...new Set(data.workflows.map(item => item.category))].sort();

  const execute = async workflow => {
    if (!workflow.executable || !canExecute) return;
    if (!window.confirm(`Trigger “${workflow.name}” for the selected store?`)) return;
    setRunning(workflow.id);
    const key = crypto.randomUUID();
    try {
      const occupancy = workflow.alias === 'retail-occupancy-alert';
      const result = await automationApi.execute(user, workflow.alias || workflow.id, {
        storeId: selectedStoreId,
        payload: occupancy ? {
          eventType: 'OCCUPANCY_THRESHOLD_EXCEEDED', cameraId: `${selectedStoreId}-entry`,
          entered: 45, exited: 8, currentOccupancy: 37, capacity: 40, timestamp: new Date().toISOString(),
        } : {},
        idempotencyKey: key,
      }, key);
      addNotification({ id: result.auditId, title: `${workflow.name} accepted`, message: `Correlation ID: ${result.correlationId}`, createdAt: new Date().toISOString(), storeId: selectedStoreId });
      data.refresh();
    } catch (error) {
      addNotification({ id: crypto.randomUUID(), title: `${workflow.name} failed`, message: `${error.message}${error.correlationId ? ` · ${error.correlationId}` : ''}`, createdAt: new Date().toISOString(), storeId: selectedStoreId });
    } finally { setRunning(null); }
  };

  const inspect = async execution => {
    setDetails({ execution, loading: true });
    try { setDetails({ execution: await automationApi.execution(user, execution.id), loading: false }); }
    catch { setDetails({ execution, loading: false }); }
  };

  return <div className="space-y-5 pb-8">
    <PageHeader title="Automation & AI Workflows" subtitle="Monitor and safely orchestrate retail operations through the RealTwin backend." showDefaultActions={false} actions={
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${data.status?.connected ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600' : 'border-red-500/25 bg-red-500/10 text-red-500'}`}>
          <span className={`h-2 w-2 rounded-full ${data.status?.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />{data.status?.connected ? 'n8n connected' : 'n8n disconnected'}
        </span>
        <button className="ui-button flex items-center gap-2" onClick={data.refresh} disabled={data.loading}><RefreshCw size={14} className={data.loading ? 'animate-spin' : ''}/>Refresh</button>
        {canManage && data.status?.editorUrl && <a className="ui-button flex items-center gap-2" href={data.status.editorUrl} target="_blank" rel="noreferrer">Open n8n<ExternalLink size={13}/></a>}
      </div>
    } />
    <p className="-mt-3 text-[10px] text-[var(--muted-foreground)]">Last synchronization: {data.status?.checkedAt ? new Date(data.status.checkedAt).toLocaleString() : 'Not available'}</p>

    <AutomationKpis metrics={data.metrics} loading={data.loading} />

    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div><h2 className="text-sm font-bold">Workflows</h2><p className="text-[10px] text-[var(--muted-foreground)]">Only server-allowlisted workflows can be executed.</p></div>
        <div className="flex flex-wrap gap-2">
          <label className="relative"><Search size={13} className="absolute left-3 top-2.5 text-[var(--muted-foreground)]"/><input aria-label="Search workflows" value={filters.search} onChange={event => setFilters(value => ({ ...value, search: event.target.value, page: 1 }))} placeholder="Search" className="workflow-input w-48 pl-8"/></label>
          <select aria-label="Filter workflow status" className="workflow-input w-32" value={filters.active} onChange={event => setFilters(value => ({ ...value, active: event.target.value, page: 1 }))}><option value="">All status</option><option value="true">Active</option><option value="false">Inactive</option></select>
          <select aria-label="Filter workflow category" className="workflow-input w-40" value={filters.category} onChange={event => setFilters(value => ({ ...value, category: event.target.value, page: 1 }))}><option value="">All categories</option>{categories.map(item => <option key={item}>{item}</option>)}</select>
        </div>
      </div>
      {data.loading ? <div className="p-4"><LoadingSkeleton rows={5}/></div> : data.error ? <ErrorState error={data.error} retry={data.refresh}/> : data.workflows.length === 0 ? <EmptyState icon={Workflow} title="No workflows found" message={data.status?.connected ? 'Try changing the filters or configure a workflow in n8n.' : 'Connect and configure n8n to load workflows.'}/> :
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-[var(--muted)] text-[10px] uppercase text-[var(--muted-foreground)]"><tr>{['Workflow','Category','Status','Trigger','Updated','Association','Actions'].map(value => <th key={value} className="px-4 py-3">{value}</th>)}</tr></thead>
          <tbody>{data.workflows.map(workflow => <tr key={workflow.id} className="border-t border-[var(--border)]"><td className="px-4 py-3"><p className="font-semibold">{workflow.name}</p><p className="text-[9px] text-[var(--muted-foreground)]">ID {workflow.id}</p></td><td className="px-4 py-3">{workflow.category}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[9px] ${workflow.active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-500/10 text-gray-500'}`}>{workflow.active ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-3">{workflow.triggerType}</td><td className="px-4 py-3">{workflow.updatedAt ? new Date(workflow.updatedAt).toLocaleString() : '—'}</td><td className="px-4 py-3">{workflow.tags.join(', ') || '—'}</td><td className="px-4 py-3"><button title={workflow.executable ? 'Execute workflow' : 'Configure this workflow in the server allowlist'} className="ui-button inline-flex items-center gap-1.5" disabled={!canExecute || !workflow.executable || running === workflow.id} onClick={() => execute(workflow)}><Play size={12}/>{running === workflow.id ? 'Executing…' : 'Execute'}</button></td></tr>)}</tbody>
        </table></div>}
      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 text-[10px]"><span>{data.total} workflow{data.total === 1 ? '' : 's'}</span><div className="flex items-center gap-2"><button className="ui-button p-1.5" aria-label="Previous page" disabled={filters.page <= 1} onClick={() => setFilters(value => ({ ...value, page: value.page - 1 }))}><ChevronLeft size={13}/></button><span>Page {filters.page} of {pages}</span><button className="ui-button p-1.5" aria-label="Next page" disabled={filters.page >= pages} onClick={() => setFilters(value => ({ ...value, page: value.page + 1 }))}><ChevronRight size={13}/></button></div></div>
    </section>

    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm"><h2 className="text-sm font-bold">Recent executions</h2>
      {data.executions.length === 0 ? <p className="py-8 text-center text-xs text-[var(--muted-foreground)]">No executions are available.</p> : <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[750px] text-left text-xs"><thead className="text-[10px] uppercase text-[var(--muted-foreground)]"><tr>{['ID','Workflow','Started','Duration','Status','Source','Error',''].map((value, index) => <th key={`${value}-${index}`} className="px-2 py-2">{value}</th>)}</tr></thead><tbody>{data.executions.slice(0, 10).map(execution => <tr key={execution.id} className="border-t border-[var(--border)]"><td className="px-2 py-2 font-mono text-[10px]">{execution.id}</td><td className="px-2 py-2 font-medium">{execution.workflowName}</td><td className="px-2 py-2">{execution.startedAt ? new Date(execution.startedAt).toLocaleString() : '—'}</td><td className="px-2 py-2">{execution.durationMs == null ? '—' : `${execution.durationMs} ms`}</td><td className="px-2 py-2">{execution.status}</td><td className="px-2 py-2">{execution.triggerSource}</td><td className="max-w-48 truncate px-2 py-2 text-red-500">{execution.errorSummary || '—'}</td><td><button className="ui-button p-1.5" onClick={() => inspect(execution)} aria-label={`Inspect execution ${execution.id}`}><Eye size={13}/></button></td></tr>)}</tbody></table></div>}
    </section>

    <section><h2 className="text-sm font-bold">Quick automation templates</h2><p className="mt-1 text-[10px] text-[var(--muted-foreground)]">Cards reflect live n8n workflow discovery; unavailable templates require configuration.</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{TEMPLATES.map(([name, Icon, alias]) => { const workflow = data.workflows.find(item => item.alias === alias); return <article key={alias} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"><Icon size={18} className="text-orange-500"/><h3 className="mt-3 text-xs font-semibold">{name}</h3><p className={`mt-1 text-[9px] ${workflow ? 'text-emerald-600' : 'text-[var(--muted-foreground)]'}`}>{workflow ? `${workflow.active ? 'Active' : 'Inactive'} in n8n` : 'Configuration required'}</p>{workflow?.executable && <button className="ui-button mt-3 w-full text-[10px]" disabled={!canExecute || running === workflow.id} onClick={() => execute(workflow)}>Execute</button>}</article>; })}</div></section>
    <ExecutionDetails execution={details.execution} loading={details.loading} onClose={() => setDetails({ execution: null, loading: false })}/>
  </div>;
}

function ErrorState({ error, retry }) {
  return <div className="grid place-items-center p-10 text-center"><XCircle size={28} className="text-red-500"/><h3 className="mt-3 text-sm font-bold">Automation data unavailable</h3><p className="mt-1 max-w-md text-xs text-[var(--muted-foreground)]">{error.message}</p>{error.correlationId && <p className="mt-1 font-mono text-[9px] text-[var(--muted-foreground)]">Correlation {error.correlationId}</p>}<button className="ui-button mt-4" onClick={retry}>Retry</button></div>;
}
