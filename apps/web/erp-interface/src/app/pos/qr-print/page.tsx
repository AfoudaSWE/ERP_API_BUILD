import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Minus, Plus, Printer, QrCode as QrCodeIcon, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useApiData } from '@/lib/api-data';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/utils';

export default function QrCodePrintPage() {
  const { products } = useApiData();
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const ar = locale === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const printable = useMemo(() => products.filter((product) => product.isActive), [products]);
  const filtered = printable.filter((product) => {
    const term = searchTerm.toLowerCase();
    return !term || product.name.toLowerCase().includes(term) || product.nameAr.includes(searchTerm) || product.sku.toLowerCase().includes(term) || (product.barcode ?? '').includes(searchTerm);
  });

  const setQuantity = (productId: string, value: number) => setQuantities((prev) => ({ ...prev, [productId]: Math.max(0, value) }));

  const labels = useMemo(
    () => filtered.flatMap((product) => Array.from({ length: quantities[product.id] ?? 0 }, (_unused, index) => ({ product, key: `${product.id}-${index}` }))),
    [filtered, quantities],
  );

  const formatPrice = (value: number) => formatCurrency(value, 'EGP', ar ? 'ar-EG' : 'en-EG');

  return (
    <AppLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">{ar ? 'طباعة رمز QR' : 'QR Code Print'}</h1>
          <p className="text-navy-500">{ar ? 'اختر المنتجات وعدد الملصقات ثم اطبع' : 'Pick products and label quantities, then print'}</p>
        </div>
        <button type="button" className="btn btn-primary btn-md" onClick={() => window.print()} disabled={!labels.length}>
          <Printer className="h-4 w-4" />{ar ? `طباعة (${labels.length})` : `Print (${labels.length})`}
        </button>
      </div>

      <div className="print:hidden">
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={ar ? 'ابحث بالاسم أو SKU...' : 'Search by name or SKU...'}
            className="input ps-10"
          />
        </div>

        <div className="card overflow-x-auto">
          <table className="table min-w-[600px]">
            <thead><tr><th>{ar ? 'المنتج' : 'Product'}</th><th>{ar ? 'SKU' : 'SKU'}</th><th>{ar ? 'السعر' : 'Price'}</th><th className="text-end">{ar ? 'عدد الملصقات' : 'Labels'}</th></tr></thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td className="font-medium">{ar ? product.nameAr || product.name : product.name}</td>
                  <td className="tabular-nums text-navy-500">{product.sku}</td>
                  <td className="tabular-nums">{formatPrice(product.sellingPrice)}</td>
                  <td className="text-end">
                    <div className="inline-flex items-center gap-2">
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setQuantity(product.id, (quantities[product.id] ?? 0) - 1)}><Minus className="h-4 w-4" /></button>
                      <span className="w-8 text-center tabular-nums font-semibold">{quantities[product.id] ?? 0}</span>
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setQuantity(product.id, (quantities[product.id] ?? 0) + 1)}><Plus className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <div className="empty-state"><QrCodeIcon className="empty-state-icon" /><p>{ar ? 'لا توجد منتجات' : 'No products found'}</p></div>}
        </div>
      </div>

      {labels.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 print:mt-0 print:grid-cols-3">
          {labels.map(({ product, key }) => <QrLabel key={key} name={ar ? product.nameAr || product.name : product.name} value={product.barcode || product.sku} price={formatPrice(product.sellingPrice)} />)}
        </div>
      )}
    </AppLayout>
  );
}

function QrLabel({ name, value, price }: { name: string; value: string; price: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, value, { width: 96, margin: 1 }).catch(() => { /* ignore render failure for an empty value */ });
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-navy-200 bg-white p-3 text-center dark:border-navy-700 dark:bg-navy-900 print:break-inside-avoid print:border-navy-300">
      <p className="line-clamp-1 w-full text-xs font-medium text-navy-700 dark:text-navy-200">{name}</p>
      <canvas ref={canvasRef} />
      <p className="text-xs font-bold text-navy-900 dark:text-white">{price}</p>
    </div>
  );
}
