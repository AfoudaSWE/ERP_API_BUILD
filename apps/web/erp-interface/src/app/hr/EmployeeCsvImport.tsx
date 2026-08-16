import { useRef, useState } from "react";
import { Download, FileUp, Loader2, X } from "lucide-react";
import { apiRequest } from "@erp/shared-frontend-data-access";

const TEMPLATE_HEADERS = [
  "name",
  "nameAr",
  "email",
  "password",
  "employeeCode",
  "nationalId",
  "phone",
  "jobTitle",
  "hireDate",
  "baseSalary",
  "branchIds",
  "shiftId",
  "workplaceIds",
  "managerId",
];

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return [];
  const parseLine = (line: string) => {
    const cells: string[] = [];
    let cur = "", inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
        else if (ch === '"') inQuotes = false;
        else cur += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === ",") { cells.push(cur); cur = ""; }
      else cur += ch;
    }
    cells.push(cur);
    return cells.map((c) => c.trim());
  };
  const headers = parseLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
  });
}

type ImportResult = { created: number; failed: number; errors: { index: number; employeeCode?: string; error: string }[] };

export function EmployeeCsvImport({ ar, onImported }: { ar: boolean; onImported: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const csv = TEMPLATE_HEADERS.join(",") + "\r\n";
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const employees = rows.map((row) => ({
        name: row.name,
        nameAr: row.nameAr || "",
        email: row.email,
        password: row.password,
        employeeCode: row.employeeCode,
        nationalId: row.nationalId || null,
        phone: row.phone || "",
        jobTitle: row.jobTitle || "",
        hireDate: row.hireDate,
        baseSalary: Number(row.baseSalary || 0),
        branchIds: row.branchIds ? row.branchIds.split(";").map((s) => s.trim()).filter(Boolean) : [],
        shiftId: row.shiftId || null,
        workplaceIds: row.workplaceIds ? row.workplaceIds.split(";").map((s) => s.trim()).filter(Boolean) : [],
        managerId: row.managerId || null,
      }));
      const data = await apiRequest<ImportResult>("/hr/employees/bulk", {
        method: "POST",
        body: JSON.stringify({ employees }),
      });
      setResult(data);
      if (data.created > 0) await onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <button className="btn btn-secondary" onClick={() => setOpen(true)}>
        <FileUp className="h-4 w-4" />
        {ar ? "استيراد CSV" : "Import CSV"}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/60 p-4" role="dialog" aria-modal="true">
          <div className="card mx-auto my-6 w-full max-w-lg p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{ar ? "استيراد الموظفين من CSV" : "Import employees from CSV"}</h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label={ar ? "إغلاق" : "Close"}
                onClick={() => { setOpen(false); setResult(null); setError(""); }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-sm text-navy-500">
              {ar
                ? "الأعمدة: name, nameAr, email, password, employeeCode, nationalId, phone, jobTitle, hireDate, baseSalary, branchIds (مفصولة بـ ;), shiftId, workplaceIds (مفصولة بـ ;), managerId"
                : "Columns: name, nameAr, email, password, employeeCode, nationalId, phone, jobTitle, hireDate, baseSalary, branchIds (semicolon-separated), shiftId, workplaceIds (semicolon-separated), managerId"}
            </p>
            <button type="button" className="btn btn-ghost btn-sm mb-4" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              {ar ? "تحميل نموذج" : "Download template"}
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="input w-full" onChange={() => void handleFile()} disabled={busy} />
            {busy && (
              <p className="mt-3 flex items-center gap-2 text-sm text-navy-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {ar ? "جارٍ الاستيراد..." : "Importing..."}
              </p>
            )}
            {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
            {result && (
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  {ar
                    ? `تم إنشاء ${result.created} موظف. فشل ${result.failed}.`
                    : `${result.created} employee(s) created. ${result.failed} failed.`}
                </p>
                {result.errors.length > 0 && (
                  <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-danger-50 p-3 text-danger-700">
                    {result.errors.map((e) => (
                      <li key={e.index}>
                        {ar ? "الصف" : "Row"} {e.index + 1} {e.employeeCode ? `(${e.employeeCode})` : ""}: {e.error}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
