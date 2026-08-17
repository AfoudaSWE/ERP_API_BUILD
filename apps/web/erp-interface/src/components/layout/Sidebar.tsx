import { useCallback, useState } from 'react';
import Link from '@/components/router/Link';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Store, ShoppingBag, Package,
  Users, Truck, Calculator, Receipt, Wallet, UserCog, Clock, Banknote,
  BarChart3, Settings, ChevronLeft, ChevronRight, ChevronDown, PanelsTopLeft, Menu, X,
  Boxes, Building, UserPlus, ShieldAlert, Tag, Award, Ruler, Warehouse,
  ClipboardList, ClipboardEdit, ArrowRightLeft, FileText, Repeat, FileStack,
  Undo2, FileSpreadsheet, CircleDollarSign, Truck as TruckIcon, PackageMinus, LineChart,
  CreditCard, TrendingUp, PiggyBank, Percent, IdCard, CalendarDays, CalendarOff,
  Briefcase, BookOpen, Contact, Kanban, Megaphone, MessageSquareHeart, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

// AppLayout (and this Sidebar) remounts on every route change, since each page wraps itself in
// <AppLayout>. Without this, the nav's scroll position resets to the top on every navigation.
let lastSidebarScrollTop = 0;

interface SidebarProps {
  locale: Locale;
  isDesktopCollapsed: boolean;
  isMobileOpen: boolean;
  onDesktopToggle: () => void;
  onMobileClose: () => void;
}

interface NavItem {
  href: string;
  icon: React.ReactNode;
  labelKey: string;
  badge?: string | number;
  permission: string;
}

export const navItems: NavItem[] = [
  { href: '/', icon: <LayoutDashboard className="h-5 w-5" />, labelKey: 'nav.dashboard', permission: 'dashboard.read' },
  { href: '/sales', icon: <ShoppingCart className="h-5 w-5" />, labelKey: 'nav.sales', permission: 'sales.read' },
  { href: '/pos', icon: <Store className="h-5 w-5" />, labelKey: 'nav.pos', permission: 'pos.use' },
  { href: '/purchases', icon: <ShoppingBag className="h-5 w-5" />, labelKey: 'nav.purchases', permission: 'purchases.read' },
  { href: '/customers', icon: <Users className="h-5 w-5" />, labelKey: 'nav.customers', permission: 'customers.read' },
  { href: '/crm', icon: <UserPlus className="h-5 w-5" />, labelKey: 'nav.crm', permission: 'crm.read' },
  { href: '/accounting', icon: <Calculator className="h-5 w-5" />, labelKey: 'nav.accounting', permission: 'accounting.read' },
  { href: '/expenses', icon: <Receipt className="h-5 w-5" />, labelKey: 'nav.expenses', permission: 'expenses.read' },
  { href: '/cash-banks', icon: <Wallet className="h-5 w-5" />, labelKey: 'nav.cashBanks', permission: 'cash.read' },
  { href: '/hr', icon: <UserCog className="h-5 w-5" />, labelKey: 'nav.hr', permission: 'hr.read' },
  { href: '/attendance', icon: <Clock className="h-5 w-5" />, labelKey: 'nav.attendance', permission: 'attendance.records.view' },
  { href: '/payroll', icon: <Banknote className="h-5 w-5" />, labelKey: 'nav.payroll', permission: 'payroll.read' },
  { href: '/reports', icon: <BarChart3 className="h-5 w-5" />, labelKey: 'nav.reports', permission: 'reports.read' },
  { href: '/branches', icon: <Building className="h-5 w-5" />, labelKey: 'nav.branches', permission: 'branches.read' },
  { href: '/settings', icon: <Settings className="h-5 w-5" />, labelKey: 'nav.settings', permission: 'settings.read' },
  { href: '/platform-admin', icon: <ShieldAlert className="h-5 w-5" />, labelKey: 'nav.platformAdmin', permission: 'companies.manage' },
];

export function visibleNavItems(can: (permission: string) => boolean, role?: string) {
  if (role === 'super_admin') return navItems.filter((item) => item.href === '/platform-admin');
  return navItems.filter((item) => can(item.permission));
}

