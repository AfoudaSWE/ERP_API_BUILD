import { useEffect, useState, type FormEvent } from "react";
import { Archive, Loader2, Pencil, Plus, X } from "lucide-react";
import { apiRequest } from "@erp/shared-frontend-data-access";

export type ExtraField =
  | { key: string; label: string; labelAr: string; type: "text"; required?: boolean }
  | { key: string; label: string; labelAr: string; type: "number"; defaultValue?: number }
  | { key: string; label: string; labelAr: string; type: "select"; options: { value: string; label: string; labelAr: string }[] };

type Row = Record<string, unknown> & { id: string; name: string; nameAr?: string; isActive: boolean };

export function CatalogCrud({
  ar,
  title,
  endpoint,
  hasCode,
  extraFields = [],
  detailKeys = [],
}: {
  ar: boolean;
  title: string;
  endpoint: string;
  hasCode?: boolean;
  extraFields?: ExtraField[];
  detailKeys?: string[];
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [edit, setEdit] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => setRows(await apiRequest<Row[]>(endpoint));
  useEffect(() => {
    const timer = setTimeout(() => {
      void load().catch((e: unknown) => setMessage(e instanceof Error ? e.message : "Failed"));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMessage("");
    const data = new FormData(form);
    const body: Record<string, unknown> = {
      name: data.get("name"),
      nameAr: data.get("nameAr") || "",
      ...(hasCode ? { code: data.get("code") } : {}),
      ...(edit ? { isActive: data.get("isActive") === "on" } : {}),
    };
    for (const field of extraFields) {
      const raw = data.get(field.key);
      body[field.key] = field.type === "number" ? Number(raw) : raw;
    }
    try {
      await apiRequest(`${endpoint}${edit ? `/${edit.id}` : ""}`, {
        method: edit ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      form.reset();
      setEdit(null);
      await load();
      setMessage(ar ? "تم الحفظ." : "Saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function archive(id: string) {
    if (!confirm(ar ? "هل تريد أرشفة هذا السجل؟" : "Archive this record?")) return;
    setBusy(true);
    try {
      await apiRequest(`${endpoint}/${id}`, { method: "DELETE" });
      await load();
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
      <div className="grid gap-5 lg:grid-cols-2">
        <form key={edit?.id ?? "new"} className="card space-y-3 p-5" onSubmit={(e) => void save(e)}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{edit ? (ar ? "تعديل" : "Edit") : (ar ? "إضافة" : "Add")} {title}</h2>
            {edit && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(null)} aria-label={ar ? "إلغاء" : "Cancel"}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {hasCode && (
            <input required name="code" className="input w-full" defaultValue={edit?.code as string | undefined} placeholder={ar ? "الكود" : "Code"} />
          )}
          <input required name="name" className="input w-full" defaultValue={edit?.name} placeholder={ar ? "الاسم بالإنجليزية" : "English name"} />
          <input name="nameAr" className="input w-full" defaultValue={edit?.nameAr} placeholder={ar ? "الاسم بالعربية" : "Arabic name"} />
          {extraFields.map((field) => {
            const current = edit?.[field.key];
            if (field.type === "select") {
              return (
                <label className="block text-sm" key={field.key}>
                  {ar ? field.labelAr : field.label}
                  <select className="select mt-1 w-full" name={field.key} defaultValue={(current as string) ?? field.options[0]?.value}>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>{ar ? option.labelAr : option.label}</option>
                    ))}
                  </select>
                </label>
              );
            }
            return (
              <label className="block text-sm" key={field.key}>
                {ar ? field.labelAr : field.label}
                <input
                  className="input mt-1 w-full"
                  name={field.key}
                  type={field.type}
                  defaultValue={(current as string | number | undefined) ?? (field.type === "number" ? field.defaultValue : undefined)}
                  required={field.type === "text" && field.required}
                />
              </label>
            );
          })}
          {edit && (
            <label className="flex gap-2">
              <input name="isActive" type="checkbox" defaultChecked={edit.isActive} />
              {ar ? "نشط" : "Active"}
            </label>
          )}
          <button disabled={busy} className="btn btn-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {edit ? (ar ? "حفظ التعديل" : "Save changes") : (ar ? "إضافة" : "Add")}
          </button>
        </form>
        <section className="card overflow-hidden">
          <h2 className="border-b p-5 font-bold">{title}</h2>
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between border-b p-4">
              <div>
                <strong>{ar ? row.nameAr || row.name : row.name}</strong>
                <small className="block text-navy-500">
                  {[row.code as string, ...detailKeys.map((k) => row[k] as string)].filter(Boolean).join(" · ")}
                  {(row.code || detailKeys.length) ? " · " : ""}
                  {row.isActive ? (ar ? "نشط" : "Active") : (ar ? "مؤرشف" : "Archived")}
                </small>
              </div>
              <div className="flex">
                <button className="btn btn-ghost btn-sm" onClick={() => setEdit(row)} aria-label={ar ? "تعديل" : "Edit"}>
                  <Pencil className="h-4 w-4" />
                </button>
                {row.isActive && (
                  <button className="btn btn-ghost btn-sm text-danger-600" onClick={() => void archive(row.id)} aria-label={ar ? "أرشفة" : "Archive"}>
                    <Archive className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {!rows.length && <p className="p-6 text-center text-navy-500">{ar ? "لا توجد بيانات." : "No records."}</p>}
        </section>
      </div>
    </div>
  );
}
