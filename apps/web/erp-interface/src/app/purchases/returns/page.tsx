import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { PackageMinus, Plus, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { apiGet, apiRequest } from '@/lib/api-client';
import { useApiData } from '@/lib/api-data';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

type Warehouse = { id: string; code: string; name: string };
type PurchaseReturn = { id: string; returnNumber: string; supplierName: string; warehouseName: string; businessDate: string; reason: string; total: string; status: string };

export default function PurchaseReturnsPage() {
  const { suppliers, products } = useApiData();
  const { can } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ supplierId: '', warehouseId: '', productId: '', quantity: '1', unitCost: '0', taxRate: '0', reason: '', businessDate: new Date().toISOString().slice(0, 10) });

  const load = useCallback(async () => {
    try {
      const [returnRows, warehouseRows] = await Promise.all([apiGet<PurchaseReturn[]>('/purchase-returns'), apiGet<Warehouse[]>('/warehouses')]);
      setReturns(returnRows); setWarehouses(warehouseRows);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function createReturn(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await apiRequest('/purchase-returns', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          supplierId: form.supplierId,
          warehouseId: form.warehouseId,
          businessDate: form.businessDate,
          reason: form.reason,
          items: [{ productId: form.productId, quantity: form.quantity, unitCost: form.unitCost, taxRate: form.taxRate }],
        }),
      });
      setShowCreate(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); } finally { setBusy(false); }
  }

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">{ar ? 'مرتجع المشتريات' : 'Purchase Return'}</h1>
          <p className="text-navy-500">{ar ? 'إرجاع بضاعة للمورد وتسوية المخزون والحسابات' : 'Return goods to a supplier, reversing stock and accounting'}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" />{ar ? 'تحديث' : 'Refresh'}</button>
          {can('purchases.write') && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}><Plus className="h-4 w-4" />{ar ? 'مرتجع جديد' : 'New return'}</button>}
        </div>
      </div>
      {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-danger-700">{error}</div>}
      {showCreate && (
        <form className="card mb-6 grid gap-4 p-4 md:grid-cols-3" onSubmit={createReturn}>
          <select className="select" required value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
            <option value="">{ar ? 'اختر المورد' : 'Select supplier'}</option>
            {suppliers.map((item) => <option key={item.id} value={item.id}>{ar ? item.nameAr || item.name : item.name}</option>)}
          </select>
          <select className="select" required value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
            <option value="">{ar ? 'اختر المخزن' : 'Select warehouse'}</option>
            {warehouses.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
          </select>
          <select className="select" required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value, unitCost: String(e.target.value ? products.find((p) => p.id === e.target.value)?.costPrice ?? 0 : 0) })}>
            <option value="">{ar ? 'اختر المنتج' : 'Select product'}</option>
            {products.map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>)}
          </select>
          <input className="input" type="date" value={form.businessDate} onChange={(e) => setForm({ ...form, businessDate: e.target.value })} required />
          <input className="input" inputMode="decimal" placeholder={ar ? 'الكمية' : 'Quantity'} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          <input className="input" inputMode="decimal" placeholder={ar ? 'تكلفة الوحدة' : 'Unit cost'} value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} required />
          <input className="input" inputMode="decimal" placeholder={ar ? 'الضريبة %' : 'Tax %'} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} required />
          <input className="input md:col-span-2" placeholder={ar ? 'سبب الإرجاع' : 'Return reason'} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required minLength={3} />
          <button disabled={busy} className="btn btn-primary">{ar ? 'ترحيل المرتجع' : 'Post return'}</button>
        </form>
      )}
      <div className="card overflow-x-auto">
        <table className="table min-w-[850px]">
          <thead><tr><th>{ar ? 'الرقم' : 'Number'}</th><th>{ar ? 'المورد' : 'Supplier'}</th><th>{ar ? 'المخزن' : 'Warehouse'}</th><th>{ar ? 'التاريخ' : 'Date'}</th><th>{ar ? 'السبب' : 'Reason'}</th><th className="text-end">{ar ? 'الإجمالي' : 'Total'}</th></tr></thead>
          <tbody>
            {returns.map((row) => (
              <tr key={row.id}>
                <td className="font-semibold">{row.returnNumber}</td>
                <td>{row.supplierName}</td>
                <td>{row.warehouseName}</td>
                <td>{row.businessDate}</td>
                <td>{row.reason}</td>
                <td className="text-end tabular-nums font-semibold">{row.total} EGP</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!returns.length && <div className="empty-state"><PackageMinus className="empty-state-icon" /><p>{ar ? 'لا توجد مرتجعات مشتريات' : 'No purchase returns yet'}</p></div>}
      </div>
    </AppLayout>
  );
}
