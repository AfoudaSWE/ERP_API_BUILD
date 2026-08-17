import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useApiData } from "@/lib/api-data";
import { useTranslation } from "react-i18next";
import { Users, Search } from "lucide-react";

type ContactRow = { id: string; name: string; nameAr?: string; kind: "customer" | "supplier" | "lead"; detail: string };

export default function ContactsPage() {
  const { customers, suppliers, leads } = useApiData();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");

  const rows = useMemo<ContactRow[]>(() => [
    ...customers.map((c) => ({ id: c.id, name: c.name, nameAr: c.nameAr, kind: "customer" as const, detail: c.phone || c.email || "" })),
    ...suppliers.map((s) => ({ id: s.id, name: s.name, nameAr: s.nameAr, kind: "supplier" as const, detail: s.phone || s.email || "" })),
    ...leads.map((l) => ({ id: l.id, name: l.name, nameAr: l.nameAr, kind: "lead" as const, detail: l.phone || l.email || "" })),
  ], [customers, suppliers, leads]);

  const filtered = rows.filter((row) => {
    const matchesKind = !kind || row.kind === kind;
    const matchesSearch = !search || row.name.toLowerCase().includes(search.toLowerCase()) || (row.nameAr ?? "").includes(search);
    return matchesKind && matchesSearch;
  });

  const kindBadge = { customer: ar ? "عميل" : "Customer", supplier: ar ? "مورد" : "Supplier", lead: ar ? "عميل محتمل" : "Lead" };

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "جهات الاتصال" : "Contacts"}</h1>
          <p className="text-sm text-navy-500">{ar ? "كل جهات الاتصال: عملاء، موردون، عملاء محتملون" : "All contacts across customers, suppliers, and leads"}</p>
        </header>
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input className="input ps-10" placeholder={ar ? "بحث بالاسم" : "Search by name"} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="select w-full md:w-48" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">{ar ? "كل الأنواع" : "All types"}</option>
            <option value="customer">{kindBadge.customer}</option>
            <option value="supplier">{kindBadge.supplier}</option>
            <option value="lead">{kindBadge.lead}</option>
          </select>
        </div>
        <div className="card overflow-x-auto">
          <table className="table min-w-[600px]">
            <thead><tr><th>{ar ? "الاسم" : "Name"}</th><th>{ar ? "النوع" : "Type"}</th><th>{ar ? "التواصل" : "Contact"}</th></tr></thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={`${row.kind}-${row.id}`}>
                  <td className="font-medium">{ar ? row.nameAr || row.name : row.name}</td>
                  <td><span className="badge badge-primary">{kindBadge[row.kind]}</span></td>
                  <td>{row.detail || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <div className="empty-state"><Users className="empty-state-icon" /><p>{ar ? "لا توجد جهات اتصال" : "No contacts found"}</p></div>}
        </div>
      </main>
    </AppLayout>
  );
}
