import { useCallback, useEffect, useState } from 'react';
import { Layers, RefreshCw } from 'lucide-react';
import Link from '@/components/router/Link';
import { AppLayout } from '@/components/layout/AppLayout';
import { apiGet } from '@/lib/api-client';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type PosOrder = { id: string; invoiceNumber: string; customerName?: string; invoiceDate: string; paymentStatus: string; total: string };

export default function PosOrdersPage() {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const ar = locale === 'ar';
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await apiGet<PosOrder[]>('/sales/invoices?source=pos')); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const total = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const formatPrice = (value: number) => formatCurrency(value, 'EGP', ar ? 'ar-EG' : 'en-EG');
  const statusBadge = (status: string) => (status === 'paid' ? 'badge-success' : status === 'partial' ? 'badge-warning' : 'badge-primary');
  const statusLabel = (status: string) => {
    if (status === 'paid') return ar ? 'مدفوعة' : 'Paid';
    if (status === 'partial') return ar ? 'جزئي' : 'Partial';
    return ar ? 'غير مدفوعة' : 'Unpaid';
  };

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">{ar ? 'طلبات نقطة البيع' : 'POS Orders'}</h1>
          <p className="text-navy-500">{ar ? 'كل الفواتير التي تم إنشاؤها من شاشة نقطة البيع' : 'Every invoice created from the POS checkout screen'}</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" />{ar ? 'تحديث' : 'Refresh'}</button>
      </div>
      {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-danger-700">{error}</div>}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="stat-card"><p className="stat-label">{ar ? 'عدد الطلبات' : 'Orders'}</p><p className="stat-value">{orders.length}</p></div>
        <div className="stat-card"><p className="stat-label">{ar ? 'الإجمالي' : 'Total'}</p><p className="stat-value">{formatPrice(total)}</p></div>
      </div>
      <div className="card overflow-x-auto">
        <table className="table min-w-[700px]">
          <thead><tr><th>{ar ? 'الرقم' : 'Number'}</th><th>{ar ? 'العميل' : 'Customer'}</th><th>{ar ? 'التاريخ' : 'Date'}</th><th>{ar ? 'الحالة' : 'Status'}</th><th className="text-end">{ar ? 'الإجمالي' : 'Total'}</th></tr></thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td><Link href={`/sales/${order.id}`} className="font-medium text-primary-600">{order.invoiceNumber}</Link></td>
                <td>{order.customerName || (ar ? 'عميل نقدي' : 'Walk-in customer')}</td>
                <td>{formatDate(order.invoiceDate, ar ? 'ar-EG' : 'en-EG')}</td>
                <td><span className={cn('badge', statusBadge(order.paymentStatus))}>{statusLabel(order.paymentStatus)}</span></td>
                <td className="text-end tabular-nums font-semibold">{formatPrice(Number(order.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !orders.length && <div className="empty-state"><Layers className="empty-state-icon" /><p>{ar ? 'لا توجد طلبات من نقطة البيع بعد' : 'No POS orders yet'}</p></div>}
      </div>
    </AppLayout>
  );
}
