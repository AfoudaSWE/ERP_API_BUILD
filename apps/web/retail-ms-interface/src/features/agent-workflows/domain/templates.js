import { catalogByType, createWorkflowNode } from './catalog';

const build = (id, name, description, types, options = {}) => {
  const nodes = types.map((type, index) => {
    const node = createWorkflowNode(type, { x: 80 + index * 260, y: 140 + (index % 2) * 60 });
    node.id = `${id}_${index}`;
    if (index === 0) node.data.config = { ...node.data.config, ...options.triggerConfig };
    return node;
  });
  const trigger = catalogByType[types[0]];
  return {
    id,
    name,
    description,
    category: options.category,
    outcome: options.outcome,
    recommendedFor: options.recommendedFor,
    setup: options.setup,
    complexity: types.length <= 6 ? 'Starter' : types.length <= 8 ? 'Intermediate' : 'Advanced',
    triggerLabel: trigger?.label ?? 'Trigger',
    requiresApproval: types.includes('humanApproval'),
    nodes,
    edges: nodes.slice(1).map((node, index) => ({
      id: `${id}_e${index}`,
      source: nodes[index].id,
      target: node.id,
      type: 'smoothstep',
      animated: false,
    })),
  };
};

export const WORKFLOW_TEMPLATES = [
  build('queue-congestion', 'Queue Congestion Response', 'Detect checkout pressure, recommend added capacity, request approval, and assign the response.', ['retailEventTrigger', 'getQueueMetrics', 'if', 'queueOptimizationAgent', 'recommendOpeningCheckout', 'humanApproval', 'createOperationsTask', 'dashboardNotification'], {
    category: 'Checkout', outcome: 'Shorter waits and accountable counter-opening actions.', recommendedFor: 'Branch managers and checkout leads', setup: 'Review the queue threshold and approval role.', triggerConfig: { eventType: 'QUEUE_THRESHOLD_EXCEEDED' },
  }),
  build('low-stock', 'Low Stock Replenishment', 'Calculate days of cover and turn a stock warning into an approved purchase request.', ['inventoryEventTrigger', 'getProductStock', 'calculateDaysCover', 'inventoryAgent', 'createReorderRecommendation', 'if', 'humanApproval', 'createPurchaseRequest', 'dashboardNotification'], {
    category: 'Inventory', outcome: 'Earlier replenishment with a governed purchasing decision.', recommendedFor: 'Inventory controllers and buyers', setup: 'Set reorder policy, supplier context, and approver.', triggerConfig: { eventType: 'LOW_STOCK_DETECTED' },
  }),
  build('branch-transfer', 'Branch Stock Transfer', 'Search nearby availability and recommend a controlled inter-branch transfer for an unavailable item.', ['inventoryEventTrigger', 'checkStockAvailability', 'compareBranches', 'inventoryAgent', 'suggestBranchTransfer', 'humanApproval', 'createOperationsTask', 'dashboardNotification'], {
    category: 'Inventory', outcome: 'Recover sales using network stock before raising a purchase.', recommendedFor: 'Inventory and branch operations teams', setup: 'Confirm eligible branches, transfer limits, and approver.', triggerConfig: { eventType: 'OUT_OF_STOCK_DETECTED' },
  }),
  build('daily-brief', 'Daily Store Manager Brief', 'Combine traffic, sales, queues, and alerts into a concise scheduled management brief.', ['scheduleTrigger', 'getFootfallData', 'getSalesMetrics', 'getQueueMetrics', 'getActiveAlerts', 'retailAnalystAgent', 'createReport', 'dashboardNotification'], {
    category: 'Management', outcome: 'A consistent daily view of priorities and recommended actions.', recommendedFor: 'Store and regional managers', setup: 'Choose delivery time and the stores included.', triggerConfig: { cron: '0 8 * * *' },
  }),
  build('conversion-drop', 'Conversion Drop Investigation', 'Investigate whether traffic, products, or checkout conditions explain a conversion decline.', ['retailEventTrigger', 'getFootfallData', 'getSalesMetrics', 'getProductPerformance', 'getQueueMetrics', 'retailAnalystAgent', 'createReport', 'createOperationsTask', 'dashboardNotification'], {
    category: 'Sales', outcome: 'A documented root-cause hypothesis and assigned recovery action.', recommendedFor: 'Commercial and store operations teams', setup: 'Set the conversion-drop threshold and task owner.', triggerConfig: { eventType: 'CONVERSION_RATE_DROPPED' },
  }),
  build('device-failure', 'Device Failure Response', 'Verify a device outage, retry health checks, and escalate unresolved failures to maintenance.', ['deviceEventTrigger', 'getDeviceHealth', 'delay', 'getDeviceHealth', 'if', 'humanApproval', 'createMaintenanceTicket', 'dashboardNotification'], {
    category: 'Devices', outcome: 'Faster recovery with fewer unnecessary maintenance tickets.', recommendedFor: 'Store support and facilities teams', setup: 'Choose device scope, retry delay, and maintenance approver.', triggerConfig: { eventType: 'DEVICE_OFFLINE' },
  }),
  build('customer-rush', 'Customer Rush Response', 'Assess a sudden traffic increase and produce a manager-ready staffing and checkout response.', ['retailEventTrigger', 'getLiveOccupancy', 'getQueueMetrics', 'storeOperationsAgent', 'generateManagerBrief', 'dashboardNotification'], {
    category: 'Operations', outcome: 'A rapid response plan before queues and service levels deteriorate.', recommendedFor: 'Duty managers and floor leaders', setup: 'Set the occupancy event and notification recipients.', triggerConfig: { eventType: 'OCCUPANCY_THRESHOLD_EXCEEDED' },
  }),
  build('opening-readiness', 'Store Opening Readiness Check', 'Check devices, stock risks, and unresolved alerts before trading begins.', ['scheduleTrigger', 'getDeviceHealth', 'findOutOfStock', 'getActiveAlerts', 'storeOperationsAgent', 'generateManagerBrief', 'dashboardNotification'], {
    category: 'Operations', outcome: 'A prioritized opening checklist before customers arrive.', recommendedFor: 'Opening managers and duty teams', setup: 'Schedule it before opening and confirm device/store scope.', triggerConfig: { cron: '30 7 * * *' },
  }),
  build('closing-summary', 'End-of-Day Performance Summary', 'Summarize sales, traffic, queues, and exceptions at the end of the trading day.', ['scheduleTrigger', 'getSalesMetrics', 'getFootfallData', 'getQueueMetrics', 'getActiveAlerts', 'retailAnalystAgent', 'createReport', 'dashboardNotification'], {
    category: 'Management', outcome: 'A repeatable close-of-day record for handover and review.', recommendedFor: 'Closing managers and regional leaders', setup: 'Set closing time and report recipients.', triggerConfig: { cron: '15 22 * * *' },
  }),
  build('critical-alert-triage', 'Critical Alert Triage', 'Assess a new alert, recommend the response, obtain approval, and update its ownership status.', ['alertTrigger', 'getActiveAlerts', 'storeOperationsAgent', 'humanApproval', 'updateAlertStatus', 'dashboardNotification'], {
    category: 'Risk', outcome: 'Clear ownership and a governed response to high-impact incidents.', recommendedFor: 'Duty managers and operations control', setup: 'Filter eligible severities and define the approving role.', triggerConfig: { eventType: 'ALERT_CREATED' },
  }),
  build('pos-outage', 'POS Outage Recovery', 'Confirm a POS outage, retry its status, and create a maintenance response if it remains unavailable.', ['posEventTrigger', 'getPosStatus', 'delay', 'getPosStatus', 'if', 'humanApproval', 'createMaintenanceTicket', 'dashboardNotification'], {
    category: 'Checkout', outcome: 'Reduced checkout disruption with traceable escalation.', recommendedFor: 'Checkout leads and technical support', setup: 'Set retry delay, POS scope, and ticket approver.', triggerConfig: { eventType: 'POS_OFFLINE' },
  }),
  build('checkout-abandonment', 'Queue Abandonment Prevention', 'Detect deteriorating queue conditions and assign an approved intervention before customers leave.', ['queueEventTrigger', 'getQueueMetrics', 'if', 'queueOptimizationAgent', 'recommendOpeningCheckout', 'humanApproval', 'createOperationsTask', 'dashboardNotification'], {
    category: 'Customer Experience', outcome: 'Lower abandonment through earlier staffing and counter decisions.', recommendedFor: 'Customer experience and checkout teams', setup: 'Set wait and abandonment thresholds plus approver.', triggerConfig: { eventType: 'WAIT_TIME_THRESHOLD_EXCEEDED' },
  }),
  build('high-returns', 'High Returns Investigation', 'Analyze product and sales signals, explain likely return drivers, and assign corrective action.', ['manualTrigger', 'getProductPerformance', 'getSalesMetrics', 'salesAnalystAgent', 'generateManagerBrief', 'humanApproval', 'createOperationsTask', 'dashboardNotification'], {
    category: 'Products', outcome: 'A focused action plan for quality, ranging, pricing, or sales-process issues.', recommendedFor: 'Category managers and commercial teams', setup: 'Select the product/category scope and action approver.',
  }),
  build('weekly-branch-review', 'Weekly Branch Performance Review', 'Compare branches and generate a consistent weekly performance review with improvement priorities.', ['scheduleTrigger', 'compareBranches', 'getSalesMetrics', 'getFootfallData', 'getQueueMetrics', 'retailAnalystAgent', 'createReport', 'dashboardNotification'], {
    category: 'Management', outcome: 'Comparable branch benchmarks and clearly ranked improvement priorities.', recommendedFor: 'Regional and area managers', setup: 'Choose comparison branches and weekly delivery time.', triggerConfig: { cron: '0 9 * * 1' },
  }),
  build('inventory-audit', 'Scheduled Inventory Risk Audit', 'Review movements and availability to identify low-stock, stockout, and control risks.', ['scheduleTrigger', 'getInventoryMovements', 'findLowStock', 'findOutOfStock', 'inventoryAgent', 'createReport', 'dashboardNotification'], {
    category: 'Inventory', outcome: 'A routine exception report for replenishment and stock-control follow-up.', recommendedFor: 'Inventory controllers and store managers', setup: 'Set audit frequency, store scope, and report recipients.', triggerConfig: { cron: '0 6 * * *' },
  }),
];
