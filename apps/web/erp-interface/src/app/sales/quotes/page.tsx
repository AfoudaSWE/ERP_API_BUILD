import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { FileSpreadsheet, Plus, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { apiGet, apiRequest } from '@/lib/api-client';
import { useApiData } from '@/lib/api-data';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

type Quote = { id: string; quoteNumber: string; customerName?: string; quoteDate: string; validUntil?: string; status: string; total: string };

export default function SalesQuotesPage() {
  const { customers, products } = useApiData();
  const { can } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ customerId: '', productId: '', quantity: '1', unitPrice: '0', taxRate: '14', quoteDate: new Date().toISOString().slice(0, 10), validUntil: '' });

  const load = useCallback(async () => {
    try { setQuotes(await apiGet<Quote[]>('/sales/quotes')); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function createQuote(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const product = products.find((item) => item.id === form.productId);
    try {
      await apiRequest('/sales/quotes', {
        method: 'POST',
        body: JSON.stringify({
          customerId: form.customerId || undefined,
          quoteDate: form.quoteDate,
          validUntil: form.validUntil || undefined,
          items: [{ productId: form.productId, description: product?.name || 'Item', quantity: form.quantity, unitPrice: form.unitPrice, taxRate: form.taxRate }],
        }),
      });
      setShowCreate(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); } finally { setBusy(false); }
  }

  async function act(quote: Quote, action: 'send' | 'accept' | 'reject') {
    setBusy(true); setError('');
    try { await apiRequest(`/sales/quotes/${quote.id}/actions`, { method: 'POST', body: JSON.stringify({ action }) }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); } finally { setBusy(false); }
  }

  async function convert(quote: Quote) {
    setBusy(true); setError('');
    try {
      await apiRequest(`/sales/quotes/${quote.id}/convert`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ invoiceDate: new Date().toISOString().slice(0, 10), paymentMethod: 'cash' }),
      });
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); } finally { setBusy(false); }
  }

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">{ar ? 'عروض أسعار المبيعات' : 'Sales Quotes'}</h1>
          <p className="text-navy-500">{ar ? 'إنشاء ومتابعة عروض الأسعار قبل تحويلها إلى فواتير' : 'Draft, track, and convert quotes into invoices'}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" />{ar ? 'تحديث' : 'Refresh'}</button>
          {can('sales.write') && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}><Plus className="h-4 w-4" />{ar ? 'عرض جديد' : 'New quote'}</button>}
        </div>
      </div>
      {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-danger-700">{error}</div>}
      {showCreate && (
        <form className="card mb-6 grid gap-4 p-4 md:grid-cols-3" onSubmit={createQuote}>
          <select className="select" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
            <option value="">{ar ? 'عميل نقدي' : 'Cash customer'}</option>
            {customers.map((item) => <option key={item.id} value={item.id}>{ar ? item.nameAr || item.name : item.name}</option>)}
          </select>
          <select className="select" required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value, unitPrice: String(e.target.value ? products.find((p) => p.id === e.target.value)?.sellingPrice ?? 0 : 0) })}>
            <option value="">{ar ? 'اختر المنتج' : 'Select product'}</option>
            {products.map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>)}
          </select>
          <input className="input" type="date" value={form.quoteDate} onChange={(e) => setForm({ ...form, quoteDate: e.target.value })} required />
          <input className="input" type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} placeholder={ar ? 'صالح حتى' : 'Valid until'} />
          <input className="input" inputMode="decimal" placeholder={ar ? 'الكمية' : 'Quantity'} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          <input className="input" inputMode="decimal" placeholder={ar ? 'سعر الوحدة' : 'Unit price'} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required />
          <input className="input" inputMode="decimal" placeholder={ar ? 'الضريبة %' : 'Tax %'} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} required />
          <button disabled={busy} className="btn btn-primary">{ar ? 'إنشاء العرض' : 'Create quote'}</button>
        </form>
      )}
      <div className="card overflow-x-auto">
        <table className="table min-w-[850px]">
          <thead><tr><th>{ar ? 'الرقم' : 'Number'}</th><th>{ar ? 'العميل' : 'Customer'}</th><th>{ar ? 'التاريخ' : 'Date'}</th><th>{ar ? 'الحالة' : 'Status'}</th><th>{ar ? 'الإجمالي' : 'Total'}</th><th>{ar ? 'إجراءات' : 'Actions'}</th></tr></thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <td className="font-semibold">{quote.quoteNumber}</td>
                <td>{quote.customerName || (ar ? 'عميل نقدي' : 'Cash customer')}</td>
                <td>{quote.quoteDate}</td>
                <td><span className="badge badge-primary">{quote.status}</span></td>
                <td>{quote.total} EGP</td>
                <td>
                  <div className="flex gap-2">
                    {quote.status === 'draft' && can('sales.write') && <button disabled={busy} className="btn btn-secondary btn-sm" onClick={() => void act(quote, 'send')}>{ar ? 'إرسال' : 'Send'}</button>}
                    {['draft', 'sent'].includes(quote.status) && can('sales.write') && <button disabled={busy} className="btn btn-secondary btn-sm" onClick={() => void act(quote, 'accept')}>{ar ? 'قبول' : 'Accept'}</button>}
                    {['draft', 'sent', 'accepted'].includes(quote.status) && can('sales.write') && <button disabled={busy} className="btn btn-primary btn-sm" onClick={() => void convert(quote)}>{ar ? 'تحويل لفاتورة' : 'Convert to invoice'}</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!quotes.length && <div className="empty-state"><FileSpreadsheet className="empty-state-icon" /><p>{ar ? 'لا توجد عروض أسعار' : 'No sales quotes yet'}</p></div>}
      </div>
    </AppLayout>
  );
}
