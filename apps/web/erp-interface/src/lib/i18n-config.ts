import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations } from './i18n';

const en = {
  ...translations.en,
  'nav.dashboard': 'Dashboard', 'nav.aiAssistant': 'AI Assistant', 'nav.sales': 'Sales', 'nav.pos': 'Point of Sale',
  'nav.purchases': 'Purchases', 'nav.inventory': 'Inventory', 'nav.products': 'Products', 'nav.customers': 'Customers',
  'nav.suppliers': 'Suppliers', 'nav.crm': 'CRM', 'nav.accounting': 'Accounting', 'nav.expenses': 'Expenses',
  'nav.cashBanks': 'Cash & Banks', 'nav.hr': 'Human Resources', 'nav.attendance': 'Attendance', 'nav.payroll': 'Payroll',
  'nav.reports': 'Reports', 'nav.branches': 'Branches', 'nav.settings': 'Settings', 'nav.platformAdmin': 'Platform admin',
  'nav.categories': 'Categories', 'nav.brands': 'Brands', 'nav.units': 'Units', 'nav.warehouses': 'Warehouse',
  'nav.manageStock': 'Manage Stock', 'nav.stockAdjustment': 'Stock Adjustment', 'nav.stockTransfer': 'Stock Transfer',
  'nav.salesOrders': 'Sales Orders', 'nav.recurringInvoices': 'Recurring Invoices', 'nav.invoiceTemplates': 'Invoice Templates',
  'nav.creditNotes': 'Credit Notes', 'nav.salesQuotes': 'Sales Quotes', 'nav.cashSales': 'Cash Sales', 'nav.refunds': 'Refunds',
  'nav.deliveryNotes': 'Delivery Notes', 'nav.salesAnalytics': 'Sales Analytics', 'nav.purchaseOrders': 'Purchase Orders',
  'nav.purchaseReturn': 'Purchase Return', 'nav.vendors': 'Vendors', 'nav.procurementAnalytics': 'Procurement Analytics',
  'nav.expenseCategory': 'Expense Category', 'nav.payments': 'Payments', 'nav.cashflow': 'Cashflow', 'nav.budgeting': 'Budgeting', 'nav.taxes': 'Taxes',
  'nav.employees': 'Employees', 'nav.departments': 'Departments', 'nav.designations': 'Designations / Roles', 'nav.holidays': 'Holidays',
  'nav.recruitment': 'Recruitment', 'nav.performance': 'Performance & Appraisal', 'nav.training': 'Training & Development', 'nav.hrAnalytics': 'HR Analytics',
  'nav.leaves': 'Leaves', 'nav.leaveTypes': 'Leave Types',
  'nav.contacts': 'Contacts', 'nav.leads': 'Leads', 'nav.deals': 'Deals', 'nav.pipeline': 'Pipeline', 'nav.campaigns': 'Campaigns',
  'nav.customerFeedback': 'Customer Feedback', 'nav.customerAnalytics': 'Customer Analytics',
  'common.search': 'Search', 'common.new': 'New', 'common.retry': 'Retry', 'common.logout': 'Logout', 'common.back': 'Back',
  'common.cancel': 'Cancel', 'common.saving': 'Saving…', 'common.create': 'Create',
  'shell.company': 'Company', 'shell.branch': 'Branch', 'shell.liveApi': 'Live API data',
  'shell.apiOffline': 'API offline', 'shell.connecting': 'Connecting to API…', 'shell.apiError': 'API connection failed: {{message}}',
  'shell.roles': 'Roles', 'shell.mainNavigation': 'Main navigation', 'shell.expand': 'Expand sidebar', 'shell.collapse': 'Collapse sidebar',
  'auth.title': 'SME ERP Login', 'auth.subtitle': 'Sign in with your assigned role', 'auth.email': 'Email',
  'auth.password': 'Password', 'auth.signIn': 'Sign in', 'auth.signingIn': 'Signing in…', 'auth.loadingSession': 'Loading session…',
  'auth.permissionDenied': 'Permission denied', 'auth.missingPermission': 'Your role does not include {{permission}}.',
  'roles.title': 'Roles and permissions', 'roles.subtitle': 'API-enforced access for company users', 'roles.createUser': 'Create user',
  'roles.fullName': 'Full name', 'roles.temporaryPassword': 'Temporary password', 'roles.selectRole': 'Select role',
  'roles.users': 'Users', 'roles.user': 'User', 'roles.role': 'Role',
  'sales.newInvoice': 'New sales invoice', 'sales.formSubtitle': 'The invoice, customer balance, and inventory are updated together through the API.',
  'sales.customer': 'Customer', 'sales.selectCustomer': 'Select customer', 'sales.product': 'Product', 'sales.selectProduct': 'Select in-stock product',
  'sales.invoiceDate': 'Invoice date', 'sales.dueDate': 'Due date', 'sales.quantity': 'Quantity', 'sales.unitPrice': 'Unit price',
  'sales.paidAmount': 'Paid amount', 'sales.totalWithTax': 'Invoice total including tax', 'sales.createInvoice': 'Create invoice',
} as const;

