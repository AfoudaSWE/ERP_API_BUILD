import Link from '@/components/router/Link';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Users, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopProduct {
  name: string;
  nameAr: string;
  sales: number;
  quantity: number;
  profit: number;
}

interface TopCustomer {
  name: string;
  nameAr: string;
  sales: number;
  orders: number;
  balance: number;
}

interface TopProductsListProps {
  products: TopProduct[];
  locale: 'ar' | 'en';
}

interface TopCustomersListProps {
  customers: TopCustomer[];
  locale: 'ar' | 'en';
}

export function TopProductsList({ products, locale }: TopProductsListProps) {
  const isRTL = locale === 'ar';
  const maxSales = Math.max(...products.map((p) => p.sales));

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-navy-900 dark:text-white">
            {locale === 'ar' ? 'أفضل المنتجات مبيعاً' : 'Top Selling Products'}
          </h3>
        </div>
        <Link
          href="/reports/products"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          {locale === 'ar' ? 'عرض الكل' : 'View all'}
          <ChevronRight className={cn('w-4 h-4', isRTL && 'rotate-180')} />
        </Link>
      </div>
      <div className="divide-y divide-navy-100 dark:divide-navy-700">
        {products.map((product, index) => (
          <div key={product.name} className="p-4 hover:bg-navy-50 dark:hover:bg-navy-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-600">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-navy-900 dark:text-white truncate">
                  {locale === 'ar' ? product.nameAr : product.name}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-navy-500">
                    {product.quantity} {locale === 'ar' ? 'وحدة' : 'units'}
                  </span>
                  <span className="text-xs text-success-600">
                    {locale === 'ar' ? 'ربح:' : 'Profit:'} {formatCurrency(product.profit, 'EGP', locale === 'ar' ? 'ar-EG' : 'en-EG')}
                  </span>
                </div>
              </div>
              <div className="text-end">
                <p className="font-semibold text-navy-900 dark:text-white tabular-nums">
                  {formatCurrency(product.sales, 'EGP', locale === 'ar' ? 'ar-EG' : 'en-EG')}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-navy-100 dark:bg-navy-700 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-primary-500 transition-all duration-500"
                  style={{ width: `${(product.sales / maxSales) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopCustomersList({ customers, locale }: TopCustomersListProps) {
  const isRTL = locale === 'ar';
  const maxSales = Math.max(...customers.map((c) => c.sales));

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-success-600" />
          <h3 className="font-semibold text-navy-900 dark:text-white">
            {locale === 'ar' ? 'أفضل العملاء' : 'Top Customers'}
          </h3>
        </div>
        <Link
          href="/reports/customers"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          {locale === 'ar' ? 'عرض الكل' : 'View all'}
          <ChevronRight className={cn('w-4 h-4', isRTL && 'rotate-180')} />
        </Link>
      </div>
      <div className="divide-y divide-navy-100 dark:divide-navy-700">
        {customers.map((customer, index) => (
          <div key={customer.name} className="p-4 hover:bg-navy-50 dark:hover:bg-navy-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center text-sm font-bold text-success-600">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-navy-900 dark:text-white truncate">
                  {locale === 'ar' ? customer.nameAr : customer.name}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-navy-500">
                    {customer.orders} {locale === 'ar' ? 'طلب' : 'orders'}
                  </span>
                  {customer.balance > 0 && (
                    <span className="text-xs text-warning-600">
                      {locale === 'ar' ? 'رصيد:' : 'Balance:'} {formatCurrency(customer.balance, 'EGP', locale === 'ar' ? 'ar-EG' : 'en-EG')}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-end">
                <p className="font-semibold text-navy-900 dark:text-white tabular-nums">
                  {formatCurrency(customer.sales, 'EGP', locale === 'ar' ? 'ar-EG' : 'en-EG')}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-navy-100 dark:bg-navy-700 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-success-500 transition-all duration-500"
                  style={{ width: `${(customer.sales / maxSales) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
