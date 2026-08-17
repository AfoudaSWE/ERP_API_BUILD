import { AppLayout } from "@/components/layout/AppLayout";
import { CatalogCrud, type ExtraField } from "@/components/shared/CatalogCrud";
import { useTranslation } from "react-i18next";

const extraFields: ExtraField[] = [
  { key: "decimalPlaces", label: "Decimal places", labelAr: "عدد الخانات العشرية", type: "number", defaultValue: 3 },
];

export default function UnitsPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "وحدات القياس" : "Units"}</h1>
          <p className="text-sm text-navy-500">{ar ? "وحدات القياس المستخدمة في المنتجات" : "Measurement units used by products"}</p>
        </header>
        <CatalogCrud ar={ar} title={ar ? "وحدة" : "unit"} endpoint="/master-data/units" hasCode extraFields={extraFields} detailKeys={["decimalPlaces"]} />
      </main>
    </AppLayout>
  );
}
