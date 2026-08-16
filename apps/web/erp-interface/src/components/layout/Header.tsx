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
    <header className="sticky top-0 z-30 h-16 border-b border-navy-200 bg-white dark:border-navy-700 dark:bg-navy-900">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <MobileMenuButton isOpen={isSidebarOpen} onClick={onSidebarToggle} locale={locale} />
          <div>
            <p className="text-sm font-semibold text-navy-900 dark:text-white">{user?.name}</p>
            <p className="text-xs text-navy-500">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => onLocaleChange(locale === 'ar' ? 'en' : 'ar')} aria-label="Change language">
            <Globe className="h-4 w-4" />
          </button>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={toggleTheme} aria-label="Change theme">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={logout} aria-label="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
