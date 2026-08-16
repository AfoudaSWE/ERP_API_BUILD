import { HashRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell.jsx';
import CommandCenter from './features/dashboard/CommandCenter.jsx';
import DigitalTwin from './features/digital-twin/DigitalTwin.jsx';
import FootfallAnalytics from './features/footfall/FootfallAnalytics.jsx';
import QueueAnalytics from './features/queues/QueueAnalytics.jsx';
import SalesIntelligence from './features/sales/SalesIntelligence.jsx';
import InventoryPage from './features/inventory/InventoryPage.jsx';
import ProductPerformance from './features/products/ProductPerformance.jsx';
import StoresPage from './features/stores/StoresPage.jsx';
import AlertsPage from './features/alerts/AlertsPage.jsx';
import SettingsPage from './features/settings/SettingsPage.jsx';
import AIIntelligence from './features/ai/AIIntelligence.jsx';
import WorkflowList from './features/agent-workflows/pages/WorkflowList.jsx';
import WorkflowEditor from './features/agent-workflows/pages/WorkflowEditor.jsx';
import ExecutionsPage from './features/agent-workflows/pages/ExecutionsPage.jsx';
import ConnectionsPage from './features/agent-workflows/pages/ConnectionsPage.jsx';
import ToolsPage from './features/agent-workflows/pages/ToolsPage.jsx';
import WorkflowSettings from './features/agent-workflows/pages/WorkflowSettings.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import AutomationPage from './features/automation/AutomationPage.jsx';
import { PublicOnly, RequireAuth, RequirePermission } from './features/auth/AuthGuards.jsx';

// Public compatibility contract used by non-regression checks. Route composition below is unchanged.
export const RETAIL_ROUTE_PATHS = [
  '/', '/digital-twin', '/ai-intelligence', '/agent-workflows', '/agent-workflows/new',
  '/agent-workflows/:workflowId', '/agent-workflows/:workflowId/executions',
  '/agent-workflows/:workflowId/settings', '/agent-tools', '/agent-connections', '/footfall',
  '/queues', '/sales', '/inventory', '/products', '/stores', '/alerts', '/settings',
  '/automation',
];

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<CommandCenter />} />
            <Route path="/digital-twin" element={<DigitalTwin />} />
            <Route path="/ai-intelligence" element={<AIIntelligence />} />
            <Route path="/automation" element={<RequirePermission permission="automation:read"><AutomationPage /></RequirePermission>} />
            <Route path="/agent-workflows" element={<WorkflowList />} />
            <Route path="/agent-workflows/new" element={<WorkflowEditor />} />
            <Route path="/agent-workflows/:workflowId" element={<WorkflowEditor />} />
            <Route path="/agent-workflows/:workflowId/executions" element={<ExecutionsPage />} />
            <Route path="/agent-workflows/:workflowId/settings" element={<WorkflowSettings />} />
            <Route path="/agent-tools" element={<ToolsPage />} />
            <Route path="/agent-connections" element={<ConnectionsPage />} />
            <Route path="/footfall" element={<FootfallAnalytics />} />
            <Route path="/queues" element={<QueueAnalytics />} />
            <Route path="/sales" element={<SalesIntelligence />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/products" element={<ProductPerformance />} />
            <Route path="/stores" element={<StoresPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  );
}
