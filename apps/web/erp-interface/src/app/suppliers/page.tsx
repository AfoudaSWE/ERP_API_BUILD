import { useMemo, useState } from 'react';
import Link from '@/components/router/Link';
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Download,
  Edit3,
  Eye,
  Factory,
  Mail,
  MapPin,
  PackagePlus,
  Phone,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Truck,
  Upload,
  UsersRound,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useApiData } from '@/lib/api-data';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { Supplier } from '@/types';
import { useAuth } from '@/lib/auth';

const supplierTypes: Record<Supplier['type'], { ar: string; en: string; badge: string }> = {
  supplier: { ar: 'مورد', en: 'Supplier', badge: 'badge-primary' },
  manufacturer: { ar: 'مصنّع', en: 'Manufacturer', badge: 'badge-ai' },
  distributor: { ar: 'موزّع', en: 'Distributor', badge: 'badge-success' },
};

export default function SuppliersPage() {
  const { suppliers } = useApiData();
  const { can } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<Supplier['type'] | ''>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'balance' | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  const isRTL = locale === 'ar';
  const numberLocale = isRTL ? 'ar-EG' : 'en-EG';
  const formatPrice = (value: number) => formatCurrency(value, 'EGP', numberLocale);

  const stats = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter((supplier) => supplier.isActive).length,
    totalPurchases: suppliers.reduce((total, supplier) => total + supplier.totalPurchases, 0),
    outstanding: suppliers.reduce((total, supplier) => total + supplier.balance, 0),
    averageLeadTime: Math.round(
      suppliers.reduce((total, supplier) => total + supplier.leadTime, 0) / Math.max(suppliers.length, 1),
    ),
  }), [suppliers]);

  const filteredSuppliers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      const matchesSearch = !normalizedSearch
        || supplier.name.toLowerCase().includes(normalizedSearch)
        || supplier.nameAr.includes(searchTerm.trim())
        || supplier.code.toLowerCase().includes(normalizedSearch)
        || supplier.phone?.includes(searchTerm.trim())
        || supplier.email?.toLowerCase().includes(normalizedSearch);
      const matchesType = !typeFilter || supplier.type === typeFilter;
      const matchesStatus = !statusFilter
        || (statusFilter === 'active' && supplier.isActive)
        || (statusFilter === 'inactive' && !supplier.isActive)
        || (statusFilter === 'balance' && supplier.balance > 0);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [searchTerm, statusFilter, suppliers, typeFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setStatusFilter('');
  };

  const hasFilters = Boolean(searchTerm || typeFilter || statusFilter);

  return (
    <AppLayout>
      <section className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
            <Truck className="h-4 w-4" />
            <span>{isRTL ? 'سلسلة التوريد' : 'Supply chain'}</span>
          </div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
            {isRTL ? 'الموردون' : 'Suppliers'}
          </h1>
          <p className="mt-1 text-navy-500 dark:text-navy-400">
            {isRTL
              ? 'إدارة بيانات الموردين، أرصدتهم، وشروط التوريد'
              : 'Manage supplier profiles, balances, and supply terms'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button type="button" className="btn btn-secondary btn-sm">
            <Upload className="h-4 w-4" />
            {isRTL ? 'استيراد' : 'Import'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm">
            <Download className="h-4 w-4" />
            {isRTL ? 'تصدير' : 'Export'}
          </button>
          <Link href="/suppliers/new" className={cn('btn btn-primary btn-sm', !can('suppliers.write') && 'hidden')}>
            <Plus className="h-4 w-4" />
            {isRTL ? 'مورد جديد' : 'New supplier'}
          </Link>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900/30">
              <UsersRound className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="stat-label">{isRTL ? 'إجمالي الموردين' : 'Total suppliers'}</p>
              <div className="flex items-baseline gap-2">
                <p className="stat-value">{stats.total}</p>
                <span className="text-xs text-success-600">
                  {isRTL ? `${stats.active} نشط` : `${stats.active} active`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <CircleDollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="stat-label">{isRTL ? 'إجمالي المشتريات' : 'Total purchases'}</p>
              <p className="truncate text-lg font-bold text-navy-900 dark:text-white">
                {formatPrice(stats.totalPurchases)}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card border-s-4 border-s-warning-500">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning-50 p-2 dark:bg-warning-900/30">
              <AlertTriangle className="h-5 w-5 text-warning-600 dark:text-yellow-400" />
            </div>
            <div className="min-w-0">
              <p className="stat-label">{isRTL ? 'أرصدة مستحقة' : 'Outstanding balance'}</p>
              <p className="truncate text-lg font-bold text-warning-600 dark:text-yellow-400">
                {formatPrice(stats.outstanding)}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success-50 p-2 dark:bg-success-900/30">
              <Clock3 className="h-5 w-5 text-success-600 dark:text-green-400" />
            </div>
            <div>
              <p className="stat-label">{isRTL ? 'متوسط مدة التوريد' : 'Average lead time'}</p>
              <p className="stat-value">
                {stats.averageLeadTime}
                <span className="ms-1 text-sm font-medium text-navy-500">{isRTL ? 'أيام' : 'days'}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="card mb-6">
        <div className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={isRTL ? 'ابحث بالاسم، الكود، الهاتف، أو البريد...' : 'Search by name, code, phone, or email...'}
                className="input ps-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:flex">
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as Supplier['type'] | '')}
                className="select lg:w-44"
                aria-label={isRTL ? 'نوع المورد' : 'Supplier type'}
              >
                <option value="">{isRTL ? 'كل الأنواع' : 'All types'}</option>
                {(Object.keys(supplierTypes) as Supplier['type'][]).map((type) => (
                  <option key={type} value={type}>{supplierTypes[type][locale]}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowFilters((visible) => !visible)}
                className="btn btn-secondary btn-sm"
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {isRTL ? 'المزيد' : 'More filters'}
                <ChevronDown className={cn('h-4 w-4 transition-transform', showFilters && 'rotate-180')} />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 flex flex-col gap-3 border-t border-navy-200 pt-4 dark:border-navy-700 sm:flex-row sm:items-end">
              <div className="w-full sm:max-w-xs">
                <label className="label" htmlFor="supplier-status-filter">
                  {isRTL ? 'الحالة المالية' : 'Account status'}
                </label>
                <select
                  id="supplier-status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="select"
                >
                  <option value="">{isRTL ? 'الكل' : 'All suppliers'}</option>
                  <option value="active">{isRTL ? 'نشط' : 'Active'}</option>
                  <option value="inactive">{isRTL ? 'غير نشط' : 'Inactive'}</option>
                  <option value="balance">{isRTL ? 'عليه رصيد مستحق' : 'Has outstanding balance'}</option>
                </select>
              </div>

              {hasFilters && (
                <button type="button" onClick={resetFilters} className="btn btn-ghost btn-sm self-start sm:self-auto">
                  <RotateCcw className="h-4 w-4" />
                  {isRTL ? 'إعادة التعيين' : 'Reset filters'}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-navy-900 dark:text-white">
              {isRTL ? 'دليل الموردين' : 'Supplier directory'}
            </h2>
            <p className="mt-0.5 text-sm text-navy-500 dark:text-navy-400">
              {isRTL
                ? `${filteredSuppliers.length} من أصل ${suppliers.length} مورد`
                : `${filteredSuppliers.length} of ${suppliers.length} suppliers`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSuppliers.map((supplier) => {
            const type = supplierTypes[supplier.type];
            const paymentCompletion = supplier.totalPurchases
              ? Math.min(100, Math.round((supplier.totalPaid / supplier.totalPurchases) * 100))
              : 0;

            return (
              <article key={supplier.id} className="card group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="h-1 bg-gradient-to-l from-primary-500 to-blue-400 opacity-80" />
                <div className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                        {supplier.type === 'manufacturer'
                          ? <Factory className="h-6 w-6" />
                          : supplier.type === 'distributor'
                            ? <Truck className="h-6 w-6" />
                            : <Building2 className="h-6 w-6" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-navy-900 dark:text-white">
                          {isRTL ? supplier.nameAr : supplier.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-navy-500">{supplier.code}</span>
                          <span className={cn('badge', type.badge)}>{type[locale]}</span>
                        </div>
                      </div>
                    </div>
                    <span className={cn(
                      'h-2.5 w-2.5 shrink-0 rounded-full ring-4',
                      supplier.isActive
                        ? 'bg-success-500 ring-success-50 dark:ring-success-900/30'
                        : 'bg-navy-300 ring-navy-100 dark:bg-navy-600 dark:ring-navy-800',
                    )} title={supplier.isActive ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')} />
                  </div>

                  <div className="mb-4 flex items-center gap-1" aria-label={`${supplier.rating} / 5`}>
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        className={cn(
                          'h-4 w-4',
                          index < supplier.rating ? 'fill-warning-500 text-warning-500' : 'text-navy-200 dark:text-navy-700',
                        )}
                      />
                    ))}
                    <span className="ms-1 text-xs font-medium text-navy-500">{supplier.rating}.0</span>
                  </div>

                  <div className="mb-4 space-y-2.5 text-sm text-navy-600 dark:text-navy-300">
                    {supplier.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0 text-navy-400" />
                        <span dir="ltr">{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 shrink-0 text-navy-400" />
                        <span className="truncate" dir="ltr">{supplier.email}</span>
                      </div>
                    )}
                    {supplier.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-navy-400" />
                        <span>{supplier.city}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-navy-50 p-3 dark:bg-navy-800/60">
                    <div>
                      <p className="text-xs text-navy-500 dark:text-navy-400">{isRTL ? 'إجمالي المشتريات' : 'Purchases'}</p>
                      <p className="mt-1 truncate text-sm font-semibold text-navy-900 dark:text-white">
                        {formatPrice(supplier.totalPurchases)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-navy-500 dark:text-navy-400">{isRTL ? 'الرصيد المستحق' : 'Balance'}</p>
                      <p className={cn(
                        'mt-1 truncate text-sm font-semibold',
                        supplier.balance > 0 ? 'text-warning-600 dark:text-yellow-400' : 'text-success-600 dark:text-green-400',
                      )}>
                        {formatPrice(supplier.balance)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-navy-500 dark:text-navy-400">{isRTL ? 'نسبة السداد' : 'Payment completion'}</span>
                      <span className="font-medium text-navy-700 dark:text-navy-200">{paymentCompletion}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-navy-100 dark:bg-navy-700">
                      <div
                        className={cn('h-full rounded-full', paymentCompletion === 100 ? 'bg-success-500' : 'bg-warning-500')}
                        style={{ width: `${paymentCompletion}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-navy-100 pt-4 dark:border-navy-700">
                    <div className="text-xs text-navy-500 dark:text-navy-400">
                      <p>{isRTL ? `توريد خلال ${supplier.leadTime} أيام` : `${supplier.leadTime}-day lead time`}</p>
                      {supplier.lastPurchaseDate && (
                        <p className="mt-1">
                          {isRTL ? 'آخر شراء: ' : 'Last purchase: '}
                          {formatDate(supplier.lastPurchaseDate, numberLocale, { year: undefined })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/purchases/new?supplier=${supplier.id}`}
                        className="btn btn-ghost btn-icon btn-sm"
                        title={isRTL ? 'إنشاء أمر شراء' : 'Create purchase order'}
                      >
                        <PackagePlus className="h-4 w-4" />
                      </Link>
                      <Link href={`/suppliers/${supplier.id}`} className="btn btn-ghost btn-icon btn-sm" title={isRTL ? 'عرض' : 'View'}>
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link href={`/suppliers/${supplier.id}/edit`} className="btn btn-ghost btn-icon btn-sm" title={isRTL ? 'تعديل' : 'Edit'}>
                        <Edit3 className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {filteredSuppliers.length === 0 && (
          <div className="card empty-state py-14">
            <UsersRound className="empty-state-icon" />
            <h3 className="empty-state-title">{isRTL ? 'لا يوجد موردون' : 'No suppliers found'}</h3>
            <p className="empty-state-description">
              {isRTL ? 'جرّب تغيير البحث أو عوامل التصفية الحالية.' : 'Try changing the current search or filters.'}
            </p>
            {hasFilters && (
              <button type="button" onClick={resetFilters} className="btn btn-secondary btn-sm mt-4">
                <RotateCcw className="h-4 w-4" />
                {isRTL ? 'مسح عوامل التصفية' : 'Clear filters'}
              </button>
            )}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
