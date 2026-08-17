import { AppLayout } from "@/components/layout/AppLayout";
import { CatalogCrud, type ExtraField } from "@/components/shared/CatalogCrud";
import { useTranslation } from "react-i18next";

export default function HolidaysPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const extraFields: ExtraField[] = [
    { key: "holidayDate", label: "Date", labelAr: "التاريخ", type: "date", required: true },
  ];
  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "الإجازات الرسمية" : "Holidays"}</h1>
          <p className="text-sm text-navy-500">{ar ? "قائمة العطلات الرسمية للشركة" : "Company-wide public holiday calendar"}</p>
        </header>
        <CatalogCrud ar={ar} title={ar ? "إجازة رسمية" : "holiday"} endpoint="/hr/holidays" extraFields={extraFields} detailKeys={["holidayDate"]} />
      </main>
    </AppLayout>
  );
}
