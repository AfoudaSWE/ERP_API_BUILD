import { useEffect, useState } from 'react';
import Link from '@/components/router/Link';
import {
  Search, Filter, Plus, Download, Upload, MoreHorizontal,
  Edit, Trash2, Eye, Package, AlertTriangle, ChevronDown
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn, formatCurrency, getStatusColor } from '@/lib/utils';
import { apiGet } from '@/lib/api-client';
import { useApiData } from '@/lib/api-data';
import type { Product } from '@/types';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

export default function ProductsPage() {
  const { products } = useApiData();
  const { can } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; nameAr: string; type: string }[]>([]);

  useEffect(() => {
    let active = true;
    void apiGet<{ id: string; name: string; nameAr: string; type: string }[]>('/categories?pageSize=100').then((rows) => { if (active) setCategories(rows); });
    return () => { active = false; };
  }, []);

  const isRTL = locale === 'ar';

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.nameAr.includes(searchTerm) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchTerm));
    
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const formatPrice = (value: number) => formatCurrency(value, 'EGP', locale === 'ar' ? 'ar-EG' : 'en-EG');

  const getStockStatus = (product: Product) => {
    const stock = product.totalStock || 0;
    if (stock === 0) return { label: locale === 'ar' ? 'نفاد' : 'Out', color: 'badge-danger' };
    if (stock <= product.minStockLevel) return { label: locale === 'ar' ? 'منخفض' : 'Low', color: 'badge-warning' };
    return { label: locale === 'ar' ? 'متوفر' : 'In Stock', color: 'badge-success' };
  };

  const stats = {
    total: products.length,
    active: products.filter(p => p.isActive).length,
    lowStock: products.filter(p => (p.totalStock || 0) <= p.minStockLevel && (p.totalStock || 0) > 0).length,
    outOfStock: products.filter(p => (p.totalStock || 0) === 0).length,
  };

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
              {locale === 'ar' ? 'المنتجات' : 'Products'}
            </h1>
            <p className="text-navy-500 dark:text-navy-400 mt-1">
              {locale === 'ar' 
                ? `إدارة ${stats.total} منتج في المخزون` 
                : `Manage ${stats.total} products in inventory`}
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
            <Link href="/products/new" className={cn('btn btn-primary btn-sm', !can('products.write') && 'hidden')}>
              <Plus className="w-4 h-4" />
              {locale === 'ar' ? 'منتج جديد' : 'Add Product'}
            </Link>
          </div>
        </div>
      </div>

      <div className="card mb-6 grid grid-cols-2 divide-x divide-y overflow-hidden md:grid-cols-4 md:divide-y-0">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Package className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="stat-label">{locale === 'ar' ? 'إجمالي المنتجات' : 'Total Products'}</p>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-50 dark:bg-success-900/30 rounded-lg">
              <Package className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="stat-label">{locale === 'ar' ? 'منتجات نشطة' : 'Active'}</p>
              <p className="stat-value">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning-50 dark:bg-warning-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <p className="stat-label">{locale === 'ar' ? 'مخزون منخفض' : 'Low Stock'}</p>
              <p className="stat-value text-warning-600">{stats.lowStock}</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-danger-50 dark:bg-danger-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-danger-600" />
            </div>
            <div>
              <p className="stat-label">{locale === 'ar' ? 'نفاد المخزون' : 'Out of Stock'}</p>
              <p className="stat-value text-danger-600">{stats.outOfStock}</p>
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
                placeholder={locale === 'ar' ? 'بحث بالاسم، الكود، أو الباركود...' : 'Search by name, SKU, or barcode...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input ps-10"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="select"
              >
                <option value="">{locale === 'ar' ? 'كل الفئات' : 'All Categories'}</option>
                {categories.filter(c => c.type === 'product').map((category) => (
                  <option key={category.id} value={category.id}>
                    {locale === 'ar' ? category.nameAr : category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* More Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary btn-sm"
            >
              <Filter className="w-4 h-4" />
              {locale === 'ar' ? 'تصفية' : 'Filters'}
              <ChevronDown className={cn('w-4 h-4 transition-transform', showFilters && 'rotate-180')} />
            </button>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-navy-200 dark:border-navy-700">
              <div>
                <label className="label">{locale === 'ar' ? 'حالة المخزون' : 'Stock Status'}</label>
                <select className="select">
                  <option value="">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="in_stock">{locale === 'ar' ? 'متوفر' : 'In Stock'}</option>
                  <option value="low_stock">{locale === 'ar' ? 'منخفض' : 'Low Stock'}</option>
                  <option value="out_of_stock">{locale === 'ar' ? 'نفاد' : 'Out of Stock'}</option>
                </select>
              </div>
              <div>
                <label className="label">{locale === 'ar' ? 'العلامة التجارية' : 'Brand'}</label>
                <select className="select">
                  <option value="">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="apple">Apple</option>
                  <option value="samsung">Samsung</option>
                  <option value="sony">Sony</option>
                </select>
              </div>
              <div>
                <label className="label">{locale === 'ar' ? 'نوع المنتج' : 'Product Type'}</label>
                <select className="select">
                  <option value="">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="product">{locale === 'ar' ? 'منتج' : 'Product'}</option>
                  <option value="service">{locale === 'ar' ? 'خدمة' : 'Service'}</option>
                  <option value="bundle">{locale === 'ar' ? 'حزمة' : 'Bundle'}</option>
                </select>
              </div>
              <div>
                <label className="label">{locale === 'ar' ? 'الحالة' : 'Status'}</label>
                <select className="select">
                  <option value="">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
                  <option value="inactive">{locale === 'ar' ? 'غير نشط' : 'Inactive'}</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{locale === 'ar' ? 'المنتج' : 'Product'}</th>
                <th>{locale === 'ar' ? 'الكود' : 'SKU'}</th>
                <th>{locale === 'ar' ? 'الفئة' : 'Category'}</th>
                <th className="text-end">{locale === 'ar' ? 'سعر التكلفة' : 'Cost'}</th>
                <th className="text-end">{locale === 'ar' ? 'سعر البيع' : 'Price'}</th>
                <th className="text-end">{locale === 'ar' ? 'المخزون' : 'Stock'}</th>
                <th>{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="text-end">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const category = categories.find(c => c.id === product.categoryId);
                const stockStatus = getStockStatus(product);
                
                return (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-navy-100 dark:bg-navy-800 flex items-center justify-center">
                          <Package className="w-5 h-5 text-navy-400" />
                        </div>
                        <div>
                          <p className="font-medium text-navy-900 dark:text-white">
                            {locale === 'ar' ? product.nameAr : product.name}
                          </p>
                          {product.brand && (
                            <p className="text-xs text-navy-500">{product.brand}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-sm">{product.sku}</span>
                    </td>
                    <td>
                      {category && (
                        <span className="badge badge-gray">
                          {locale === 'ar' ? category.nameAr : category.name}
                        </span>
                      )}
                    </td>
                    <td className="text-end tabular-nums">
                      {formatPrice(product.costPrice)}
                    </td>
                    <td className="text-end tabular-nums font-medium">
                      {formatPrice(product.sellingPrice)}
                    </td>
                    <td className="text-end">
                      <span className={cn(
                        'font-semibold tabular-nums',
                        (product.totalStock || 0) === 0 && 'text-danger-600',
                        (product.totalStock || 0) <= product.minStockLevel && (product.totalStock || 0) > 0 && 'text-warning-600'
                      )}>
                        {product.totalStock || 0}
                      </span>
                      <span className="text-navy-400 text-xs ms-1">{product.unit}</span>
                    </td>
                    <td>
                      <span className={cn('badge', stockStatus.color)}>
                        {stockStatus.label}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/products/${product.id}`}
                          className="btn btn-ghost btn-icon btn-sm"
                          title={locale === 'ar' ? 'عرض' : 'View'}
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/products/${product.id}/edit`}
                          className="btn btn-ghost btn-icon btn-sm"
                          title={locale === 'ar' ? 'تعديل' : 'Edit'}
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          className="btn btn-ghost btn-icon btn-sm text-danger-600 hover:bg-danger-50"
                          title={locale === 'ar' ? 'حذف' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-navy-200 dark:border-navy-700 flex items-center justify-between">
          <p className="text-sm text-navy-500">
            {locale === 'ar'
              ? `عرض ${filteredProducts.length} من ${products.length} منتج`
              : `Showing ${filteredProducts.length} of ${products.length} products`}
          </p>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary btn-sm" disabled>
              {locale === 'ar' ? 'السابق' : 'Previous'}
            </button>
            <button className="btn btn-primary btn-sm">1</button>
            <button className="btn btn-secondary btn-sm">2</button>
            <button className="btn btn-secondary btn-sm">
              {locale === 'ar' ? 'التالي' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