const inventorySectionItems: NavItem[] = [
  { href: '/products', icon: <Boxes className="h-4 w-4" />, labelKey: 'nav.products', permission: 'products.read' },
  { href: '/categories', icon: <Tag className="h-4 w-4" />, labelKey: 'nav.categories', permission: 'products.read' },
  { href: '/brands', icon: <Award className="h-4 w-4" />, labelKey: 'nav.brands', permission: 'products.read' },
  { href: '/units', icon: <Ruler className="h-4 w-4" />, labelKey: 'nav.units', permission: 'products.read' },
  { href: '/inventory', icon: <Package className="h-4 w-4" />, labelKey: 'nav.inventory', permission: 'inventory.read' },
  { href: '/suppliers', icon: <Truck className="h-4 w-4" />, labelKey: 'nav.suppliers', permission: 'suppliers.read' },
  { href: '/warehouses', icon: <Warehouse className="h-4 w-4" />, labelKey: 'nav.warehouses', permission: 'inventory.read' },
];

const stockGroupItems: NavItem[] = [
  { href: '/inventory', icon: <ClipboardList className="h-4 w-4" />, labelKey: 'nav.manageStock', permission: 'inventory.read' },
  { href: '/inventory/stock-adjustment', icon: <ClipboardEdit className="h-4 w-4" />, labelKey: 'nav.stockAdjustment', permission: 'inventory.adjust' },
  { href: '/inventory/stock-transfer', icon: <ArrowRightLeft className="h-4 w-4" />, labelKey: 'nav.stockTransfer', permission: 'inventory.transfer' },
];

const salesSectionItems: NavItem[] = [
  { href: '/customers', icon: <Users className="h-4 w-4" />, labelKey: 'nav.customers', permission: 'customers.read' },
  { href: '/sales', icon: <ShoppingCart className="h-4 w-4" />, labelKey: 'nav.salesOrders', permission: 'sales.read' },
  { href: '/sales/recurring', icon: <Repeat className="h-4 w-4" />, labelKey: 'nav.recurringInvoices', permission: 'sales.read' },
  { href: '/sales/templates', icon: <FileStack className="h-4 w-4" />, labelKey: 'nav.invoiceTemplates', permission: 'sales.read' },
  { href: '/sales/returns', icon: <FileText className="h-4 w-4" />, labelKey: 'nav.creditNotes', permission: 'sales.read' },
  { href: '/sales/quotes', icon: <FileSpreadsheet className="h-4 w-4" />, labelKey: 'nav.salesQuotes', permission: 'sales.read' },
  { href: '/sales/cash-sales', icon: <CircleDollarSign className="h-4 w-4" />, labelKey: 'nav.cashSales', permission: 'sales.read' },
  { href: '/sales/returns', icon: <Undo2 className="h-4 w-4" />, labelKey: 'nav.refunds', permission: 'sales.read' },
  { href: '/sales/delivery-notes', icon: <TruckIcon className="h-4 w-4" />, labelKey: 'nav.deliveryNotes', permission: 'sales.read' },
  { href: '/reports', icon: <LineChart className="h-4 w-4" />, labelKey: 'nav.salesAnalytics', permission: 'reports.read' },
];

const purchaseSectionItems: NavItem[] = [
  { href: '/purchases', icon: <ShoppingBag className="h-4 w-4" />, labelKey: 'nav.purchases', permission: 'purchases.read' },
  { href: '/purchases', icon: <ClipboardList className="h-4 w-4" />, labelKey: 'nav.purchaseOrders', permission: 'purchases.read' },
  { href: '/purchases/returns', icon: <PackageMinus className="h-4 w-4" />, labelKey: 'nav.purchaseReturn', permission: 'purchases.read' },
  { href: '/suppliers', icon: <Truck className="h-4 w-4" />, labelKey: 'nav.vendors', permission: 'suppliers.read' },
  { href: '/reports', icon: <LineChart className="h-4 w-4" />, labelKey: 'nav.procurementAnalytics', permission: 'reports.read' },
];

const financeSectionItems: NavItem[] = [
  { href: '/expenses', icon: <Receipt className="h-4 w-4" />, labelKey: 'nav.expenses', permission: 'expenses.read' },
  { href: '/expenses/categories', icon: <Tag className="h-4 w-4" />, labelKey: 'nav.expenseCategory', permission: 'expenses.read' },
  { href: '/finance/payments', icon: <CreditCard className="h-4 w-4" />, labelKey: 'nav.payments', permission: 'expenses.read' },
  { href: '/finance/cashflow', icon: <TrendingUp className="h-4 w-4" />, labelKey: 'nav.cashflow', permission: 'accounting.read' },
  { href: '/finance/budgets', icon: <PiggyBank className="h-4 w-4" />, labelKey: 'nav.budgeting', permission: 'accounting.read' },
  { href: '/finance/tax-rates', icon: <Percent className="h-4 w-4" />, labelKey: 'nav.taxes', permission: 'accounting.read' },
  { href: '/reports', icon: <BarChart3 className="h-4 w-4" />, labelKey: 'nav.reports', permission: 'reports.read' },
];

