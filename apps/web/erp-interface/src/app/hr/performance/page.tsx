import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useTranslation } from "react-i18next";

type Employee = { userId: string; name: string; nameAr?: string };
type Review = { id: string; employeeId: string; reviewPeriod: string; rating: string; comments: string; reviewDate: string };

export default function PerformancePage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ employeeId: "", reviewPeriod: "", rating: "3", comments: "", reviewDate: new Date().toISOString().slice(0, 10) });

  const load = useCallback(async () => {
    const [employeeRows, reviewRows] = await Promise.all([
      apiRequest<Employee[]>("/hr/employees").catch(() => []),
      apiRequest<Review[]>("/hr/performance-reviews"),
    ]);
    setEmployees(employeeRows); setReviews(reviewRows);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load().catch(() => undefined); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await apiRequest("/hr/performance-reviews", { method: "POST", body: JSON.stringify(form) });
      setForm({ ...form, reviewPeriod: "", comments: "" });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Failed"); } finally { setBusy(false); }
  }

  const employeeName = (id: string) => { const emp = employees.find((e) => e.userId === id); return emp ? (ar ? emp.nameAr || emp.name : emp.name) : "—"; };

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "الأداء والتقييم" : "Performance & Appraisal"}</h1>
          <p className="text-sm text-navy-500">{ar ? "سجل تقييمات أداء الموظفين" : "Track employee performance reviews"}</p>
        </header>
        {error && <div role="alert" className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
        <form onSubmit={(e) => void submit(e)} className="card grid gap-3 p-5 md:grid-cols-3">
          <select required className="select" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
            <option value="">{ar ? "اختر الموظف" : "Select employee"}</option>
            {employees.map((emp) => <option key={emp.userId} value={emp.userId}>{ar ? emp.nameAr || emp.name : emp.name}</option>)}
          </select>
          <input required className="input" placeholder={ar ? "فترة التقييم (مثال: Q1 2026)" : "Review period (e.g. Q1 2026)"} value={form.reviewPeriod} onChange={(e) => setForm({ ...form, reviewPeriod: e.target.value })} />
          <input type="date" required className="input" value={form.reviewDate} onChange={(e) => setForm({ ...form, reviewDate: e.target.value })} />
          <label className="block text-sm md:col-span-3">
            {ar ? "التقييم (0-5)" : "Rating (0-5)"}
            <input type="number" min="0" max="5" step="0.5" required className="input mt-1 w-full" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
          </label>
          <textarea className="input md:col-span-3" rows={3} placeholder={ar ? "ملاحظات" : "Comments"} value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
          <button disabled={busy} className="btn btn-primary md:col-span-3">{ar ? "حفظ التقييم" : "Save review"}</button>
        </form>
        <div className="card overflow-x-auto">
          <table className="table min-w-[750px]">
            <thead><tr><th>{ar ? "الموظف" : "Employee"}</th><th>{ar ? "الفترة" : "Period"}</th><th>{ar ? "التاريخ" : "Date"}</th><th>{ar ? "التقييم" : "Rating"}</th><th>{ar ? "ملاحظات" : "Comments"}</th></tr></thead>
            <tbody>
              {reviews.map((row) => (
                <tr key={row.id}>
                  <td>{employeeName(row.employeeId)}</td>
                  <td>{row.reviewPeriod}</td>
                  <td>{row.reviewDate}</td>
                  <td><span className="badge badge-primary">{row.rating} / 5</span></td>
                  <td className="max-w-xs truncate">{row.comments}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!reviews.length && <p className="p-6 text-center text-navy-500">{ar ? "لا توجد تقييمات" : "No reviews yet"}</p>}
        </div>
      </main>
    </AppLayout>
  );
}
