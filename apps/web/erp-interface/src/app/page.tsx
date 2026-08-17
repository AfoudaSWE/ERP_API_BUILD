import {
  AlertTriangle,
  Boxes,
  Building2,
  CircleDollarSign,
  Clock,
  Package,
  Receipt,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import Link from "@/components/router/Link";
import { useApiData } from "@/lib/api-data";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

export default function Dashboard() {
  const {
    dashboardStats: stats,
    dashboardAnalytics: analytics,
    products,
    customers,
    suppliers,
    isLoading,
  } = useApiData();
  const { user, can } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith("ar") ? "ar" : "en";
  const ar = locale === "ar";
  const money = (value: number) =>
    formatCurrency(Number(value || 0), "EGP", ar ? "ar-EG" : "en-EG");
  const number = (value: number) =>
    new Intl.NumberFormat(ar ? "ar-EG" : "en-EG").format(value);
  const netFlow = stats.salesThisMonth - stats.expensesThisMonth;
  const salesChart = {
    labels: analytics.salesTrend.map((item) =>
      ar
        ? new Intl.DateTimeFormat("ar-EG", { month: "short" }).format(
            new Date(`${item.month}-01`),
          )
        : item.label,
    ),
    datasets: [
      {
        label: ar ? "المبيعات" : "Sales",
        data: analytics.salesTrend.map((item) => item.sales),
        color: "#415a77",
      },
    ],
  };
  const categoryChart = {
    labels: analytics.categorySales.map((item) =>
      ar ? item.nameAr || item.name : item.name,
    ),
    datasets: [
      {
        label: ar ? "المبيعات" : "Sales",
        data: analytics.categorySales.map((item) => item.sales),
      },
    ],
  };
  const bestSellerChart = {
    labels: analytics.bestSellers.map((item) =>
      ar ? item.nameAr || item.name : item.name,
    ),
    datasets: [
      {
        label: ar ? "المبيعات" : "Sales",
        data: analytics.bestSellers.map((item) => item.sales),
        color: "#10b981",
      },
    ],
  };
  const recommendations = [
    ...(stats.overdueAmount > 0
      ? [
          {
            title: ar ? "تحصيل الفواتير المتأخرة" : "Collect overdue invoices",
            body: ar
              ? `ابدأ بمتابعة المبالغ المستحقة بقيمة ${money(stats.overdueAmount)}.`
              : `Prioritize outstanding balances totaling ${money(stats.overdueAmount)}.`,
            href: "/sales",
            color: "bg-orange-100 text-orange-600",
          },
        ]
      : []),
    ...(stats.lowStockCount + stats.outOfStockCount > 0
      ? [
          {
            title: ar ? "إعادة توريد المخزون" : "Replenish inventory",
            body: ar
              ? `${number(stats.lowStockCount + stats.outOfStockCount)} أصناف تحتاج إجراء شراء.`
              : `${number(stats.lowStockCount + stats.outOfStockCount)} products need purchasing action.`,
            href: "/inventory",
            color: "bg-red-100 text-red-600",
          },
        ]
      : []),
    ...(analytics.bestSellers[0]
      ? [
          {
            title: ar ? "دعم المنتج الأفضل" : "Support the best seller",
            body: ar
              ? `حافظ على توافر ${analytics.bestSellers[0].nameAr || analytics.bestSellers[0].name}.`
              : `Keep ${analytics.bestSellers[0].name} available.`,
            href: "/products",
            color: "bg-green-100 text-green-600",
          },
        ]
      : []),
  ];

  return (
    <AppLayout>
      <header className="mb-7 flex flex-col gap-4 border-b border-navy-200 pb-5 dark:border-navy-700 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-navy-950 dark:text-white md:text-3xl">
            {ar
              ? `مرحباً، ${user?.name || ""}`
              : `Welcome, ${user?.name || ""}`}
          </h1>
          <p className="mt-1 text-navy-500 dark:text-navy-400">
            {ar
              ? "إليك ملخص أعمالك اليوم"
              : "Here's your business summary for today"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can("pos.use") && (
            <Link href="/pos" className="btn btn-primary btn-md">
              <ShoppingCart className="h-4 w-4" />
              {ar ? "نقطة البيع" : "Open POS"}
            </Link>
          )}
          {(can("sales.create") || can("sales.write")) && (
            <Link href="/sales/new" className="btn btn-secondary btn-md">
              {ar ? "فاتورة جديدة" : "New invoice"}
            </Link>
          )}
        </div>
      </header>

      <section className="dashboard-summary card mb-8 grid grid-cols-2 overflow-hidden md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title={ar ? "مبيعات اليوم" : "Sales today"}
          value={stats.salesToday}
          format="currency"
          locale={ar ? "ar-EG" : "en-EG"}
          icon={<ShoppingCart className="h-5 w-5 text-primary-600" />}
          iconBg="bg-primary-100 dark:bg-primary-900/30"
        />
        <StatCard
          title={ar ? "مبيعات الشهر" : "Monthly sales"}
          value={stats.salesThisMonth}
          format="currency"
          locale={ar ? "ar-EG" : "en-EG"}
          change={stats.salesGrowth}
          changeLabel={ar ? "عن الشهر الماضي" : "vs last month"}
          trend={stats.salesGrowth >= 0 ? "up" : "down"}
          icon={<TrendingUp className="h-5 w-5 text-success-600" />}
          iconBg="bg-success-50 dark:bg-success-900/30"
        />
        <StatCard
          title={ar ? "صافي التدفق" : "Net flow"}
          value={netFlow}
          format="currency"
          locale={ar ? "ar-EG" : "en-EG"}
          subtitle={ar ? "المبيعات ناقص المصروفات" : "Sales minus expenses"}
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          iconBg="bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          title={ar ? "المبالغ المحصلة" : "Collected"}
          value={analytics.payment.paid}
          format="currency"
          locale={ar ? "ar-EG" : "en-EG"}
          icon={<Wallet className="h-5 w-5 text-teal-600" />}
          iconBg="bg-teal-100 dark:bg-teal-900/30"
        />
        <StatCard
          title={ar ? "الذمم المستحقة" : "Receivables"}
          value={stats.receivables}
          format="currency"
          locale={ar ? "ar-EG" : "en-EG"}
          icon={<Building2 className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          href="/sales"
        />
        <StatCard
          title={ar ? "ذمم العملاء" : "Customer balances"}
          value={analytics.payment.outstanding}
          format="currency"
          locale={ar ? "ar-EG" : "en-EG"}
          icon={<Users className="h-5 w-5 text-orange-600" />}
          iconBg="bg-orange-100 dark:bg-orange-900/30"
          href="/customers"
        />
        <StatCard
          title={ar ? "ذمم الموردين" : "Supplier payables"}
          value={stats.payables}
          format="currency"
          locale={ar ? "ar-EG" : "en-EG"}
          icon={<Truck className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          href="/suppliers"
        />
        <StatCard
          title={ar ? "قيمة المخزون" : "Inventory value"}
          value={stats.inventoryValue}
          format="currency"
          locale={ar ? "ar-EG" : "en-EG"}
          icon={<Package className="h-5 w-5 text-indigo-600" />}
          iconBg="bg-indigo-100 dark:bg-indigo-900/30"
          href="/inventory"
        />
        <StatCard
          title={ar ? "المصروفات" : "Expenses"}
          value={stats.expensesThisMonth}
          format="currency"
          locale={ar ? "ar-EG" : "en-EG"}
          icon={<Receipt className="h-5 w-5 text-red-600" />}
          iconBg="bg-red-100 dark:bg-red-900/30"
          href="/expenses"
        />
        <StatCard
          title={ar ? "العملاء والمنتجات" : "Customers / products"}
          value={`${number(customers.length)} / ${number(products.length)}`}
          format="raw"
          subtitle={
            ar
              ? `${number(suppliers.length)} موردين`
              : `${number(suppliers.length)} suppliers`
          }
          icon={<Users className="h-5 w-5 text-pink-600" />}
          iconBg="bg-pink-100 dark:bg-pink-900/30"
        />
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/inventory" className="stat-card">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-warning-50 p-2">
              <Package className="h-5 w-5 text-warning-600" />
            </span>
            <div>
              <p className="stat-label">{ar ? "مخزون منخفض" : "Low stock"}</p>
              <p className="text-xl font-bold text-warning-600">
                {stats.lowStockCount}
              </p>
            </div>
          </div>
        </Link>
        <Link href="/inventory" className="stat-card">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-danger-50 p-2">
              <AlertTriangle className="h-5 w-5 text-danger-600" />
            </span>
            <div>
              <p className="stat-label">
                {ar ? "نفاد المخزون" : "Out of stock"}
              </p>
              <p className="text-xl font-bold text-danger-600">
                {stats.outOfStockCount}
              </p>
            </div>
          </div>
        </Link>
        <Link href="/sales" className="stat-card">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-warning-50 p-2">
              <Clock className="h-5 w-5 text-warning-600" />
            </span>
            <div>
              <p className="stat-label">
                {ar ? "فواتير متأخرة" : "Overdue invoices"}
              </p>
              <p className="text-xl font-bold text-warning-600">
                {stats.overdueInvoices}
              </p>
            </div>
          </div>
        </Link>
        <Link href="/purchases" className="stat-card">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-success-50 p-2">
              <CircleDollarSign className="h-5 w-5 text-success-600" />
            </span>
            <div>
              <p className="stat-label">
                {ar ? "مشتريات مفتوحة" : "Open purchases"}
              </p>
              <p className="text-xl font-bold text-success-600">
                {stats.pendingPurchases}
              </p>
            </div>
          </div>
        </Link>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SalesChart
          data={salesChart}
          title={ar ? "اتجاه المبيعات" : "Sales trend"}
          locale={locale}
        />
        <SalesChart
          data={categoryChart}
          title={ar ? "المبيعات حسب الفئة" : "Sales by category"}
          type="pie"
          locale={locale}
        />
      </section>
      <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="card">
          <header className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-navy-900 dark:text-white">
              {ar ? "توصيات الذكاء الاصطناعي" : "AI recommendations"}
            </h2>
          </header>
          <div className="divide-y divide-navy-100 p-2 dark:divide-navy-700">
            {recommendations.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex items-start gap-3 rounded-lg p-3 hover:bg-navy-50 dark:hover:bg-navy-800"
              >
                <span className={`rounded-lg p-2 ${item.color}`}>
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-navy-900 dark:text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-navy-500">
                    {item.body}
                  </p>
                </div>
              </Link>
            ))}
            {!recommendations.length && (
              <p className="p-8 text-center text-sm text-navy-500">
                {ar ? "لا توجد توصيات عاجلة." : "No urgent recommendations."}
              </p>
            )}
          </div>
        </article>
        <SalesChart
          data={bestSellerChart}
          title={ar ? "أفضل المنتجات مبيعاً" : "Best-selling products"}
          type="bar"
          locale={locale}
        />
      </section>
      {isLoading && (
        <div className="fixed bottom-5 end-5 rounded-full bg-navy-900 px-4 py-2 text-xs text-white shadow-lg">
          {ar ? "تحديث البيانات…" : "Refreshing data…"}
        </div>
      )}
    </AppLayout>
  );
}
