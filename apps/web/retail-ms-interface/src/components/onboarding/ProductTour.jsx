import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import 'intro.js/introjs.css';

// Increment this whenever the tour copy or steps materially change so returning
// users receive the improved page guidance once.
const TOUR_VERSION = 'v8';

const PAGE_DETAILS = {
  dashboard: {
    title: 'Command Center',
    intro: 'This is the executive view of the selected store. Review live occupancy, visitors, sales, conversion, queue health, inventory alerts, operating trends, and the AI-generated operations brief in one place.',
  },
  'digital-twin': {
    title: 'Live Digital Twin',
    intro: 'Explore a real-time 3D replay of the store. Use camera-derived spatial activity, zones, paths, and playback controls to understand how customers move through the floor.',
  },
  'ai-intelligence': {
    title: 'AI Intelligence',
    intro: 'Review predictive operational insights produced by the local AI runtime. This page brings together forecasts, recommended actions, capability status, and model-backed retail analysis.',
  },
  'workflow-list': {
    title: 'Agent Workflows',
    intro: 'Create and manage visual retail automations. Search existing workflows, check their status and latest runs, open execution history, or begin with a ready-made retail template.',
  },
  'workflow-editor': {
    title: 'Workflow Builder',
    intro: 'Design an event-driven automation by placing and connecting nodes. Configure triggers, local AI agents, tools, approvals, and notifications, then validate, publish, and run the workflow.',
  },
  'workflow-executions': {
    title: 'Execution History',
    intro: 'Inspect every run for this workflow. Filter by status, select an execution, and review its node path, model interactions, tool calls, approvals, retries, timing, and errors.',
  },
  'workflow-settings': {
    title: 'Workflow Settings',
    intro: 'Set the workflow’s execution guardrails. Review runtime and concurrency limits, retry behavior, data retention, store scope, role permissions, approvals, and audit controls.',
  },
  'agent-tools': {
    title: 'Agent Tools',
    intro: 'Review the governed capabilities available to workflows. Each tool shows its server, risk level, approval requirement, allowed roles, input contract, and test controls.',
  },
  'agent-connections': {
    title: 'Agent Connections',
    intro: 'Manage the services used by AI workflows. Check the local Ollama runtime, test connectivity, and configure MCP connection records while keeping credentials protected.',
  },
  footfall: {
    title: 'Footfall Analytics',
    intro: 'Understand customer traffic and occupancy. Compare entries and exits, peak hours, visit duration, returning visitors, capacity use, weekday patterns, and customer-to-staff ratios.',
  },
  queues: {
    title: 'Queue Analytics',
    intro: 'Monitor checkout performance and customer wait times. See live counter status, queue length, average and P95 waits, service speed, abandonment, throughput, and optimization recommendations.',
  },
  sales: {
    title: 'Sales Intelligence',
    intro: 'Analyze revenue and conversion performance. Track sales, transactions, basket value, margin, returns, hourly and category trends, payment methods, top products, cashiers, and recent purchases.',
  },
  inventory: {
    title: 'Inventory',
    intro: 'Monitor stock health and replenishment needs. Review inventory value, low and out-of-stock items, accuracy, turnover, pending transfers, category value, and individual product levels.',
  },
  products: {
    title: 'Product Performance',
    intro: 'See how shoppers engage with products from view to purchase. Compare views, pick-ups, conversion, returns, estimated lost sales, engagement funnels, and item-level performance.',
  },
  stores: {
    title: 'Stores',
    intro: 'Compare the branch network from one command center. Review each location’s status and operating KPIs, then use the network map and branch overview to spot differences between stores.',
  },
  alerts: {
    title: 'Alerts',
    intro: 'Triage operational issues across the selected store. Review active and critical alerts, filter the list, inspect severity and timing, and acknowledge or resolve items that need action.',
  },
  settings: {
    title: 'Settings',
    intro: 'Configure store and system behavior. Manage the store profile, hours, capacity, queue and alert thresholds, locale, connected devices, retention, privacy, and demo simulation controls.',
  },
  workspace: {
    title: 'RetailTwin AI',
    intro: 'Use this workspace to monitor store operations, explore analytics, and act on AI-assisted recommendations. The controls highlighted next apply to the page you are viewing.',
  },
};

