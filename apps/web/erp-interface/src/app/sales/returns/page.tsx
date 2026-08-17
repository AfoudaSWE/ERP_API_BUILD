import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Undo2, Plus, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { apiGet, apiRequest } from '@/lib/api-client';
import { useApiData } from '@/lib/api-data';
import { useAuth } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { SalesInvoice } from '@/types';

type SalesReturn = { id: string; returnNumber: string; invoiceNumber?: string; customerName?: string; businessDate: string; reason: string; total: string; status: string };

export default function SalesReturnsPage() {
  const { salesInvoices } = useApiData();
  const { can } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const ar = locale === 'ar';
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [invoiceId, setInvoiceId] = useState('');
  const [invoiceDetail, setInvoiceDetail] = useState<SalesInvoice | null>(null);
  const [itemId, setItemId] = useState('');

  const load = useCallback(async () => {
    try { setReturns(await apiGet<SalesReturn[]>('/sales/returns')); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function pickInvoice(id: string) {
    setInvoiceId(id); setInvoiceDetail(null); setItemId('');
    if (!id) return;
    try { const detail = await apiGet<SalesInvoice>(`/sales/invoices/${id}`); setInvoiceDetail(detail); setItemId(detail.items[0]?.id ?? ''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invoiceId || !itemId) return;
    setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try {
      await apiRequest(`/sales/invoices/${invoiceId}/returns`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ businessDate: data.get('businessDate'), reason: data.get('reason'), items: [{ invoiceItemId: itemId, quantity: data.get('quantity') }] }),
      });
      setShowCreate(false); setInvoiceId(''); setInvoiceDetail(null); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); } finally { setBusy(false); }
  }

  const formatPrice = (value: number) => formatCurrency(value, 'EGP', ar ? 'ar-EG' : 'en-EG');

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">{ar ? 'إشعارات الدائن والمرتجعات' : 'Credit Notes & Refunds'}</h1>
          <p className="text-navy-500">{ar ? 'مرتجعات المبيعات المسجلة على الفواتير' : 'Sales returns posted against invoices'}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" />{ar ? 'تحديث' : 'Refresh'}</button>
          {can('sales.refund') && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />{ar ? 'مرتجع جديد' : 'New return'}</button>}
        </div>
      </div>
      {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-danger-700">{error}</div>}
      <div className="card overflow-x-auto">
        <table className="table min-w-[800px]">
          <thead><tr><th>{ar ? 'الرقم' : 'Number'}</th><th>{ar ? 'الفاتورة' : 'Invoice'}</th><th>{ar ? 'العميل' : 'Customer'}</th><th>{ar ? 'التاريخ' : 'Date'}</th><th>{ar ? 'السبب' : 'Reason'}</th><th className="text-end">{ar ? 'الإجمالي' : 'Total'}</th></tr></thead>
          <tbody>
            {returns.map((row) => (
              <tr key={row.id}>
                <td className="font-semibold">{row.returnNumber}</td>
                <td>{row.invoiceNumber || '—'}</td>
                <td>{row.customerName || (ar ? 'عميل نقدي' : 'Cash customer')}</td>
                <td>{formatDate(row.businessDate, ar ? 'ar-EG' : 'en-EG')}</td>
                <td>{row.reason}</td>
                <td className="text-end tabular-nums font-semibold">{formatPrice(Number(row.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!returns.length && <div className="empty-state"><Undo2 className="empty-state-icon" /><p>{ar ? 'لا توجد مرتجعات' : 'No returns yet'}</p></div>}
      </div>
      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/60 p-4">
          <form onSubmit={submit} className="card w-full max-w-md p-5">
            <h2 className="mb-4 text-lg font-bold text-navy-900 dark:text-white">{ar ? 'تسجيل مرتجع' : 'Post return'}</h2>
            <label className="label">{ar ? 'الفاتورة' : 'Invoice'}</label>
            <select className="select mb-3" required value={invoiceId} onChange={(e) => void pickInvoice(e.target.value)}>
              <option value="">{ar ? 'اختر الفاتورة' : 'Select invoice'}</option>
              {salesInvoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.invoiceNumber}</option>)}
            </select>
            {invoiceDetail && (
              <>
                <label className="label">{ar ? 'البند' : 'Item'}</label>
                <select className="select mb-3" value={itemId} onChange={(e) => setItemId(e.target.value)}>
                  {invoiceDetail.items.map((item) => <option key={item.id} value={item.id}>{item.description}</option>)}
                </select>
              </>
            )}
            <label className="label">{ar ? 'الكمية' : 'Quantity'}</label>
            <input name="quantity" type="number" min="0.001" step="0.001" required className="input mb-3" />
            <label className="label">{ar ? 'التاريخ' : 'Date'}</label>
            <input name="businessDate" type="date" required className="input mb-3" defaultValue={new Date().toISOString().slice(0, 10)} />
            <label className="label">{ar ? 'السبب' : 'Reason'}</label>
            <input name="reason" required minLength={3} className="input mb-4" />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>{ar ? 'إلغاء' : 'Cancel'}</button>
              <button disabled={busy || !invoiceId || !itemId} className="btn btn-primary">{busy ? (ar ? 'جارٍ الحفظ…' : 'Saving…') : (ar ? 'تأكيد' : 'Confirm')}</button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