const hrmSectionItems: NavItem[] = [
  { href: '/hr', icon: <UserCog className="h-4 w-4" />, labelKey: 'nav.employees', permission: 'hr.read' },
  { href: '/hr', icon: <Building className="h-4 w-4" />, labelKey: 'nav.departments', permission: 'hr.read' },
  { href: '/hr/designations', icon: <IdCard className="h-4 w-4" />, labelKey: 'nav.designations', permission: 'hr.read' },
  { href: '/attendance', icon: <Clock className="h-4 w-4" />, labelKey: 'nav.attendance', permission: 'attendance.records.view' },
  { href: '/hr/holidays', icon: <CalendarOff className="h-4 w-4" />, labelKey: 'nav.holidays', permission: 'hr.read' },
  { href: '/payroll', icon: <Banknote className="h-4 w-4" />, labelKey: 'nav.payroll', permission: 'payroll.read' },
  { href: '/hr/recruitment', icon: <Briefcase className="h-4 w-4" />, labelKey: 'nav.recruitment', permission: 'hr.read' },
  { href: '/hr/performance', icon: <Star className="h-4 w-4" />, labelKey: 'nav.performance', permission: 'hr.read' },
  { href: '/hr/training', icon: <BookOpen className="h-4 w-4" />, labelKey: 'nav.training', permission: 'hr.read' },
  { href: '/hr/analytics', icon: <TrendingUp className="h-4 w-4" />, labelKey: 'nav.hrAnalytics', permission: 'hr.read' },
];

const leaveGroupItems: NavItem[] = [
  { href: '/hr/leaves', icon: <CalendarDays className="h-4 w-4" />, labelKey: 'nav.leaves', permission: 'hr.read' },
  { href: '/hr/leave-types', icon: <FileStack className="h-4 w-4" />, labelKey: 'nav.leaveTypes', permission: 'hr.read' },
];

const crmSectionItems: NavItem[] = [
  { href: '/crm/contacts', icon: <Contact className="h-4 w-4" />, labelKey: 'nav.contacts', permission: 'crm.read' },
  { href: '/crm', icon: <UserPlus className="h-4 w-4" />, labelKey: 'nav.leads', permission: 'crm.read' },
  { href: '/crm', icon: <ShoppingBag className="h-4 w-4" />, labelKey: 'nav.deals', permission: 'crm.read' },
  { href: '/crm/pipeline', icon: <Kanban className="h-4 w-4" />, labelKey: 'nav.pipeline', permission: 'crm.read' },
  { href: '/crm/campaigns', icon: <Megaphone className="h-4 w-4" />, labelKey: 'nav.campaigns', permission: 'crm.read' },
  { href: '/crm/feedback', icon: <MessageSquareHeart className="h-4 w-4" />, labelKey: 'nav.customerFeedback', permission: 'crm.read' },
  { href: '/crm/analytics', icon: <LineChart className="h-4 w-4" />, labelKey: 'nav.customerAnalytics', permission: 'crm.read' },
];

