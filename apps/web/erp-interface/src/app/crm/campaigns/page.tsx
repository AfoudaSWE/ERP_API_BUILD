import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useTranslation } from "react-i18next";
import { Megaphone, Plus } from "lucide-react";

type Campaign = { id: string; name: string; channel: string; startDate?: string; endDate?: string; budget: string; status: string };

export default function CampaignsPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", channel: "email", startDate: "", endDate: "", budget: "0" });

  const load = useCallback(async () => setCampaigns(await apiRequest<Campaign[]>("/crm/campaigns")), []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load().catch(() => undefined); }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await apiRequest("/crm/campaigns", { method: "POST", body: JSON.stringify({ ...form, startDate: form.startDate || undefined, endDate: form.endDate || undefined }) });
      setShowCreate(false); setForm({ name: "", channel: "email", startDate: "", endDate: "", budget: "0" });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Failed"); } finally { setBusy(false); }
  }

  async function updateStatus(campaign: Campaign, status: string) {
    setBusy(true); setError("");
    try { await apiRequest(`/crm/campaigns/${campaign.id}`, { method: "PATCH", body: JSON.stringify({ status }) }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Failed"); } finally { setBusy(false); }
  }

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <header>
            <h1 className="text-2xl font-bold">{ar ? "الحملات التسويقية" : "Campaigns"}</h1>
            <p className="text-sm text-navy-500">{ar ? "تخطيط ومتابعة الحملات التسويقية" : "Plan and track marketing campaigns"}</p>
          </header>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}><Plus className="h-4 w-4" />{ar ? "حملة جديدة" : "New campaign"}</button>
        </div>
        {error && <div role="alert" className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
        {showCreate && (
          <form onSubmit={(e) => void create(e)} className="card grid gap-3 p-5 md:grid-cols-3">
            <input required className="input" placeholder={ar ? "اسم الحملة" : "Campaign name"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className="select" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
              <option value="email">{ar ? "بريد إلكتروني" : "Email"}</option>
              <option value="social_media">{ar ? "وسائل التواصل" : "Social media"}</option>
              <option value="sms">SMS</option>
              <option value="event">{ar ? "فعالية" : "Event"}</option>
              <option value="other">{ar ? "أخرى" : "Other"}</option>
            </select>
            <input type="number" min="0" step="0.01" className="input" placeholder={ar ? "الميزانية" : "Budget"} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <input type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            <button disabled={busy} className="btn btn-primary">{ar ? "إنشاء" : "Create"}</button>
          </form>
        )}
        <div className="card overflow-x-auto">
          <table className="table min-w-[750px]">
            <thead><tr><th>{ar ? "الاسم" : "Name"}</th><th>{ar ? "القناة" : "Channel"}</th><th>{ar ? "الفترة" : "Period"}</th><th className="text-end">{ar ? "الميزانية" : "Budget"}</th><th>{ar ? "الحالة" : "Status"}</th></tr></thead>
            <tbody>
              {campaigns.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold">{row.name}</td>
                  <td>{row.channel}</td>
                  <td>{row.startDate || "—"} → {row.endDate || "—"}</td>
                  <td className="text-end tabular-nums">{row.budget} EGP</td>
                  <td>
                    <select className="select" value={row.status} disabled={busy} onChange={(e) => void updateStatus(row, e.target.value)}>
                      <option value="planned">{ar ? "مخطط" : "Planned"}</option>
                      <option value="active">{ar ? "نشط" : "Active"}</option>
                      <option value="completed">{ar ? "مكتمل" : "Completed"}</option>
                      <option value="canceled">{ar ? "ملغي" : "Canceled"}</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!campaigns.length && <div className="empty-state"><Megaphone className="empty-state-icon" /><p>{ar ? "لا توجد حملات" : "No campaigns yet"}</p></div>}
        </div>
      </main>
    </AppLayout>
  );
}
