import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useApiData } from "@/lib/api-data";
import { useTranslation } from "react-i18next";
import { MessageSquareHeart, Plus, Star } from "lucide-react";

type Feedback = { id: string; customerId?: string; customerName: string; rating: number; comment: string; feedbackDate: string };

export default function CustomerFeedbackPage() {
  const { customers } = useApiData();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [rows, setRows] = useState<Feedback[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ customerId: "", rating: "5", comment: "", feedbackDate: new Date().toISOString().slice(0, 10) });

  const load = useCallback(async () => setRows(await apiRequest<Feedback[]>("/crm/customer-feedback")), []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load().catch(() => undefined); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const customer = customers.find((c) => c.id === form.customerId);
    try {
      await apiRequest("/crm/customer-feedback", { method: "POST", body: JSON.stringify({ customerId: form.customerId || undefined, customerName: customer?.name ?? "", rating: form.rating, comment: form.comment, feedbackDate: form.feedbackDate }) });
      setShowCreate(false); setForm({ ...form, comment: "" });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Failed"); } finally { setBusy(false); }
  }

  const avgRating = rows.length ? (rows.reduce((sum, r) => sum + r.rating, 0) / rows.length).toFixed(1) : "—";

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <header>
            <h1 className="text-2xl font-bold">{ar ? "آراء العملاء" : "Customer Feedback"}</h1>
            <p className="text-sm text-navy-500">{ar ? "تعليقات وتقييمات العملاء" : "Customer ratings and comments"}</p>
          </header>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}><Plus className="h-4 w-4" />{ar ? "إضافة رأي" : "New feedback"}</button>
        </div>
        {error && <div role="alert" className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
        <div className="stat-card w-fit"><div className="flex items-center gap-3"><Star className="h-5 w-5 text-warning-500" /><div><p className="stat-label">{ar ? "متوسط التقييم" : "Average rating"}</p><p className="stat-value">{avgRating} / 5</p></div></div></div>
        {showCreate && (
          <form onSubmit={(e) => void submit(e)} className="card grid gap-3 p-5 md:grid-cols-3">
            <select className="select" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">{ar ? "بدون عميل محدد" : "No specific customer"}</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{ar ? c.nameAr || c.name : c.name}</option>)}
            </select>
            <select className="select" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} / 5</option>)}
            </select>
            <input type="date" className="input" value={form.feedbackDate} onChange={(e) => setForm({ ...form, feedbackDate: e.target.value })} required />
            <textarea className="input md:col-span-3" rows={3} placeholder={ar ? "التعليق" : "Comment"} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            <button disabled={busy} className="btn btn-primary md:col-span-3">{ar ? "حفظ" : "Save"}</button>
          </form>
        )}
        <div className="card overflow-x-auto">
          <table className="table min-w-[650px]">
            <thead><tr><th>{ar ? "العميل" : "Customer"}</th><th>{ar ? "التقييم" : "Rating"}</th><th>{ar ? "التعليق" : "Comment"}</th><th>{ar ? "التاريخ" : "Date"}</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.customerName || (ar ? "غير محدد" : "Unspecified")}</td>
                  <td><span className="badge badge-primary">{row.rating} / 5</span></td>
                  <td className="max-w-xs truncate">{row.comment}</td>
                  <td>{row.feedbackDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="empty-state"><MessageSquareHeart className="empty-state-icon" /><p>{ar ? "لا توجد آراء بعد" : "No feedback yet"}</p></div>}
        </div>
      </main>
    </AppLayout>
  );
}
