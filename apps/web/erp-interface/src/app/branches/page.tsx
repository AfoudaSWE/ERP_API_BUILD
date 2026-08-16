import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Building2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";
type Branch = {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  address: string;
  phone: string;
  timezone?: string | null;
  isActive: boolean;
  employeeCount: number;
};
export default function BranchesPage() {
  const { can } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const manage = can("branches.manage");
  const [rows, setRows] = useState<Branch[]>([]),
    [editing, setEditing] = useState<Branch | null>(null),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      setRows(await apiRequest<Branch[]>("/hr/branches"));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    }
  }, []);
  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [load]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await apiRequest(
        editing ? `/hr/branches/${editing.id}` : "/hr/branches",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify({
            code: f.get("code"),
            name: f.get("name"),
            nameAr: f.get("nameAr"),
            address: f.get("address"),
            phone: f.get("phone"),
            timezone: f.get("timezone") || null,
            isActive: true,
          }),
        },
      );
      setOpen(false);
      setEditing(null);
      setMessage(ar ? "تم حفظ الفرع." : "Branch saved.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }
  async function archive(row: Branch) {
    const reason = prompt(ar ? "سبب أرشفة الفرع:" : "Archive reason:");
    if (
      !reason?.trim() ||
      !confirm(
        ar
          ? "سيتم تعطيل الفرع مع الاحتفاظ ببياناته. متابعة؟"
          : "Archive this branch and retain its data?",
      )
    )
      return;
    setBusy(true);
    try {
      await apiRequest(`/hr/branches/${row.id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      await load();
      setMessage(ar ? "تمت أرشفة الفرع." : "Branch archived.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{ar ? "الفروع" : "Branches"}</h1>
            <p className="text-sm text-navy-500">
              {ar
                ? "إدارة بيانات الفروع ونطاق الموظفين"
                : "Manage branch details and employee scope"}
            </p>
          </div>
          {manage && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {ar ? "فرع جديد" : "New branch"}
            </button>
          )}
        </header>
        {message && (
          <div
            role="status"
            className="rounded-xl bg-primary-50 p-3 text-primary-700"
          >
            {message}
          </div>
        )}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows
            .filter((x) => x.isActive)
            .map((row) => (
              <article className="card p-5" key={row.id}>
                <div className="flex items-start justify-between">
                  <span className="rounded-xl bg-primary-50 p-3 text-primary-700">
                    <Building2 />
                  </span>
                  <span className="badge badge-success">{row.code}</span>
                </div>
                <h2 className="mt-4 text-lg font-bold">
                  {ar ? row.nameAr || row.name : row.name}
                </h2>
                <p className="mt-1 text-sm text-navy-500">
                  {row.address || "—"}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-navy-500">
                      {ar ? "الموظفون" : "Employees"}
                    </dt>
                    <dd className="font-bold">{row.employeeCount}</dd>
                  </div>
                  <div>
                    <dt className="text-navy-500">
                      {ar ? "المنطقة الزمنية" : "Timezone"}
                    </dt>
                    <dd>{row.timezone || "Company"}</dd>
                  </div>
                </dl>
                {manage && (
                  <div className="mt-4 flex gap-2 border-t pt-4">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setEditing(row);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      {ar ? "تعديل" : "Edit"}
                    </button>
                    <button
                      disabled={busy}
                      className="btn btn-ghost btn-sm text-danger-600"
                      onClick={() => void archive(row)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {ar ? "حذف" : "Delete"}
                    </button>
                  </div>
                )}
              </article>
            ))}
        </section>
        {open && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-navy-950/60 p-4"
            role="dialog"
            aria-modal="true"
          >
            <form
              onSubmit={(e) => void save(e)}
              className="card w-full max-w-xl space-y-4 p-6"
            >
              <h2 className="text-lg font-bold">
                {editing
                  ? ar
                    ? "تعديل الفرع"
                    : "Edit branch"
                  : ar
                    ? "إضافة فرع"
                    : "Add branch"}
              </h2>
              {[
                ["code", ar ? "كود الفرع" : "Code", editing?.code],
                [
                  "name",
                  ar ? "الاسم بالإنجليزية" : "English name",
                  editing?.name,
                ],
                [
                  "nameAr",
                  ar ? "الاسم بالعربية" : "Arabic name",
                  editing?.nameAr,
                ],
                ["address", ar ? "العنوان" : "Address", editing?.address],
                ["phone", ar ? "الهاتف" : "Phone", editing?.phone],
                [
                  "timezone",
                  ar ? "المنطقة الزمنية" : "Timezone",
                  editing?.timezone ?? "Africa/Cairo",
                ],
              ].map(([name, label, value]) => (
                <label className="block text-sm" key={name}>
                  {label}
                  <input
                    required={name === "code" || name === "name"}
                    className="input mt-1 w-full"
                    name={name}
                    defaultValue={value}
                  />
                </label>
              ))}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setOpen(false)}
                >
                  {ar ? "إلغاء" : "Cancel"}
                </button>
                <button disabled={busy} className="btn btn-primary">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {ar ? "حفظ" : "Save"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
