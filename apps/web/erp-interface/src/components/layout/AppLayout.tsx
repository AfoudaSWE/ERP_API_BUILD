import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';
import { useApiData } from '@/lib/api-data';
import { useAuth } from '@/lib/auth';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { error, refresh } = useApiData();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.resolvedLanguage?.startsWith('ar') ? 'ar' : 'en';
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const currentUser = { name: user?.name ?? '', nameAr: user?.name ?? '', email: user?.email ?? '', role: user?.role ?? '' };

  return (
    <div className={cn('min-h-screen bg-navy-50 dark:bg-navy-950', locale === 'ar' && 'font-arabic')}>
      <Sidebar
        locale={locale}
        isDesktopCollapsed={isDesktopSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        onDesktopToggle={() => setIsDesktopSidebarCollapsed((collapsed) => !collapsed)}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <div className={cn('min-w-0 transition-[padding] duration-200', isDesktopSidebarCollapsed ? 'lg:ps-20' : 'lg:ps-64')}>
        <Header
          locale={locale}
          onLocaleChange={(nextLocale) => void i18n.changeLanguage(nextLocale)}
          isSidebarOpen={isMobileSidebarOpen}
          onSidebarToggle={() => setIsMobileSidebarOpen((open) => !open)}
          user={currentUser}
        />
        <main className="page-frame p-4 sm:p-5 lg:p-6 xl:p-8">
          {error && (
            <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-sm text-danger-700 dark:bg-danger-900/20 dark:text-red-300">
              <span>{t('shell.apiError', { message: error })}</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void refresh()}>{t('common.retry')}</button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
