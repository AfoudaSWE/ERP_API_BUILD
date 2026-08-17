import { useEffect, useMemo, useState } from 'react';
import Link from '@/components/router/Link';
import {
  Search, X, Plus, Minus, Trash2, User, CreditCard,
  Wallet, Smartphone, Percent, Tag, Barcode, Grid3X3,
  ShoppingCart, Receipt, Clock, ChevronLeft, Package, LogOut, Layers3
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { apiGet, apiRequest } from '@/lib/api-client';
import { useApiData } from '@/lib/api-data';
import { useTranslation } from 'react-i18next';
import type { Customer, Product } from '@/types';
import { useAuth } from '@/lib/auth';

interface CategoryOption { id: string; name: string; nameAr: string; type: string; isActive: boolean }

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export default function POSPage() {
  const { products, customers, refresh } = useApiData();
  const { can, logout } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [checkoutError, setCheckoutError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');

  const isRTL = locale === 'ar';

  useEffect(() => {
    let active = true;
    void apiGet<CategoryOption[]>('/categories?pageSize=100').then((rows) => { if (active) setCategories(rows.filter((row) => row.type === 'product')); }).catch((cause: unknown) => { if (active) setCheckoutError(cause instanceof Error ? cause.message : 'Unable to load categories'); });
    return () => { active = false; };
  }, []);

  const activeProducts = useMemo(() => products.filter((product) => product.isActive), [products]);
  const categoryCounts = useMemo(() => activeProducts.reduce<Record<string, number>>((counts, product) => {
    if (product.categoryId) counts[product.categoryId] = (counts[product.categoryId] || 0) + 1;
    return counts;
  }, {}), [activeProducts]);
  const visibleCategories = useMemo(() => categories.filter((category) => category.isActive && (categoryCounts[category.id] || 0) > 0), [categories, categoryCounts]);

  const filteredProducts = activeProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.nameAr.includes(searchTerm) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchTerm));
    
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const formatPrice = (value: number) => formatCurrency(value, 'EGP', locale === 'ar' ? 'ar-EG' : 'en-EG');

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const newQty = Math.max(0, item.quantity + change);
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setShowPayment(false);
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
  const discountAmount = cart.reduce((sum, item) => sum + item.discount, 0);
  const taxAmount = cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity * item.product.taxRate / 100, 0);
  const total = subtotal - discountAmount + taxAmount;
  const change = parseFloat(cashReceived || '0') - total;

  const checkout = async () => {
    setIsSaving(true); setCheckoutError('');
    try {
      await apiRequest('/sales/invoices', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer ? (isRTL ? selectedCustomer.nameAr || selectedCustomer.name : selectedCustomer.name) : undefined,
        invoiceDate: new Date().toISOString().slice(0, 10),
        currency: 'EGP', discountAmount: discountAmount.toFixed(2), initialPayment: total.toFixed(2), paymentMethod, source: 'pos',
        items: cart.map(({ product, quantity }) => ({ productId: product.id, description: isRTL ? product.nameAr || product.name : product.name, quantity: quantity.toFixed(3), unitPrice: Number(product.sellingPrice).toFixed(2), taxRate: Number(product.taxRate).toFixed(4) })),
      }) });
      clearCart(); setCashReceived(''); await refresh();
    } catch (cause) { setCheckoutError(cause instanceof Error ? cause.message : (isRTL ? 'تعذر إتمام البيع.' : 'Unable to complete sale.')); }
    finally { setIsSaving(false); }
  };

  return (
    <div className={cn(
      'min-h-screen bg-navy-100 dark:bg-navy-950 flex',
      isRTL && 'font-arabic'
    )} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-navy-900 border-b border-navy-200 dark:border-navy-700 p-4">
          <div className="flex items-center gap-4">
            {can('dashboard.read') ? <Link href="/" className="btn btn-ghost btn-icon">
              <ChevronLeft className={cn('w-5 h-5', isRTL && 'rotate-180')} />
            </Link> : <button type="button" onClick={logout} className="btn btn-ghost btn-icon" title={locale === 'ar' ? 'تسجيل الخروج' : 'Sign out'}><LogOut className="h-5 w-5" /></button>}
            <div className="flex-1 relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث بالباركود أو اسم المنتج...' : 'Search by barcode or product name...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input ps-12 text-lg"
                autoFocus
              />
              <button className="absolute end-3 top-1/2 -translate-y-1/2 p-1 hover:bg-navy-100 dark:hover:bg-navy-800 rounded">
                <Barcode className="w-5 h-5 text-navy-400" />
              </button>
            </div>
          </div>

          {/* Categories */}
          <section className="mt-4" aria-labelledby="pos-categories-title">
            <div className="mb-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"><Layers3 className="h-4 w-4" /></span>
                <h2 id="pos-categories-title" className="text-sm font-bold text-navy-900 dark:text-white">{locale === 'ar' ? 'فئات المنتجات' : 'Product categories'}</h2>
              </div>
              <p className="text-xs font-medium text-navy-500" aria-live="polite">{filteredProducts.length} {locale === 'ar' ? 'منتج ظاهر' : filteredProducts.length === 1 ? 'product shown' : 'products shown'}</p>
            </div>
            <div className="flex items-stretch gap-2 overflow-x-auto pb-2" role="group" aria-label={locale === 'ar' ? 'تصفية حسب الفئة' : 'Filter by category'}>
              <button type="button" onClick={() => setSelectedCategory('')} aria-pressed={!selectedCategory} className={cn('group flex min-w-[116px] items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-all', !selectedCategory ? 'border-primary-600 bg-primary-600 text-white shadow-md shadow-primary-600/20' : 'border-navy-200 bg-navy-50 text-navy-700 hover:border-primary-300 hover:bg-white dark:border-navy-700 dark:bg-navy-800 dark:text-navy-200')}>
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', !selectedCategory ? 'bg-white/15' : 'bg-white text-primary-600 shadow-sm dark:bg-navy-700')}><Grid3X3 className="h-4 w-4" /></span>
                <span><strong className="block text-sm">{locale === 'ar' ? 'الكل' : 'All'}</strong><small className={cn('tabular-nums', !selectedCategory ? 'text-primary-100' : 'text-navy-500')}>{activeProducts.length}</small></span>
              </button>
              {visibleCategories.map((category) => {
                const selected = selectedCategory === category.id;
                return <button type="button" key={category.id} onClick={() => setSelectedCategory(category.id)} aria-pressed={selected} className={cn('group flex min-w-[138px] items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-all', selected ? 'border-primary-600 bg-primary-600 text-white shadow-md shadow-primary-600/20' : 'border-navy-200 bg-navy-50 text-navy-700 hover:border-primary-300 hover:bg-white dark:border-navy-700 dark:bg-navy-800 dark:text-navy-200')}>
                  <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', selected ? 'bg-white/15' : 'bg-white text-primary-600 shadow-sm dark:bg-navy-700')}><Smartphone className="h-4 w-4" /></span>
                  <span className="min-w-0"><strong className="block truncate text-sm">{locale === 'ar' ? category.nameAr || category.name : category.name}</strong><small className={cn('tabular-nums', selected ? 'text-primary-100' : 'text-navy-500')}>{categoryCounts[category.id]} {locale === 'ar' ? 'منتج' : 'items'}</small></span>
                </button>;
              })}
            </div>
          </section>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className={cn(
                  'bg-white dark:bg-navy-800 rounded-xl p-4 text-start hover:shadow-lg transition-all border border-transparent hover:border-primary-500',
                  (product.totalStock || 0) === 0 && 'opacity-50 cursor-not-allowed'
                )}
                disabled={(product.totalStock || 0) === 0}
              >
                <div className="w-full aspect-square bg-navy-100 dark:bg-navy-700 rounded-lg mb-3 flex items-center justify-center">
                  <Package className="w-10 h-10 text-navy-400" />
                </div>
                <h3 className="font-medium text-navy-900 dark:text-white text-sm line-clamp-2 mb-1">
                  {locale === 'ar' ? product.nameAr : product.name}
                </h3>
                <p className="text-xs text-navy-500 mb-2">{product.sku}</p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary-600">
                    {formatPrice(product.sellingPrice)}
                  </span>
                  <span className={cn(
                    'text-xs',
                    (product.totalStock || 0) === 0 ? 'text-danger-600' : 'text-navy-500'
                  )}>
                    {product.totalStock || 0} {locale === 'ar' ? 'متاح' : 'avail'}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-navy-500">
              <Package className="w-12 h-12 mb-3 text-navy-300" />
              <p>{locale === 'ar' ? 'لا توجد منتجات' : 'No products found'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-96 xl:w-[420px] bg-white dark:bg-navy-900 border-s border-navy-200 dark:border-navy-700 flex flex-col">
        {checkoutError && <div role="alert" className="m-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{checkoutError}</div>}
        {/* Cart Header */}
        <div className="p-4 border-b border-navy-200 dark:border-navy-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary-600" />
              <h2 className="font-bold text-navy-900 dark:text-white">
                {locale === 'ar' ? 'السلة' : 'Cart'}
              </h2>
              {cart.length > 0 && (
                <span className="badge badge-primary">{cart.length}</span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="btn btn-ghost btn-sm text-danger-600 hover:bg-danger-50"
              >
                <Trash2 className="w-4 h-4" />
                {locale === 'ar' ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>

          {/* Customer Selection */}
          <div className="relative"><User className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" /><select className="select w-full ps-10" value={selectedCustomer?.id ?? ''} onChange={(event) => setSelectedCustomer(customers.find((customer) => customer.id === event.target.value) ?? null)}><option value="">{locale === 'ar' ? 'اختر عميل (اختياري)' : 'Select customer (optional)'}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{locale === 'ar' ? customer.nameAr || customer.name : customer.name}</option>)}</select></div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-navy-500">
              <ShoppingCart className="w-12 h-12 mb-3 text-navy-300" />
              <p>{locale === 'ar' ? 'السلة فارغة' : 'Cart is empty'}</p>
              <p className="text-sm mt-1">
                {locale === 'ar' ? 'اضغط على المنتجات لإضافتها' : 'Click products to add them'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-navy-50 dark:bg-navy-800 rounded-lg p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-white dark:bg-navy-700 rounded-lg flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-navy-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-navy-900 dark:text-white text-sm line-clamp-1">
                        {locale === 'ar' ? item.product.nameAr : item.product.name}
                      </h4>
                      <p className="text-sm text-primary-600 font-medium">
                        {formatPrice(item.product.sellingPrice)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 hover:bg-danger-100 dark:hover:bg-danger-900/30 rounded text-danger-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-navy-700 flex items-center justify-center hover:bg-navy-100 dark:hover:bg-navy-600"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-navy-700 flex items-center justify-center hover:bg-navy-100 dark:hover:bg-navy-600"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="font-bold text-navy-900 dark:text-white">
                      {formatPrice(item.product.sellingPrice * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div className="border-t border-navy-200 dark:border-navy-700 p-4">
            {/* Totals */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-navy-500">{locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-navy-500">{locale === 'ar' ? 'الضريبة (14%)' : 'Tax (14%)'}</span>
                <span className="font-medium">{formatPrice(taxAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold pt-2 border-t border-navy-200 dark:border-navy-700">
                <span>{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                <span className="text-primary-600">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Payment Buttons */}
            {!showPayment ? (
              <div className="space-y-2">
                <button
                  onClick={() => setShowPayment(true)}
                  className="w-full btn btn-primary btn-lg"
                >
                  <CreditCard className="w-5 h-5" />
                  {locale === 'ar' ? 'الدفع' : 'Pay'} - {formatPrice(total)}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn btn-secondary btn-md">
                    <Clock className="w-4 h-4" />
                    {locale === 'ar' ? 'تعليق' : 'Hold'}
                  </button>
                  <button className="btn btn-secondary btn-md">
                    <Percent className="w-4 h-4" />
                    {locale === 'ar' ? 'خصم' : 'Discount'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Payment Methods */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={cn(
                      'btn btn-md flex-col py-3',
                      paymentMethod === 'cash' ? 'btn-primary' : 'btn-secondary'
                    )}
                  >
                    <Wallet className="w-5 h-5" />
                    <span className="text-xs mt-1">{locale === 'ar' ? 'نقدي' : 'Cash'}</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={cn(
                      'btn btn-md flex-col py-3',
                      paymentMethod === 'card' ? 'btn-primary' : 'btn-secondary'
                    )}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs mt-1">{locale === 'ar' ? 'بطاقة' : 'Card'}</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('wallet')}
                    className={cn(
                      'btn btn-md flex-col py-3',
                      paymentMethod === 'wallet' ? 'btn-primary' : 'btn-secondary'
                    )}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-xs mt-1">{locale === 'ar' ? 'محفظة' : 'Wallet'}</span>
                  </button>
                </div>

                {/* Cash Input */}
                {paymentMethod === 'cash' && (
                  <div>
                    <label className="label">{locale === 'ar' ? 'المبلغ المستلم' : 'Cash Received'}</label>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="input text-lg font-bold text-center"
                      placeholder="0.00"
                    />
                    {change >= 0 && parseFloat(cashReceived) > 0 && (
                      <div className="mt-2 p-3 bg-success-50 dark:bg-success-900/30 rounded-lg text-center">
                        <span className="text-sm text-success-600">{locale === 'ar' ? 'الباقي' : 'Change'}</span>
                        <p className="text-xl font-bold text-success-600">{formatPrice(change)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowPayment(false)}
                    className="btn btn-secondary btn-md"
                  >
                    {locale === 'ar' ? 'رجوع' : 'Back'}
                  </button>
                  <button
                    onClick={() => void checkout()}
                    className="btn btn-success btn-md"
                    disabled={isSaving || (paymentMethod === 'cash' && change < 0)}
                  >
                    <Receipt className="w-4 h-4" />
                    {isSaving ? (locale === 'ar' ? 'جارٍ الحفظ…' : 'Saving…') : (locale === 'ar' ? 'تأكيد' : 'Confirm')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
