import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Repeat, Plus, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { apiGet, apiRequest } from '@/lib/api-client';
import { useApiData } from '@/lib/api-data';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

type RecurringTemplate = { id: string; name: string; frequency: string; nextRunDate: string; status: string; lastGeneratedAt?: string };

export default function RecurringInvoicesPage() {
  const { customers, products } = useApiData();
  const { can } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', customerId: '', productId: '', quantity: '1', unitPrice: '0', taxRate: '14', frequency: 'monthly', nextRunDate: new Date().toISOString().slice(0, 10) });

  const load = useCallback(async () => {
    try { setTemplates(await apiGet<RecurringTemplate[]>('/sales/recurring-invoices')); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function createTemplate(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const product = products.find((item) => item.id === form.productId);
    try {
      await apiRequest('/sales/recurring-invoices', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          customerId: form.customerId || undefined,
          frequency: form.frequency,
          nextRunDate: form.nextRunDate,
          items: [{ productId: form.productId, description: product?.name || 'Item', quantity: form.quantity, unitPrice: form.unitPrice, taxRate: form.taxRate }],
        }),
      });
      setShowCreate(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); } finally { setBusy(false); }
  }

  async function act(template: RecurringTemplate, action: 'pause' | 'resume' | 'cancel') {
    setBusy(true); setError('');
    try { await apiRequest(`/sales/recurring-invoices/${template.id}/actions`, { method: 'POST', body: JSON.stringify({ action }) }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); } finally { setBusy(false); }
  }

  async function generate(template: RecurringTemplate) {
    setBusy(true); setError('');
    try { await apiRequest(`/sales/recurring-invoices/${template.id}/generate`, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() } }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); } finally { setBusy(false); }
  }

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">{ar ? 'الفواتير المتكررة' : 'Recurring Invoices'}</h1>
          <p className="text-navy-500">{ar ? 'قوالب فوترة تلقائية تتكرر حسب جدول زمني' : 'Automated billing templates that repeat on a schedule'}</p>
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
          <select className="select" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
            <option value="">{ar ? 'عميل نقدي' : 'Cash customer'}</option>
            {customers.map((item) => <option key={item.id} value={item.id}>{ar ? item.nameAr || item.name : item.name}</option>)}
          </select>
          <select className="select" required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value, unitPrice: String(e.target.value ? products.find((p) => p.id === e.target.value)?.sellingPrice ?? 0 : 0) })}>
            <option value="">{ar ? 'اختر المنتج' : 'Select product'}</option>
            {products.map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>)}
          </select>
          <select className="select" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
            <option value="weekly">{ar ? 'أسبوعي' : 'Weekly'}</option>
            <option value="monthly">{ar ? 'شهري' : 'Monthly'}</option>
            <option value="quarterly">{ar ? 'ربع سنوي' : 'Quarterly'}</option>
            <option value="yearly">{ar ? 'سنوي' : 'Yearly'}</option>
          </select>
          <input className="input" type="date" value={form.nextRunDate} onChange={(e) => setForm({ ...form, nextRunDate: e.target.value })} required />
          <input className="input" inputMode="decimal" placeholder={ar ? 'الكمية' : 'Quantity'} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          <input className="input" inputMode="decimal" placeholder={ar ? 'سعر الوحدة' : 'Unit price'} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required />
          <input className="input" inputMode="decimal" placeholder={ar ? 'الضريبة %' : 'Tax %'} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} required />
          <button disabled={busy} className="btn btn-primary">{ar ? 'إنشاء القالب' : 'Create template'}</button>
        </form>
      )}
      <div className="card overflow-x-auto">
        <table className="table min-w-[800px]">
          <thead><tr><th>{ar ? 'الاسم' : 'Name'}</th><th>{ar ? 'التكرار' : 'Frequency'}</th><th>{ar ? 'التشغيل القادم' : 'Next run'}</th><th>{ar ? 'الحالة' : 'Status'}</th><th>{ar ? 'إجراءات' : 'Actions'}</th></tr></thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.id}>
                <td className="font-semibold">{template.name}</td>
                <td>{template.frequency}</td>
                <td>{template.nextRunDate}</td>
                <td><span className="badge badge-primary">{template.status}</span></td>
                <td>
                  <div className="flex gap-2">
                    {template.status === 'active' && can('sales.write') && <button disabled={busy} className="btn btn-primary btn-sm" onClick={() => void generate(template)}>{ar ? 'توليد الآن' : 'Generate now'}</button>}
                    {template.status === 'active' && can('sales.write') && <button disabled={busy} className="btn btn-secondary btn-sm" onClick={() => void act(template, 'pause')}>{ar ? 'إيقاف مؤقت' : 'Pause'}</button>}
                    {template.status === 'paused' && can('sales.write') && <button disabled={busy} className="btn btn-secondary btn-sm" onClick={() => void act(template, 'resume')}>{ar ? 'استئناف' : 'Resume'}</button>}
                    {template.status !== 'canceled' && can('sales.write') && <button disabled={busy} className="btn btn-ghost btn-sm" onClick={() => void act(template, 'cancel')}>{ar ? 'إلغاء' : 'Cancel'}</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!templates.length && <div className="empty-state"><Repeat className="empty-state-icon" /><p>{ar ? 'لا توجد قوالب متكررة' : 'No recurring templates yet'}</p></div>}
      </div>
    </AppLayout>
  );
}
