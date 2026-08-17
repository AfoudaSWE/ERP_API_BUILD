import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import type { ToastDetail } from "./toast";

type Toast=ToastDetail&{id:number};

export function ToastHost(){
  const [toasts,setToasts]=useState<Toast[]>([]);
  useEffect(()=>{
    const listener=(event:Event)=>{const detail=(event as CustomEvent<ToastDetail>).detail;if(!detail?.message)return;const toast={...detail,id:Date.now()+Math.random()};setToasts(current=>[...current.slice(-3),toast]);setTimeout(()=>setToasts(current=>current.filter(item=>item.id!==toast.id)),6000);};
    window.addEventListener("erp:toast",listener);return()=>window.removeEventListener("erp:toast",listener);
  },[]);
  return <div className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:end-5 sm:top-5 sm:w-[380px]" aria-live="polite" aria-atomic="false">{toasts.map(toast=>{const Icon=toast.type==="success"?CheckCircle2:toast.type==="error"?CircleAlert:Info;return <div key={toast.id} role={toast.type==="error"?"alert":"status"} className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-xl ${toast.type==="success"?"border-success-500/30 bg-success-50 text-success-700":toast.type==="error"?"border-danger-500/30 bg-danger-50 text-danger-700":"border-primary-500/30 bg-primary-50 text-primary-700"}`}><Icon className="mt-0.5 h-5 w-5 shrink-0"/><p className="min-w-0 flex-1 text-sm font-medium">{toast.message}</p><button type="button" className="rounded p-1 hover:bg-black/5" onClick={()=>setToasts(current=>current.filter(item=>item.id!==toast.id))} aria-label="Close notification"><X className="h-4 w-4"/></button></div>;})}</div>;
}
