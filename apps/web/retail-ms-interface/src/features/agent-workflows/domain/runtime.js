import { topologicalOrder, validateWorkflow } from './graph';
import { executeTool } from './tools';
import { isOllamaAgentNode, ollamaWorkflowProvider } from './ollamaProvider';

export const EXECUTION_STATES=['QUEUED','RUNNING','WAITING','WAITING_FOR_APPROVAL','SUCCEEDED','PARTIALLY_SUCCEEDED','FAILED','CANCELLED','TIMED_OUT'];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const toolForNode={getQueueMetrics:'retail.getQueueMetrics',getLiveOccupancy:'retail.getLiveOccupancy',getActiveAlerts:'retail.getActiveAlerts',getProductStock:'inventory.getStock',findLowStock:'inventory.findLowStock',findOutOfStock:'inventory.findOutOfStock',createOperationsTask:'retail.createOperationsTask',createStoreAlert:'retail.createAlert',createPurchaseRequest:'inventory.createPurchaseRequest',digitalTwinCommand:'twin.createOverlayAlert'};

function event(status,nodeId,message,data={}) { return { id:crypto.randomUUID(), timestamp:new Date().toISOString(), status,nodeId,message,...data }; }
export class MockWorkflowRuntime {
  constructor({onUpdate=()=>{},modelProvider=ollamaWorkflowProvider,notificationPublisher=()=>{}}={}) { this.onUpdate=onUpdate; this.modelProvider=modelProvider; this.notificationPublisher=notificationPublisher; this.cancelled=false; this.approvalResolver=null; this.abortController=new AbortController(); }
  emit(execution){ this.onUpdate(structuredClone(execution)); }
  cancel(){ this.cancelled=true; this.abortController.abort(); this.approvalResolver?.({approved:false,cancelled:true}); }
  resolveApproval(approved,comment=''){ this.approvalResolver?.({approved,comment}); this.approvalResolver=null; }
  async execute(workflow,context={}){
    const validation=validateWorkflow(workflow.nodes,workflow.edges); if(!validation.valid) throw new Error(validation.errors[0].message);
    const execution={ id:`exec_${crypto.randomUUID().slice(0,8)}`,workflowId:workflow.id,workflowName:workflow.name,status:'RUNNING',trigger:context.event?.eventType||'MANUAL',storeId:context.storeId||'cfc',organizationId:'org_demo',initiatedBy:context.user||'Retail Manager',startedAt:new Date().toISOString(),completedAt:null,durationMs:null,currentNode:null,nodeExecutions:{},logs:[event('RUNNING',null,'Execution started in demo mode.')],demoData:true };
    this.emit(execution); const started=Date.now(); const outputs={};
    for(const nodeId of topologicalOrder(workflow.nodes,workflow.edges)){
      if(this.cancelled){ execution.status='CANCELLED'; break; }
      const node=workflow.nodes.find(n=>n.id===nodeId); execution.currentNode=nodeId;
      const nodeRun={nodeId,nodeType:node.data.nodeType,status:'RUNNING',startedAt:new Date().toISOString(),retryCount:0,input:context.event||{},output:null,error:null,durationMs:null}; execution.nodeExecutions[nodeId]=nodeRun; execution.logs.push(event('RUNNING',nodeId,`${node.data.label} started.`)); this.emit(execution);
      const nodeStarted=Date.now();
      try{
        await delay(220);
        if(node.data.nodeType==='humanApproval'){
          nodeRun.status='WAITING'; execution.status='WAITING_FOR_APPROVAL'; execution.approval={id:`approval_${crypto.randomUUID().slice(0,8)}`,status:'Pending',requestedAction:'Open an additional checkout and create an operations task',requestingAgent:'Queue Optimization Agent',expectedImpact:'Reduce average wait below 4 minutes',riskLevel:'medium',store:execution.storeId,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString()}; execution.logs.push(event('WAITING',nodeId,'Waiting for manager approval.')); this.emit(execution);
          const decision=await new Promise(resolve=>{this.approvalResolver=resolve});
          if(!decision.approved) throw new Error(decision.cancelled?'Execution cancelled.':'Manager rejected the requested action.');
          execution.approval={...execution.approval,status:'Approved',comment:decision.comment,resolvedAt:new Date().toISOString()}; execution.status='RUNNING';
        }
        const toolId=toolForNode[node.data.nodeType];
        if(toolId) {
          const latestRecommendation=Object.values(outputs).reverse().find(output=>output?.recommendation)?.recommendation;
          nodeRun.output=await executeTool(toolId,{storeId:execution.storeId,sourceNode:nodeId,recommendation:latestRecommendation||'No agent recommendation was supplied.'},{role:'Branch Manager',storeId:execution.storeId});
        }
        else if(isOllamaAgentNode(node.data.nodeType)) {
          execution.logs.push(event('RUNNING',nodeId,`Sending scoped workflow context to Ollama ${node.data.config?.model || 'qwen2.5-coder:7b'}.`));
          this.emit(execution);
          nodeRun.output=await this.modelProvider.run({
            node,
            signal:this.abortController.signal,
            workflowContext:{
              workflow:{ id:workflow.id, name:workflow.name, organizationId:execution.organizationId },
              trigger:context.event||{},
              storeId:execution.storeId,
              previousNodeOutputs:outputs,
              dataPolicy:'Aggregated demo retail data only. No credentials or customer payment data.',
            },
          });
          execution.logs.push(event('RUNNING',nodeId,`Ollama returned a result using ${nodeRun.output.model}.`,{durationMs:nodeRun.output.durationMs}));
        }
        else if(node.data.nodeType==='if') nodeRun.output={condition:true,branch:'true'};
        else if(node.data.nodeType==='dashboardNotification') {
          const latestRecommendation=Object.values(outputs).reverse().find(output=>output?.recommendation)?.recommendation;
          const notification={
            id:`notification_${Date.now()}`,
            type:'agent-workflow',
            severity:'info',
            title:`${workflow.name} completed an action`,
            message:latestRecommendation||'The workflow completed successfully.',
            workflowId:workflow.id,
            workflowName:workflow.name,
            executionId:execution.id,
            storeId:execution.storeId,
            demoData:true,
            createdAt:new Date().toISOString(),
            read:false,
          };
          this.notificationPublisher(notification);
          nodeRun.output={demoData:true,notificationId:notification.id,delivered:true,notification};
        }
        else nodeRun.output={demoData:true,processed:true};
        outputs[nodeId]=nodeRun.output; nodeRun.status='SUCCEEDED'; nodeRun.durationMs=Date.now()-nodeStarted; execution.logs.push(event('SUCCEEDED',nodeId,`${node.data.label} completed.`,{durationMs:nodeRun.durationMs}));
      }catch(error){ nodeRun.status='FAILED'; nodeRun.error={message:error.message}; nodeRun.durationMs=Date.now()-nodeStarted; execution.status=this.cancelled?'CANCELLED':'FAILED'; execution.logs.push(event('FAILED',nodeId,error.message)); this.emit(execution); break; }
      this.emit(execution);
    }
    if(execution.status==='RUNNING') execution.status='SUCCEEDED'; execution.completedAt=new Date().toISOString(); execution.durationMs=Date.now()-started; execution.currentNode=null; execution.result=outputs; execution.logs.push(event(execution.status,null,`Execution ${execution.status.toLowerCase()}.`)); this.emit(execution); return execution;
  }
}

export function createRetailEvent(eventType,storeId='cfc',payload={}){ return {eventId:`evt_${crypto.randomUUID().slice(0,8)}`,eventType,organizationId:'org_demo',storeId,source:'retail-digital-twin',timestamp:new Date().toISOString(),correlationId:`corr_${crypto.randomUUID().slice(0,8)}`,payload}; }
