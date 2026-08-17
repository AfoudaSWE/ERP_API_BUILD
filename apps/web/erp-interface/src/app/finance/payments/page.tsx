import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiRequest } from "@erp/shared-frontend-data-access";
import { useTranslation } from "react-i18next";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";

type Payment = { id: string; direction: "in" | "out"; amount: string; businessDate: string; method: string; reference?: string; source: string };

export default function PaymentsPage() {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith("ar");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      void apiRequest<Payment[]>("/finance/payments").then(setPayments).catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed"));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const totalIn = payments.filter((p) => p.direction === "in").reduce((sum, p) => sum + Number(p.amount), 0);
  const totalOut = payments.filter((p) => p.direction === "out").reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <AppLayout>
      <main className="space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-bold">{ar ? "المدفوعات" : "Payments"}</h1>
          <p className="text-sm text-navy-500">{ar ? "حركة المقبوضات من العملاء والمدفوعات للمصروفات" : "Money received from customers and paid out for expenses"}</p>
        </header>
        {error && <div role="alert" className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="stat-card"><div className="flex items-center gap-3"><ArrowDownCircle className="h-5 w-5 text-success-600" /><div><p className="stat-label">{ar ? "مقبوضات" : "Received"}</p><p className="stat-value text-success-600">{totalIn.toFixed(2)} EGP</p></div></div></div>
          <div className="stat-card"><div className="flex items-center gap-3"><ArrowUpCircle className="h-5 w-5 text-danger-600" /><div><p className="stat-label">{ar ? "مدفوعات" : "Paid out"}</p><p className="stat-value text-danger-600">{totalOut.toFixed(2)} EGP</p></div></div></div>
        </div>
        <div className="card overflow-x-auto">
          <table className="table min-w-[700px]">
            <thead><tr><th>{ar ? "التاريخ" : "Date"}</th><th>{ar ? "المرجع" : "Reference"}</th><th>{ar ? "الطريقة" : "Method"}</th><th>{ar ? "المصدر" : "Source"}</th><th className="text-end">{ar ? "المبلغ" : "Amount"}</th></tr></thead>
            <tbody>
              {payments.map((row) => (
                <tr key={`${row.source}-${row.id}`}>
                  <td>{row.businessDate}</td>
                  <td>{row.reference || "—"}</td>
                  <td>{row.method}</td>
                  <td>{row.source === "customer_payment" ? (ar ? "دفعة عميل" : "Customer payment") : (ar ? "مصروف" : "Expense")}</td>
                  <td className={`text-end tabular-nums font-semibold ${row.direction === "in" ? "text-success-600" : "text-danger-600"}`}>{row.direction === "in" ? "+" : "-"}{row.amount} EGP</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!payments.length && <div className="empty-state"><Wallet className="empty-state-icon" /><p>{ar ? "لا توجد مدفوعات بعد" : "No payments yet"}</p></div>}
        </div>
      </main>
    </AppLayout>
  );
}
