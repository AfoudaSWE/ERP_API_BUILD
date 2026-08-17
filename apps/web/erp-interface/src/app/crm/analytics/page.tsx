import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useApiData } from "@/lib/api-data";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useTranslation } from "react-i18next";
import { Trophy, Users, Star } from "lucide-react";

type Feedback = { rating: number };

export default function CustomerAnalyticsPage() {
  const { dashboardAnalytics, customers } = useApiData();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [feedback, setFeedback] = useState<Feedback[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void apiRequest<Feedback[]>("/crm/customer-feedback").then(setFeedback).catch(() => undefined);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const avgRating = feedback.length ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1) : "—";
  const topCustomers = dashboardAnalytics.topCustomers;

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "تحليلات العملاء" : "Customer Analytics"}</h1>
          <p className="text-sm text-navy-500">{ar ? "أفضل العملاء ومتوسط رضاهم" : "Top customers and satisfaction overview"}</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="stat-card"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary-600" /><div><p className="stat-label">{ar ? "إجمالي العملاء" : "Total customers"}</p><p className="stat-value">{customers.length}</p></div></div></div>
          <div className="stat-card"><div className="flex items-center gap-3"><Star className="h-5 w-5 text-warning-500" /><div><p className="stat-label">{ar ? "متوسط التقييم" : "Average feedback rating"}</p><p className="stat-value">{avgRating} / 5</p></div></div></div>
          <div className="stat-card"><div className="flex items-center gap-3"><Trophy className="h-5 w-5 text-success-600" /><div><p className="stat-label">{ar ? "عملاء مميزون" : "Top customers tracked"}</p><p className="stat-value">{topCustomers.length}</p></div></div></div>
        </div>
        <div className="card overflow-x-auto">
          <h2 className="border-b p-5 font-bold">{ar ? "أفضل العملاء حسب المبيعات" : "Top customers by sales"}</h2>
          <table className="table min-w-[600px]">
            <thead><tr><th>{ar ? "العميل" : "Customer"}</th><th className="text-end">{ar ? "المبيعات" : "Sales"}</th><th className="text-end">{ar ? "الرصيد" : "Balance"}</th></tr></thead>
            <tbody>
              {topCustomers.map((c) => (
                <tr key={c.id}>
                  <td>{ar ? c.nameAr || c.name : c.name}</td>
                  <td className="text-end tabular-nums">{c.sales.toLocaleString()} EGP</td>
                  <td className="text-end tabular-nums">{c.balance.toLocaleString()} EGP</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!topCustomers.length && <p className="p-6 text-center text-navy-500">{ar ? "لا توجد بيانات بعد" : "No data yet"}</p>}
        </div>
      </main>
    </AppLayout>
  );
}
