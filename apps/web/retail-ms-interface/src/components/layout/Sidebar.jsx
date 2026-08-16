import { NavLink } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import {
  LayoutDashboard, Map, Footprints, Users, ShoppingCart,
  Package, BarChart3, Building2, Bell, Settings,
  ChevronLeft, ChevronRight, Shield, X, BrainCircuit, Workflow
} from 'lucide-react';
import logoUrl from '../../assets/2B_idOyAcQyQk_0.png';

const NAV_ITEMS = [
  { path: '/', label: 'Command Center', icon: LayoutDashboard },
  { path: '/ai-intelligence', label: 'AI Intelligence', icon: BrainCircuit },
  { path: '/agent-workflows', label: 'Agent Workflows', icon: Workflow },
  { path: '/automation', label: 'N8N', icon: N8nIcon, permission: 'automation:read' },
  { path: '/digital-twin', label: 'Live Digital Twin', icon: Map },
  { path: '/footfall', label: 'Footfall Analytics', icon: Footprints },
  { path: '/queues', label: 'Queue Analytics', icon: Users },
  { path: '/sales', label: 'Sales Intelligence', icon: ShoppingCart },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/products', label: 'Product Performance', icon: BarChart3 },
  { path: '/stores', label: 'Stores', icon: Building2 },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/settings', label: 'Settings', icon: Settings },
];

function N8nIcon({ size = 18, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5.2 7.1 9.1 12m1.8 0 3.3-4.2m1.7-.2 3 3.5m-8 1.8 3.2 3.6m1.9.2 3.1-3.9" />
      <circle cx="4" cy="5.7" r="2.1" />
      <circle cx="10" cy="12" r="2.1" />
      <circle cx="15.2" cy="6.2" r="2.1" />
      <circle cx="15.4" cy="17.9" r="2.1" />
      <circle cx="20" cy="12" r="2.1" />
    </svg>
  );
}

export default function Sidebar({ mobile = false, onNavigate }) {
  const sidebarCollapsed = useAppStore(s => s.sidebarCollapsed);
  const toggleSidebar = useAppStore(s => s.toggleSidebar);
  const permissions = useAppStore(s => s.authUser?.permissions || []);

  const isCollapsed = mobile ? false : sidebarCollapsed;

  return (
    <aside
      data-tour="primary-navigation"
      className={`${mobile ? 'w-[280px]' : 'fixed left-0 top-0'} z-40 h-dvh flex flex-col transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-[68px]' : 'w-[240px]'}
        sidebar-surface border-r shadow-[4px_0_24px_rgba(0,0,0,0.04)]`}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 border-b border-[var(--border)] shrink-0 ${isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3'}`}>
        <div className="w-15 h-9 rounded-lg  flex items-center justify-center shrink-0 shadow-sm ring-1 ring-white/10 overflow-hidden">
          <img src={logoUrl} alt="RetailTwin logo" className="w-25 h-auto object-contain" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="text-sm font-bold text-[var(--foreground)] tracking-tight leading-tight">RetailTwin</p>
            <p className="text-[9px] text-[var(--muted-foreground)] mt-0.5 tracking-[0.12em] uppercase whitespace-nowrap">Store Intelligence</p>
          </div>
        )}
        {mobile && (
          <button
            type="button"
            onClick={onNavigate}
            className="ml-auto grid h-8 w-8 place-items-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label="Close menu"
          >
            <X size={17} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto no-scrollbar" aria-label="Primary navigation">
        {!isCollapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            Workspace
          </p>
        )}
        <div className="space-y-0.5">
          {NAV_ITEMS.filter(item => !item.permission || permissions.includes(item.permission)).map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200
                ${isActive
                  ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-sm shadow-orange-500/5'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] border border-transparent'
                }
                ${isCollapsed ? 'justify-center px-2' : ''}`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Privacy indicator */}
      {!isCollapsed && (
        <div className="px-3 py-2 mx-2 mb-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
          <div className="flex items-center gap-2 text-[11px] text-emerald-400">
            <Shield size={12} />
            <span>Privacy-First Analytics</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
            Anonymous tracking · No face recognition · Edge processing
          </p>
        </div>
      )}

      {/* Collapse button (desktop only) */}
      {!mobile && (
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center h-10 border-t border-[var(--border)] text-[var(--muted-foreground)] hover:text-orange-500 transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}
    </aside>
  );
}
