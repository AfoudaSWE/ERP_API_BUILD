import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { PackageCheck, Plus, RefreshCw, ShoppingCart } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { apiGet, apiRequest } from '@/lib/api-client';
import { useApiData } from '@/lib/api-data';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

type Warehouse = { id: string; code: string; name: string };
type OrderItem = { id: string; description: string; orderedQuantity: string; receivedQuantity: string };
type Order = { id: string; orderNumber: string; supplierName: string; warehouseName: string; orderDate: string; expectedDate?: string; status: string; total: string; items?: OrderItem[] };

export default function PurchasesPage() {
  const { suppliers, products } = useApiData();
  const { can } = useAuth();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  const [orders, setOrders] = useState<Order[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ supplierId: '', warehouseId: '', productId: '', quantity: '1', unitPrice: '0', taxRate: '0', orderDate: new Date().toISOString().slice(0, 10) });
  const [receiptQuantity, setReceiptQuantity] = useState('');

  const load = useCallback(async () => {
    try {
      const [orderRows, warehouseRows] = await Promise.all([apiGet<Order[]>('/purchase-orders'), apiGet<Warehouse[]>('/warehouses')]);
      setOrders(orderRows); setWarehouses(warehouseRows);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); }
  }, []);
  // The async request is the external synchronization performed by this effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const total = useMemo(() => orders.reduce((sum, order) => sum + Number(order.total), 0), [orders]);
  async function createOrder(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const product = products.find((item) => item.id === form.productId);
    try {
      await apiRequest('/purchase-orders', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ supplierId: form.supplierId, warehouseId: form.warehouseId, orderDate: form.orderDate, currency: 'EGP', discountAmount: '0', items: [{ productId: form.productId, description: product?.name || 'Item', quantity: form.quantity, unit: product?.unit || 'piece', unitPrice: form.unitPrice, taxRate: form.taxRate }] }) });
      setShowCreate(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); } finally { setBusy(false); }
  }
  async function action(order: Order, nextAction: string) {
    setBusy(true); setError('');
    try { await apiRequest(`/purchase-orders/${order.id}/actions`, { method: 'POST', body: JSON.stringify({ action: nextAction }) }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); } finally { setBusy(false); }
  }
  async function openReceipt(order: Order) {
    try { const detail = await apiGet<Order>(`/purchase-orders/${order.id}`); setSelected(detail); setReceiptQuantity(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); }
  }
  async function receive(event: FormEvent) {
    event.preventDefault(); if (!selected?.items?.[0]) return; setBusy(true); setError('');
    try {
      await apiRequest(`/purchase-orders/${selected.id}/receipts`, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ receiptDate: new Date().toISOString().slice(0, 10), items: [{ purchaseOrderItemId: selected.items[0].id, acceptedQuantity: receiptQuantity }] }) });
      setSelected(null); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Request failed'); } finally { setBusy(false); }
  }

  return <AppLayout>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-navy-900 dark:text-white">{ar ? 'المشتريات' : 'Purchases'}</h1><p className="text-navy-500">{ar ? 'أوامر شراء واستلام مباشر من API' : 'API-backed purchase orders and receiving'}</p></div>
      <div className="flex gap-2"><button className="btn btn-secondary btn-sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" />{ar ? 'تحديث' : 'Refresh'}</button>{can('purchases.write') && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}><Plus className="h-4 w-4" />{ar ? 'أمر جديد' : 'New order'}</button>}</div>
    </div>
    {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-danger-700">{error}</div>}
    <div className="mb-6 grid gap-4 sm:grid-cols-3"><div className="stat-card"><p className="stat-label">{ar ? 'عدد الأوامر' : 'Orders'}</p><p className="stat-value">{orders.length}</p></div><div className="stat-card"><p className="stat-label">{ar ? 'القيمة' : 'Value'}</p><p className="stat-value">{total.toFixed(2)} EGP</p></div><div className="stat-card"><p className="stat-label">{ar ? 'قيد الاستلام' : 'Receivable'}</p><p className="stat-value">{orders.filter((item) => ['approved', 'partially_received'].includes(item.status)).length}</p></div></div>
    {showCreate && <form className="card mb-6 grid gap-4 p-4 md:grid-cols-3" onSubmit={createOrder}>
      <select className="select" required value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}><option value="">{ar ? 'اختر المورد' : 'Select supplier'}</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{ar ? item.nameAr || item.name : item.name}</option>)}</select>
      <select className="select" required value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}><option value="">{ar ? 'اختر المخزن' : 'Select warehouse'}</option>{warehouses.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select>
      <select className="select" required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value, unitPrice: String(e.target.value ? products.find((p) => p.id === e.target.value)?.costPrice ?? 0 : 0) })}><option value="">{ar ? 'اختر المنتج' : 'Select product'}</option>{products.map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>)}</select>
      <input className="input" type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} required />
      <input className="input" inputMode="decimal" placeholder={ar ? 'الكمية' : 'Quantity'} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
      <input className="input" inputMode="decimal" placeholder={ar ? 'سعر الوحدة' : 'Unit price'} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required />
      <input className="input" inputMode="decimal" placeholder={ar ? 'الضريبة %' : 'Tax %'} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} required />
      <button disabled={busy} className="btn btn-primary">{ar ? 'إنشاء المسودة' : 'Create draft'}</button>
    </form>}
    <div className="card overflow-x-auto"><table className="table min-w-[850px]"><thead><tr><th>{ar ? 'الرقم' : 'Number'}</th><th>{ar ? 'المورد' : 'Supplier'}</th><th>{ar ? 'المخزن' : 'Warehouse'}</th><th>{ar ? 'التاريخ' : 'Date'}</th><th>{ar ? 'الحالة' : 'Status'}</th><th>{ar ? 'الإجمالي' : 'Total'}</th><th>{ar ? 'إجراءات' : 'Actions'}</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td className="font-semibold">{order.orderNumber}</td><td>{order.supplierName}</td><td>{order.warehouseName}</td><td>{order.orderDate}</td><td><span className="badge badge-primary">{order.status}</span></td><td>{order.total} EGP</td><td><div className="flex gap-2">{order.status === 'draft' && can('purchases.write') && <button disabled={busy} className="btn btn-secondary btn-sm" onClick={() => void action(order, 'submit')}>{ar ? 'إرسال' : 'Submit'}</button>}{order.status === 'submitted' && can('purchases.approve') && <button disabled={busy} className="btn btn-primary btn-sm" onClick={() => void action(order, 'approve')}>{ar ? 'اعتماد' : 'Approve'}</button>}{['approved', 'partially_received'].includes(order.status) && can('inventory.receive') && <button className="btn btn-primary btn-sm" onClick={() => void openReceipt(order)}><PackageCheck className="h-4 w-4" />{ar ? 'استلام' : 'Receive'}</button>}</div></td></tr>)}</tbody></table>{!orders.length && <div className="empty-state"><ShoppingCart className="empty-state-icon" /><p>{ar ? 'لا توجد أوامر شراء' : 'No purchase orders yet'}</p></div>}</div>
    {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form onSubmit={receive} className="card w-full max-w-lg p-5"><h2 className="mb-4 text-lg font-bold">{ar ? 'استلام أمر' : 'Receive order'} {selected.orderNumber}</h2><select className="select mb-3" disabled><option>{selected.items?.[0]?.description}</option></select><input className="input mb-4" required inputMode="decimal" value={receiptQuantity} onChange={(e) => setReceiptQuantity(e.target.value)} placeholder={ar ? 'الكمية المستلمة' : 'Accepted quantity'} /><div className="flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>{ar ? 'إلغاء' : 'Cancel'}</button><button disabled={busy} className="btn btn-primary">{ar ? 'ترحيل الاستلام' : 'Post receipt'}</button></div></form></div>}
  </AppLayout>;
}
