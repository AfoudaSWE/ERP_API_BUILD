import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Link from '@/components/router/Link';
import { ArrowRight, CheckCircle2, ChevronLeft, Edit3, FileText, Package, Plus, Save, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { formatCurrency, formatDate } from '@/lib/utils';
import { apiGet, apiRequest } from '@/lib/api-client';
import { useApiData } from '@/lib/api-data';
import { useAuth } from '@/lib/auth';

export type EntityModule = 'sales' | 'products' | 'customers' | 'suppliers' | 'purchases' | 'expenses' | 'employees' | 'leads' | 'inventory';

type Field = {
  name: string;
  ar: string;
  en: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
};

type ModuleConfig = {
  ar: string;
  en: string;
  singularAr: string;
  singularEn: string;
  base: string;
  fields: Field[];
};

const productCategories: { id: string; nameAr: string }[] = [];
const expenseCategories: { id: string; nameAr: string }[] = [];
const emptyOptions: { id: string; nameAr: string }[] = [];

const configs: Record<EntityModule, ModuleConfig> = {
  sales: {
    ar: 'المبيعات', en: 'Sales', singularAr: 'فاتورة مبيعات', singularEn: 'Sales invoice', base: '/sales',
    fields: [
      { name: 'customer', ar: 'العميل', en: 'Customer', type: 'select', required: true, options: emptyOptions.map((item) => ({ value: item.id, label: item.nameAr })) },
      { name: 'invoiceDate', ar: 'تاريخ الفاتورة', en: 'Invoice date', type: 'date', required: true },
      { name: 'dueDate', ar: 'تاريخ الاستحقاق', en: 'Due date', type: 'date' },
      { name: 'warehouse', ar: 'المخزن', en: 'Warehouse', type: 'select', options: emptyOptions.map((item) => ({ value: item.id, label: item.nameAr })) },
      { name: 'notes', ar: 'ملاحظات', en: 'Notes', type: 'textarea' },
    ],
  },
  products: {
    ar: 'المنتجات', en: 'Products', singularAr: 'منتج', singularEn: 'Product', base: '/products',
    fields: [
      { name: 'nameAr', ar: 'اسم المنتج بالعربية', en: 'Arabic name', required: true },
      { name: 'name', ar: 'اسم المنتج بالإنجليزية', en: 'English name', required: true },
      { name: 'sku', ar: 'كود الصنف', en: 'SKU', required: true },
      { name: 'categoryId', ar: 'الفئة', en: 'Category', type: 'select', required: true, options: productCategories.map((item) => ({ value: item.id, label: item.nameAr })) },
      { name: 'costPrice', ar: 'سعر التكلفة', en: 'Cost price', type: 'number', required: true },
      { name: 'sellingPrice', ar: 'سعر البيع', en: 'Selling price', type: 'number', required: true },
      { name: 'minStock', ar: 'الحد الأدنى للمخزون', en: 'Minimum stock', type: 'number' },
    ],
  },
  customers: {
    ar: 'العملاء', en: 'Customers', singularAr: 'عميل', singularEn: 'Customer', base: '/customers',
    fields: [
      { name: 'nameAr', ar: 'الاسم بالعربية', en: 'Arabic name', required: true },
      { name: 'name', ar: 'الاسم بالإنجليزية', en: 'English name', required: true },
      { name: 'code', ar: 'كود العميل', en: 'Customer code', required: true },
      { name: 'type', ar: 'نوع العميل', en: 'Customer type', type: 'select', options: [{ value: 'retail', label: 'تجزئة' }, { value: 'wholesale', label: 'جملة' }, { value: 'corporate', label: 'شركات' }] },
      { name: 'phone', ar: 'الهاتف', en: 'Phone', type: 'tel' },
      { name: 'email', ar: 'البريد الإلكتروني', en: 'Email', type: 'email' },
      { name: 'creditLimit', ar: 'الحد الائتماني', en: 'Credit limit', type: 'number' },
    ],
  },
  suppliers: {
    ar: 'الموردون', en: 'Suppliers', singularAr: 'مورد', singularEn: 'Supplier', base: '/suppliers',
    fields: [
      { name: 'nameAr', ar: 'اسم المورد بالعربية', en: 'Arabic name', required: true },
      { name: 'name', ar: 'اسم المورد بالإنجليزية', en: 'English name', required: true },
      { name: 'code', ar: 'كود المورد', en: 'Supplier code', required: true },
      { name: 'type', ar: 'نوع المورد', en: 'Supplier type', type: 'select', options: [{ value: 'supplier', label: 'مورد' }, { value: 'manufacturer', label: 'مصنّع' }, { value: 'distributor', label: 'موزّع' }] },
      { name: 'phone', ar: 'الهاتف', en: 'Phone', type: 'tel' },
      { name: 'email', ar: 'البريد الإلكتروني', en: 'Email', type: 'email' },
      { name: 'paymentTerms', ar: 'مهلة السداد بالأيام', en: 'Payment terms', type: 'number' },
      { name: 'leadTime', ar: 'مدة التوريد بالأيام', en: 'Lead time', type: 'number' },
    ],
  },
  purchases: {
    ar: 'المشتريات', en: 'Purchases', singularAr: 'أمر شراء', singularEn: 'Purchase order', base: '/purchases',
    fields: [
      { name: 'supplier', ar: 'المورد', en: 'Supplier', type: 'select', required: true, options: emptyOptions.map((item) => ({ value: item.id, label: item.nameAr })) },
      { name: 'orderDate', ar: 'تاريخ الأمر', en: 'Order date', type: 'date', required: true },
      { name: 'expectedDate', ar: 'تاريخ التوريد المتوقع', en: 'Expected delivery', type: 'date' },
      { name: 'warehouse', ar: 'مخزن الاستلام', en: 'Receiving warehouse', type: 'select', options: emptyOptions.map((item) => ({ value: item.id, label: item.nameAr })) },
      { name: 'notes', ar: 'شروط وملاحظات', en: 'Terms and notes', type: 'textarea' },
    ],
  },
  expenses: {
    ar: 'المصروفات', en: 'Expenses', singularAr: 'مصروف', singularEn: 'Expense', base: '/expenses',
    fields: [
      { name: 'description', ar: 'بيان المصروف', en: 'Description', required: true },
      { name: 'category', ar: 'الفئة', en: 'Category', type: 'select', required: true, options: expenseCategories.map((item) => ({ value: item.id, label: item.nameAr })) },
      { name: 'date', ar: 'التاريخ', en: 'Date', type: 'date', required: true },
      { name: 'amount', ar: 'المبلغ قبل الضريبة', en: 'Amount before tax', type: 'number', required: true },
      { name: 'tax', ar: 'الضريبة', en: 'Tax', type: 'number' },
      { name: 'payment', ar: 'طريقة السداد', en: 'Payment method', type: 'select', options: [{ value: 'cash', label: 'نقدي' }, { value: 'bank_transfer', label: 'تحويل بنكي' }, { value: 'card', label: 'بطاقة' }, { value: 'check', label: 'شيك' }] },
      { name: 'notes', ar: 'ملاحظات', en: 'Notes', type: 'textarea' },
    ],
  },
  employees: {
    ar: 'الموظفون', en: 'Employees', singularAr: 'موظف', singularEn: 'Employee', base: '/hr',
    fields: [
      { name: 'nameAr', ar: 'الاسم بالعربية', en: 'Arabic name', required: true },
      { name: 'name', ar: 'الاسم بالإنجليزية', en: 'English name', required: true },
      { name: 'employeeCode', ar: 'كود الموظف', en: 'Employee code', required: true },
      { name: 'nationalId', ar: 'الرقم القومي', en: 'National ID', required: true },
      { name: 'phone', ar: 'الهاتف', en: 'Phone', type: 'tel' },
      { name: 'email', ar: 'البريد الإلكتروني', en: 'Email', type: 'email' },
      { name: 'jobTitle', ar: 'المسمى الوظيفي', en: 'Job title', required: true },
      { name: 'baseSalary', ar: 'الراتب الأساسي', en: 'Base salary', type: 'number', required: true },
      { name: 'hireDate', ar: 'تاريخ التعيين', en: 'Hire date', type: 'date', required: true },
    ],
  },
  leads: {
    ar: 'العملاء المحتملون', en: 'Leads', singularAr: 'عميل محتمل', singularEn: 'Lead', base: '/crm',
    fields: [
      { name: 'nameAr', ar: 'الاسم بالعربية', en: 'Arabic name', required: true },
      { name: 'name', ar: 'الاسم بالإنجليزية', en: 'English name', required: true },
      { name: 'company', ar: 'الشركة', en: 'Company' },
      { name: 'phone', ar: 'الهاتف', en: 'Phone', type: 'tel' },
      { name: 'email', ar: 'البريد الإلكتروني', en: 'Email', type: 'email' },
      { name: 'value', ar: 'القيمة المتوقعة', en: 'Expected value', type: 'number' },
      { name: 'probability', ar: 'احتمالية الإغلاق %', en: 'Close probability %', type: 'number' },
      { name: 'expectedDate', ar: 'تاريخ الإغلاق المتوقع', en: 'Expected close date', type: 'date' },
      { name: 'notes', ar: 'ملاحظات', en: 'Notes', type: 'textarea' },
    ],
  },
  inventory: {
    ar: 'المخزون', en: 'Inventory', singularAr: 'تسوية مخزون', singularEn: 'Stock adjustment', base: '/inventory',
    fields: [
      { name: 'product', ar: 'المنتج', en: 'Product', type: 'select', required: true, options: emptyOptions.map((item) => ({ value: item.id, label: item.nameAr })) },
      { name: 'warehouse', ar: 'المخزن', en: 'Warehouse', type: 'select', required: true, options: emptyOptions.map((item) => ({ value: item.id, label: item.nameAr })) },
      { name: 'quantity', ar: 'الكمية', en: 'Quantity', type: 'number', required: true },
      { name: 'reason', ar: 'سبب التسوية', en: 'Adjustment reason', type: 'select', required: true, options: [{ value: 'count', label: 'جرد فعلي' }, { value: 'damage', label: 'تالف' }, { value: 'correction', label: 'تصحيح رصيد' }] },
      { name: 'notes', ar: 'ملاحظات', en: 'Notes', type: 'textarea' },
    ],
  },
};

function getRecord(module: EntityModule, id?: string) {
  void module; void id;
  return undefined;
}

function displayValue(value: unknown) {
  if (typeof value === 'number') return new Intl.NumberFormat('ar-EG').format(value);
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  if (Array.isArray(value)) return `${value.length} عناصر`;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value, 'ar-EG');
  return typeof value === 'string' ? value : '—';
}