function tourKey(pathname) {
  if (pathname === '/') return 'dashboard';
  if (pathname === '/digital-twin') return 'digital-twin';
  if (pathname === '/ai-intelligence') return 'ai-intelligence';
  if (pathname === '/agent-workflows') return 'workflow-list';
  if (/^\/agent-workflows\/[^/]+\/executions$/.test(pathname)) return 'workflow-executions';
  if (/^\/agent-workflows\/[^/]+\/settings$/.test(pathname)) return 'workflow-settings';
  if (pathname === '/agent-workflows/new' || /^\/agent-workflows\/[^/]+$/.test(pathname)) return 'workflow-editor';
  if (pathname === '/agent-tools') return 'agent-tools';
  if (pathname === '/agent-connections') return 'agent-connections';
  if (pathname === '/footfall') return 'footfall';
  if (pathname === '/queues') return 'queues';
  if (pathname === '/sales') return 'sales';
  if (pathname === '/inventory') return 'inventory';
  if (pathname === '/products') return 'products';
  if (pathname === '/stores') return 'stores';
  if (pathname === '/alerts') return 'alerts';
  if (pathname === '/settings') return 'settings';
  return 'workspace';
}

const existing = (steps) => steps.flatMap((step) => {
  if (!step.element || typeof step.element !== 'string') return [step];
  const matches = [...document.querySelectorAll(step.element)];
  const target = matches.find((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  });
  return target ? [{ ...step, element: target }] : [];
});