const ar: Record<keyof typeof en, string> = {
  ...translations.ar,
  'nav.dashboard': 'لوحة التحكم', 'nav.aiAssistant': 'المساعد الذكي', 'nav.sales': 'المبيعات', 'nav.pos': 'نقطة البيع',
  'nav.purchases': 'المشتريات', 'nav.inventory': 'المخزون', 'nav.products': 'المنتجات', 'nav.customers': 'العملاء',
  'nav.suppliers': 'الموردون', 'nav.crm': 'إدارة العملاء', 'nav.accounting': 'المحاسبة', 'nav.expenses': 'المصروفات',
  'nav.cashBanks': 'الخزينة والبنوك', 'nav.hr': 'الموارد البشرية', 'nav.attendance': 'الحضور والانصراف', 'nav.payroll': 'الرواتب',
  'nav.reports': 'التقارير', 'nav.branches': 'الفروع', 'nav.settings': 'الإعدادات', 'nav.platformAdmin': 'إدارة المنصة',
  'nav.categories': 'الفئات', 'nav.brands': 'الماركات', 'nav.units': 'الوحدات', 'nav.warehouses': 'المخازن',
  'nav.manageStock': 'إدارة المخزون', 'nav.stockAdjustment': 'تسوية المخزون', 'nav.stockTransfer': 'نقل المخزون',
  'nav.salesOrders': 'أوامر البيع', 'nav.recurringInvoices': 'الفواتير المتكررة', 'nav.invoiceTemplates': 'قوالب الفواتير',
  'nav.creditNotes': 'إشعارات دائن', 'nav.salesQuotes': 'عروض أسعار المبيعات', 'nav.cashSales': 'المبيعات النقدية', 'nav.refunds': 'المرتجعات',
  'nav.deliveryNotes': 'إذون التسليم', 'nav.salesAnalytics': 'تحليلات المبيعات', 'nav.purchaseOrders': 'أوامر الشراء',
  'nav.purchaseReturn': 'مرتجع المشتريات', 'nav.vendors': 'الموردون', 'nav.procurementAnalytics': 'تحليلات المشتريات',
  'nav.expenseCategory': 'فئات المصروفات', 'nav.payments': 'المدفوعات', 'nav.cashflow': 'التدفق النقدي', 'nav.budgeting': 'الموازنات', 'nav.taxes': 'الضرائب',
  'nav.employees': 'الموظفون', 'nav.departments': 'الأقسام', 'nav.designations': 'المسميات الوظيفية', 'nav.holidays': 'الإجازات الرسمية',
  'nav.recruitment': 'التوظيف', 'nav.performance': 'الأداء والتقييم', 'nav.training': 'التدريب والتطوير', 'nav.hrAnalytics': 'تحليلات الموارد البشرية',
  'nav.leaves': 'الإجازات', 'nav.leaveTypes': 'أنواع الإجازات',
  'nav.contacts': 'جهات الاتصال', 'nav.leads': 'العملاء المحتملون', 'nav.deals': 'الصفقات', 'nav.pipeline': 'خط سير المبيعات', 'nav.campaigns': 'الحملات',
  'nav.customerFeedback': 'آراء العملاء', 'nav.customerAnalytics': 'تحليلات العملاء',
  'common.search': 'بحث', 'common.new': 'جديد', 'common.retry': 'إعادة المحاولة', 'common.logout': 'تسجيل الخروج', 'common.back': 'العودة',
  'common.cancel': 'إلغاء', 'common.saving': 'جارٍ الحفظ…', 'common.create': 'إنشاء',
  'shell.company': 'شركة النور للإلكترونيات', 'shell.branch': 'الفرع الرئيسي - وسط البلد', 'shell.liveApi': 'بيانات مباشرة من API',
  'shell.apiOffline': 'واجهة API غير متصلة', 'shell.connecting': 'جارٍ الاتصال بواجهة API…', 'shell.apiError': 'فشل الاتصال بواجهة API: {{message}}',
  'shell.roles': 'الأدوار', 'shell.mainNavigation': 'التنقل الرئيسي', 'shell.expand': 'توسيع القائمة', 'shell.collapse': 'طي القائمة',
  'auth.title': 'تسجيل الدخول لنظام ERP', 'auth.subtitle': 'سجّل الدخول باستخدام الدور المخصص لك', 'auth.email': 'البريد الإلكتروني',
  'auth.password': 'كلمة المرور', 'auth.signIn': 'تسجيل الدخول', 'auth.signingIn': 'جارٍ تسجيل الدخول…', 'auth.loadingSession': 'جارٍ تحميل الجلسة…',
  'auth.permissionDenied': 'غير مصرح لك', 'auth.missingPermission': 'دورك لا يملك الصلاحية {{permission}}.',
  'roles.title': 'الأدوار والصلاحيات', 'roles.subtitle': 'صلاحيات مستخدمي الشركة مطبقة من خلال API', 'roles.createUser': 'إنشاء مستخدم',
  'roles.fullName': 'الاسم الكامل', 'roles.temporaryPassword': 'كلمة مرور مؤقتة', 'roles.selectRole': 'اختر الدور',
  'roles.users': 'المستخدمون', 'roles.user': 'المستخدم', 'roles.role': 'الدور',
  'sales.newInvoice': 'فاتورة مبيعات جديدة', 'sales.formSubtitle': 'يتم تحديث الفاتورة ورصيد العميل والمخزون معاً من خلال API.',
  'sales.customer': 'العميل', 'sales.selectCustomer': 'اختر العميل', 'sales.product': 'المنتج', 'sales.selectProduct': 'اختر منتجاً متاحاً',
  'sales.invoiceDate': 'تاريخ الفاتورة', 'sales.dueDate': 'تاريخ الاستحقاق', 'sales.quantity': 'الكمية', 'sales.unitPrice': 'سعر الوحدة',
  'sales.paidAmount': 'المبلغ المدفوع', 'sales.totalWithTax': 'إجمالي الفاتورة شامل الضريبة', 'sales.createInvoice': 'إنشاء الفاتورة',
};

const savedLanguage = localStorage.getItem('erp_language');
const initialLanguage = savedLanguage === 'en' || savedLanguage === 'ar' ? savedLanguage : 'ar';

function applyDocumentLanguage(language: string) {
  const locale = language.startsWith('ar') ? 'ar' : 'en';
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  localStorage.setItem('erp_language', locale);
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: initialLanguage,
  fallbackLng: 'en',
  keySeparator: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

applyDocumentLanguage(initialLanguage);
i18n.on('languageChanged', applyDocumentLanguage);

export default i18n;
