import { AppLayout } from "@/components/layout/AppLayout";
import { CatalogCrud } from "@/components/shared/CatalogCrud";
import { useTranslation } from "react-i18next";

export default function CategoriesPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "فئات المنتجات" : "Categories"}</h1>
          <p className="text-sm text-navy-500">{ar ? "نظّم منتجاتك في فئات" : "Organize your products into categories"}</p>
        </header>
        <CatalogCrud ar={ar} title={ar ? "فئة" : "category"} endpoint="/categories" />
      </main>
    </AppLayout>
  );
}