function pageSteps(pathname) {
  const details = PAGE_DETAILS[tourKey(pathname)] ?? PAGE_DETAILS.workspace;
  const welcome = { title: details.title, intro: `${details.intro} Use the buttons or arrow keys to explore this page.` };
  const common = [
    { element: '[data-tour="primary-navigation"]', title: 'Workspace navigation', intro: 'Open analytics, digital twin, inventory, alerts, agent workflows, tools, and connections.', position: 'right' },
    { element: '[data-tour="store-selector"]', title: 'Choose a store', intro: 'Dashboard and workflow data stay scoped to this retail location.', position: 'bottom' },
    { element: '[data-tour="notifications"]', title: 'Dashboard notifications', intro: 'Workflow recommendations and store-operation results appear here.', position: 'bottom' },
  ];
  if (pathname === '/') return [welcome, ...common,
    { element: '[data-tour="live-mode"]', title: 'Live or historical', intro: 'Switch between current operational data and historical analysis.', position: 'bottom' },
    { element: '[data-tour="demo-mode"]', title: 'Demo controls', intro: 'Pause or reset the RetailTwin simulation during a presentation.', position: 'bottom' },
    { element: '[data-tour="command-kpis"]', title: 'Executive operating pulse', intro: 'Use these KPIs to assess the store at a glance: current occupancy, visitor volume, sales, conversion, traffic balance, basket value, checkout wait, and inventory risk.', position: 'bottom' },
    { element: '[data-tour="command-demand"]', title: 'Connect demand to store capacity', intro: 'Compare hourly footfall with sales to see whether traffic converts into revenue, then check occupancy against capacity to identify crowding or underused trading periods.', position: 'top' },
    { element: '[data-tour="command-performance"]', title: 'Find performance opportunities', intro: 'Follow the visitor-to-purchase funnel, compare zones, and inspect category revenue to locate conversion loss, weak areas, and the product groups driving the day.', position: 'top' },
    { element: '[data-tour="command-actions"]', title: 'Prioritize operational action', intro: 'Review average and worst-case queue waits alongside the AI operations brief to decide where managers should intervene next.', position: 'top' },
  ];
  if (pathname === '/digital-twin') return [welcome,
    { element: '[data-tour="twin-health"]', title: 'Live operational health', intro: 'Start with the business signals that need attention now: people inside, checkout demand and wait time, edge-inference latency, and camera availability.', position: 'bottom' },
    { element: '[data-tour="twin-scene"]', title: 'Understand movement in context', intro: 'The 3D floor view turns anonymous camera detections into operational context. Orbit the store and select a zone or person to investigate occupancy, dwell, customer flow, queues, and purchase intent.', position: 'right' },
    { element: '[data-tour="twin-controls"]', title: 'Change the operational view', intro: 'Pause or reset the feed, adjust zoom, and overlay heat intensity, cameras, fixtures, or movement paths to answer different store-performance questions.', position: 'bottom' },
    { element: '[data-tour="twin-replay"]', title: 'Review what happened', intro: 'Move through the one-hour timeline to investigate a specific moment, compare conditions before and after an event, or replay the customer journey at one-second intervals.', position: 'top' },
    { element: '[data-tour="twin-inspector"]', title: 'Inspect zones and customer journeys', intro: 'Selecting an object reveals the details behind the scene: zone utilization, dwell and queue conditions, or an anonymous track’s source camera, confidence, velocity, path, and purchase signal.', position: 'left' },
    { element: '[data-tour="twin-activity"]', title: 'Follow operational events', intro: 'The activity stream records entrances, exits, zone movement, queue alerts, and purchase signals as they occur, giving operators a chronological account of store activity.', position: 'left' },
  ];
  if (pathname === '/ai-intelligence') return [welcome,
    { element: '[data-tour="ai-runtime"]', title: 'Private local intelligence', intro: 'Check whether the local Ollama model is ready. Forecast calculations stay in the app, while briefs, explanations, and copilot answers use only aggregated anonymous store data.', position: 'bottom' },
    { element: '[data-tour="ai-forecast"]', title: 'Plan for expected demand', intro: 'Use the eight-hour footfall forecast and confidence range to anticipate staffing, checkout, replenishment, and floor-support needs before traffic arrives.', position: 'right' },
    { element: '[data-tour="ai-brief"]', title: 'Turn signals into a manager brief', intro: 'Generate a concise summary of current conditions, prioritized risks and opportunities, and a practical four-hour action plan for the store team.', position: 'left' },
    { element: '[data-tour="ai-capabilities"]', title: 'Review decision engines', intro: 'Filter continuously evaluated retail capabilities to find forecasts, anomalies, risks, and recommended actions. Ask the copilot to explain any insight and produce an implementation plan.', position: 'top' },
    { element: '[data-tour="ai-copilot"]', title: 'Ask questions in store context', intro: 'Use the operations copilot to explain why a signal changed, predict what may happen next, or request a grounded action plan based on the current store.', position: 'top' },
  ];
  if (pathname === '/footfall') return [welcome,
    { element: '[data-tour="footfall-kpis"]', title: 'Measure traffic and occupancy', intro: 'Assess demand through visitors, entries and exits, current capacity use, peak hour, visit duration, repeat visits, and the customer-to-staff ratio.', position: 'bottom' },
    { element: '[data-tour="footfall-trends"]', title: 'Understand when customers arrive', intro: 'Compare hourly entry and exit flows for today, then use the 30-day trend to distinguish a temporary spike from a sustained traffic change.', position: 'top' },
    { element: '[data-tour="footfall-patterns"]', title: 'Plan schedules around behavior', intro: 'Weekday patterns reveal which days need more coverage, while visit-duration distribution shows whether customers browse deeply or leave quickly.', position: 'top' },
  ];
  if (pathname === '/queues') return [welcome,
    { element: '[data-tour="queue-kpis"]', title: 'Assess checkout service health', intro: 'Monitor customers waiting, average and P95 wait, service time, payment gaps, abandonment, hourly throughput, and available counters to see whether service matches demand.', position: 'bottom' },
    { element: '[data-tour="queue-counters"]', title: 'Act at the counter level', intro: 'Compare each checkout’s status, queue, wait, cashier, and throughput to decide where to open capacity, rebalance staff, or investigate a slow terminal.', position: 'bottom' },
    { element: '[data-tour="queue-analysis"]', title: 'Find pressure periods and causes', intro: 'Use queue length and wait trends to locate service peaks, then compare cashier throughput to determine whether demand, staffing, or service speed is driving delays.', position: 'top' },
    { element: '[data-tour="queue-recommendations"]', title: 'Apply queue improvements', intro: 'Prioritized recommendations translate the observed queue conditions into concrete operational actions for checkout leaders.', position: 'top' },
  ];
  if (pathname === '/sales') return [welcome,
    { element: '[data-tour="sales-kpis"]', title: 'Read commercial performance', intro: 'Review gross and net sales, transactions, basket size, revenue per visitor, conversion, returns, margin, and units sold to understand both revenue and quality of sales.', position: 'bottom' },
    { element: '[data-tour="sales-trends"]', title: 'See when and where revenue is earned', intro: 'Hourly sales identify trading peaks and gaps, while category revenue shows which parts of the assortment are contributing most to today’s result.', position: 'top' },
    { element: '[data-tour="sales-mix"]', title: 'Understand payment and product mix', intro: 'Compare payment preferences and the products generating the most revenue to support merchandising, availability, and checkout decisions.', position: 'top' },
    { element: '[data-tour="sales-funnel"]', title: 'Locate conversion loss', intro: 'Follow customers from store visit through engagement and purchase to see where demand drops before becoming a transaction.', position: 'top' },
    { element: '[data-tour="sales-cashiers"]', title: 'Compare cashier performance', intro: 'Use transactions, revenue, service time, and average basket together to recognize strong performance and target coaching or process support.', position: 'top' },
    { element: '[data-tour="sales-transactions"]', title: 'Audit recent sales activity', intro: 'Inspect transaction-level details such as terminal, cashier, time, items, value, and payment method to validate the aggregated sales picture.', position: 'top' },
  ];
  if (pathname === '/inventory') return [welcome,
    { element: '[data-tour="inventory-kpis"]', title: 'Assess stock risk and efficiency', intro: 'Track stock value and range size alongside low, critical, and out-of-stock counts, accuracy, turnover, and pending transfers to balance availability with working capital.', position: 'bottom' },
    { element: '[data-tour="inventory-health"]', title: 'See where inventory is concentrated', intro: 'The health distribution shows the scale of immediate stock issues, while category value reveals where inventory investment and exposure are highest.', position: 'top' },
    { element: '[data-tour="inventory-products"]', title: 'Prioritize product-level action', intro: 'Search and filter SKUs, compare on-hand and available units with reorder points and sales velocity, and open a product to investigate replenishment needs.', position: 'top' },
  ];
  if (pathname === '/products') return [welcome,
    { element: '[data-tour="product-kpis"]', title: 'Measure product engagement quality', intro: 'Track views, engagement, pick-up, purchase conversion, returns, and estimated lost sales to understand whether shopper interest becomes profitable demand.', position: 'bottom' },
    { element: '[data-tour="product-funnel"]', title: 'Find where product interest is lost', intro: 'Follow shoppers from zone visit through product view, engagement, pick-up, and purchase. Stage-to-stage conversion reveals where merchandising or availability needs attention.', position: 'top' },
    { element: '[data-tour="product-filters"]', title: 'Focus on actionable exceptions', intro: 'Search the assortment or filter for patterns such as high engagement with low conversion, fast sellers with low stock, weak engagement, high returns, or pick-up without purchase.', position: 'bottom' },
    { element: '[data-tour="product-cards"]', title: 'Compare products in business context', intro: 'Each product combines engagement, sales, conversion, stock, revenue, trend, category, and zone so teams can choose the right merchandising, pricing, or replenishment response.', position: 'top' },
  ];
  if (pathname === '/stores') return [welcome,
    { element: '[data-tour="stores-network"]', title: 'Navigate the branch network', intro: 'Review every branch’s operating status and performance score, then select a location to make it the active store for dashboard and analytics data.', position: 'bottom' },
    { element: '[data-tour="stores-focus"]', title: 'Know where leadership attention is needed', intro: 'The best-performing branch establishes the current benchmark, while the at-risk panel identifies locations that need investigation or support.', position: 'bottom' },
    { element: '[data-tour="stores-overview"]', title: 'Compare branch operations', intro: 'Review traffic, sales, conversion, queues, stock alerts, device health, and overall score for each store. Select two or more branches to create a direct comparison.', position: 'top' },
    { element: '[data-tour="stores-comparison"]', title: 'Diagnose branch differences', intro: 'The comparison table places selected branches side by side across visitors, sales, conversion, queue wait, score, and staffing to expose the source of performance gaps.', position: 'top' },
    { element: '[data-tour="stores-ranking"]', title: 'Benchmark network performance', intro: 'Use the full ranking to compare every branch consistently and identify leaders, lagging stores, and unusual trade-offs between demand, revenue, conversion, and service.', position: 'top' },
  ];
  if (pathname === '/alerts') return [welcome,
    { element: '[data-tour="alerts-summary"]', title: 'Prioritize by operational severity', intro: 'The severity summary shows the active workload from critical through low priority. Select a severity to focus immediately on the most consequential store issues.', position: 'bottom' },
    { element: '[data-tour="alerts-filters"]', title: 'Control the response queue', intro: 'Combine severity and lifecycle status filters to separate new incidents from acknowledged work and completed resolutions.', position: 'bottom' },
    { element: '[data-tour="alerts-list"]', title: 'Investigate and own each incident', intro: 'Each alert identifies the affected store or zone, time, severity, and status. Expand it for context and a suggested action, then acknowledge, assign, or resolve it to maintain clear ownership.', position: 'top' },
  ];
  if (pathname === '/settings') return [welcome,
    { element: '[data-tour="settings-sections"]', title: 'Configure by operating domain', intro: 'Move between store identity, hours, occupancy, queue thresholds, alert delivery, regional formats, devices, retention, privacy, and demo controls.', position: 'right' },
    { element: '[data-tour="settings-content"]', title: 'Set the rules behind operations', intro: 'The selected section controls how the platform interprets store conditions and behaves—for example when capacity or queue warnings trigger, which devices are registered, and how data is protected.', position: 'left' },
    { element: '[data-tour="settings-save"]', title: 'Apply configuration changes', intro: 'Save after reviewing the active section so the updated operating thresholds and preferences are retained.', position: 'top' },
  ];
  if (pathname === '/agent-workflows') return [welcome,
    { element: '[data-tour="workflow-create"]', title: 'Build from an empty canvas', intro: 'Create a workflow when you want to define the trigger, decision logic, tools, approvals, and notifications yourself.', position: 'left' },
    { element: '[data-tour="workflow-filters"]', title: 'Find the automation you need', intro: 'Search by workflow name, owner, or tag; separate active automations from drafts; and switch between grid and list views.', position: 'bottom' },
    { element: '[data-tour="workflow-catalog"]', title: 'Open and manage workflows', intro: 'Open a workflow to edit its nodes. Each card also shows its version, success rate, and today’s run count, with shortcuts for execution history, duplication, activation, and deletion.', position: 'top' },
    { element: '[data-tour="workflow-templates"]', title: 'Start with a proven retail flow', intro: 'Choose a template to create a pre-connected workflow for queue response, inventory, manager briefs, device recovery, or simulation, then customize its nodes.', position: 'top' },
  ];
  if (pathname === '/agent-workflows/new' || /^\/agent-workflows\/[^/]+$/.test(pathname)) return [welcome,
    { element: '[data-tour="node-library"]', title: '1. Add the building blocks', intro: 'Drag a retail trigger onto the canvas, then add local AI agents, governed tools, human approvals, logic, and notifications. Templates in this panel can populate a complete starting graph.', position: 'right' },
    { element: '[data-tour="workflow-canvas"]', title: '2. Arrange, connect, and select nodes', intro: 'Drop nodes here and connect an upstream orange plus handle to the next node. Click any node to see its details on the right; drag to reposition, use the controls to pan or zoom, and press Delete to remove a selection.', position: 'left' },
    { element: '[data-tour="node-config"]', title: '3. Find details for the selected node', intro: 'The right panel always reflects the node you clicked. It identifies what the node does and exposes the settings relevant to that node type. Click the canvas background or the close icon to clear the selection.', position: 'left' },
    { element: '[data-tour="node-config-summary"]', title: 'Confirm which node is selected', intro: 'The panel header shows the selected node’s label and business purpose, so you can confirm you are editing the correct step in the workflow.', position: 'left' },
    { element: '[data-tour="node-config-fields"]', title: 'Configure the selected node', intro: 'Edit its label and type-specific details here. A trigger exposes its retail event; an AI node exposes role, instruction, model, steps, and temperature. Every node includes timeout, retry count, error behavior, upstream-input guidance, testing, and deletion.', position: 'left' },
    { element: '[data-tour="workflow-toolbar"]', title: '4. Validate and release the workflow', intro: 'Name and save the draft, validate graph structure, publish a version, activate it for events, or execute it immediately. Auto-layout, import, export, version history, and governance settings are also available here.', position: 'bottom' },
    { element: '[data-tour="execution-panel"]', title: '5. Inspect the run', intro: 'Execute the workflow, then expand this log to follow node-by-node status, timings, Ollama responses, tool output, errors, and any approval request. Use execution history for completed run traces.', position: 'top' },
  ];
  if (pathname === '/agent-tools') return [welcome,
    { element: '[data-tour="agent-tools"]', title: 'Governed tool registry', intro: 'Review allow-listed capabilities, risk, approvals, servers, and permitted roles.', position: 'top' },
  ];
  if (pathname === '/agent-connections') return [welcome,
    { element: '[data-tour="agent-connections"]', title: 'Agent connections', intro: 'Test local Ollama and configure MCP connection records without exposing secrets.', position: 'top' },
  ];
  return [welcome];
}