export function EntityRoutePage({ module, segments }: { module: EntityModule; segments: string[] }) {
  const navigate = useNavigate();
  const { products, customers, suppliers, salesInvoices, leads, refresh } = useApiData();
  const { can } = useAuth();
  const config = configs[module];
  const isNew = segments.includes('new');
  const isEdit = segments.at(-1) === 'edit';
  const isMovements = segments.at(-1) === 'movements';
  const id = isEdit ? segments.at(-2) : segments[0];
  const apiCollections: Partial<Record<EntityModule, readonly Record<string, unknown>[]>> = {
    sales: salesInvoices as unknown as Record<string, unknown>[],
    products: products as unknown as Record<string, unknown>[],
    customers: customers as unknown as Record<string, unknown>[],
    suppliers: suppliers as unknown as Record<string, unknown>[],
    inventory: products as unknown as Record<string, unknown>[],
    leads: leads as unknown as Record<string, unknown>[],
  };
  const record = apiCollections[module]?.find((item) => item.id === id) ?? getRecord(module, id);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string; nameAr: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(String(record?.categoryId ?? ''));
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  useEffect(() => {
    if (module !== 'products' || (!isNew && !isEdit)) return;
    let active = true;
    void apiGet<{ id: string; name: string; nameAr: string }[]>('/categories?pageSize=100')
      .then((rows) => { if (active) setCategories(rows); })
      .catch((error: unknown) => { if (active) setSaveError(error instanceof Error ? error.message : 'Unable to load categories'); });
    return () => { active = false; };
  }, [isEdit, isNew, module]);

  const formTitle = isEdit ? `تعديل ${config.singularAr}` : `إضافة ${config.singularAr} جديد`;
  const defaultValues = useMemo(() => record ?? {}, [record]);

  const actionPermission = ['products', 'customers', 'suppliers'].includes(module) ? `${module}.${isEdit ? 'update' : 'create'}` : module === 'sales' ? 'sales.create' : module === 'leads' ? 'crm.write' : '';
  const legacyPermission = ['products', 'customers', 'suppliers'].includes(module) ? `${module}.write` : module === 'sales' ? 'sales.write' : '';
  if ((isNew || isEdit) && actionPermission && !can(actionPermission) && !can(legacyPermission)) {
    return <AppLayout><div className="card p-8 text-center"><h1 className="text-xl font-bold text-navy-900 dark:text-white">Permission denied</h1><p className="mt-2 text-navy-500">Your role does not include {actionPermission}.</p><Link href={config.base} className="btn btn-primary btn-sm mt-5">Back</Link></div></AppLayout>;
  }

  if (isNew || isEdit || (module === 'inventory' && segments.join('/') === 'adjustments/new')) {
    const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!['products', 'customers', 'suppliers', 'leads'].includes(module)) {
        setSaveError('This form is not connected to an API endpoint yet.');
        return;
      }
      setSaving(true);
      setSaveError(null);
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const numberValue = (key: string) => values[key] === '' || values[key] === undefined ? 0 : Number(values[key]);
      try {
        let payload: Record<string, unknown>;
        if (module === 'products') {
          payload = { name: values.name, nameAr: values.nameAr, sku: values.sku, categoryId: values.categoryId, costPrice: numberValue('costPrice'), sellingPrice: numberValue('sellingPrice'), minStockLevel: numberValue('minStock'), reorderLevel: numberValue('minStock'), unit: 'piece', type: 'product', taxRate: 14, isActive: true };
        } else if (module === 'customers') {
          payload = { name: values.name, nameAr: values.nameAr, code: values.code, type: values.type || 'retail', phone: values.phone || undefined, email: values.email || undefined, creditLimit: numberValue('creditLimit'), paymentTerms: 0, tags: [], isActive: true };
        } else if (module === 'suppliers') {
          payload = { name: values.name, nameAr: values.nameAr, code: values.code, type: values.type || 'supplier', phone: values.phone || undefined, email: values.email || undefined, paymentTerms: numberValue('paymentTerms'), leadTime: numberValue('leadTime'), rating: 0, tags: [], isActive: true };
        } else {
          payload = { name: values.name, nameAr: values.nameAr, company: values.company || undefined, phone: values.phone || undefined, email: values.email || undefined, value: numberValue('value'), probability: numberValue('probability'), expectedCloseDate: values.expectedDate || undefined, notes: values.notes || undefined, status: 'new', source: 'other', tags: [] };
        }
        const path = module === 'leads' ? '/crm/leads' : `/${module}`;
        await apiRequest(`${path}${isEdit ? `/${id}` : ''}`, { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
        await refresh();
        setSaved(true);
        navigate(config.base);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Unable to save the record');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } finally {
        setSaving(false);
      }
    };

    const createCategory = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setCategorySaving(true);
      setCategoryError(null);
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      try {
        const created = await apiRequest<{ id: string; name: string; nameAr: string }>('/categories', {
          method: 'POST',
          body: JSON.stringify({ name: values.name, nameAr: values.nameAr, type: 'product', isActive: true }),
        });
        setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedCategoryId(created.id);
        setShowCategoryModal(false);
      } catch (error) {
        setCategoryError(error instanceof Error ? error.message : 'Unable to create category');
      } finally {
        setCategorySaving(false);
      }
    };

    return (
      <AppLayout>
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center gap-2 text-sm text-navy-500">
            <Link href={config.base} className="hover:text-primary-600">{config.ar}</Link>
            <ChevronLeft className="h-4 w-4" />
            <span className="text-navy-800 dark:text-navy-200">{formTitle}</span>
          </div>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h1 className="text-2xl font-bold text-navy-900 dark:text-white">{formTitle}</h1><p className="mt-1 text-navy-500 dark:text-navy-400">أدخل البيانات المطلوبة، والحقول المميزة بنجمة إلزامية.</p></div>
            <Link href={config.base} className="btn btn-secondary btn-sm"><ArrowRight className="h-4 w-4" />العودة</Link>
          </div>
          {saved && <div role="status" className="mb-5 flex items-center gap-3 rounded-xl border border-success-500/30 bg-success-50 p-4 text-success-700 dark:bg-success-900/20 dark:text-green-300"><CheckCircle2 className="h-5 w-5" />تم حفظ البيانات محلياً بنجاح. يمكن ربط النموذج بواجهة API لاحقاً.</div>}
          {saveError && <div role="alert" className="mb-5 rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-danger-700 dark:bg-danger-900/20 dark:text-red-300">{saveError}</div>}
          {saving && <div role="status" className="mb-5 rounded-xl border border-primary-500/30 bg-primary-50 p-4 text-primary-700">Saving to API…</div>}
          <form onSubmit={submit} className="card">
            <div className="card-header"><h2 className="font-semibold text-navy-900 dark:text-white">البيانات الأساسية</h2></div>
            <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
              {config.fields.map((field) => {
                const value = defaultValues[field.name];
                const common = { id: field.name, name: field.name, required: field.required, defaultValue: typeof value === 'string' || typeof value === 'number' ? value : undefined };
                if (module === 'products' && field.name === 'categoryId') {
                  return <div key={field.name}><label htmlFor="categoryId" className="label">الفئة<span className="ms-1 text-danger-500">*</span></label><div className="flex gap-2"><select id="categoryId" name="categoryId" required className="select flex-1" value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)}><option value="">اختر الفئة</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.nameAr || category.name}</option>)}</select><button type="button" className="btn btn-secondary btn-sm shrink-0" onClick={() => setShowCategoryModal(true)}><Plus className="h-4 w-4" />إضافة فئة</button></div>{categories.length === 0 && <p className="mt-1 text-xs text-navy-500">لا توجد فئات بعد. أضف أول فئة للمنتجات.</p>}</div>;
                }
                return <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}><label htmlFor={field.name} className="label">{field.ar}{field.required && <span className="ms-1 text-danger-500">*</span>}</label>{field.type === 'select' ? <select {...common} className="select"><option value="">اختر {field.ar}</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea {...common} rows={4} className="input" /> : <input {...common} type={field.type ?? 'text'} min={field.type === 'number' ? 0 : undefined} className="input" placeholder={field.placeholder} />}</div>;
              })}
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-navy-200 p-5 dark:border-navy-700 sm:flex-row sm:justify-end"><Link href={config.base} className="btn btn-secondary btn-md">إلغاء</Link><button type="submit" className="btn btn-primary btn-md" disabled={saving}><Save className="h-4 w-4" />{saving ? 'جارٍ الحفظ…' : `حفظ ${config.singularAr}`}</button></div>
          </form>
          {showCategoryModal && <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="new-category-title"><form onSubmit={createCategory} className="card w-full max-w-md p-5"><h2 id="new-category-title" className="text-lg font-bold text-navy-900 dark:text-white">إضافة فئة منتجات</h2><p className="mb-4 mt-1 text-sm text-navy-500">ستُحفظ الفئة في قاعدة البيانات وتُحدد للمنتج الحالي.</p>{categoryError && <div className="mb-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{categoryError}</div>}<label className="label" htmlFor="category-name">الاسم بالإنجليزية</label><input id="category-name" name="name" className="input mb-3" required minLength={2} maxLength={120} autoFocus /><label className="label" htmlFor="category-name-ar">الاسم بالعربية</label><input id="category-name-ar" name="nameAr" className="input" maxLength={120} /><div className="mt-5 flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowCategoryModal(false)} disabled={categorySaving}>إلغاء</button><button className="btn btn-primary" disabled={categorySaving}>{categorySaving ? 'جارٍ الحفظ…' : 'حفظ الفئة'}</button></div></form></div>}
        </div>
      </AppLayout>
    );
  }

  if (!record) return <AppLayout><div className="empty-state card"><Search className="empty-state-icon" /><h1 className="empty-state-title">السجل غير موجود</h1><p className="empty-state-description">تعذر العثور على السجل المطلوب. ربما تم حذفه أو أن الرابط غير صحيح.</p><Link href={config.base} className="btn btn-primary btn-sm mt-4">العودة إلى {config.ar}</Link></div></AppLayout>;

  const entries = Object.entries(record).filter(([key, value]) => !['id', 'companyId', 'createdAt', 'updatedAt', 'items', 'tags', 'images'].includes(key) && value !== undefined).slice(0, 12);
  const items = Array.isArray(record.items) ? record.items as Record<string, unknown>[] : [];

  return (
    <AppLayout>
      <div className="mb-6 flex items-center gap-2 text-sm text-navy-500"><Link href={config.base} className="hover:text-primary-600">{config.ar}</Link><ChevronLeft className="h-4 w-4" /><span className="text-navy-800 dark:text-navy-200">تفاصيل {config.singularAr}</span></div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="mb-2 flex items-center gap-2"><span className="badge badge-success">نشط</span>{isMovements && <span className="badge badge-primary">حركات المخزون</span>}</div><h1 className="text-2xl font-bold text-navy-900 dark:text-white">{String(record.nameAr ?? record.name ?? record.invoiceNumber ?? record.orderNumber ?? record.expenseNumber ?? record.employeeCode ?? record.entryNumber ?? config.singularAr)}</h1><p className="mt-1 text-navy-500">معرّف السجل: <span dir="ltr">{id}</span></p></div><div className="flex gap-2"><button className="btn btn-secondary btn-sm"><FileText className="h-4 w-4" />طباعة</button>{!['sales', 'purchases', 'expenses'].includes(module) && <Link href={`${config.base}/${id}/edit`} className="btn btn-primary btn-sm"><Edit3 className="h-4 w-4" />تعديل</Link>}</div></div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3"><section className="card xl:col-span-2"><div className="card-header"><h2 className="font-semibold text-navy-900 dark:text-white">المعلومات الأساسية</h2></div><dl className="grid grid-cols-1 gap-px bg-navy-100 dark:bg-navy-700 sm:grid-cols-2">{entries.map(([key, value]) => <div key={key} className="bg-white p-4 dark:bg-navy-900"><dt className="text-xs text-navy-500">{key}</dt><dd className="mt-1 font-medium text-navy-900 dark:text-white">{displayValue(value)}</dd></div>)}</dl></section><aside className="card h-fit"><div className="card-header"><h2 className="font-semibold text-navy-900 dark:text-white">ملخص</h2></div><div className="space-y-4 p-5"><div className="rounded-xl bg-primary-50 p-4 dark:bg-primary-900/20"><p className="text-sm text-primary-600 dark:text-primary-400">القيمة الإجمالية</p><p className="mt-1 text-xl font-bold text-navy-900 dark:text-white">{formatCurrency(Number(record.total ?? record.totalSales ?? record.totalPurchases ?? record.sellingPrice ?? record.value ?? 0), 'EGP', 'ar-EG')}</p></div><p className="text-sm text-navy-500">تم إنشاء السجل في {displayValue(record.createdAt)}</p></div></aside></div>
      {(items.length > 0 || isMovements) && <section className="card mt-6"><div className="card-header flex items-center gap-2"><Package className="h-5 w-5 text-primary-600" /><h2 className="font-semibold text-navy-900 dark:text-white">{isMovements ? 'سجل حركات المخزون' : 'البنود'}</h2></div><div className="table-container rounded-none border-0"><table className="table"><thead><tr><th>البيان</th><th className="text-end">الكمية</th><th className="text-end">السعر</th><th className="text-end">الإجمالي</th></tr></thead><tbody>{(isMovements ? [{ description: 'رصيد افتتاحي', quantity: record.totalStock, unitPrice: record.costPrice, total: record.stockValue }, { description: 'آخر صرف للمبيعات', quantity: -2, unitPrice: record.costPrice, total: -2 * Number(record.costPrice ?? 0) }] : items).map((item, index) => <tr key={index}><td>{displayValue(item.description ?? item.name)}</td><td className="text-end tabular-nums">{displayValue(item.quantity)}</td><td className="text-end tabular-nums">{formatCurrency(Number(item.unitPrice ?? 0), 'EGP', 'ar-EG')}</td><td className="text-end font-semibold tabular-nums">{formatCurrency(Number(item.total ?? 0), 'EGP', 'ar-EG')}</td></tr>)}</tbody></table></div></section>}
    </AppLayout>
  );
}
