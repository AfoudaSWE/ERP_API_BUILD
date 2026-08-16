import { useEffect, useState, type FormEvent } from "react";
import { Archive, Loader2, Pencil, Plus, X } from "lucide-react";
import { apiRequest } from "@erp/shared-frontend-data-access";

type Department = { id: string; code: string; name: string; nameAr: string; isActive: boolean };
type Shift = { id: string; name: string; nameAr: string; startTime: string; endTime: string; graceMinutes: number; workDays: number[]; isActive: boolean };
type Edit = { kind: "department"; value: Department } | { kind: "shift"; value: Shift } | null;

export function HrSetupCrud({ ar, onChanged }: { ar: boolean; onChanged: () => Promise<void> }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [edit, setEdit] = useState<Edit>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = async () => {
    const [d, s] = await Promise.all([apiRequest<Department[]>("/hr/departments"), apiRequest<Shift[]>("/attendance/admin/shifts")]);
    setDepartments(d); setShifts(s);
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      void load().catch((e: unknown) => setMessage(e instanceof Error ? e.message : "Failed"));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function save(e: FormEvent<HTMLFormElement>, kind: "department" | "shift") {
    e.preventDefault(); setBusy(true); setMessage("");
    const form = e.currentTarget, data = new FormData(form);
    const current = edit?.kind === kind ? edit.value : null;
    const base = kind === "department" ? "/hr/departments" : "/attendance/admin/shifts";
    const body = kind === "department"
      ? { code: data.get("code"), name: data.get("name"), nameAr: data.get("nameAr"), ...(current ? { isActive: data.get("isActive") === "on" } : {}) }
      : { name: data.get("name"), nameAr: data.get("nameAr"), startTime: data.get("startTime"), endTime: data.get("endTime"), graceMinutes: Number(data.get("graceMinutes")), workDays: current && "workDays" in current ? current.workDays : [0,1,2,3,4,5,6], isActive: current ? data.get("isActive") === "on" : true };
    try {
      await apiRequest(`${base}${current ? `/${current.id}` : ""}`, { method: current ? "PATCH" : "POST", body: JSON.stringify(body) });
      form.reset(); setEdit(null); await Promise.all([load(), onChanged()]);
      setMessage(ar ? "تم حفظ البيانات بنجاح." : "Saved successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed"); }
    finally { setBusy(false); }
  }

  async function archive(kind: "department" | "shift", id: string) {
    if (!confirm(ar ? "هل تريد أرشفة هذا السجل؟" : "Archive this record?")) return;
    setBusy(true);
    try {
      await apiRequest(kind === "department" ? `/hr/departments/${id}` : `/attendance/admin/shifts/${id}`, { method: "DELETE" });
      await Promise.all([load(), onChanged()]); setMessage(ar ? "تمت الأرشفة." : "Archived.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed"); }
    finally { setBusy(false); }
  }

  const de = edit?.kind === "department" ? edit.value : undefined;
  const se = edit?.kind === "shift" ? edit.value : undefined;
  return <div className="space-y-5">
    {message && <div role="status" className="rounded-xl bg-primary-50 p-3 text-primary-700">{message}</div>}
    <div className="grid gap-5 lg:grid-cols-2">
      <form key={de?.id ?? "department-new"} className="card space-y-3 p-5" onSubmit={(e) => void save(e, "department")}>
        <Title ar={ar} edit={!!de} name={ar ? "القسم" : "department"} cancel={() => setEdit(null)} />
        <input required name="code" className="input w-full" defaultValue={de?.code} placeholder={ar ? "الكود" : "Code"} />
        <input required name="name" className="input w-full" defaultValue={de?.name} placeholder={ar ? "الاسم بالإنجليزية" : "English name"} />
        <input name="nameAr" className="input w-full" defaultValue={de?.nameAr} placeholder={ar ? "الاسم بالعربية" : "Arabic name"} />
        {de && <Active ar={ar} value={de.isActive} />}<Submit ar={ar} busy={busy} edit={!!de} />
      </form>
      <form key={se?.id ?? "shift-new"} className="card space-y-3 p-5" onSubmit={(e) => void save(e, "shift")}>
        <Title ar={ar} edit={!!se} name={ar ? "الوردية" : "shift"} cancel={() => setEdit(null)} />
        <input required name="name" className="input w-full" defaultValue={se?.name} placeholder={ar ? "الاسم بالإنجليزية" : "English name"} />
        <input name="nameAr" className="input w-full" defaultValue={se?.nameAr} placeholder={ar ? "الاسم بالعربية" : "Arabic name"} />
        <div className="grid grid-cols-2 gap-3"><label>{ar ? "البداية" : "Start"}<input required name="startTime" type="time" className="input mt-1 w-full" defaultValue={se?.startTime?.slice(0,5)} /></label><label>{ar ? "النهاية" : "End"}<input required name="endTime" type="time" className="input mt-1 w-full" defaultValue={se?.endTime?.slice(0,5)} /></label></div>
        <label>{ar ? "دقائق السماح" : "Grace minutes"}<input required name="graceMinutes" type="number" min="0" max="240" className="input mt-1 w-full" defaultValue={se?.graceMinutes ?? 15} /></label>
        {se && <Active ar={ar} value={se.isActive} />}<Submit ar={ar} busy={busy} edit={!!se} />
      </form>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <List title={ar ? "الأقسام" : "Departments"} ar={ar} rows={departments.map(value => ({ id:value.id, title:ar ? value.nameAr || value.name : value.name, detail:value.code, active:value.isActive, edit:()=>setEdit({kind:"department",value}), archive:()=>void archive("department",value.id) }))} />
      <List title={ar ? "الورديات" : "Shifts"} ar={ar} rows={shifts.map(value => ({ id:value.id, title:ar ? value.nameAr || value.name : value.name, detail:`${value.startTime.slice(0,5)} – ${value.endTime.slice(0,5)}`, active:value.isActive, edit:()=>setEdit({kind:"shift",value}), archive:()=>void archive("shift",value.id) }))} />
    </div>
  </div>;
}

function Title({ ar, edit, name, cancel }: { ar:boolean; edit:boolean; name:string; cancel:()=>void }) { return <div className="flex justify-between"><h2 className="font-bold">{edit ? (ar ? "تعديل" : "Edit") : (ar ? "إضافة" : "Add")} {name}</h2>{edit && <button type="button" className="btn btn-ghost btn-sm" onClick={cancel} aria-label={ar ? "إلغاء" : "Cancel"}><X className="h-4 w-4" /></button>}</div>; }
function Active({ ar, value }: { ar:boolean; value:boolean }) { return <label className="flex gap-2"><input name="isActive" type="checkbox" defaultChecked={value} />{ar ? "نشط" : "Active"}</label>; }
function Submit({ ar, busy, edit }: { ar:boolean; busy:boolean; edit:boolean }) { return <button disabled={busy} className="btn btn-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{edit ? (ar ? "حفظ التعديل" : "Save changes") : (ar ? "إضافة" : "Add")}</button>; }
function List({ title, rows, ar }: { title:string; ar:boolean; rows:{id:string;title:string;detail:string;active:boolean;edit:()=>void;archive:()=>void}[] }) { return <section className="card overflow-hidden"><h2 className="border-b p-5 font-bold">{title}</h2>{rows.map(r=><div key={r.id} className="flex items-center justify-between border-b p-4"><div><strong>{r.title}</strong><small className="block text-navy-500">{r.detail} · {r.active ? (ar ? "نشط" : "Active") : (ar ? "مؤرشف" : "Archived")}</small></div><div className="flex"><button className="btn btn-ghost btn-sm" onClick={r.edit} aria-label={ar ? "تعديل" : "Edit"}><Pencil className="h-4 w-4" /></button>{r.active && <button className="btn btn-ghost btn-sm text-danger-600" onClick={r.archive} aria-label={ar ? "أرشفة" : "Archive"}><Archive className="h-4 w-4" /></button>}</div></div>)}{!rows.length && <p className="p-6 text-center text-navy-500">{ar ? "لا توجد بيانات." : "No records."}</p>}</section>; }
