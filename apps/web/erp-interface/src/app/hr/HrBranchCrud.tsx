import { useEffect, useState, type FormEvent } from "react";
import { Archive, Loader2, Pencil, Plus, X } from "lucide-react";
import { apiRequest } from "@erp/shared-frontend-data-access";

type Branch = {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  address: string;
  phone: string;
  timezone: string | null;
  isActive: boolean;
  employeeCount?: number;
};

export function HrBranchCrud({ ar, onChanged }: { ar: boolean; onChanged: () => Promise<void> }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [edit, setEdit] = useState<Branch | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = async () => setBranches(await apiRequest<Branch[]>("/hr/branches"));
  useEffect(() => {
    const timer = setTimeout(() => {
      void load().catch((e: unknown) => setMessage(e instanceof Error ? e.message : "Failed"));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const form = e.currentTarget, data = new FormData(form);
    const body = {
      code: data.get("code"),
      name: data.get("name"),
      nameAr: data.get("nameAr"),
      address: data.get("address"),
      phone: data.get("phone"),
      ...(edit ? { isActive: data.get("isActive") === "on" } : {}),
    };
    try {
      await apiRequest(`/hr/branches${edit ? `/${edit.id}` : ""}`, {
        method: edit ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      form.reset();
      setEdit(null);
      await Promise.all([load(), onChanged()]);
      setMessage(ar ? "تم حفظ البيانات بنجاح." : "Saved successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function archive(id: string) {
    const reason = prompt(ar ? "سبب أرشفة الفرع؟" : "Reason for archiving this branch?");
    if (!reason) return;
    setBusy(true);
    try {
      await apiRequest(`/hr/branches/${id}`, { method: "DELETE", body: JSON.stringify({ reason }) });
      await Promise.all([load(), onChanged()]);
      setMessage(ar ? "تمت الأرشفة." : "Archived.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {message && <div role="status" className="rounded-xl bg-primary-50 p-3 text-primary-700">{message}</div>}
      <form key={edit?.id ?? "branch-new"} className="card grid gap-3 p-5 md:grid-cols-2" onSubmit={(e) => void save(e)}>
        <div className="flex items-center justify-between md:col-span-2">
          <h2 className="font-bold">{edit ? (ar ? "تعديل فرع" : "Edit branch") : (ar ? "إضافة فرع" : "Add branch")}</h2>
          {edit && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(null)} aria-label={ar ? "إلغاء" : "Cancel"}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <input required name="code" className="input" defaultValue={edit?.code} placeholder={ar ? "الكود" : "Code"} />
        <input required name="name" className="input" defaultValue={edit?.name} placeholder={ar ? "الاسم بالإنجليزية" : "English name"} />
        <input name="nameAr" className="input" defaultValue={edit?.nameAr} placeholder={ar ? "الاسم بالعربية" : "Arabic name"} />
        <input name="phone" className="input" defaultValue={edit?.phone} placeholder={ar ? "الهاتف" : "Phone"} />
        <input name="address" className="input md:col-span-2" defaultValue={edit?.address} placeholder={ar ? "العنوان" : "Address"} />
        {edit && (
          <label className="flex gap-2">
            <input name="isActive" type="checkbox" defaultChecked={edit.isActive} />
            {ar ? "نشط" : "Active"}
          </label>
        )}
        <div className="md:col-span-2">
          <button disabled={busy} className="btn btn-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {edit ? (ar ? "حفظ التعديل" : "Save changes") : ar ? "إضافة" : "Add"}
          </button>
        </div>
      </form>
      <section className="card overflow-hidden">
        <h2 className="border-b p-5 font-bold">{ar ? "الفروع" : "Branches"}</h2>
        {branches.map((b) => (
          <div key={b.id} className="flex items-center justify-between border-b p-4">
            <div>
              <strong>{ar ? b.nameAr || b.name : b.name}</strong>
              <small className="block text-navy-500">
                {b.code} · {b.employeeCount ?? 0} {ar ? "موظف" : "employees"} · {b.isActive ? (ar ? "نشط" : "Active") : (ar ? "مؤرشف" : "Archived")}
              </small>
            </div>
            <div className="flex">
              <button className="btn btn-ghost btn-sm" onClick={() => setEdit(b)} aria-label={ar ? "تعديل" : "Edit"}>
                <Pencil className="h-4 w-4" />
              </button>
              {b.isActive && (
                <button className="btn btn-ghost btn-sm text-danger-600" onClick={() => void archive(b.id)} aria-label={ar ? "أرشفة" : "Archive"}>
                  <Archive className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {!branches.length && <p className="p-6 text-center text-navy-500">{ar ? "لا توجد بيانات." : "No records."}</p>}
      </section>
    </div>
  );
}
