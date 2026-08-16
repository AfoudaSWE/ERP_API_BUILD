import { getQueueMetrics } from '../../../services/mock/queueService';
import { getInventory } from '../../../services/mock/inventoryService';
import { getDigitalTwinState } from '../../../services/mock/digitalTwinService';
import { getAlerts } from '../../../services/mock/alertService';
import { assertToolAccess } from './permissions';

const definition = (toolId, description, execute, options={}) => ({ toolId, serverId:'retailtwin-built-in', name:toolId, description, inputSchema:{type:'object'}, outputSchema:{type:'object'}, riskLevel:'low', requiresApproval:false, enabled:true, timeout:30000, allowedRoles:['Super Admin','Company Owner','System Admin','Branch Manager','Inventory Manager','Operations Manager'], allowedOrganizations:['org_demo'], allowedStores:[], ...options, execute });
const demo = data => ({ demoData:true, source:'RetailTwin mock service', ...data });

export const BUILT_IN_TOOLS = [
  definition('retail.getQueueMetrics','Current queue KPIs',async ({storeId})=>{ const result=await getQueueMetrics(storeId); return demo({ averageWaitMinutes:+(result.kpis.avgWaitTime/60).toFixed(1), queueLength:result.kpis.currentlyWaiting, openCounters:result.kpis.openCounters, raw:result.kpis }); }),
  definition('retail.getLiveOccupancy','Current occupancy',async ({storeId})=>{ const state=getDigitalTwinState(storeId,0); return demo({ occupancy:state.totalInside, zones:state.zoneOccupancy }); }),
  definition('retail.getActiveAlerts','Active alerts',async ({storeId})=>demo({ alerts:(await getAlerts(storeId)).filter(a=>a.status==='active') })),
  definition('inventory.getStock','Product stock',async ({storeId})=>{ const result=await getInventory(storeId); return demo({ inventory:result.inventory, kpis:result.kpis }); }),
  definition('inventory.findLowStock','Low stock products',async ({storeId})=>{ const result=await getInventory(storeId); return demo({ products:result.inventory.filter(p=>['low_stock','critical'].includes(p.status)) }); }),
  definition('inventory.findOutOfStock','Out of stock products',async ({storeId})=>{ const result=await getInventory(storeId); return demo({ products:result.inventory.filter(p=>p.status==='out_of_stock') }); }),
  definition('twin.getStoreState','Digital twin state',async ({storeId})=>demo({ state:getDigitalTwinState(storeId,0) })),
  definition('retail.createOperationsTask','Create operations task',async input=>demo({ taskId:`TASK-${Date.now()}`, status:'created', ...input }),{riskLevel:'high',requiresApproval:true}),
  definition('retail.createAlert','Create store alert',async input=>demo({ alertId:`ALT-${Date.now()}`, status:'active', ...input }),{riskLevel:'medium',requiresApproval:true}),
  definition('inventory.createPurchaseRequest','Create purchase request',async input=>demo({ requestId:`PR-${Date.now()}`, status:'draft', ...input }),{riskLevel:'high',requiresApproval:true}),
  definition('twin.createOverlayAlert','Create digital twin overlay',async input=>demo({ overlayId:`OVR-${Date.now()}`, ...input }),{riskLevel:'medium',requiresApproval:true}),
  ...['retail.getStoreMetrics','retail.getFootfallAnalytics','retail.getSalesAnalytics','retail.compareBranches','retail.getProductPerformance','retail.generateDailyBrief','inventory.getInventoryMovements','inventory.calculateDaysOfCover','inventory.suggestReorder','inventory.suggestBranchTransfer','inventory.requestStockAdjustment','twin.getZoneState','twin.getDeviceHealth','twin.highlightZone','twin.simulateOperationalEvent'].map(id=>definition(id,'Demo-ready adapter interface',async input=>demo({tool:id,input,message:'Adapter executed in demo mode.'})))
];

export async function executeTool(toolId, input, context) {
  const tool=BUILT_IN_TOOLS.find(item=>item.toolId===toolId);
  if(!tool) throw new Error(`Tool ${toolId} is not registered.`);
  assertToolAccess(tool,context);
  const result=await Promise.race([tool.execute(input),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tool execution timed out.')),tool.timeout))]);
  const serialized=JSON.stringify(result);
  if(serialized.length>1_000_000) throw new Error('Tool output exceeded the 1 MB limit.');
  return result;
}
