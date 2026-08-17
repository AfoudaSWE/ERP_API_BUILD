import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { FileStack, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { apiGet, apiRequest } from '@/lib/api-client';
import { useApiData } from '@/lib/api-data';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

type InvoiceTemplate = { id: string; name: string; isActive: boolean };

export default function InvoiceTemplatesPage() {
  const { customers, products } = useApiData();
  const { can } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', productId: '', quantity: '1', unitPrice: '0', taxRate: '14' });
  const [useTemplateId, setUseTemplateId] = useState<string | null>(null);
  const [useCustomerId, setUseCustomerId] = useState('');

  const load = useCallback(async () => {
    try { setTemplates(await apiGet<InvoiceTemplate[]>('/sales/invoice-templates')); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function createTemplate(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const product = products.find((item) => item.id === form.productId);
    try {
      await apiRequest('/sales/invoice-templates', {
        method: 'POST',
        body: JSON.stringify({ name: form.name, items: [{ productId: form.productId, description: product?.name || 'Item', quantity: form.quantity, unitPrice: form.unitPrice, taxRate: form.taxRate }] }),
      });
      setShowCreate(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); } finally { setBusy(false); }
  }

  async function archive(template: InvoiceTemplate) {
    setBusy(true); setError('');
    try { await apiRequest(`/sales/invoice-templates/${template.id}`, { method: 'DELETE' }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); } finally { setBusy(false); }
  }

  async function useTemplate(event: FormEvent) {
    event.preventDefault(); if (!useTemplateId) return; setBusy(true); setError('');
    try {
      await apiRequest(`/sales/invoice-templates/${useTemplateId}/create-invoice`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ customerId: useCustomerId || undefined, invoiceDate: new Date().toISOString().slice(0, 10), paymentMethod: 'cash' }),
      });
      setUseTemplateId(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); } finally { setBusy(false); }
  }

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">{ar ? 'قوالب الفواتير' : 'Invoice Templates'}</h1>
          <p className="text-navy-500">{ar ? 'مجموعات بنود جاهزة لإنشاء فواتير بسرعة' : 'Reusable line-item sets for fast invoice creation'}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" />{ar ? 'تحديث' : 'Refresh'}</button>
          {can('sales.write') && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}><Plus className="h-4 w-4" />{ar ? 'قالب جديد' : 'New template'}</button>}
        </div>
      </div>
      {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-danger-700">{error}</div>}
      {showCreate && (
        <form className="card mb-6 grid gap-4 p-4 md:grid-cols-3" onSubmit={createTemplate}>
          <input className="input" required placeholder={ar ? 'اسم القالب' : 'Template name'} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="select" required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value, unitPrice: String(e.target.value ? products.find((p) => p.id === e.target.value)?.sellingPrice ?? 0 : 0) })}>
            <option value="">{ar ? 'اختر المنتج' : 'Select product'}</option>
            {products.map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>)}
          </select>
          <input className="input" inputMode="decimal" placeholder={ar ? 'الكمية' : 'Quantity'} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          <input className="input" inputMode="decimal" placeholder={ar ? 'سعر الوحدة' : 'Unit price'} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required />
          <input className="input" inputMode="decimal" placeholder={ar ? 'الضريبة %' : 'Tax %'} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} required />
          <button disabled={busy} className="btn btn-primary">{ar ? 'إنشاء القالب' : 'Create template'}</button>
        </form>
      )}
      <div className="card overflow-x-auto">
        <table className="table min-w-[600px]">
          <thead><tr><th>{ar ? 'الاسم' : 'Name'}</th><th>{ar ? 'إجراءات' : 'Actions'}</th></tr></thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.id}>
                <td className="font-semibold">{template.name}</td>
                <td>
                  <div className="flex gap-2">
                    {can('sales.write') && <button disabled={busy} className="btn btn-primary btn-sm" onClick={() => { setUseTemplateId(template.id); setUseCustomerId(''); }}>{ar ? 'إنشاء فاتورة' : 'Use template'}</button>}
                    {can('sales.write') && <button disabled={busy} className="btn btn-ghost btn-icon btn-sm" title={ar ? 'أرشفة' : 'Archive'} onClick={() => void archive(template)}><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!templates.length && <div className="empty-state"><FileStack className="empty-state-icon" /><p>{ar ? 'لا توجد قوالب فواتير' : 'No invoice templates yet'}</p></div>}
      </div>
      {useTemplateId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/60 p-4">
          <form onSubmit={useTemplate} className="card w-full max-w-md p-5">
            <h2 className="mb-4 text-lg font-bold text-navy-900 dark:text-white">{ar ? 'إنشاء فاتورة من القالب' : 'Create invoice from template'}</h2>
            <label className="label">{ar ? 'العميل' : 'Customer'}</label>
            <select className="select mb-4" value={useCustomerId} onChange={(e) => setUseCustomerId(e.target.value)}>
              <option value="">{ar ? 'عميل نقدي' : 'Cash customer'}</option>
              {customers.map((item) => <option key={item.id} value={item.id}>{ar ? item.nameAr || item.name : item.name}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setUseTemplateId(null)}>{ar ? 'إلغاء' : 'Cancel'}</button>
              <button disabled={busy} className="btn btn-primary">{ar ? 'إنشاء' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
