import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Workflow,
  Play,
  MoreHorizontal,
  Copy,
  Download,
  Trash2,
  Power,
  History,
  LayoutGrid,
  List,
  Activity,
  RotateCcw,
  Wrench,
  PlugZap,
} from "lucide-react";
import { useWorkflowStore } from "../store/workflowStore";
import { WORKFLOW_TEMPLATES } from "../domain/templates";
export default function WorkflowList() {
  const workflows = useWorkflowStore((s) => s.workflows);
  const save = useWorkflowStore((s) => s.saveWorkflow);
  const remove = useWorkflowStore((s) => s.deleteWorkflow);
  const reset = useWorkflowStore((s) => s.resetExecutions);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState("grid");
  const [templateCategory, setTemplateCategory] = useState("All");
  const templateCategories = useMemo(() => ["All", ...new Set(WORKFLOW_TEMPLATES.map((template) => template.category))], []);
  const visibleTemplates = useMemo(() => WORKFLOW_TEMPLATES.filter((template) => templateCategory === "All" || template.category === templateCategory), [templateCategory]);
  const visible = useMemo(
    () =>
      workflows.filter(
        (w) =>
          (status === "all" || w.status === status) &&
          `${w.name} ${w.description}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [workflows, status, search],
  );
  const createFrom = (t) => {
    const w = {
      ...structuredClone(t),
      id: `workflow_${crypto.randomUUID().slice(0, 8)}`,
      status: "draft",
      version: 1,
      owner: "Retail Manager",
      tags: [],
      updatedAt: new Date().toISOString(),
    };
    save(w);
    navigate(`/agent-workflows/${w.id}`);
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Agent Workflows</h1>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Design governed retail automations with local AI, tools, and
            approvals.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Link to="/agent-tools" className="ui-button px-3 py-2 text-xs">
            <Wrench size={13} />
            Agent Tools
          </Link>
          <Link to="/agent-connections" className="ui-button px-3 py-2 text-xs">
            <PlugZap size={13} />
            Agent Connections
          </Link>
          <button onClick={reset} className="ui-button px-3 py-2 text-xs">
            <RotateCcw size={13} />
            Reset executions
          </button>
          <Link
            data-tour="workflow-create"
            to="/agent-workflows/new"
            className="ui-button ui-button-primary px-3 py-2 text-xs"
          >
            <Plus size={14} />
            Create workflow
          </Link>
        </div>
      </div>
      <div data-tour="workflow-filters" className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 sm:grid-cols-[1fr_160px_auto]">
        <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3">
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows, owners, or tags"
            className="h-9 w-full bg-transparent text-xs outline-none"
          />
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="workflow-input"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
        </select>
        <div className="flex rounded-lg bg-[var(--muted)] p-1">
          <button
            onClick={() => setView("grid")}
            className={`p-2 ${view === "grid" ? "rounded bg-[var(--card)] shadow-sm" : ""}`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-2 ${view === "list" ? "rounded bg-[var(--card)] shadow-sm" : ""}`}
          >
            <List size={14} />
          </button>
        </div>
      </div>
      {!visible.length ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] py-16 text-center">
          <Workflow className="mx-auto text-orange-500" />
          <p className="mt-3 text-sm font-semibold">No workflows found</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Create a workflow or start from a retail template.
          </p>
        </div>
      ) : (
        <div
          data-tour="workflow-catalog"
          className={
            view === "grid"
              ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3"
              : "space-y-2"
          }
        >
          {visible.map((w) => (
            <article
              key={w.id}
              className={`group rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:border-orange-500/30 ${view === "list" ? "flex items-center gap-4" : ""}`}
            >
              <div className="flex items-start justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-500/10 text-orange-500">
                  <Workflow size={17} />
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-[9px] uppercase ${w.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}
                >
                  {w.status}
                </span>
              </div>
              <div className={view === "list" ? "min-w-0 flex-1" : "mt-3"}>
                <Link
                  to={`/agent-workflows/${w.id}`}
                  className="text-sm font-semibold hover:text-orange-500"
                >
                  {w.name}
                </Link>
                <p className="mt-1 line-clamp-2 text-[11px] text-[var(--muted-foreground)]">
                  {w.description}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                  <Metric label="Version" value={`v${w.version}`} />
                  <Metric
                    label="Success"
                    value={w.successRate ? `${w.successRate}%` : "—"}
                  />
                  <Metric label="Today" value={w.executionsToday ?? 0} />
                </div>
              </div>
              <div
                className={`flex items-center gap-1 ${view === "list" ? "" : "mt-4 border-t border-[var(--border)] pt-3"}`}
              >
                <button
                  onClick={() => navigate(`/agent-workflows/${w.id}`)}
                  className="ui-button flex-1 px-2 py-1.5 text-[10px]"
                >
                  <Play size={11} />
                  Open
                </button>
                <button
                  onClick={() =>
                    navigate(`/agent-workflows/${w.id}/executions`)
                  }
                  className="p-2"
                  title="Executions"
                >
                  <History size={13} />
                </button>
                <button
                  onClick={() =>
                    save({
                      ...structuredClone(w),
                      id: `workflow_${crypto.randomUUID().slice(0, 8)}`,
                      name: `${w.name} copy`,
                      status: "draft",
                    })
                  }
                  className="p-2"
                  title="Duplicate"
                >
                  <Copy size={13} />
                </button>
                <button
                  onClick={() =>
                    save({
                      ...w,
                      status: w.status === "active" ? "draft" : "active",
                    })
                  }
                  className="p-2"
                  title="Activate/deactivate"
                >
                  <Power size={13} />
                </button>
                <button
                  onClick={() => confirm(`Delete ${w.name}?`) && remove(w.id)}
                  className="p-2 text-red-500"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <section data-tour="workflow-templates">
        <h2 className="text-sm font-semibold">Retail workflow templates</h2>
        <p className="mb-3 mt-1 text-[10px] text-[var(--muted-foreground)]">Choose a business outcome, then customize its trigger, thresholds, roles, approvals, and destinations.</p>
        <div className="mb-3 flex max-w-full gap-1 overflow-x-auto pb-1">
          {templateCategories.map((category) => <button key={category} onClick={() => setTemplateCategory(category)} className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[10px] ${templateCategory === category ? "bg-orange-500 text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>{category}</button>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleTemplates.map((t) => (
            <button
              key={t.id}
              onClick={() => createFrom(t)}
              className="group flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left hover:border-orange-500/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-[10px] font-semibold text-orange-500"><Activity size={14} />{t.category}</span><span className="rounded-full bg-[var(--muted)] px-2 py-1 text-[9px] text-[var(--muted-foreground)]">{t.complexity}</span></div>
              <p className="mt-3 text-xs font-semibold">{t.name}</p>
              <p className="mt-1.5 text-[10px] leading-4 text-[var(--muted-foreground)]">{t.description}</p>
              <div className="mt-3 rounded-lg bg-[var(--muted)] p-2.5"><p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Expected outcome</p><p className="mt-1 text-[10px] leading-4">{t.outcome}</p></div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[9px]"><div><p className="text-[var(--muted-foreground)]">Starts with</p><p className="mt-0.5 font-medium">{t.triggerLabel}</p></div><div><p className="text-[var(--muted-foreground)]">Best for</p><p className="mt-0.5 font-medium">{t.recommendedFor}</p></div></div>
              <div className="mt-3 border-t border-[var(--border)] pt-3 text-[9px] leading-4 text-[var(--muted-foreground)]"><span className="font-semibold text-[var(--foreground)]">Before activation:</span> {t.setup}</div>
              <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                {t.nodes.length} nodes · Demo ready
              </p>
              <div className="mt-auto flex items-center justify-between pt-3 text-[9px]"><span className="text-[var(--muted-foreground)]">{t.requiresApproval ? "Approval included" : "No approval step"}</span><span className="font-semibold text-orange-500 group-hover:text-orange-400">Use template →</span></div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
function Metric({ label, value }) {
  return (
    <div>
      <p className="text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}
