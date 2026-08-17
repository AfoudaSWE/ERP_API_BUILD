import { useEffect, useSyncExternalStore } from 'react';
import { Globe, LogOut, Moon, Sun } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { MobileMenuButton } from './Sidebar';
import { useAuth } from '@/lib/auth';

function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

function getThemeSnapshot() {
  return document.documentElement.classList.contains('dark');
}

export function Header({
  locale,
  onLocaleChange,
  isSidebarOpen,
  onSidebarToggle,
  user,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  isSidebarOpen: boolean;
  onSidebarToggle: () => void;
  user?: { name: string; nameAr?: string; email: string; role: string };
}) {
  const { logout } = useAuth();
  const isDark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => false);

  useEffect(() => {
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  const toggleTheme = () => {
    const nextDark = !isDark;
    document.documentElement.classList.toggle('dark', nextDark);
    localStorage.setItem('theme', nextDark ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-navy-200 bg-white/95 dark:border-navy-700 dark:bg-navy-900/95">
      <div className="page-frame flex h-full items-center justify-between px-4 sm:px-5 lg:px-6 xl:px-8">
        <div className="flex items-center gap-3">
          <MobileMenuButton isOpen={isSidebarOpen} onClick={onSidebarToggle} locale={locale} />
          <div>
            <p className="text-sm font-semibold text-navy-900 dark:text-white">{user?.name}</p>
            <p className="max-w-[13rem] truncate text-xs text-navy-500 sm:max-w-none">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-md border border-navy-200 px-2 py-1 text-xs font-medium capitalize text-navy-600 dark:border-navy-700 dark:text-navy-300 md:inline-flex">{user?.role.replaceAll('_', ' ')}</span>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => onLocaleChange(locale === 'ar' ? 'en' : 'ar')} aria-label={locale === 'ar' ? 'Switch to English' : 'Switch to Arabic'}>
            <Globe className="h-4 w-4" />
          </button>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={toggleTheme} aria-label={isDark ? 'Use light theme' : 'Use dark theme'}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={logout} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
