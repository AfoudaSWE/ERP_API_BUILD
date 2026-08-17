import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CatalogCrud, type ExtraField } from "@/components/shared/CatalogCrud";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useTranslation } from "react-i18next";

type Department = { id: string; name: string; nameAr?: string };

export default function DesignationsPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void apiRequest<Department[]>("/hr/departments").then(setDepartments).catch(() => undefined);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const extraFields: ExtraField[] = [
    {
      key: "departmentId", label: "Department", labelAr: "القسم", type: "select",
      options: [{ value: "", label: "None", labelAr: "بدون" }, ...departments.map((d) => ({ value: d.id, label: d.name, labelAr: d.nameAr || d.name }))],
    },
  ];

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "المسميات الوظيفية" : "Designations / Roles"}</h1>
          <p className="text-sm text-navy-500">{ar ? "المسميات الوظيفية المستخدمة للموظفين" : "Job titles used for employees"}</p>
        </header>
        <CatalogCrud ar={ar} title={ar ? "مسمى وظيفي" : "designation"} endpoint="/hr/designations" extraFields={extraFields} />
      </main>
    </AppLayout>
  );
}
