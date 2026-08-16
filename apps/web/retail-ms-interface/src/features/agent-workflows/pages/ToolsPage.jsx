import { useState } from "react";
import { Search, Wrench, ShieldCheck, Play } from "lucide-react";
import { BUILT_IN_TOOLS } from "../domain/tools";
export default function ToolsPage() {
  const [search, setSearch] = useState("");
  const [tested, setTested] = useState(null);
  const visible = BUILT_IN_TOOLS.filter((t) =>
    `${t.name} ${t.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div data-tour="agent-tools" className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Agent Tools</h1>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Normalized, allow-listed capabilities available to workflow agents.
        </p>
      </div>
      <label className="flex max-w-xl items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3">
        <Search size={14} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tool registry"
          className="h-10 w-full bg-transparent text-xs outline-none"
        />
      </label>
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--muted)] text-[10px] uppercase text-[var(--muted-foreground)]">
            <tr>
              <th className="px-4 py-3">Tool</th>
              <th>Risk</th>
              <th>Approval</th>
              <th>Server</th>
              <th>Roles</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <tr key={t.toolId} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">
                  <p className="font-mono text-[11px]">{t.toolId}</p>
                  <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                    {t.description}
                  </p>
                </td>
                <td>
                  <span
                    className={`rounded-full px-2 py-1 text-[9px] ${t.riskLevel === "high" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}
                  >
                    {t.riskLevel}
                  </span>
                </td>
                <td>
                  {t.requiresApproval ? (
                    <ShieldCheck size={14} className="text-orange-500" />
                  ) : (
                    "No"
                  )}
                </td>
                <td className="text-[10px]">Built-in</td>
                <td className="max-w-48 truncate text-[10px]">
                  {t.allowedRoles.join(", ")}
                </td>
                <td className="pr-3">
                  <button
                    onClick={() => setTested(t.toolId)}
                    className="ui-button p-2"
                    title="Test tool"
                  >
                    <Play size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tested && (
        <div className="fixed bottom-5 right-5 rounded-lg border border-emerald-500/30 bg-emerald-950 px-4 py-3 text-xs text-emerald-200">
          {tested} schema validated in test mode.
          <button onClick={() => setTested(null)} className="ml-4">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
