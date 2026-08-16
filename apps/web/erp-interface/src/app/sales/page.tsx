import { useState } from 'react';
import type React from 'react';
import Link from '@/components/router/Link';
import {
  Search, Filter, Plus, Download, Calendar,
  Eye, Printer, MoreHorizontal, FileText,
  CheckCircle, Clock, XCircle, AlertTriangle, CircleDollarSign, Undo2
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useApiData } from '@/lib/api-data';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { apiGet, apiRequest } from '@/lib/api-client';
import type { SalesInvoice } from '@/types';

export default function SalesPage() {
  const { salesInvoices, customers, refresh } = useApiData();
  const { can } = useAuth();
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');
  const [actionInvoice, setActionInvoice] = useState<SalesInvoice | null>(null);
  const [returnItemId, setReturnItemId] = useState('');
  const [actionMode, setActionMode] = useState<'payment' | 'return' | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionSaving, setActionSaving] = useState(false);

  const openReturn = async (invoice: SalesInvoice) => { setActionError(''); try { const detail = await apiGet<SalesInvoice>(`/sales/invoices/${invoice.id}`); setActionInvoice(detail); setReturnItemId(detail.items[0]?.id ?? ''); setActionMode('return'); } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Unable to load invoice'); } };
  const submitAction = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!actionInvoice || !actionMode) return; setActionSaving(true); setActionError(''); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); try { const path = actionMode === 'payment' ? `/sales/invoices/${actionInvoice.id}/payments` : `/sales/invoices/${actionInvoice.id}/returns`; const body = actionMode === 'payment' ? { amount: Number(values.amount).toFixed(2), businessDate: values.businessDate, method: values.method } : { businessDate: values.businessDate, reason: values.reason, items: [{ invoiceItemId: returnItemId, quantity: Number(values.quantity).toFixed(3) }] }; await apiRequest(path, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body) }); await refresh(); setActionMode(null); setActionInvoice(null); } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Action failed'); } finally { setActionSaving(false); } };

  const filteredInvoices = salesInvoices.filter((invoice) => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.customerName && invoice.customerName.includes(searchTerm));
    
    const matchesStatus = !statusFilter || invoice.status === statusFilter;
    const matchesPayment = !paymentFilter || invoice.paymentStatus === paymentFilter;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const formatPrice = (value: number) => formatCurrency(value, 'EGP', locale === 'ar' ? 'ar-EG' : 'en-EG');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'confirmed': return <FileText className="w-4 h-4" />;
      case 'draft': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; labelAr: string; color: string }> = {
      draft: { label: 'Draft', labelAr: 'مسودة', color: 'badge-gray' },
      confirmed: { label: 'Confirmed', labelAr: 'مؤكد', color: 'badge-primary' },
      delivered: { label: 'Delivered', labelAr: 'تم التسليم', color: 'badge-success' },
      paid: { label: 'Paid', labelAr: 'مدفوع', color: 'badge-success' },
      cancelled: { label: 'Cancelled', labelAr: 'ملغي', color: 'badge-danger' },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return { label: locale === 'ar' ? config.labelAr : config.label, color: config.color };
  };

  const getPaymentBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; labelAr: string; color: string }> = {
      paid: { label: 'Paid', labelAr: 'مدفوع', color: 'badge-success' },
      partial: { label: 'Partial', labelAr: 'جزئي', color: 'badge-warning' },
      unpaid: { label: 'Unpaid', labelAr: 'غير مدفوع', color: 'badge-danger' },
    };
    const config = statusConfig[status] || statusConfig.unpaid;
    return { label: locale === 'ar' ? config.labelAr : config.label, color: config.color };
  };

  const stats = {
    total: salesInvoices.length,
    totalAmount: salesInvoices.reduce((sum, inv) => sum + inv.total, 0),
    paidAmount: salesInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
    pendingAmount: salesInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0),
  };

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
              {locale === 'ar' ? 'المبيعات' : 'Sales'}
            </h1>
            <p className="text-navy-500 dark:text-navy-400 mt-1">
              {locale === 'ar' 
                ? 'إدارة فواتير المبيعات وعروض الأسعار' 
                : 'Manage sales invoices and quotations'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-secondary btn-sm">
              <Download className="w-4 h-4" />
              {locale === 'ar' ? 'تصدير' : 'Export'}
            </button>
            <Link href="/sales/new" className={cn('btn btn-primary btn-sm', !can('sales.write') && 'hidden')}>
              <Plus className="w-4 h-4" />
              {locale === 'ar' ? 'فاتورة جديدة' : 'New Invoice'}
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="stat-label">{locale === 'ar' ? 'إجمالي الفواتير' : 'Total Invoices'}</p>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="stat-label">{locale === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</p>
              <p className="stat-value text-lg">{formatPrice(stats.totalAmount)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-50 dark:bg-success-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="stat-label">{locale === 'ar' ? 'المدفوع' : 'Collected'}</p>
              <p className="stat-value text-lg text-success-600">{formatPrice(stats.paidAmount)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card border-s-4 border-s-warning-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning-50 dark:bg-warning-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <p className="stat-label">{locale === 'ar' ? 'المتبقي' : 'Pending'}</p>
              <p className="stat-value text-lg text-warning-600">{formatPrice(stats.pendingAmount)}</p>
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
                placeholder={locale === 'ar' ? 'بحث برقم الفاتورة أو اسم العميل...' : 'Search by invoice number or customer...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input ps-10"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select"
              >
                <option value="">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="draft">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                <option value="confirmed">{locale === 'ar' ? 'مؤكد' : 'Confirmed'}</option>
                <option value="paid">{locale === 'ar' ? 'مدفوع' : 'Paid'}</option>
                <option value="cancelled">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</option>
              </select>
            </div>

            {/* Payment Filter */}
            <div className="w-full md:w-40">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="select"
              >
                <option value="">{locale === 'ar' ? 'كل الدفع' : 'All Payment'}</option>
                <option value="paid">{locale === 'ar' ? 'مدفوع' : 'Paid'}</option>
                <option value="partial">{locale === 'ar' ? 'جزئي' : 'Partial'}</option>
                <option value="unpaid">{locale === 'ar' ? 'غير مدفوع' : 'Unpaid'}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{locale === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</th>
                <th>{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                <th>{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                <th>{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="text-end">{locale === 'ar' ? 'الإجمالي' : 'Total'}</th>
                <th>{locale === 'ar' ? 'الدفع' : 'Payment'}</th>
                <th className="text-end">{locale === 'ar' ? 'المتبقي' : 'Balance'}</th>
                <th className="text-end">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const customer = customers.find(c => c.id === invoice.customerId);
                const statusBadge = getStatusBadge(invoice.status);
                const paymentBadge = getPaymentBadge(invoice.paymentStatus);
                
                return (
                  <tr key={invoice.id}>
                    <td>
                      <Link 
                        href={`/sales/${invoice.id}`}
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                      <div className="mt-1">
                        <span className={cn('badge', invoice.source === 'ecommerce' ? 'badge-primary' : 'badge-gray')}>
                          {invoice.source === 'ecommerce' ? (locale === 'ar' ? 'المتجر' : 'E-commerce') : (invoice.source ?? 'ERP').toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td>
                      {customer ? (
                        <div>
                          <p className="font-medium text-navy-900 dark:text-white">
                            {locale === 'ar' ? customer.nameAr : customer.name}
                          </p>
                          <p className="text-xs text-navy-500">{customer.code}</p>
                        </div>
                      ) : (
                        <span className="text-navy-500">{invoice.customerName || (locale === 'ar' ? 'عميل نقدي' : 'Cash Customer')}</span>
                      )}
                    </td>
                    <td>
                      <span className="text-sm">
                        {formatDate(invoice.invoiceDate, locale === 'ar' ? 'ar-EG' : 'en-EG')}
                      </span>
                    </td>
                    <td>
                      <span className={cn('badge', statusBadge.color)}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="text-end tabular-nums font-semibold">
                      {formatPrice(invoice.total)}
                    </td>
                    <td>
                      <span className={cn('badge', paymentBadge.color)}>
                        {paymentBadge.label}
                      </span>
                    </td>
                    <td className={cn(
                      'text-end tabular-nums font-medium',
                      invoice.remainingAmount > 0 ? 'text-warning-600' : 'text-success-600'
                    )}>
                      {formatPrice(invoice.remainingAmount)}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/sales/${invoice.id}`}
                          className="btn btn-ghost btn-icon btn-sm"
                          title={locale === 'ar' ? 'عرض' : 'View'}
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title={locale === 'ar' ? 'طباعة' : 'Print'}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {can('payments.receive') && invoice.remainingAmount > 0 && <button type="button" onClick={() => { setActionInvoice(invoice); setActionMode('payment'); setActionError(''); }} className="btn btn-ghost btn-icon btn-sm" title={locale === 'ar' ? 'تحصيل' : 'Collect'}><CircleDollarSign className="h-4 w-4" /></button>}
                        {can('sales.refund') && <button type="button" onClick={() => void openReturn(invoice)} className="btn btn-ghost btn-icon btn-sm" title={locale === 'ar' ? 'مرتجع' : 'Return'}><Undo2 className="h-4 w-4" /></button>}
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title={locale === 'ar' ? 'المزيد' : 'More'}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredInvoices.length === 0 && (
          <div className="empty-state py-12">
            <FileText className="empty-state-icon" />
            <h3 className="empty-state-title">
              {locale === 'ar' ? 'لا توجد فواتير' : 'No invoices found'}
            </h3>
            <p className="empty-state-description">
              {locale === 'ar' 
                ? 'لم يتم العثور على فواتير مطابقة للبحث' 
                : 'No invoices match your search criteria'}
            </p>
            <Link href="/sales/new" className={cn('btn btn-primary btn-md mt-4', !can('sales.write') && 'hidden')}>
              <Plus className="w-4 h-4" />
              {locale === 'ar' ? 'إنشاء فاتورة' : 'Create Invoice'}
            </Link>
          </div>
        )}

        {/* Pagination */}
        {filteredInvoices.length > 0 && (
          <div className="px-4 py-3 border-t border-navy-200 dark:border-navy-700 flex items-center justify-between">
            <p className="text-sm text-navy-500">
              {locale === 'ar'
                ? `عرض ${filteredInvoices.length} فاتورة`
                : `Showing ${filteredInvoices.length} invoices`}
            </p>
            <div className="flex items-center gap-2">
              <button className="btn btn-secondary btn-sm" disabled>
                {locale === 'ar' ? 'السابق' : 'Previous'}
              </button>
              <button className="btn btn-primary btn-sm">1</button>
              <button className="btn btn-secondary btn-sm">
                {locale === 'ar' ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>
      {actionMode && actionInvoice && <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/60 p-4"><form onSubmit={submitAction} className="card w-full max-w-md p-5"><h2 className="text-lg font-bold text-navy-900 dark:text-white">{actionMode === 'payment' ? (locale === 'ar' ? 'تحصيل دفعة' : 'Collect payment') : (locale === 'ar' ? 'تسجيل مرتجع' : 'Post return')}</h2><p className="mb-4 mt-1 text-sm text-navy-500">{actionInvoice.invoiceNumber}</p>{actionError && <div role="alert" className="mb-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{actionError}</div>}<label className="label">{locale === 'ar' ? 'التاريخ' : 'Date'}</label><input name="businessDate" type="date" required className="input mb-3" defaultValue={new Date().toISOString().slice(0,10)} />{actionMode === 'payment' ? <><label className="label">{locale === 'ar' ? 'المبلغ' : 'Amount'}</label><input name="amount" type="number" min="0.01" max={actionInvoice.remainingAmount} step="0.01" required className="input mb-3" /><label className="label">{locale === 'ar' ? 'الطريقة' : 'Method'}</label><select name="method" className="select"><option value="cash">{locale === 'ar' ? 'نقدي' : 'Cash'}</option><option value="card">{locale === 'ar' ? 'بطاقة' : 'Card'}</option><option value="bank_transfer">{locale === 'ar' ? 'تحويل' : 'Bank transfer'}</option></select></> : <><label className="label">{locale === 'ar' ? 'البند' : 'Item'}</label><select value={returnItemId} onChange={(event)=>setReturnItemId(event.target.value)} className="select mb-3">{actionInvoice.items.map(item=><option key={item.id} value={item.id}>{item.description}</option>)}</select><label className="label">{locale === 'ar' ? 'الكمية' : 'Quantity'}</label><input name="quantity" type="number" min="0.001" step="0.001" required className="input mb-3" /><label className="label">{locale === 'ar' ? 'السبب' : 'Reason'}</label><input name="reason" required minLength={3} className="input" /></>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setActionMode(null)} className="btn btn-secondary">{locale === 'ar' ? 'إلغاء' : 'Cancel'}</button><button disabled={actionSaving} className="btn btn-primary">{actionSaving ? (locale === 'ar' ? 'جارٍ الحفظ…' : 'Saving…') : (locale === 'ar' ? 'تأكيد' : 'Confirm')}</button></div></form></div>}
    </AppLayout>
  );
}
