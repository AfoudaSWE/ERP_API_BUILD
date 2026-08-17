import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CatalogCrud } from "@/components/shared/CatalogCrud";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useTranslation } from "react-i18next";

type Course = { id: string; name: string; nameAr?: string; isActive: boolean };
type Employee = { userId: string; name: string; nameAr?: string };
type Enrollment = { id: string; courseId: string; employeeId: string; status: string; employeeName?: string; courseName?: string };

export default function TrainingPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [courses, setCourses] = useState<Course[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [form, setForm] = useState({ courseId: "", employeeId: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [courseRows, employeeRows, enrollmentRows] = await Promise.all([
      apiRequest<Course[]>("/hr/training-courses"),
      apiRequest<{ userId: string; name: string; nameAr?: string }[]>("/hr/employees").catch(() => []),
      apiRequest<{ id: string; courseId: string; employeeId: string; status: string }[]>("/hr/training-enrollments"),
    ]);
    setCourses(courseRows);
    setEmployees(employeeRows);
    const courseById = new Map(courseRows.map((c) => [c.id, c]));
    const employeeById = new Map(employeeRows.map((e) => [e.userId, e]));
    setEnrollments(enrollmentRows.map((row) => ({ ...row, courseName: courseById.get(row.courseId)?.name, employeeName: employeeById.get(row.employeeId)?.name })));
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load().catch(() => undefined); }, [load]);

  async function enroll(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMessage("");
    try {
      await apiRequest("/hr/training-enrollments", { method: "POST", body: JSON.stringify(form) });
      setForm({ courseId: "", employeeId: "" });
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed"); } finally { setBusy(false); }
  }

  async function complete(enrollment: Enrollment) {
    setBusy(true);
    try { await apiRequest(`/hr/training-enrollments/${enrollment.id}`, { method: "PATCH", body: JSON.stringify({ status: "completed" }) }); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Failed"); } finally { setBusy(false); }
  }

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "التدريب والتطوير" : "Training & Development"}</h1>
          <p className="text-sm text-navy-500">{ar ? "الدورات التدريبية وتسجيل الموظفين" : "Courses and employee enrollment tracking"}</p>
        </header>
        <CatalogCrud ar={ar} title={ar ? "دورة تدريبية" : "course"} endpoint="/hr/training-courses" />
        <section className="card space-y-4 p-5">
          <h2 className="font-bold">{ar ? "تسجيل موظف في دورة" : "Enroll an employee"}</h2>
          {message && <div role="alert" className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{message}</div>}
          <form onSubmit={(e) => void enroll(e)} className="grid gap-3 md:grid-cols-3">
            <select required className="select" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
              <option value="">{ar ? "اختر الدورة" : "Select course"}</option>
              {courses.filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{ar ? c.nameAr || c.name : c.name}</option>)}
            </select>
            <select required className="select" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">{ar ? "اختر الموظف" : "Select employee"}</option>
              {employees.map((e) => <option key={e.userId} value={e.userId}>{ar ? e.nameAr || e.name : e.name}</option>)}
            </select>
            <button disabled={busy} className="btn btn-primary">{ar ? "تسجيل" : "Enroll"}</button>
          </form>
          <div className="overflow-x-auto">
            <table className="table min-w-[600px]">
              <thead><tr><th>{ar ? "الموظف" : "Employee"}</th><th>{ar ? "الدورة" : "Course"}</th><th>{ar ? "الحالة" : "Status"}</th><th>{ar ? "إجراءات" : "Actions"}</th></tr></thead>
              <tbody>
                {enrollments.map((row) => (
                  <tr key={row.id}>
                    <td>{row.employeeName || "—"}</td>
                    <td>{row.courseName || "—"}</td>
                    <td><span className="badge badge-primary">{row.status}</span></td>
                    <td>{row.status === "enrolled" && <button disabled={busy} className="btn btn-secondary btn-sm" onClick={() => void complete(row)}>{ar ? "إتمام" : "Mark complete"}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!enrollments.length && <p className="p-4 text-center text-navy-500">{ar ? "لا توجد تسجيلات" : "No enrollments yet"}</p>}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}
