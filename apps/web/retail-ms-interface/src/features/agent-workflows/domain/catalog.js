import {
  Play, Clock, Webhook, Radio, Package, ListStart, Cpu, Bell, Monitor,
  Bot, BrainCircuit, MessageSquareText, Braces, Database, FileText, Tags,
  Server, Wrench, BookOpen, Route, Store, Users, Footprints, ShoppingCart,
  BarChart3, GitCompare, AlertTriangle, ClipboardList, Boxes, Truck, ArrowLeftRight,
  ScanLine, Activity, UserPlus, Settings, GitBranch, Shuffle, Filter, Merge,
  Split, Repeat, Timer, Octagon, RefreshCcw, Workflow, UserCheck, ListPlus,
  CalendarClock, Calculator, Layers, ArrowDownAZ, ListFilter, Mail, Send, Download,
  ShieldCheck, HardDrive
} from 'lucide-react';

export const CATEGORY_STYLES = {
  trigger: { label: 'Triggers', color: '#8b5cf6', bg: 'rgba(139,92,246,.12)' },
  agent: { label: 'AI & Agents', color: '#06b6d4', bg: 'rgba(6,182,212,.12)' },
  model: { label: 'Ollama Model', color: '#3b82f6', bg: 'rgba(59,130,246,.12)' },
  mcp: { label: 'MCP', color: '#6366f1', bg: 'rgba(99,102,241,.12)' },
  retail: { label: 'Retail Business', color: '#10b981', bg: 'rgba(16,185,129,.12)' },
  inventory: { label: 'Inventory', color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
  operations: { label: 'Store Operations', color: '#14b8a6', bg: 'rgba(20,184,166,.12)' },
  flow: { label: 'Flow Control', color: '#eab308', bg: 'rgba(234,179,8,.12)' },
  approval: { label: 'Human Approval', color: '#f97316', bg: 'rgba(249,115,22,.12)' },
  data: { label: 'Data Transformation', color: '#64748b', bg: 'rgba(100,116,139,.12)' },
  output: { label: 'Output & Communication', color: '#ec4899', bg: 'rgba(236,72,153,.12)' },
};

const item = (type, label, category, icon, description, defaults = {}) => ({
  type, label, category, icon, description,
  defaults: { timeoutMs: 30000, retry: { maxAttempts: 1, backoffMs: 1000 }, errorBehavior: 'stop', ...defaults },
});

const agentDefaults = (role, systemInstruction) => ({
  role,
  systemInstruction,
  model: 'qwen2.5-coder:7b',
  maxSteps: 6,
  temperature: 0.2,
});

export const NODE_CATALOG = [
  item('manualTrigger','Manual Trigger','trigger',Play,'Start a workflow on demand.'),
  item('scheduleTrigger','Schedule Trigger','trigger',Clock,'Run on a schedule.',{ cron:'0 18 * * *' }),
  item('webhookTrigger','Webhook Trigger','trigger',Webhook,'Start from a signed webhook.'),
  item('retailEventTrigger','Retail Event Trigger','trigger',Radio,'Subscribe to RetailTwin events.',{ eventType:'QUEUE_THRESHOLD_EXCEEDED' }),
  item('inventoryEventTrigger','Inventory Event Trigger','trigger',Package,'Subscribe to stock events.'),
  item('queueEventTrigger','Queue Event Trigger','trigger',ListStart,'Subscribe to queue events.'),
  item('digitalTwinEventTrigger','Digital Twin Event Trigger','trigger',Cpu,'Subscribe to twin events.'),
  item('posEventTrigger','POS Event Trigger','trigger',ShoppingCart,'Subscribe to POS events.'),
  item('alertTrigger','Alert Trigger','trigger',Bell,'Start when an alert is created.'),
  item('deviceEventTrigger','Device Event Trigger','trigger',Monitor,'Start from device health events.'),
  item('ollamaChatModel','Ollama Chat Model','model',BrainCircuit,'Local Ollama model provider.',{ model:'qwen2.5-coder:7b', temperature:.2, contextLength:8192 }),
  item('aiAgent','AI Agent','agent',Bot,'Tool-using constrained AI agent.',{ ...agentDefaults('Retail operations analyst','Analyze the supplied store context and produce safe, evidence-based actions.'), toolCallLimit:4, allowedTools:[] }),
  item('retailAnalystAgent','Retail Analyst Agent','agent',Bot,'Analyze retail performance.',agentDefaults('Retail performance analyst','Explain KPI movement, identify root causes, and prioritize measurable retail actions.')),
  item('inventoryAgent','Inventory Agent','agent',Bot,'Recommend safe inventory actions.',agentDefaults('Inventory optimization analyst','Assess availability, stock cover, and demand before recommending replenishment or transfer actions.')),
  item('storeOperationsAgent','Store Operations Agent','agent',Bot,'Optimize store operations.',agentDefaults('Store operations manager','Balance service, staffing, device health, and customer experience using the supplied store signals.')),
  item('queueOptimizationAgent','Queue Optimization Agent','agent',Bot,'Reduce queue wait and abandonment.',agentDefaults('Checkout optimization specialist','Analyze queue demand, wait time, counter capacity, and throughput before recommending an intervention.')),
  item('salesAnalystAgent','Sales Analyst Agent','agent',Bot,'Analyze sales and conversion.',agentDefaults('Retail sales analyst','Analyze revenue, conversion, basket, returns, and product performance using only the supplied evidence.')),
  item('summarizer','Summarizer','agent',FileText,'Summarize workflow context.',agentDefaults('Retail operations summarizer','Condense the supplied workflow evidence without losing material risks, metrics, decisions, or actions.')),
  item('classifier','Classifier','agent',Tags,'Classify data into labels.',agentDefaults('Retail operations classifier','Classify the supplied store data into the configured labels and explain the evidence for the selected class.')),
  item('promptTemplate','Prompt Template','data',MessageSquareText,'Build a prompt from safe expressions.'),
  item('structuredOutput','Structured Output Parser','data',Braces,'Validate structured model output.'),
  item('memory','Memory','data',Database,'Scoped execution memory.'),
  item('mcpServer','MCP Server','mcp',Server,'Configured MCP capability provider.'),
  item('mcpTool','MCP Tool','mcp',Wrench,'Execute an allow-listed MCP tool.'),
  item('mcpResource','MCP Resource','mcp',BookOpen,'Read an allowed MCP resource.'),
  item('mcpPrompt','MCP Prompt','mcp',MessageSquareText,'Load an allowed MCP prompt.'),
  item('toolRouter','Tool Router','mcp',Route,'Route to an approved tool.'),
  item('getStoreMetrics','Get Store Metrics','retail',Store,'Load current store KPIs.'),
  item('getLiveOccupancy','Get Live Occupancy','retail',Users,'Read current occupancy.'),
  item('getFootfallData','Get Footfall Data','retail',Footprints,'Load footfall analytics.'),
  item('getQueueMetrics','Get Queue Metrics','retail',ListStart,'Load checkout queue KPIs.'),
  item('getSalesMetrics','Get Sales Metrics','retail',ShoppingCart,'Load sales analytics.'),
  item('getProductPerformance','Get Product Performance','retail',BarChart3,'Load product performance.'),
  item('compareBranches','Compare Branches','retail',GitCompare,'Compare store KPIs.'),
  item('getActiveAlerts','Get Active Alerts','retail',AlertTriangle,'Load active store alerts.'),
  item('createStoreAlert','Create Store Alert','retail',Bell,'Create a manager-visible alert.',{ requiresApproval:true }),
  item('generateManagerBrief','Generate Manager Brief','retail',ClipboardList,'Create a concise manager brief.'),
  item('getProductStock','Get Product Stock','inventory',Boxes,'Read product inventory.'),
  item('findLowStock','Find Low Stock','inventory',AlertTriangle,'Find low-stock products.'),
  item('findOutOfStock','Find Out-of-Stock Products','inventory',Octagon,'Find unavailable products.'),
  item('calculateDaysCover','Calculate Days of Cover','inventory',Calculator,'Estimate stock coverage.'),
  item('createReorderRecommendation','Create Reorder Recommendation','inventory',ClipboardList,'Prepare a reorder recommendation.'),
  item('createPurchaseRequest','Create Purchase Request','inventory',ShoppingCart,'Create an approved purchase request.',{ requiresApproval:true }),
  item('suggestBranchTransfer','Suggest Branch Transfer','inventory',ArrowLeftRight,'Recommend a branch transfer.'),
  item('checkStockAvailability','Check Stock Availability','inventory',ScanLine,'Check nearby stock.'),
  item('getInventoryMovements','Get Inventory Movements','inventory',Truck,'Load stock movement history.'),
  item('requestStockAdjustment','Request Stock Adjustment Approval','inventory',ShieldCheck,'Request controlled stock adjustment.',{ requiresApproval:true }),
  item('getPosStatus','Get POS Status','operations',Activity,'Read point-of-sale health.'),
  item('recommendOpeningCheckout','Recommend Opening Checkout','operations',ListPlus,'Recommend another checkout.'),
  item('assignStaff','Assign Staff Recommendation','operations',UserPlus,'Recommend staff allocation.'),
  item('createOperationsTask','Create Operations Task','operations',ClipboardList,'Create an operations task.',{ requiresApproval:true }),
  item('updateAlertStatus','Update Alert Status','operations',Bell,'Update an existing alert.',{ requiresApproval:true }),
  item('getDeviceHealth','Get Device Health','operations',Activity,'Read device status.'),
  item('createMaintenanceTicket','Create Maintenance Ticket','operations',Wrench,'Create a maintenance request.',{ requiresApproval:true }),
  item('digitalTwinCommand','Digital Twin Command','operations',Cpu,'Send a safe allow-listed twin command.',{ requiresApproval:true }),
  item('if','If','flow',GitBranch,'Branch on a safe condition.',{ expression:'{{ nodes.getQueue.output.averageWaitMinutes }}', operator:'>', value:4 }),
  item('switch','Switch','flow',Shuffle,'Route across multiple cases.'), item('filter','Filter','flow',Filter,'Filter a collection.'),
  item('merge','Merge','flow',Merge,'Merge multiple paths.'), item('split','Split','flow',Split,'Split a collection.'),
  item('loop','Loop','flow',Repeat,'Explicit bounded loop.',{ maxIterations:10 }), item('wait','Wait','flow',Clock,'Wait for a signal.'),
  item('delay','Delay','flow',Timer,'Delay execution.',{ delayMs:1000 }), item('stop','Stop','flow',Octagon,'Stop execution.'),
  item('retry','Retry','flow',RefreshCcw,'Retry a failed path.'), item('errorHandler','Error Handler','flow',AlertTriangle,'Handle an error branch.'),
  item('subWorkflow','Sub-workflow','flow',Workflow,'Execute a published workflow.'),
  item('humanApproval','Human Approval','approval',UserCheck,'Pause until an authorized manager decides.',{ expiresMinutes:60, riskLevel:'high' }),
  item('setFields','Set Fields','data',ListPlus,'Set structured fields.'), item('mapFields','Map Fields','data',Route,'Map fields safely.'),
  item('jsonTransform','JSON Transform','data',Braces,'Transform JSON without eval.'), item('dateTime','Date and Time','data',CalendarClock,'Format dates and times.'),
  item('math','Math','data',Calculator,'Apply safe numeric operations.'), item('aggregate','Aggregate','data',Layers,'Aggregate a collection.'),
  item('sort','Sort','data',ArrowDownAZ,'Sort a collection.'), item('limit','Limit','data',ListFilter,'Limit collection size.'),
  item('dashboardNotification','Dashboard Notification','output',Bell,'Send an in-app notification.'),
  item('emailAdapter','Email Adapter','output',Mail,'Send through a configured email adapter.',{ requiresApproval:true }),
  item('slackAdapter','Slack Adapter','output',Send,'Send through a configured Slack adapter.',{ requiresApproval:true }),
  item('teamsAdapter','Microsoft Teams Adapter','output',Send,'Send through a configured Teams adapter.',{ requiresApproval:true }),
  item('webhookResponse','Webhook Response','output',Webhook,'Return a webhook response.'),
  item('createReport','Create Report','output',FileText,'Create a workflow report.'), item('exportJson','Export JSON','output',Download,'Export execution output.'),
  item('auditLog','Audit Log','output',HardDrive,'Write a redacted audit event.'),
];

export const catalogByType = Object.fromEntries(NODE_CATALOG.map(node => [node.type, node]));

const SPECIAL_NODE_USAGE = {
  manualTrigger: 'Place it at the start of a workflow. Use Execute in the editor whenever a manager or tester wants to start the flow on demand.',
  scheduleTrigger: 'Place it at the start, set its cron schedule, and connect it to the first action. Use it for recurring briefs, checks, and reports.',
  deviceEventTrigger: 'Place it at the start and connect the device event payload to health checks or recovery actions. It runs automatically when device health changes.',
  webhookTrigger: 'Place it at the start, configure the signed webhook source, and map the verified request payload into downstream nodes.',
  retailEventTrigger: 'Place it at the start, choose a RetailTwin event, and connect its event payload to the first decision or action.',
  inventoryEventTrigger: 'Place it at the start of an inventory flow and connect stock-change data to availability checks, alerts, or replenishment actions.',
  queueEventTrigger: 'Place it at the start of a queue flow and connect queue measurements to thresholds, staffing recommendations, or notifications.',
  digitalTwinEventTrigger: 'Place it at the start and route Digital Twin occupancy, zone, or movement events into operational decisions.',
  posEventTrigger: 'Place it at the start and connect POS transaction or health events to sales, support, or recovery actions.',
  alertTrigger: 'Place it at the start and connect the new alert payload to triage, approval, assignment, or notification nodes.',
};

const CATEGORY_GUIDES = {
  trigger: {
    input: 'A user action, time, webhook, or subscribed business event.',
    output: 'The trigger payload and execution context.',
    use: node => `Place ${node.label} at the beginning of the graph, configure its event source, then connect it to the first processing node.`,
  },
  agent: {
    input: 'Store context and outputs from upstream nodes.',
    output: 'A constrained AI analysis, classification, summary, or recommendation.',
    use: node => `Connect relevant retail data to ${node.label}, define its instruction or role, and pass its result to an approval, action, or output node.`,
  },
  model: {
    input: 'A prompt and model configuration from an AI node.',
    output: 'The local model response and usage metadata.',
    use: node => `Connect ${node.label} to an AI agent, select the local model and temperature, and keep the result connected to a parser or business action.`,
  },
  mcp: {
    input: 'Approved arguments or context from an upstream node.',
    output: 'A governed MCP resource, prompt, or tool result.',
    use: node => `Add ${node.label} after the node that prepares its inputs, select an allowed connection or capability, and route the governed result downstream.`,
  },
  retail: {
    input: 'Store scope plus optional filters or upstream context.',
    output: 'Current retail data or a proposed retail action.',
    use: node => `Connect ${node.label} where the workflow needs this business information or action, then use its structured output in an agent, decision, report, or notification.`,
  },
  inventory: {
    input: 'Store, product, stock, or replenishment context.',
    output: 'Inventory data, risk assessment, or a controlled stock action.',
    use: node => `Connect ${node.label} after a stock trigger or product lookup, configure the product/store scope, and route the result to a decision, approval, or notification.`,
  },
  operations: {
    input: 'Store, device, queue, alert, or staffing context.',
    output: 'Operational status, recommendation, task, or controlled action.',
    use: node => `Use ${node.label} after collecting the required operating context. Send high-impact actions through approval and surface the result to the responsible team.`,
  },
  flow: {
    input: 'One or more upstream values or execution paths.',
    output: 'A controlled branch, transformed path, retry, delay, or stop result.',
    use: node => `Place ${node.label} between business steps to control execution. Configure its condition or limits and connect every intended output path.`,
  },
  approval: {
    input: 'The proposed action, risk context, and supporting evidence.',
    output: 'An approved, rejected, or expired decision path.',
    use: node => `Place ${node.label} immediately before a sensitive action, provide the manager with decision context, and connect the approved and rejected outcomes appropriately.`,
  },
  data: {
    input: 'Structured values from upstream nodes.',
    output: 'Safely transformed, mapped, sorted, filtered, or aggregated data.',
    use: node => `Insert ${node.label} before the consumer that needs reshaped data, configure safe expressions, and connect its result to the next node.`,
  },
  output: {
    input: 'The final message, report, response, or structured workflow result.',
    output: 'A delivered notification, adapter response, export, report, or audit record.',
    use: node => `Place ${node.label} near the end of a path, map the content from upstream outputs, configure its destination, and test delivery before activation.`,
  },
};

const readableSetting = ([key, value]) => {
  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, character => character.toUpperCase());
  if (key === 'retry') return `${label}: ${value.maxAttempts} attempt(s), ${value.backoffMs} ms backoff`;
  if (typeof value === 'boolean') return `${label}: ${value ? 'Yes' : 'No'}`;
  if (Array.isArray(value)) return `${label}: ${value.length ? value.join(', ') : 'None selected'}`;
  return `${label}: ${value}`;
};

