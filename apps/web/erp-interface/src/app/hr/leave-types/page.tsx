import { AppLayout } from "@/components/layout/AppLayout";
import { CatalogCrud, type ExtraField } from "@/components/shared/CatalogCrud";
import { useTranslation } from "react-i18next";

export default function LeaveTypesPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const extraFields: ExtraField[] = [
    { key: "paid", label: "Paid", labelAr: "مدفوعة", type: "select", options: [{ value: "true", label: "Paid", labelAr: "مدفوعة" }, { value: "false", label: "Unpaid", labelAr: "غير مدفوعة" }] },
    { key: "defaultDays", label: "Default days / year", labelAr: "الأيام الافتراضية / سنة", type: "number", defaultValue: 0 },
  ];
  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "أنواع الإجازات" : "Leave Types"}</h1>
          <p className="text-sm text-navy-500">{ar ? "إعداد أنواع الإجازات المتاحة للموظفين" : "Configure leave types available to employees"}</p>
        </header>
        <CatalogCrud ar={ar} title={ar ? "نوع إجازة" : "leave type"} endpoint="/hr/leave-types" extraFields={extraFields} detailKeys={["defaultDays"]} />
      </main>
    </AppLayout>
  );
}
