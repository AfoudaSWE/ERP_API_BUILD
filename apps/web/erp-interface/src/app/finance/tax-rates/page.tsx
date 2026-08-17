import { AppLayout } from "@/components/layout/AppLayout";
import { CatalogCrud, type ExtraField } from "@/components/shared/CatalogCrud";
import { useTranslation } from "react-i18next";

export default function TaxRatesPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const extraFields: ExtraField[] = [
    { key: "rate", label: "Rate %", labelAr: "النسبة %", type: "number", defaultValue: 0 },
  ];
  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "نسب الضرائب" : "Tax Rates"}</h1>
          <p className="text-sm text-navy-500">{ar ? "إعداد نسب الضريبة المستخدمة في الفواتير" : "Configure tax rates used across sales and purchases"}</p>
        </header>
        <CatalogCrud ar={ar} title={ar ? "نسبة ضريبة" : "tax rate"} endpoint="/finance/tax-rates" extraFields={extraFields} detailKeys={["rate"]} />
      </main>
    </AppLayout>
  );
}
