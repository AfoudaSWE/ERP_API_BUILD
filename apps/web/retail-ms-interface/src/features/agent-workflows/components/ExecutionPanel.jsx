import { ChevronDown, Square, RotateCcw, Check, X } from "lucide-react";
export default function ExecutionPanel({
  execution,
  onStop,
  onDecision,
  collapsed,
  onToggle,
}) {
  return (
    <div
      data-tour="execution-panel"
      className={`shrink-0 overflow-hidden border-t border-[var(--border)] bg-[var(--card)] transition-[height] ${collapsed ? "h-10" : "h-72 md:h-64"}`}
    >
      <button
        onClick={onToggle}
        className="flex h-10 w-full items-center justify-between border-b border-[var(--border)] px-4"
      >
        <span className="text-xs font-semibold">
          Execution log{" "}
          {execution && (
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-[9px] ${execution.status === "SUCCEEDED" ? "bg-emerald-500/10 text-emerald-500" : execution.status === "FAILED" ? "bg-red-500/10 text-red-500" : "bg-orange-500/10 text-orange-500"}`}
            >
              {execution.status}
            </span>
          )}
          {execution?.logs?.length > 0 && <span className="ml-2 text-[9px] font-normal text-[var(--muted-foreground)]">{execution.logs.length} events</span>}
        </span>
        <span className="flex items-center gap-3">
          {execution &&
            ["RUNNING", "WAITING_FOR_APPROVAL"].includes(execution.status) && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onStop();
                }}
                className="flex items-center gap-1 text-[10px] text-red-500"
              >
                <Square size={11} />
                Stop
              </span>
            )}
          <ChevronDown size={14} className={collapsed ? "rotate-180" : ""} />
        </span>
      </button>
      {!collapsed && (
        <div className="grid h-[calc(100%-2.5rem)] min-h-0 grid-cols-1 grid-rows-2 overflow-hidden md:grid-cols-[minmax(0,1fr)_320px] md:grid-rows-1">
          <div aria-label="Workflow execution events" tabIndex={0} className="h-full min-h-0 overflow-y-scroll overscroll-contain p-3 pr-2 [scrollbar-gutter:stable] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/40">
            {!execution ? (
              <p className="p-5 text-center text-xs text-[var(--muted-foreground)]">
                Execute the workflow to watch node-level events here.
              </p>
            ) : (
              execution.logs.map((log) => (
                <div key={log.id} className="mb-1.5 flex gap-3 text-[10px]">
                  <span className="w-20 shrink-0 text-[var(--muted-foreground)]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={
                      log.status === "FAILED"
                        ? "text-red-500"
                        : log.status === "SUCCEEDED"
                          ? "text-emerald-500"
                          : "text-orange-500"
                    }
                  >
                    {log.status}
                  </span>
                  <span className="min-w-0 flex-1 break-words">{log.message}</span>
                  <span className="ml-auto shrink-0 text-[var(--muted-foreground)]">
                    {log.durationMs ? `${log.durationMs} ms` : ""}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="h-full min-h-0 overflow-y-auto overscroll-contain border-t border-[var(--border)] p-3 [scrollbar-gutter:stable] md:border-l md:border-t-0">
            {execution?.approval?.status === "Pending" ? (
              <>
                <p className="text-xs font-semibold">Approval required</p>
                <p className="mt-2 text-[10px] text-[var(--muted-foreground)]">
                  {execution.approval.requestedAction}
                </p>
                <div className="mt-3 rounded-lg bg-orange-500/10 p-2 text-[10px] text-orange-500">
                  Risk: {execution.approval.riskLevel} · Store:{" "}
                  {execution.approval.store}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onDecision(true)}
                    className="ui-button ui-button-primary flex-1 px-3 py-2 text-xs"
                  >
                    <Check size={12} />
                    Approve
                  </button>
                  <button
                    onClick={() => onDecision(false)}
                    className="ui-button flex-1 px-3 py-2 text-xs text-red-500"
                  >
                    <X size={12} />
                    Reject
                  </button>
                </div>
              </>
            ) : execution ? (
              <pre className="h-full overflow-auto whitespace-pre-wrap text-[9px] text-[var(--muted-foreground)]">
                {JSON.stringify(
                  execution.result || execution.nodeExecutions,
                  null,
                  2,
                )}
              </pre>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)]">
                Inputs, outputs, tool calls, model usage, errors, and retries
                appear here.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
