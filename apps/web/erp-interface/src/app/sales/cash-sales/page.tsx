import { useCallback, useEffect, useState } from 'react';
import { CircleDollarSign, RefreshCw } from 'lucide-react';
import Link from '@/components/router/Link';
import { AppLayout } from '@/components/layout/AppLayout';
import { apiGet } from '@/lib/api-client';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type CashInvoice = { id: string; invoiceNumber: string; customerName?: string; invoiceDate: string; status: string; total: string };

export default function CashSalesPage() {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const ar = locale === 'ar';
  const [invoices, setInvoices] = useState<CashInvoice[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setInvoices(await apiGet<CashInvoice[]>('/sales/invoices?paymentMethod=cash')); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const total = invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const formatPrice = (value: number) => formatCurrency(value, 'EGP', ar ? 'ar-EG' : 'en-EG');

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">{ar ? 'المبيعات النقدية' : 'Cash Sales'}</h1>
          <p className="text-navy-500">{ar ? 'الفواتير المدفوعة نقدًا بالكامل أو جزئيًا' : 'Invoices settled with a cash payment'}</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" />{ar ? 'تحديث' : 'Refresh'}</button>
      </div>
      {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-danger-700">{error}</div>}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="stat-card"><p className="stat-label">{ar ? 'عدد الفواتير' : 'Invoices'}</p><p className="stat-value">{invoices.length}</p></div>
        <div className="stat-card"><p className="stat-label">{ar ? 'الإجمالي' : 'Total'}</p><p className="stat-value">{formatPrice(total)}</p></div>
      </div>
      <div className="card overflow-x-auto">
        <table className="table min-w-[700px]">
          <thead><tr><th>{ar ? 'الرقم' : 'Number'}</th><th>{ar ? 'العميل' : 'Customer'}</th><th>{ar ? 'التاريخ' : 'Date'}</th><th>{ar ? 'الحالة' : 'Status'}</th><th className="text-end">{ar ? 'الإجمالي' : 'Total'}</th></tr></thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td><Link href={`/sales/${invoice.id}`} className="font-medium text-primary-600">{invoice.invoiceNumber}</Link></td>
                <td>{invoice.customerName || (ar ? 'عميل نقدي' : 'Cash customer')}</td>
                <td>{formatDate(invoice.invoiceDate, ar ? 'ar-EG' : 'en-EG')}</td>
                <td><span className={cn('badge', invoice.status === 'paid' ? 'badge-success' : 'badge-primary')}>{invoice.status}</span></td>
                <td className="text-end tabular-nums font-semibold">{formatPrice(Number(invoice.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !invoices.length && <div className="empty-state"><CircleDollarSign className="empty-state-icon" /><p>{ar ? 'لا توجد مبيعات نقدية' : 'No cash sales yet'}</p></div>}
      </div>
    </AppLayout>
  );
}
