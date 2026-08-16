import { useState } from 'react';
import Link from '@/components/router/Link';
import {
  Search, Filter, Plus, Download, Upload,
  Edit, Trash2, Eye, Users, Phone, Mail,
  Building2, CreditCard, ChevronDown, AlertTriangle
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn, formatCurrency } from '@/lib/utils';
import { useApiData } from '@/lib/api-data';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';

export default function CustomersPage() {
  const { customers } = useApiData();
  const { can } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.nameAr.includes(searchTerm) ||
      customer.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone && customer.phone.includes(searchTerm));
    
    const matchesType = !selectedType || customer.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const formatPrice = (value: number) => formatCurrency(value, 'EGP', locale === 'ar' ? 'ar-EG' : 'en-EG');

  const customerTypes = [
    { value: 'retail', labelAr: 'تجزئة', label: 'Retail' },
    { value: 'wholesale', labelAr: 'جملة', label: 'Wholesale' },
    { value: 'distributor', labelAr: 'موزع', label: 'Distributor' },
    { value: 'corporate', labelAr: 'شركات', label: 'Corporate' },
  ];

  const getTypeLabel = (type: string) => {
    const typeObj = customerTypes.find(t => t.value === type);
    return locale === 'ar' ? typeObj?.labelAr : typeObj?.label;
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'retail': return 'badge-gray';
      case 'wholesale': return 'badge-primary';
      case 'distributor': return 'badge-success';
      case 'corporate': return 'badge-ai';
      default: return 'badge-gray';
    }
  };

  const stats = {
    total: customers.length,
    totalSales: customers.reduce((sum, c) => sum + c.totalSales, 0),
    totalBalance: customers.reduce((sum, c) => sum + c.balance, 0),
    overdueCount: customers.filter(c => c.balance > 0).length,
  };

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
              {locale === 'ar' ? 'العملاء' : 'Customers'}
            </h1>
            <p className="text-navy-500 dark:text-navy-400 mt-1">
              {locale === 'ar' 
                ? `إدارة ${stats.total} عميل` 
                : `Manage ${stats.total} customers`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-secondary btn-sm">
              <Upload className="w-4 h-4" />
              {locale === 'ar' ? 'استيراد' : 'Import'}
            </button>
            <button className="btn btn-secondary btn-sm">
              <Download className="w-4 h-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </button>
            <Link href="/customers/new" className={cn('btn btn-primary btn-sm', !can('customers.create') && !can('customers.write') && 'hidden')}>
              <Plus className="w-4 h-4" />
              {locale === 'ar' ? 'عميل جديد' : 'Add Customer'}
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="stat-label">{locale === 'ar' ? 'إجمالي العملاء' : 'Total Customers'}</p>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-50 dark:bg-success-900/30 rounded-lg">
              <CreditCard className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="stat-label">{locale === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</p>
              <p className="stat-value text-lg">{formatPrice(stats.totalSales)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card border-s-4 border-s-warning-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning-50 dark:bg-warning-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <p className="stat-label">{locale === 'ar' ? 'إجمالي المديونية' : 'Total Balance'}</p>
              <p className="stat-value text-lg text-warning-600">{formatPrice(stats.totalBalance)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="stat-label">{locale === 'ar' ? 'عملاء مدينون' : 'With Balance'}</p>
              <p className="stat-value">{stats.overdueCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث بالاسم، الكود، أو الهاتف...' : 'Search by name, code, or phone...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input ps-10"
              />
            </div>

            {/* Type Filter */}
            <div className="w-full md:w-48">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="select"
              >
                <option value="">{locale === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
                {customerTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {locale === 'ar' ? type.labelAr : type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <div key={customer.id} className="card hover:shadow-md transition-shadow">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-600">
                      {(locale === 'ar' ? customer.nameAr : customer.name).charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900 dark:text-white">
                      {locale === 'ar' ? customer.nameAr : customer.name}
                    </h3>
                    <p className="text-sm text-navy-500">{customer.code}</p>
                  </div>
                </div>
                <span className={cn('badge', getTypeBadgeColor(customer.type))}>
                  {getTypeLabel(customer.type)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-navy-600 dark:text-navy-300">
                    <Phone className="w-4 h-4 text-navy-400" />
                    <span dir="ltr">{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-navy-600 dark:text-navy-300">
                    <Mail className="w-4 h-4 text-navy-400" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.city && (
                  <div className="flex items-center gap-2 text-sm text-navy-600 dark:text-navy-300">
                    <Building2 className="w-4 h-4 text-navy-400" />
                    <span>{customer.city}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-navy-100 dark:border-navy-700">
                <div>
                  <p className="text-xs text-navy-500">{locale === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</p>
                  <p className="font-semibold text-navy-900 dark:text-white tabular-nums">
                    {formatPrice(customer.totalSales)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-navy-500">{locale === 'ar' ? 'الرصيد' : 'Balance'}</p>
                  <p className={cn(
                    'font-semibold tabular-nums',
                    customer.balance > 0 ? 'text-warning-600' : 'text-success-600'
                  )}>
                    {formatPrice(customer.balance)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1 mt-4 pt-3 border-t border-navy-100 dark:border-navy-700">
                <Link
                  href={`/customers/${customer.id}`}
                  className="btn btn-ghost btn-sm"
                >
                  <Eye className="w-4 h-4" />
                  {locale === 'ar' ? 'عرض' : 'View'}
                </Link>
                <Link
                  href={`/customers/${customer.id}/edit`}
                  className="btn btn-ghost btn-sm"
                >
                  <Edit className="w-4 h-4" />
                  {locale === 'ar' ? 'تعديل' : 'Edit'}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCustomers.length === 0 && (
        <div className="empty-state">
          <Users className="empty-state-icon" />
          <h3 className="empty-state-title">
            {locale === 'ar' ? 'لا يوجد عملاء' : 'No customers found'}
          </h3>
          <p className="empty-state-description">
            {locale === 'ar' 
              ? 'لم يتم العثور على عملاء مطابقين للبحث' 
              : 'No customers match your search criteria'}
          </p>
        </div>
      )}
    </AppLayout>
  );
}
