import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  Clock3,
  Download,
  Loader2,
  MapPin,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  apiDownload,
  apiEnvelopeRequest,
  apiRequest,
} from "@erp/shared-frontend-data-access";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";

type Row = {
  id: string;
  employeeName: string;
  email: string;
  businessDate: string;
  timezone: string;
  branchName?: string;
  shiftName?: string;
  checkInAt: string;
  checkOutAt?: string | null;
  workedMinutes?: number | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  status: string;
  workplaceName?: string;
  checkoutWorkplaceName?: string;
  distanceM?: number;
  accuracyM?: number;
  locationStatus?: string;
};
type Summary = {
  totalEmployees: number;
  present: number;
  late: number;
  absent: number;
  checkedOut: number;
  missingCheckout: number;
  rejectedLocation: number;
  suspicious: number;
};
type Workplace = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusM: number;
  branchName?: string;
  isActive: boolean;
  assignedUsers: number;
};
const fmt = (v: string | null | undefined, locale: string, tz: string) =>
  v
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: undefined,
        hour: "2-digit",
        minute: "2-digit",
        timeZone: tz,
      }).format(new Date(v))
    : "—";
const mins = (v: number | null | undefined) =>
  v == null ? "—" : `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;

export default function AttendanceAdminPage() {
  const { can } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar"),
    locale = ar ? "ar-EG" : "en-US";
  const [rows, setRows] = useState<Row[]>([]),
    [summary, setSummary] = useState<Summary | null>(null),
    [workplaces, setWorkplaces] = useState<Workplace[]>([]),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState<"records" | "workplaces">("records"),
    [filters, setFilters] = useState({
      search: "",
      from: "",
      to: "",
      status: "",
      branchId: "",
    });
  const manageLocations =
    can("attendance.locations.manage") ||
    can("attendance.locations") ||
    can("attendance.manage");
  const canExport =
    can("attendance.records.export") || can("attendance.manage");
  const params = useCallback(
    (withPage = true) => {
      const q = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && q.set(k, v));
      if (withPage) {
        q.set("page", String(page));
        q.set("pageSize", "25");
      }
      return q.toString();
    },
    [filters, page],
  );
  const load = useCallback(async () => {
    setLoading(true);
    setNotice("");
    try {
      const q = params();
      const envelope = await apiEnvelopeRequest<Row[]>(
        `/attendance/admin/records?${q}`,
      );
      setRows(envelope.data);
      setTotal(envelope.meta?.total ?? envelope.data.length);
      const date =
        filters.to || filters.from || new Date().toISOString().slice(0, 10);
      setSummary(
        await apiRequest<Summary>(`/attendance/admin/summary?date=${date}`),
      );
      if (manageLocations)
        setWorkplaces(
          await apiRequest<Workplace[]>("/attendance/admin/workplaces"),
        );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [filters.from, filters.to, manageLocations, params]);
  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);
  async function download() {
    try {
      const file = await apiDownload(
        `/attendance/admin/export?${params(false)}`,
      );
      const url = URL.createObjectURL(file.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Export failed");
    }
  }
  function reset() {
    setFilters({ search: "", from: "", to: "", status: "", branchId: "" });
    setPage(1);
  }
  return (
    <AppLayout>
      <main className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {ar ? "إدارة الحضور والانصراف" : "Attendance administration"}
            </h1>
            <p className="text-sm text-navy-500">
              {ar
                ? "تقارير الموظفين ضمن نطاق الشركة والفروع المصرح بها"
                : "Employee reports restricted to your company and branch scope"}
            </p>
          </div>
          <div className="flex gap-2">
            {canExport && (
              <button className="btn btn-ghost" onClick={() => void download()}>
                <Download className="h-4 w-4" />
                {ar ? "تصدير CSV" : "Export CSV"}
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              {ar ? "تحديث" : "Refresh"}
            </button>
          </div>
        </header>
        {notice && (
          <div
            role="alert"
            className="rounded-xl bg-danger-50 p-3 text-danger-700"
          >
            {notice}
          </div>
        )}
        <div className="flex gap-2">
          <button
            className={tab === "records" ? "btn btn-primary" : "btn btn-ghost"}
            onClick={() => setTab("records")}
          >
            {ar ? "السجلات والتقارير" : "Records & reports"}
          </button>
          {manageLocations && (
            <button
              className={
                tab === "workplaces" ? "btn btn-primary" : "btn btn-ghost"
              }
              onClick={() => setTab("workplaces")}
            >
              {ar ? "مواقع العمل" : "Workplaces"}
            </button>
          )}
        </div>
        {tab === "records" && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  [
                    ar ? "إجمالي الموظفين" : "Employees",
                    summary?.totalEmployees,
                    Users,
                  ],
                  [
                    ar ? "الحاضرون اليوم" : "Present",
                    summary?.present,
                    UserRoundCheck,
                  ],
                  [ar ? "المتأخرون" : "Late", summary?.late, Clock3],
                  [ar ? "الغائبون" : "Absent", summary?.absent, AlertTriangle],
                  [
                    ar ? "سجلوا الانصراف" : "Checked out",
                    summary?.checkedOut,
                    CalendarCheck,
                  ],
                  [
                    ar ? "انصراف منسي" : "Missing checkout",
                    summary?.missingCheckout,
                    AlertTriangle,
                  ],
                  [
                    ar ? "مرفوضة بالموقع" : "Location rejected",
                    summary?.rejectedLocation,
                    MapPin,
                  ],
                  [
                    ar ? "مشكوك فيها" : "Suspicious",
                    summary?.suspicious,
                    AlertTriangle,
                  ],
                ] as const
              ).map(([label, value, Icon]) => (
                <article
                  key={String(label)}
                  className="card flex items-center gap-4 p-4"
                >
                  <span className="rounded-xl bg-primary-50 p-3 text-primary-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm text-navy-500">{String(label)}</p>
                    <strong className="text-2xl">
                      {loading ? "—" : String(value ?? 0)}
                    </strong>
                  </div>
                </article>
              ))}
            </section>
            <section className="card p-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <label className="relative">
                  <Search className="absolute start-3 top-3 h-4 w-4 text-navy-400" />
                  <input
                    aria-label={ar ? "بحث" : "Search"}
                    className="input ps-9"
                    placeholder={
                      ar ? "اسم أو بريد الموظف" : "Employee name or email"
                    }
                    value={filters.search}
                    onChange={(e) => {
                      setFilters({ ...filters, search: e.target.value });
                      setPage(1);
                    }}
                  />
                </label>
                <input
                  aria-label="From"
                  className="input"
                  type="date"
                  value={filters.from}
                  onChange={(e) => {
                    setFilters({ ...filters, from: e.target.value });
                    setPage(1);
                  }}
                />
                <input
                  aria-label="To"
                  className="input"
                  type="date"
                  value={filters.to}
                  onChange={(e) => {
                    setFilters({ ...filters, to: e.target.value });
                    setPage(1);
                  }}
                />
                <select
                  aria-label="Status"
                  className="input"
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({ ...filters, status: e.target.value });
                    setPage(1);
                  }}
                >
                  <option value="">{ar ? "كل الحالات" : "All statuses"}</option>
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="completed">Completed</option>
                  <option value="incomplete">Incomplete</option>
                  <option value="manual">Manual</option>
                </select>
                <button className="btn btn-ghost" onClick={reset}>
                  {ar ? "إعادة ضبط الفلاتر" : "Reset filters"}
                </button>
              </div>
            </section>
            <section className="card overflow-hidden">
              {loading ? (
                <div className="grid min-h-52 place-items-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{ar ? "الموظف" : "Employee"}</th>
                        <th>{ar ? "التاريخ" : "Date"}</th>
                        <th>{ar ? "الفرع / الوردية" : "Branch / shift"}</th>
                        <th>{ar ? "الحضور" : "Check-in"}</th>
                        <th>{ar ? "الانصراف" : "Check-out"}</th>
                        <th>{ar ? "الساعات" : "Hours"}</th>
                        <th>{ar ? "التأخير" : "Late"}</th>
                        <th>{ar ? "الموقع" : "Location"}</th>
                        <th>{ar ? "الحالة" : "Status"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.employeeName}</strong>
                            <small className="block text-navy-500">
                              {r.email}
                            </small>
                          </td>
                          <td>{r.businessDate}</td>
                          <td>
                            {r.branchName || "—"}
                            <small className="block">
                              {r.shiftName || "—"}
                            </small>
                          </td>
                          <td>{fmt(r.checkInAt, locale, r.timezone)}</td>
                          <td>{fmt(r.checkOutAt, locale, r.timezone)}</td>
                          <td>{mins(r.workedMinutes)}</td>
                          <td>{r.lateMinutes}m</td>
                          <td>
                            {r.workplaceName || "—"}
                            <small className="block text-navy-500">
                              {r.distanceM ?? "—"}m · ±{r.accuracyM ?? "—"}m
                            </small>
                          </td>
                          <td>
                            <span className="badge badge-gray">{r.status}</span>
                          </td>
                        </tr>
                      ))}
                      {!rows.length && (
                        <tr>
                          <td
                            colSpan={9}
                            className="p-10 text-center text-navy-500"
                          >
                            {ar
                              ? "لا توجد نتائج مطابقة"
                              : "No matching records"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <footer className="flex items-center justify-between border-t p-4 text-sm">
                <span>
                  {total} {ar ? "سجل" : "records"}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPage((p) => p - 1)}
                  >
                    {ar ? "السابق" : "Previous"}
                  </button>
                  <span className="p-2">{page}</span>
                  <button
                    disabled={page * 25 >= total}
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {ar ? "التالي" : "Next"}
                  </button>
                </div>
              </footer>
            </section>
          </>
        )}
        {tab === "workplaces" && (
          <Workplaces
            rows={workplaces}
            ar={ar}
            refresh={load}
            setNotice={setNotice}
          />
        )}
      </main>
    </AppLayout>
  );
}

function Workplaces({
  rows,
  ar,
  refresh,
  setNotice,
}: {
  rows: Workplace[];
  ar: boolean;
  refresh: () => Promise<void>;
  setNotice: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Workplace | null>(null);
  const [success, setSuccess] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setSuccess("");
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await apiRequest("/attendance/admin/workplaces", {
        method: "POST",
        body: JSON.stringify({
          name: f.get("name"),
          address: f.get("address"),
          latitude: Number(f.get("latitude")),
          longitude: Number(f.get("longitude")),
          radiusM: Number(f.get("radius")),
          isActive: true,
        }),
      });
      form.reset();
      await refresh();
      setSuccess(ar ? "تمت إضافة موقع العمل." : "Workplace added.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }
  async function update(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setSuccess("");
    const f = new FormData(e.currentTarget);
    try {
      await apiRequest(`/attendance/admin/workplaces/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: f.get("name"),
          address: f.get("address"),
          latitude: Number(f.get("latitude")),
          longitude: Number(f.get("longitude")),
          radiusM: Number(f.get("radius")),
          isActive: f.get("isActive") === "on",
        }),
      });
      setEditing(null);
      await refresh();
      setSuccess(ar ? "تم حفظ تعديلات الموقع." : "Workplace changes saved.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }
  async function archive(workplace: Workplace) {
    const reason = window.prompt(
      ar
        ? "اكتب سبب حذف/أرشفة الموقع:"
        : "Reason for archiving this workplace:",
    );
    if (!reason?.trim()) {
      setNotice(ar ? "سبب الحذف مطلوب." : "A deletion reason is required.");
      return;
    }
    if (
      !window.confirm(
        ar
          ? `سيتم تعطيل «${workplace.name}» مع الاحتفاظ بالسجلات القديمة. متابعة؟`
          : `Archive “${workplace.name}” while retaining historical records?`,
      )
    )
      return;
    setBusy(true);
    setSuccess("");
    try {
      await apiRequest(`/attendance/admin/workplaces/${workplace.id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      await refresh();
      setSuccess(
        ar
          ? "تم حذف موقع العمل من القائمة النشطة مع الاحتفاظ بالسجلات القديمة."
          : "Workplace removed from the active list; historical records were retained.",
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      {success && (
        <div
          role="status"
          className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 xl:col-span-2"
        >
          {success}
        </div>
      )}
      <form className="card space-y-4 p-5" onSubmit={(e) => void submit(e)}>
        <h2 className="font-bold">{ar ? "إضافة موقع عمل" : "Add workplace"}</h2>
        {[
          ["name", ar ? "الاسم" : "Name", "text"],
          ["address", ar ? "العنوان" : "Address", "text"],
          ["latitude", "Latitude", "number"],
          ["longitude", "Longitude", "number"],
          ["radius", ar ? "نصف القطر بالمتر" : "Radius (m)", "number"],
        ].map(([name, label, type]) => (
          <label key={name} className="block text-sm">
            {label}
            <input
              required
              name={name}
              type={type}
              step={type === "number" ? "any" : undefined}
              className="input mt-1 w-full"
            />
          </label>
        ))}
        <button
          disabled={busy}
          className="btn btn-primary w-full justify-center"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {ar ? "حفظ" : "Save"}
        </button>
      </form>
      <section className="grid gap-3 md:grid-cols-2">
        {rows
          .filter((w) => w.isActive)
          .map((w) => (
            <article key={w.id} className="card p-5">
              <div className="flex justify-between">
                <h3 className="font-bold">{w.name}</h3>
                <span
                  className={
                    w.isActive ? "badge badge-success" : "badge badge-gray"
                  }
                >
                  {w.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-2 text-sm text-navy-500">
                {w.address || w.branchName || "—"}
              </p>
              <p className="mt-3 text-xs">
                {Number(w.latitude).toFixed(5)},{" "}
                {Number(w.longitude).toFixed(5)} · {w.radiusM}m ·{" "}
                {w.assignedUsers} users
              </p>
              <div className="mt-4 flex gap-2 border-t border-navy-100 pt-4 dark:border-navy-700">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditing(w)}
                >
                  <Pencil className="h-4 w-4" />
                  {ar ? "تعديل" : "Edit"}
                </button>
                {w.isActive && (
                  <button
                    type="button"
                    disabled={busy}
                    className="btn btn-ghost btn-sm text-danger-600"
                    onClick={() => void archive(w)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {ar ? "حذف" : "Delete"}
                  </button>
                )}
              </div>
            </article>
          ))}
        {!rows.some((w) => w.isActive) && (
          <div className="card p-8 text-center text-navy-500">
            {ar ? "لا توجد مواقع عمل نشطة." : "No active workplaces."}
          </div>
        )}
      </section>
      {editing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-navy-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-workplace-title"
        >
          <form
            onSubmit={(e) => void update(e)}
            className="card w-full max-w-lg space-y-4 p-6"
          >
            <div className="flex items-center justify-between">
              <h2 id="edit-workplace-title" className="text-lg font-bold">
                {ar ? "تعديل موقع العمل" : "Edit workplace"}
              </h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEditing(null)}
              >
                ×
              </button>
            </div>
            {[
              ["name", ar ? "الاسم" : "Name", "text", editing.name],
              ["address", ar ? "العنوان" : "Address", "text", editing.address],
              ["latitude", "Latitude", "number", editing.latitude],
              ["longitude", "Longitude", "number", editing.longitude],
              [
                "radius",
                ar ? "نصف القطر بالمتر" : "Radius (m)",
                "number",
                editing.radiusM,
              ],
            ].map(([name, label, type, value]) => (
              <label key={String(name)} className="block text-sm">
                {label}
                <input
                  required
                  name={String(name)}
                  type={String(type)}
                  step={type === "number" ? "any" : undefined}
                  defaultValue={value}
                  className="input mt-1 w-full"
                />
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                name="isActive"
                type="checkbox"
                defaultChecked={editing.isActive}
              />
              {ar ? "الموقع نشط" : "Active workplace"}
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditing(null)}
              >
                {ar ? "إلغاء" : "Cancel"}
              </button>
              <button disabled={busy} className="btn btn-primary">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {ar ? "حفظ التعديلات" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