export async function startProductTour(pathname) {
  if (tourKey(pathname) === 'workflow-editor') {
    window.dispatchEvent(new Event('retailtwin:tour-select-node'));
    // React needs a paint after selecting the first existing node before the
    // tour resolves the node-detail targets in the configuration panel.
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
  }
  const steps = existing(pageSteps(pathname));
  if (!steps.length) return null;
  const { default: introJs } = await import('intro.js');
  const tour = introJs.tour();
  tour.setOptions({
    steps, nextLabel: 'Next', prevLabel: 'Back', doneLabel: 'Finish',
    showButtons: true, showBullets: true, showProgress: true,
    exitOnOverlayClick: false, scrollToElement: true, scrollPadding: 24,
    overlayOpacity: 0.62, tooltipClass: 'retailtwin-tour', highlightClass: 'retailtwin-tour-highlight',
  });
  tour.start();
  return tour;
}

export default function ProductTour() {
  const { pathname } = useLocation();
  const active = useRef(null);

  useEffect(() => {
    const launch = async () => {
      active.current?.exit?.();
      active.current = await startProductTour(pathname);
    };
    window.addEventListener('retailtwin:start-tour', launch);
    return () => window.removeEventListener('retailtwin:start-tour', launch);
  }, [pathname]);

  useEffect(() => {
    const key = `retailtwin-tour-${TOUR_VERSION}-${tourKey(pathname)}`;
    if (localStorage.getItem(key)) return;
    const timer = window.setTimeout(async () => {
      const tour = await startProductTour(pathname);
      active.current = tour;
      if (!tour) return;
      const remember = () => localStorage.setItem(key, 'seen');
      tour.onComplete(remember);
      tour.onExit(remember);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
