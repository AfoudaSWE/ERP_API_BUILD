import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useTranslation } from "react-i18next";

type Employee = { userId: string; name: string; nameAr?: string };
type LeaveType = { id: string; name: string; nameAr?: string };
type LeaveRequest = { id: string; employeeName: string; leaveTypeName: string; startDate: string; endDate: string; days: string; status: string; reason: string };

export default function LeavesPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ employeeId: "", leaveTypeId: "", startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), days: "1", reason: "" });

  const load = useCallback(async () => {
    const [employeeRows, typeRows, requestRows] = await Promise.all([
      apiRequest<Employee[]>("/hr/employees").catch(() => []),
      apiRequest<LeaveType[]>("/hr/leave-types"),
      apiRequest<LeaveRequest[]>("/hr/leave-requests"),
    ]);
    setEmployees(employeeRows); setLeaveTypes(typeRows); setRequests(requestRows);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load().catch(() => undefined); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await apiRequest("/hr/leave-requests", { method: "POST", body: JSON.stringify(form) });
      setForm({ ...form, reason: "" });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Failed"); } finally { setBusy(false); }
  }

  async function act(request: LeaveRequest, action: "approve" | "reject" | "cancel") {
    setBusy(true); setError("");
    try { await apiRequest(`/hr/leave-requests/${request.id}/actions`, { method: "POST", body: JSON.stringify({ action }) }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Failed"); } finally { setBusy(false); }
  }

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "الإجازات" : "Leaves"}</h1>
          <p className="text-sm text-navy-500">{ar ? "طلبات إجازة الموظفين واعتمادها" : "Employee leave requests and approvals"}</p>
        </header>
        {error && <div role="alert" className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
        <form onSubmit={(e) => void submit(e)} className="card grid gap-3 p-5 md:grid-cols-3">
          <select required className="select" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
            <option value="">{ar ? "اختر الموظف" : "Select employee"}</option>
            {employees.map((emp) => <option key={emp.userId} value={emp.userId}>{ar ? emp.nameAr || emp.name : emp.name}</option>)}
          </select>
          <select required className="select" value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}>
            <option value="">{ar ? "نوع الإجازة" : "Leave type"}</option>
            {leaveTypes.filter((t) => t).map((t) => <option key={t.id} value={t.id}>{ar ? t.nameAr || t.name : t.name}</option>)}
          </select>
          <input type="number" min="0.5" step="0.5" required className="input" placeholder={ar ? "عدد الأيام" : "Days"} value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
          <input type="date" required className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <input type="date" required className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          <input className="input md:col-span-3" placeholder={ar ? "السبب" : "Reason"} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <button disabled={busy} className="btn btn-primary md:col-span-3">{ar ? "تقديم الطلب" : "Submit request"}</button>
        </form>
        <div className="card overflow-x-auto">
          <table className="table min-w-[850px]">
            <thead><tr><th>{ar ? "الموظف" : "Employee"}</th><th>{ar ? "النوع" : "Type"}</th><th>{ar ? "من" : "From"}</th><th>{ar ? "إلى" : "To"}</th><th>{ar ? "الأيام" : "Days"}</th><th>{ar ? "الحالة" : "Status"}</th><th>{ar ? "إجراءات" : "Actions"}</th></tr></thead>
            <tbody>
              {requests.map((row) => (
                <tr key={row.id}>
                  <td>{row.employeeName}</td>
                  <td>{row.leaveTypeName}</td>
                  <td>{row.startDate}</td>
                  <td>{row.endDate}</td>
                  <td>{row.days}</td>
                  <td><span className="badge badge-primary">{row.status}</span></td>
                  <td>
                    {row.status === "pending" && (
                      <div className="flex gap-2">
                        <button disabled={busy} className="btn btn-primary btn-sm" onClick={() => void act(row, "approve")}>{ar ? "اعتماد" : "Approve"}</button>
                        <button disabled={busy} className="btn btn-secondary btn-sm" onClick={() => void act(row, "reject")}>{ar ? "رفض" : "Reject"}</button>
                        <button disabled={busy} className="btn btn-ghost btn-sm" onClick={() => void act(row, "cancel")}>{ar ? "إلغاء" : "Cancel"}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!requests.length && <p className="p-6 text-center text-navy-500">{ar ? "لا توجد طلبات إجازة" : "No leave requests yet"}</p>}
        </div>
      </main>
    </AppLayout>
  );
}
