import { AppLayout } from "@/components/layout/AppLayout";
import { CatalogCrud, type ExtraField } from "@/components/shared/CatalogCrud";
import { useTranslation } from "react-i18next";

const extraFields: ExtraField[] = [
  {
    key: "warehouseType",
    label: "Type",
    labelAr: "النوع",
    type: "select",
    options: [
      { value: "main", label: "Main", labelAr: "رئيسي" },
      { value: "transit", label: "Transit", labelAr: "عبور" },
      { value: "returns", label: "Returns", labelAr: "مرتجعات" },
      { value: "damaged", label: "Damaged", labelAr: "تالف" },
    ],
  },
];

export default function WarehousesPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "المخازن" : "Warehouses"}</h1>
          <p className="text-sm text-navy-500">{ar ? "مواقع تخزين المخزون" : "Storage locations for your inventory"}</p>
        </header>
        <CatalogCrud ar={ar} title={ar ? "مخزن" : "warehouse"} endpoint="/warehouses" hasCode extraFields={extraFields} detailKeys={["warehouseType"]} />
      </main>
    </AppLayout>
  );
}
