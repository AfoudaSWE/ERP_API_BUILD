import { useAppStore } from '../../store/appStore';
import {
  Search, Bell, Moon, Sun, Activity, Signal, Menu, Play, Pause, RotateCcw, CircleHelp, ChevronDown, LogOut
} from 'lucide-react';
import StoreSelector from '../common/StoreSelector.jsx';
import { useState } from 'react';

export default function Topbar() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const authUser = useAppStore(s => s.authUser);
  const logout = useAppStore(s => s.logout);
  const sidebarCollapsed = useAppStore(s => s.sidebarCollapsed);
  const liveMode = useAppStore(s => s.liveMode);
  const setLiveMode = useAppStore(s => s.setLiveMode);
  const theme = useAppStore(s => s.theme);
  const toggleTheme = useAppStore(s => s.toggleTheme);
  const demoMode = useAppStore(s => s.demoMode);
  const simulationPaused = useAppStore(s => s.simulationPaused);
  const toggleSimulation = useAppStore(s => s.toggleSimulation);
  const resetDemo = useAppStore(s => s.resetDemo);
  const setSidebarOpen = useAppStore(s => s.setSidebarOpen);
  const notifications = useAppStore(s => s.notifications);
  const clearNotifications = useAppStore(s => s.clearNotifications);

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-30 h-14 flex items-center justify-between px-3 sm:px-4 gap-2
        ${sidebarCollapsed ? 'lg:left-[68px]' : 'lg:left-[240px]'}
        topbar-surface backdrop-blur-xl border-b transition-all duration-300`}
    >
      {/* Left side */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile menu */}
        <button
          className="lg:hidden text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1.5 rounded-md hover:bg-[var(--muted)]"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div data-tour="store-selector"><StoreSelector /></div>

        {/* Live mode toggle */}
        <div data-tour="live-mode" className="hidden sm:flex items-center gap-0.5 bg-[var(--muted)] rounded-lg p-0.5 border border-[var(--border)]">
          <button
            onClick={() => setLiveMode(true)}
            className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
              liveMode ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {liveMode && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-live" />}
              Live
            </span>
          </button>
          <button
            onClick={() => setLiveMode(false)}
            className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
              !liveMode ? 'bg-[var(--card)] text-orange-500 shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            Historical
          </button>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Demo indicator */}
        {demoMode && (
          <div data-tour="demo-mode" className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Activity size={12} className="text-amber-400" />
            <span className="text-[11px] font-medium text-amber-400">Demo Mode</span>
            <button
              onClick={toggleSimulation}
              className="ml-0.5 text-amber-400/70 hover:text-amber-300"
              title={simulationPaused ? 'Resume simulation' : 'Pause simulation'}
              aria-label={simulationPaused ? 'Resume simulation' : 'Pause simulation'}
            >
              {simulationPaused ? <Play size={12} /> : <Pause size={12} />}
            </button>
            <button
              onClick={resetDemo}
              className="text-amber-400/70 hover:text-amber-300"
              title="Reset Demo"
              aria-label="Reset Demo"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        )}

        {/* Notifications */}
        <div data-tour="notifications" className="relative">
          <button
            onClick={() => setNotificationsOpen(open => !open)}
            className={`relative p-2 rounded-lg transition-colors ${notificationsOpen ? 'bg-orange-500/10 text-orange-500' : 'text-[var(--muted-foreground)] hover:text-orange-500 hover:bg-[var(--muted)]'}`}
            aria-label={`Notifications${notifications.length ? ` (${notifications.length})` : ''}`}
            aria-expanded={notificationsOpen}
          >
            <Bell size={16} />
            {notifications.length > 0 && (
              <span className="absolute -right-1 -top-1 grid min-w-4 h-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {Math.min(notifications.length, 99)}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-1rem))] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--popover)] text-[var(--foreground)] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <div>
                  <p className="text-xs font-semibold">Dashboard Notifications</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Workflow and store-operation results</p>
                </div>
                {notifications.length > 0 && (
                  <button onClick={clearNotifications} className="text-[10px] font-medium text-orange-500 hover:text-orange-400">Clear all</button>
                )}
              </div>
              <div className="max-h-[420px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <Bell size={22} className="mx-auto text-[var(--muted-foreground)]" />
                    <p className="mt-3 text-xs font-medium">No notifications yet</p>
                    <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">Run a workflow containing Dashboard Notification.</p>
                  </div>
                ) : notifications.map(notification => (
                  <article key={notification.id} className="border-b border-[var(--border)] p-3 last:border-0 hover:bg-[var(--muted)]">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-orange-500/10 text-orange-500"><Bell size={13} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[11px] font-semibold leading-snug">{notification.title || 'Workflow notification'}</p>
                          {notification.demoData && <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[8px] uppercase text-amber-500">Demo</span>}
                        </div>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted-foreground)]">{notification.message}</p>
                        <div className="mt-2 flex items-center justify-between text-[9px] text-[var(--muted-foreground)]">
                          <span>{notification.storeId ? `Store ${notification.storeId}` : 'RetailTwin'}</span>
                          <time>{notification.createdAt ? new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</time>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          data-tour="help"
          onClick={() => window.dispatchEvent(new Event('retailtwin:start-tour'))}
          className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-orange-500 hover:bg-[var(--muted)] transition-colors"
          aria-label="Show page tour"
          title="Show page tour"
        >
          <CircleHelp size={16} />
        </button>

        {/* Theme */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-orange-500 hover:bg-[var(--muted)] transition-colors"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* System status */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[var(--muted)] border border-[var(--border)]">
          <Signal size={11} className="text-emerald-400" />
          <span className="text-[11px] text-gray-400">OK</span>
        </div>

        {/* User session */}
        <div className="relative">
          <button onClick={() => setUserMenuOpen(open => !open)} className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-[var(--muted)] sm:px-2" aria-label="Open user menu" aria-expanded={userMenuOpen}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 ring-2 ring-orange-500/15"><span className="text-[11px] font-bold text-white">RA</span></div>
            <div className="hidden text-left lg:block"><p className="max-w-36 truncate text-xs font-medium text-gray-200">{authUser?.displayName ?? 'Retail Administrator'}</p><p className="text-[9px] text-[var(--muted-foreground)]">{authUser?.role ?? 'ADMIN'}</p></div>
            <ChevronDown size={12} className="hidden text-[var(--muted-foreground)] lg:block" />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-11 z-50 w-60 rounded-xl border border-[var(--border)] bg-[var(--popover)] p-2 text-[var(--foreground)] shadow-2xl">
              <div className="border-b border-[var(--border)] px-2 py-2"><p className="truncate text-xs font-semibold">{authUser?.displayName}</p><p className="mt-0.5 truncate text-[10px] text-[var(--muted-foreground)]">{authUser?.email}</p></div>
              <button onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-red-500 hover:bg-red-500/10"><LogOut size={14} />Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
