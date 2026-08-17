import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useTranslation } from "react-i18next";
import { TrendingUp } from "lucide-react";

type CashflowRow = { month: string; cashIn: string; cashOut: string };

export default function CashflowPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [rows, setRows] = useState<CashflowRow[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void apiRequest<CashflowRow[]>("/finance/cashflow").then(setRows).catch(() => undefined);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const maxValue = Math.max(1, ...rows.flatMap((r) => [Number(r.cashIn), Number(r.cashOut)]));
  const netTotal = rows.reduce((sum, r) => sum + Number(r.cashIn) - Number(r.cashOut), 0);

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "التدفق النقدي" : "Cashflow"}</h1>
          <p className="text-sm text-navy-500">{ar ? "التدفق النقدي الشهري خلال آخر 12 شهرًا" : "Monthly cash movement over the last 12 months"}</p>
        </header>
        <div className="stat-card w-fit"><div className="flex items-center gap-3"><TrendingUp className="h-5 w-5 text-primary-600" /><div><p className="stat-label">{ar ? "صافي التدفق" : "Net cashflow"}</p><p className={`stat-value ${netTotal >= 0 ? "text-success-600" : "text-danger-600"}`}>{netTotal.toFixed(2)} EGP</p></div></div></div>
        <div className="card space-y-3 p-5">
          {rows.map((row) => (
            <div key={row.month} className="space-y-1">
              <div className="flex items-center justify-between text-sm"><span className="font-medium">{row.month}</span><span className="text-navy-500">+{row.cashIn} / -{row.cashOut}</span></div>
              <div className="flex h-3 gap-1 overflow-hidden rounded-full bg-navy-100 dark:bg-navy-800">
                <div className="h-3 bg-success-500" style={{ width: `${(Number(row.cashIn) / maxValue) * 50}%` }} />
                <div className="h-3 bg-danger-500" style={{ width: `${(Number(row.cashOut) / maxValue) * 50}%` }} />
              </div>
            </div>
          ))}
          {!rows.length && <p className="text-center text-navy-500">{ar ? "لا توجد بيانات تدفق نقدي بعد" : "No cashflow data yet"}</p>}
        </div>
      </main>
    </AppLayout>
  );
}
