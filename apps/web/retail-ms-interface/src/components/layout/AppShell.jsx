import { Outlet } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { useEffect } from 'react';
import ProductTour from '../onboarding/ProductTour.jsx';
import CopilotChat from '../ai/CopilotChat.jsx';

export default function AppShell() {
  const sidebarCollapsed = useAppStore(s => s.sidebarCollapsed);
  const sidebarOpen = useAppStore(s => s.sidebarOpen);
  const setSidebarOpen = useAppStore(s => s.setSidebarOpen);
  const theme = useAppStore(s => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="min-h-screen app-surface">
      <ProductTour />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-40 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar mobile onNavigate={() => setSidebarOpen(false)} />
      </div>

      <Topbar />
      <CopilotChat />
      <main
        className={`pt-14 min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-[240px]'
        }`}
      >
        <div className="p-3 sm:p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