export function getNodeGuide(node) {
  const guide = CATEGORY_GUIDES[node.category] ?? CATEGORY_GUIDES.flow;
  return {
    purpose: node.description,
    howToUse: SPECIAL_NODE_USAGE[node.type] ?? guide.use(node),
    input: guide.input,
    output: guide.output,
    defaults: Object.entries(node.defaults).map(readableSetting),
  };
}

export const RETAIL_EVENTS = ['CUSTOMER_ENTERED_STORE','CUSTOMER_EXITED_STORE','STORE_OCCUPANCY_CHANGED','OCCUPANCY_THRESHOLD_EXCEEDED','CUSTOMER_ENTERED_ZONE','CUSTOMER_LEFT_ZONE','QUEUE_LENGTH_CHANGED','QUEUE_THRESHOLD_EXCEEDED','WAIT_TIME_THRESHOLD_EXCEEDED','PAYMENT_COMPLETED','POS_OFFLINE','POS_RECOVERED','PRODUCT_STOCK_CHANGED','LOW_STOCK_DETECTED','OUT_OF_STOCK_DETECTED','SHELF_REPLENISHMENT_REQUIRED','INVENTORY_DISCREPANCY_DETECTED','CONVERSION_RATE_DROPPED','CAMERA_OFFLINE','DEVICE_OFFLINE','ALERT_CREATED','STORE_CLOSED','DAILY_SUMMARY_REQUESTED'];

export function createWorkflowNode(type, position = { x: 120, y: 120 }) {
  const definition = catalogByType[type] || NODE_CATALOG[0];
  return { id: `${type}_${crypto.randomUUID().slice(0,8)}`, type:'workflowNode', position, data:{ nodeType:type, label:definition.label, category:definition.category, config:{...definition.defaults}, status:'IDLE' } };
}
