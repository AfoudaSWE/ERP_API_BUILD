import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Customer, DashboardStats, Lead, Product, SalesInvoice, Supplier } from '@/types';
import { mockDashboardStats } from './mock-data';
import { apiGet, apiPageRequest } from './api-client';
import { useAuth } from './auth';

interface ApiData {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  salesInvoices: SalesInvoice[];
  leads: Lead[];
  dashboardStats: DashboardStats;
  dashboardAnalytics: DashboardAnalytics;
  isLoading: boolean;
  isLive: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface DashboardAnalytics {
  salesTrend: { month: string; label: string; sales: number; invoices: number }[];
  payment: { paid: number; outstanding: number };
  topProducts: { id: string; name: string; nameAr: string; sku: string; stock: number; value: number }[];
  topCustomers: { id: string; name: string; nameAr: string; sales: number; balance: number }[];
  purchaseStatus: { status: string; count: number; value: number }[];
  inventoryHealth: { healthy: number; low: number; out: number };
  categorySales: { id: string; name: string; nameAr: string; sales: number; quantity: number }[];
  bestSellers: { id: string; name: string; nameAr: string; sku: string; sales: number; quantity: number; invoiceCount: number }[];
}

const emptyAnalytics: DashboardAnalytics = { salesTrend: [], payment: { paid: 0, outstanding: 0 }, topProducts: [], topCustomers: [], purchaseStatus: [], inventoryHealth: { healthy: 0, low: 0, out: 0 }, categorySales: [], bestSellers: [] };

const ApiDataContext = createContext<ApiData | null>(null);

const productDefaults = {
  description: '', taxInclusive: false, maxStockLevel: 0, wholesalePrice: 0, minSellingPrice: 0,
  weight: 0, images: [], hasVariants: false, trackBatches: false, trackSerials: false, trackExpiry: false,
};

async function loadAllProducts() {
  const first = await apiPageRequest<Partial<Product>>('/products?page=1&pageSize=100');
  const pageCount = Math.ceil(first.total / first.pageSize);
  if (pageCount <= 1) return first.data;
  const remaining = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => apiPageRequest<Partial<Product>>(`/products?page=${index + 2}&pageSize=100`)));
  return [first, ...remaining].flatMap((page) => page.data);
}

export function ApiDataProvider({ children }: { children: ReactNode }) {
  const { can } = useAuth();
  const [live, setLive] = useState<Partial<ApiData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [products, customers, suppliers, salesInvoices, leads, dashboard, dashboardAnalytics] = await Promise.all([
      can('products.read') || can('pos.use') ? loadAllProducts() : Promise.resolve([]),
      can('customers.read') || can('pos.use') ? apiGet<Customer[]>('/customers?pageSize=100') : Promise.resolve([]),
      can('suppliers.read') ? apiGet<Supplier[]>('/suppliers?pageSize=100') : Promise.resolve([]),
      can('sales.read') ? apiGet<Partial<SalesInvoice>[]>('/sales/invoices') : Promise.resolve([]),
      can('crm.read') || can('crm.write') ? apiGet<Lead[]>('/crm/leads?pageSize=100') : Promise.resolve([]),
      can('dashboard.read') ? apiGet<Partial<DashboardStats>>('/dashboard/summary') : Promise.resolve({}),
      can('dashboard.read') ? apiGet<DashboardAnalytics>('/dashboard/analytics') : Promise.resolve(emptyAnalytics),
      ]);
      setLive({
        products: products.map((product) => ({ ...productDefaults, ...product, availableStock: product.totalStock, stockValue: Number(product.totalStock) * Number(product.costPrice) } as Product)),
        customers,
        suppliers,
        salesInvoices: salesInvoices.map((invoice) => ({ items: [], type: 'invoice', currency: 'EGP', exchangeRate: 1, discountType: 'fixed', discountValue: 0, ...invoice } as SalesInvoice)),
        leads,
        dashboardStats: { ...mockDashboardStats, ...dashboard },
        dashboardAnalytics,
      });
      setIsLive(true);
    } catch (requestError) {
      setIsLive(false);
      setError(requestError instanceof Error ? requestError.message : 'Unable to connect to the API');
    } finally {
      setIsLoading(false);
    }
  }, [can]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const value = useMemo<ApiData>(() => ({
    products: live.products ?? [],
    customers: live.customers ?? [],
    suppliers: live.suppliers ?? [],
    salesInvoices: live.salesInvoices ?? [],
    leads: live.leads ?? [],
    dashboardStats: live.dashboardStats ?? mockDashboardStats,
    dashboardAnalytics: live.dashboardAnalytics ?? emptyAnalytics,
    isLoading,
    isLive,
    error,
    refresh,
  }), [live, isLoading, isLive, error, refresh]);

  return <ApiDataContext.Provider value={value}>{children}</ApiDataContext.Provider>;
}

// This colocated hook is the public API for the provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useApiData() {
  const context = useContext(ApiDataContext);
  if (!context) throw new Error('useApiData must be used inside ApiDataProvider');
  return context;
}
