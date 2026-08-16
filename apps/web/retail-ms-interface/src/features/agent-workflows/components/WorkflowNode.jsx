import { Handle, Position } from '@xyflow/react';
import { AlertCircle, CheckCircle2, Clock3, LoaderCircle } from 'lucide-react';
import { catalogByType, CATEGORY_STYLES } from '../domain/catalog';

export default function WorkflowNode({data,selected}){
  const definition=catalogByType[data.nodeType]; const style=CATEGORY_STYLES[data.category]||CATEGORY_STYLES.data; const Icon=definition?.icon;
  const Status=data.status==='RUNNING'?LoaderCircle:data.status==='SUCCEEDED'?CheckCircle2:data.status==='FAILED'?AlertCircle:Clock3;
  return <div className={`workflow-node ${selected?'workflow-node-selected':''}`} style={{'--node-color':style.color}}>
    {data.category!=='trigger'&&<Handle type="target" position={Position.Left}/>} 
    <div className="workflow-node-accent"/>
    <div className="flex items-start gap-2.5 p-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{background:style.bg,color:style.color}}>{Icon&&<Icon size={16}/>}</span>
      <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{data.label}</p><p className="mt-0.5 truncate text-[10px] text-[var(--muted-foreground)]">{definition?.description}</p></div>
      <Status size={13} className={data.status==='RUNNING'?'animate-spin text-orange-500':data.status==='SUCCEEDED'?'text-emerald-500':data.status==='FAILED'?'text-red-500':'text-[var(--muted-foreground)]'}/>
    </div>
    <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-1.5 text-[9px] text-[var(--muted-foreground)]"><span>{data.category==='agent'?`LLM · ${data.config?.model||'qwen2.5-coder:7b'}`:style.label}</span><span>{data.durationMs?`${data.durationMs} ms`:data.status||'IDLE'}</span></div>
    <Handle type="source" position={Position.Right}/>
  </div>
}
