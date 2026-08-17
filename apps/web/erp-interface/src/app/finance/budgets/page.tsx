import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";

type Category = { id: string; name: string; nameAr?: string };
type Budget = { id: string; name: string; categoryName?: string; periodStart: string; periodEnd: string; amount: string; actualSpend: string };

export default function BudgetsPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", categoryId: "", periodStart: new Date().toISOString().slice(0, 10), periodEnd: new Date().toISOString().slice(0, 10), amount: "0" });

  const load = useCallback(async () => {
    const [categoryRows, budgetRows] = await Promise.all([
      apiRequest<Category[]>("/finance/expense-categories"),
      apiRequest<Budget[]>("/finance/budgets"),
    ]);
    setCategories(categoryRows); setBudgets(budgetRows);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load().catch(() => undefined); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await apiRequest("/finance/budgets", { method: "POST", body: JSON.stringify({ ...form, categoryId: form.categoryId || undefined }) });
      setForm({ ...form, name: "", amount: "0" });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Failed"); } finally { setBusy(false); }
  }

  async function remove(budget: Budget) {
    setBusy(true); setError("");
    try { await apiRequest(`/finance/budgets/${budget.id}`, { method: "DELETE" }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Failed"); } finally { setBusy(false); }
  }

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "الموازنات" : "Budgeting"}</h1>
          <p className="text-sm text-navy-500">{ar ? "خطط الإنفاق مقابل الفعلي حسب الفئة والفترة" : "Planned spend vs actual, by category and period"}</p>
        </header>
        {error && <div role="alert" className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
        <form onSubmit={(e) => void submit(e)} className="card grid gap-3 p-5 md:grid-cols-3">
          <input required className="input" placeholder={ar ? "اسم الموازنة" : "Budget name"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="select" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">{ar ? "كل الفئات" : "All categories"}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{ar ? c.nameAr || c.name : c.name}</option>)}
          </select>
          <input type="number" min="0" step="0.01" required className="input" placeholder={ar ? "المبلغ" : "Amount"} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input type="date" required className="input" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
          <input type="date" required className="input" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
          <button disabled={busy} className="btn btn-primary">{ar ? "إنشاء الموازنة" : "Create budget"}</button>
        </form>
        <div className="card overflow-x-auto">
          <table className="table min-w-[850px]">
            <thead><tr><th>{ar ? "الاسم" : "Name"}</th><th>{ar ? "الفئة" : "Category"}</th><th>{ar ? "الفترة" : "Period"}</th><th className="text-end">{ar ? "الموازنة" : "Budgeted"}</th><th className="text-end">{ar ? "الفعلي" : "Actual"}</th><th></th></tr></thead>
            <tbody>
              {budgets.map((row) => {
                const over = Number(row.actualSpend) > Number(row.amount);
                return (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.name}</td>
                    <td>{row.categoryName || (ar ? "كل الفئات" : "All categories")}</td>
                    <td>{row.periodStart} → {row.periodEnd}</td>
                    <td className="text-end tabular-nums">{row.amount} EGP</td>
                    <td className={`text-end tabular-nums font-semibold ${over ? "text-danger-600" : "text-success-600"}`}>{row.actualSpend} EGP</td>
                    <td><button className="btn btn-ghost btn-icon btn-sm" onClick={() => void remove(row)} aria-label={ar ? "حذف" : "Delete"}><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!budgets.length && <p className="p-6 text-center text-navy-500">{ar ? "لا توجد موازنات" : "No budgets yet"}</p>}
        </div>
      </main>
    </AppLayout>
  );
}
