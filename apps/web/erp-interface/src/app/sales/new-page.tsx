import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import Link from '@/components/router/Link';
import { apiRequest } from '@/lib/api-client';
import { useApiData } from '@/lib/api-data';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

export default function NewSalesInvoicePage() {
  const navigate = useNavigate();
  const { customers, products, refresh } = useApiData();
  const { can } = useAuth();
  const { t, i18n } = useTranslation();
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selectedProduct = products.find((product) => product.id === productId);
  const total = useMemo(() => quantity * unitPrice * (1 + Number(selectedProduct?.taxRate ?? 14) / 100), [quantity, selectedProduct, unitPrice]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const customer = customers.find((item) => item.id === values.customerId);
    try {
      await apiRequest('/sales/invoices', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          customerId: values.customerId || undefined,
          customerName: customer?.name,
          invoiceDate: values.invoiceDate,
          dueDate: values.dueDate || undefined,
          currency: 'EGP',
          discountAmount: '0',
          initialPayment: Number(values.paidAmount || 0).toFixed(2),
          paymentMethod: 'cash',
          items: [{
            productId,
            description: selectedProduct?.name || 'Product',
            quantity: quantity.toFixed(3),
            unitPrice: unitPrice.toFixed(2),
            taxRate: Number(selectedProduct?.taxRate ?? 14).toFixed(4),
          }],
        }),
      });
      await refresh();
      navigate('/sales');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create invoice');
    } finally {
      setSaving(false);
    }
  }

  if (!can('sales.write')) return <AppLayout><div className="card p-8 text-center"><h1 className="text-xl font-bold">{t('auth.permissionDenied')}</h1><p className="mt-2 text-navy-500">{t('auth.missingPermission', { permission: 'sales.write' })}</p></div></AppLayout>;

  return <AppLayout>
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-navy-900 dark:text-white">{t('sales.newInvoice')}</h1><p className="mt-1 text-navy-500">{t('sales.formSubtitle')}</p></div>
        <Link href="/sales" className="btn btn-secondary btn-sm">{t('common.back')}</Link>
      </div>
      {error && <div role="alert" className="mb-5 rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-danger-700">{error}</div>}
      <form onSubmit={submit} className="card">
        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
          <div><label className="label" htmlFor="customerId">{t('sales.customer')}</label><select id="customerId" name="customerId" className="select" required><option value="">{t('sales.selectCustomer')}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{i18n.language.startsWith('ar') ? customer.nameAr || customer.name : customer.name}</option>)}</select></div>
          <div><label className="label" htmlFor="productId">{t('sales.product')}</label><select id="productId" className="select" value={productId} required onChange={(event) => { const product = products.find((item) => item.id === event.target.value); setProductId(event.target.value); setUnitPrice(Number(product?.sellingPrice ?? 0)); }}><option value="">{t('sales.selectProduct')}</option>{products.filter((product) => Number(product.totalStock) > 0).map((product) => <option key={product.id} value={product.id}>{i18n.language.startsWith('ar') ? product.nameAr || product.name : product.name} — {product.totalStock}</option>)}</select></div>
          <div><label className="label" htmlFor="invoiceDate">{t('sales.invoiceDate')}</label><input id="invoiceDate" name="invoiceDate" type="date" className="input" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          <div><label className="label" htmlFor="dueDate">{t('sales.dueDate')}</label><input id="dueDate" name="dueDate" type="date" className="input" /></div>
          <div><label className="label" htmlFor="quantity">{t('sales.quantity')}</label><input id="quantity" type="number" min="1" max={Number(selectedProduct?.totalStock ?? 1)} className="input" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required /></div>
          <div><label className="label" htmlFor="unitPrice">{t('sales.unitPrice')}</label><input id="unitPrice" type="number" min="0" step="0.01" className="input" value={unitPrice} onChange={(event) => setUnitPrice(Number(event.target.value))} required /></div>
          <div><label className="label" htmlFor="paidAmount">{t('sales.paidAmount')}</label><input id="paidAmount" name="paidAmount" type="number" min="0" max={total} step="0.01" defaultValue="0" className="input" /></div>
          <div className="rounded-xl bg-primary-50 p-4"><span className="text-sm text-primary-700">{t('sales.totalWithTax')}</span><strong className="mt-1 block text-xl text-navy-900">{formatCurrency(total, 'EGP', i18n.language.startsWith('ar') ? 'ar-EG' : 'en-EG')}</strong></div>
        </div>
        <div className="flex justify-end gap-3 border-t border-navy-200 p-5"><Link href="/sales" className="btn btn-secondary btn-md">{t('common.cancel')}</Link><button type="submit" disabled={saving || !productId} className="btn btn-primary btn-md"><Save className="h-4 w-4" />{saving ? t('common.saving') : t('sales.createInvoice')}</button></div>
      </form>
    </div>
  </AppLayout>;
}
