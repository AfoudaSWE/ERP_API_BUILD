import Link from '@/components/router/Link';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Store, ShoppingBag, Package,
  Users, Truck, Calculator, Receipt, Wallet, UserCog, Clock, Banknote,
  BarChart3, Settings, ChevronLeft, ChevronRight, Sparkles, Menu, X,
  Boxes, Building, UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

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
  { href: '/inventory', icon: <Package className="h-5 w-5" />, labelKey: 'nav.inventory', permission: 'inventory.read' },
  { href: '/products', icon: <Boxes className="h-5 w-5" />, labelKey: 'nav.products', permission: 'products.read' },
  { href: '/customers', icon: <Users className="h-5 w-5" />, labelKey: 'nav.customers', permission: 'customers.read' },
  { href: '/suppliers', icon: <Truck className="h-5 w-5" />, labelKey: 'nav.suppliers', permission: 'suppliers.read' },
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
];

export function visibleNavItems(can: (permission: string) => boolean) {
  return navItems.filter((item) => can(item.permission));
}

export function Sidebar({
  locale,
  isDesktopCollapsed,
  isMobileOpen,
  onDesktopToggle,
  onMobileClose,
}: SidebarProps) {
  const { pathname } = useLocation();
  const { can } = useAuth();
  const { t } = useTranslation();
  const isRTL = locale === 'ar';
  const expandedLabel = isRTL ? 'توسيع القائمة' : 'Expand sidebar';
  const collapsedLabel = isRTL ? 'طي القائمة' : 'Collapse sidebar';

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] transition-opacity duration-300 lg:hidden',
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
        <div className="flex h-16 items-center justify-between gap-2 border-b border-navy-200 px-4 dark:border-navy-700">
          <div className={cn('flex min-w-0 items-center gap-2', isDesktopCollapsed && 'lg:hidden')}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm shadow-primary-500/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="truncate text-lg font-bold text-navy-900 dark:text-white">
              {isRTL ? 'ClubGenies ERP' : 'ClubGenies ERP'}
            </span>
          </div>

          <div className={cn(
            'hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700',
            isDesktopCollapsed && 'lg:flex',
          )}>
            <Sparkles className="h-5 w-5 text-white" />
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

        <nav className="sidebar-nav flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleNavItems(can).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'sidebar-link',
                  isActive && 'active',
                  isDesktopCollapsed && 'lg:justify-center lg:px-2',
                )}
                title={isDesktopCollapsed ? t(item.labelKey) : undefined}
                aria-current={isActive ? 'page' : undefined}
                onClick={onMobileClose}
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
