import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Truck, Plus, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { apiGet, apiRequest } from '@/lib/api-client';
import { useApiData } from '@/lib/api-data';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

type DeliveryNote = { id: string; deliveryNumber: string; invoiceNumber?: string; deliveryDate: string; recipientName: string; status: string };

export default function DeliveryNotesPage() {
  const { salesInvoices, products } = useApiData();
  const { can } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ invoiceId: '', productId: '', quantity: '1', recipientName: '', deliveryDate: new Date().toISOString().slice(0, 10) });

  const load = useCallback(async () => {
    try { setNotes(await apiGet<DeliveryNote[]>('/sales/delivery-notes')); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function createNote(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const product = products.find((item) => item.id === form.productId);
    try {
      await apiRequest('/sales/delivery-notes', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: form.invoiceId || undefined,
          deliveryDate: form.deliveryDate,
          recipientName: form.recipientName,
          items: [{ productId: form.productId || undefined, description: product?.name || 'Item', quantity: form.quantity }],
        }),
      });
      setShowCreate(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); } finally { setBusy(false); }
  }

  async function act(note: DeliveryNote, action: 'deliver' | 'cancel') {
    setBusy(true); setError('');
    try { await apiRequest(`/sales/delivery-notes/${note.id}/actions`, { method: 'POST', body: JSON.stringify({ action }) }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); } finally { setBusy(false); }
  }

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">{ar ? 'إذون التسليم' : 'Delivery Notes'}</h1>
          <p className="text-navy-500">{ar ? 'تتبع تسليم الشحنات للعملاء' : 'Track dispatch and delivery of customer shipments'}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" />{ar ? 'تحديث' : 'Refresh'}</button>
          {can('sales.write') && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}><Plus className="h-4 w-4" />{ar ? 'إذن جديد' : 'New delivery note'}</button>}
        </div>
      </div>
      {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-danger-700">{error}</div>}
      {showCreate && (
        <form className="card mb-6 grid gap-4 p-4 md:grid-cols-3" onSubmit={createNote}>
          <select className="select" value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}>
            <option value="">{ar ? 'بدون فاتورة' : 'No linked invoice'}</option>
            {salesInvoices.map((item) => <option key={item.id} value={item.id}>{item.invoiceNumber}</option>)}
          </select>
          <select className="select" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
            <option value="">{ar ? 'اختر المنتج' : 'Select product'}</option>
            {products.map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>)}
          </select>
          <input className="input" inputMode="decimal" placeholder={ar ? 'الكمية' : 'Quantity'} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          <input className="input" placeholder={ar ? 'اسم المستلم' : 'Recipient name'} value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} />
          <input className="input" type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} required />
          <button disabled={busy} className="btn btn-primary">{ar ? 'إنشاء إذن التسليم' : 'Create delivery note'}</button>
        </form>
      )}
      <div className="card overflow-x-auto">
        <table className="table min-w-[800px]">
          <thead><tr><th>{ar ? 'الرقم' : 'Number'}</th><th>{ar ? 'الفاتورة' : 'Invoice'}</th><th>{ar ? 'التاريخ' : 'Date'}</th><th>{ar ? 'المستلم' : 'Recipient'}</th><th>{ar ? 'الحالة' : 'Status'}</th><th>{ar ? 'إجراءات' : 'Actions'}</th></tr></thead>
          <tbody>
            {notes.map((note) => (
              <tr key={note.id}>
                <td className="font-semibold">{note.deliveryNumber}</td>
                <td>{note.invoiceNumber || '—'}</td>
                <td>{note.deliveryDate}</td>
                <td>{note.recipientName || '—'}</td>
                <td><span className="badge badge-primary">{note.status}</span></td>
                <td>
                  <div className="flex gap-2">
                    {note.status === 'pending' && can('sales.write') && <button disabled={busy} className="btn btn-primary btn-sm" onClick={() => void act(note, 'deliver')}>{ar ? 'تسليم' : 'Deliver'}</button>}
                    {note.status === 'pending' && can('sales.write') && <button disabled={busy} className="btn btn-ghost btn-sm" onClick={() => void act(note, 'cancel')}>{ar ? 'إلغاء' : 'Cancel'}</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!notes.length && <div className="empty-state"><Truck className="empty-state-icon" /><p>{ar ? 'لا توجد إذون تسليم' : 'No delivery notes yet'}</p></div>}
      </div>
    </AppLayout>
  );
}