export function Sidebar({
  locale,
  isDesktopCollapsed,
  isMobileOpen,
  onDesktopToggle,
  onMobileClose,
}: SidebarProps) {
  const { pathname } = useLocation();
  const { can, user } = useAuth();
  const { t } = useTranslation();
  const isRTL = locale === 'ar';
  const expandedLabel = isRTL ? 'توسيع القائمة' : 'Expand sidebar';
  const collapsedLabel = isRTL ? 'طي القائمة' : 'Collapse sidebar';

  const visibleInventoryItems = inventorySectionItems.filter((item) => can(item.permission));
  const visibleStockItems = stockGroupItems.filter((item) => can(item.permission));
  const isStockActive = pathname.startsWith('/inventory/stock-');
  const [stockOpen, setStockOpen] = useState(isStockActive);
  const showInventorySection = user?.role !== 'super_admin' && (visibleInventoryItems.length > 0 || visibleStockItems.length > 0);
  const customersIndex = navItems.findIndex((item) => item.href === '/customers');

  const visibleSalesItems = salesSectionItems.filter((item) => can(item.permission));
  const showSalesSection = user?.role !== 'super_admin' && visibleSalesItems.length > 0;
  const salesIndex = navItems.findIndex((item) => item.href === '/sales');

  const visiblePurchaseItems = purchaseSectionItems.filter((item) => can(item.permission));
  const showPurchaseSection = user?.role !== 'super_admin' && visiblePurchaseItems.length > 0;
  const purchasesIndex = navItems.findIndex((item) => item.href === '/purchases');

  const visibleFinanceItems = financeSectionItems.filter((item) => can(item.permission));
  const showFinanceSection = user?.role !== 'super_admin' && visibleFinanceItems.length > 0;
  const expensesIndex = navItems.findIndex((item) => item.href === '/expenses');

  const visibleHrmItems = hrmSectionItems.filter((item) => can(item.permission));
  const visibleLeaveItems = leaveGroupItems.filter((item) => can(item.permission));
  const isLeaveActive = pathname.startsWith('/hr/leave');
  const [leaveOpen, setLeaveOpen] = useState(isLeaveActive);
  const showHrmSection = user?.role !== 'super_admin' && (visibleHrmItems.length > 0 || visibleLeaveItems.length > 0);
  const hrIndex = navItems.findIndex((item) => item.href === '/hr');

  const visibleCrmItems = crmSectionItems.filter((item) => can(item.permission));
  const showCrmSection = user?.role !== 'super_admin' && visibleCrmItems.length > 0;
  const crmIndex = navItems.findIndex((item) => item.href === '/crm');

  const navRef = useCallback((node: HTMLElement | null) => {
    if (node) node.scrollTop = lastSidebarScrollTop;
  }, []);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-navy-950/55 transition-opacity duration-200 lg:hidden',
          isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'sidebar',
          isDesktopCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded',
          isMobileOpen
            ? 'translate-x-0'
            : isRTL
              ? 'translate-x-full lg:translate-x-0'
              : '-translate-x-full lg:translate-x-0',
        )}
        aria-label={isRTL ? 'التنقل الرئيسي' : 'Main navigation'}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-navy-200 px-3 dark:border-navy-700">
          <div className={cn('flex min-w-0 items-center gap-2', isDesktopCollapsed && 'lg:hidden')}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-950 text-primary-100 dark:bg-primary-100 dark:text-primary-950">
              <PanelsTopLeft className="h-5 w-5" />
            </div>
            <span className="truncate text-base font-bold tracking-[-0.02em] text-navy-950 dark:text-white">ClubGenies</span>
          </div>

          <div className={cn(
            'hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-950 text-primary-100 dark:bg-primary-100 dark:text-primary-950',
            isDesktopCollapsed && 'lg:flex',
          )}>
            <PanelsTopLeft className="h-5 w-5" />
          </div>

          <button
            type="button"
            onClick={onMobileClose}
            className="btn btn-ghost btn-icon lg:hidden"
            aria-label={isRTL ? 'إغلاق القائمة' : 'Close menu'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav
          ref={navRef}
          onScroll={(event) => { lastSidebarScrollTop = event.currentTarget.scrollTop; }}
          className="sidebar-nav flex-1 space-y-1 overflow-y-auto px-3 py-4"
        >
          {(user?.role === 'super_admin' ? navItems.filter((item) => item.href === '/platform-admin') : navItems).map((item, index) => {
            const isCustomersAnchor = item.href === '/customers' && showInventorySection;
            const isSalesAnchor = item.href === '/sales' && showSalesSection;
            const isPurchasesAnchor = item.href === '/purchases' && showPurchaseSection;
            const isExpensesAnchor = item.href === '/expenses' && showFinanceSection;
            const isHrAnchor = item.href === '/hr' && showHrmSection;
            const isCrmAnchor = item.href === '/crm' && showCrmSection;
            if (!can(item.permission) && !isCustomersAnchor && !isSalesAnchor && !isPurchasesAnchor && !isExpensesAnchor && !isHrAnchor && !isCrmAnchor) return null;

            if (index === salesIndex && showSalesSection) {
              return (
                <ExpandableSection
                  key="sales-section"
                  title={isRTL ? 'المبيعات' : 'Sales'}
                  items={visibleSalesItems}
                  pathname={pathname}
                  isDesktopCollapsed={isDesktopCollapsed}
                  t={t}
                  onClick={onMobileClose}
                />
              );
            }

            if (index === purchasesIndex && showPurchaseSection) {
              return (
                <ExpandableSection
                  key="purchase-section"
                  title={isRTL ? 'المشتريات' : 'Purchase'}
                  items={visiblePurchaseItems}
                  pathname={pathname}
                  isDesktopCollapsed={isDesktopCollapsed}
                  t={t}
                  onClick={onMobileClose}
                />
              );
            }

            if (index === expensesIndex && showFinanceSection) {
              return (
                <ExpandableSection
                  key="finance-section"
                  title={isRTL ? 'المالية' : 'Finance'}
                  items={visibleFinanceItems}
                  pathname={pathname}
                  isDesktopCollapsed={isDesktopCollapsed}
                  t={t}
                  onClick={onMobileClose}
                />
              );
            }

            if (index === crmIndex && showCrmSection) {
              return (
                <ExpandableSection
                  key="crm-section"
                  title={isRTL ? 'إدارة العملاء' : 'CRM'}
                  items={visibleCrmItems}
                  pathname={pathname}
                  isDesktopCollapsed={isDesktopCollapsed}
                  t={t}
                  onClick={onMobileClose}
                />
              );
            }

            if (index === hrIndex && showHrmSection) {
              return (
                <div key="hrm-section" className="contents">
                  {!isDesktopCollapsed && (
                    <p className="px-3 pb-1 pt-4 text-sm font-bold tracking-[0.04em] text-navy-700 dark:text-navy-200">
                      {isRTL ? 'الموارد البشرية' : 'HRM'}
                    </p>
                  )}
                  {visibleHrmItems.map((leaf, leafIndex) => (
                    <div key={`${leaf.href}-${leaf.labelKey}-${leafIndex}`} className="contents">
                      <SidebarLink item={leaf} pathname={pathname} isDesktopCollapsed={isDesktopCollapsed} t={t} onClick={onMobileClose} />
                      {leaf.labelKey === 'nav.designations' && visibleLeaveItems.length > 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setLeaveOpen((open) => !open)}
                            className={cn('sidebar-link w-full', isLeaveActive && 'active', isDesktopCollapsed && 'lg:justify-center lg:px-2')}
                            title={isDesktopCollapsed ? (isRTL ? 'الإجازات' : 'Leave') : undefined}
                            aria-expanded={leaveOpen}
                          >
                            <span className={cn('shrink-0', isLeaveActive && 'text-primary-600 dark:text-primary-400')}>
                              <CalendarDays className="h-5 w-5" />
                            </span>
                            <span className={cn('flex-1 truncate text-start', isDesktopCollapsed && 'lg:hidden')}>
                              {isRTL ? 'الإجازات' : 'Leave'}
                            </span>
                            <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', leaveOpen && 'rotate-180', isDesktopCollapsed && 'lg:hidden')} />
                          </button>
                          {leaveOpen && !isDesktopCollapsed && (
                            <div className="ms-4 mt-1 space-y-1 border-s border-navy-200 ps-3 dark:border-navy-700">
                              {visibleLeaveItems.map((sub) => (
                                <SidebarLink key={sub.href} item={sub} pathname={pathname} isDesktopCollapsed={false} t={t} onClick={onMobileClose} small />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            }

            if (index === customersIndex && showInventorySection) {
              return (
                <div key="inventory-section" className="contents">
                  {!isDesktopCollapsed && (
                    <p className="px-3 pb-1 pt-4 text-sm font-bold tracking-[0.04em] text-navy-700 dark:text-navy-200">
                      {isRTL ? 'المخزون' : 'Inventory'}
                    </p>
                  )}
                  {visibleInventoryItems.map((leaf) => (
                    <SidebarLink key={leaf.href} item={leaf} pathname={pathname} isDesktopCollapsed={isDesktopCollapsed} t={t} onClick={onMobileClose} />
                  ))}
                  {visibleStockItems.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setStockOpen((open) => !open)}
                        className={cn('sidebar-link w-full', isStockActive && 'active', isDesktopCollapsed && 'lg:justify-center lg:px-2')}
                        title={isDesktopCollapsed ? (isRTL ? 'حركة المخزون' : 'Stock') : undefined}
                        aria-expanded={stockOpen}
                      >
                        <span className={cn('shrink-0', isStockActive && 'text-primary-600 dark:text-primary-400')}>
                          <ClipboardList className="h-5 w-5" />
                        </span>
                        <span className={cn('flex-1 truncate text-start', isDesktopCollapsed && 'lg:hidden')}>
                          {isRTL ? 'حركة المخزون' : 'Stock'}
                        </span>
                        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', stockOpen && 'rotate-180', isDesktopCollapsed && 'lg:hidden')} />
                      </button>
                      {stockOpen && !isDesktopCollapsed && (
                        <div className="ms-4 mt-1 space-y-1 border-s border-navy-200 ps-3 dark:border-navy-700">
                          {visibleStockItems.map((leaf) => (
                            <SidebarLink key={leaf.href} item={leaf} pathname={pathname} isDesktopCollapsed={false} t={t} onClick={onMobileClose} small />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {can(item.permission) && (
                    <SidebarLink item={item} pathname={pathname} isDesktopCollapsed={isDesktopCollapsed} t={t} onClick={onMobileClose} />
                  )}
                </div>
              );
            }
            if (
              (item.href === '/sales' && showSalesSection) ||
              (item.href === '/purchases' && showPurchaseSection) ||
              (item.href === '/expenses' && showFinanceSection) ||
              (item.href === '/hr' && showHrmSection) ||
              (item.href === '/crm' && showCrmSection)
            ) return null;
            return <SidebarLink key={item.href} item={item} pathname={pathname} isDesktopCollapsed={isDesktopCollapsed} t={t} onClick={onMobileClose} />;
          })}
        </nav>

        <div className="hidden border-t border-navy-200 p-4 dark:border-navy-700 lg:block">
          <button
            type="button"
            onClick={onDesktopToggle}
            className="btn btn-ghost w-full justify-center"
            title={isDesktopCollapsed ? expandedLabel : collapsedLabel}
            aria-label={isDesktopCollapsed ? expandedLabel : collapsedLabel}
          >
            {isDesktopCollapsed ? (
              <ChevronRight className={cn('h-5 w-5', isRTL && 'rotate-180')} />
            ) : (
              <ChevronLeft className={cn('h-5 w-5', isRTL && 'rotate-180')} />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

function ExpandableSection({
  title,
  items,
  pathname,
  isDesktopCollapsed,
  t,
  onClick,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  isDesktopCollapsed: boolean;
  t: (key: string) => string;
  onClick: () => void;
}) {
  return (
    <div className="contents">
      {!isDesktopCollapsed && (
        <p className="px-3 pb-1 pt-4 text-sm font-bold tracking-[0.04em] text-navy-700 dark:text-navy-200">
          {title}
        </p>
      )}
      {items.map((leaf, index) => (
        <SidebarLink key={`${leaf.href}-${leaf.labelKey}-${index}`} item={leaf} pathname={pathname} isDesktopCollapsed={isDesktopCollapsed} t={t} onClick={onClick} />
      ))}
    </div>
  );
}

function SidebarLink({
  item,
  pathname,
  isDesktopCollapsed,
  t,
  onClick,
  small,
}: {
  item: NavItem;
  pathname: string;
  isDesktopCollapsed: boolean;
  t: (key: string) => string;
  onClick: () => void;
  small?: boolean;
}) {
  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
  return (
    <Link
      href={item.href}
      className={cn(
        'sidebar-link',
        small && 'py-1.5 text-sm',
        isActive && 'active',
        isDesktopCollapsed && 'lg:justify-center lg:px-2',
      )}
      title={isDesktopCollapsed ? t(item.labelKey) : undefined}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
    >
      <span className={cn('shrink-0', isActive && 'text-primary-600 dark:text-primary-400')}>
        {item.icon}
      </span>
      <span className={cn('flex-1 truncate', isDesktopCollapsed && 'lg:hidden')}>
        {t(item.labelKey)}
      </span>
      {item.badge && (
        <span className={cn('badge badge-primary', isDesktopCollapsed && 'lg:hidden')}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function MobileMenuButton({
  isOpen,
  onClick,
  locale,
}: {
  isOpen: boolean;
  onClick: () => void;
  locale: Locale;
}) {
  const label = isOpen
    ? (locale === 'ar' ? 'إغلاق القائمة' : 'Close menu')
    : (locale === 'ar' ? 'فتح القائمة' : 'Open menu');

  return (
    <button
      type="button"
      onClick={onClick}
      className="btn btn-ghost btn-icon lg:hidden"
      aria-label={label}
      aria-expanded={isOpen}
    >
      {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
    </button>
  );
}
