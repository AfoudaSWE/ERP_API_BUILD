import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "@/components/router/Link";
import { BarChart3, ChevronLeft, Download, FileSpreadsheet, Loader2, RefreshCw, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiDownload, apiRequest } from "@erp/shared-frontend-data-access";

type ReportData = { key:string; title:string; note?:string; generatedAt:string; rows:Record<string,unknown>[] };
const arabicTitles:Record<string,string>={
  "sales/daily":"المبيعات اليومية","sales/monthly":"المبيعات الشهرية","sales/by-product":"المبيعات حسب المنتج","sales/by-customer":"المبيعات حسب العميل","sales/by-branch":"المبيعات حسب الفرع","sales/profitability":"تحليل الربحية",
  "inventory/balance":"رصيد المخزون","inventory/valuation":"تقييم المخزون","inventory/movements":"حركات المخزون","inventory/low-stock":"المخزون المنخفض","inventory/slow-moving":"المنتجات بطيئة الحركة","inventory/expiry":"تقرير الانتهاء",
  "accounting/trial-balance":"ميزان المراجعة","accounting/income-statement":"قائمة الدخل","accounting/balance-sheet":"الميزانية العمومية","accounting/cash-flow":"التدفق النقدي","accounting/aging":"أعمار الذمم","accounting/tax":"تقرير الضرائب",
  "customers/statement":"كشف حساب العميل","customers/balances":"أرصدة العملاء","customers/analysis":"تحليل العملاء","customers/top":"أفضل العملاء",
  "purchases/by-supplier":"المشتريات حسب المورد","purchases/pending":"أوامر الشراء المعلقة","purchases/prices":"تحليل الأسعار","purchases/supplier-performance":"أداء الموردين",
  "hr/attendance":"سجل الحضور","hr/payroll":"ملخص الرواتب","hr/overtime":"العمل الإضافي","hr/leaves":"رصيد الإجازات",
};

export function ReportRoutePage({slug}:{slug:string[]}) {
  const {i18n}=useTranslation(), ar=i18n.language.startsWith("ar"), key=slug.join("/");
  const [data,setData]=useState<ReportData|null>(null),[search,setSearch]=useState(""),[from,setFrom]=useState(""),[to,setTo]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState(""),[exporting,setExporting]=useState(false);
  const parameters=()=>{const p=new URLSearchParams();if(from)p.set("from",from);if(to)p.set("to",to);return p.toString();};
  async function load(){setLoading(true);setError("");try{const q=parameters();setData(await apiRequest<ReportData>(`/reports/${key}${q?`?${q}`:""}`));}catch(e){setError(e instanceof Error?e.message:"Failed to load report");}finally{setLoading(false);}}
  useEffect(()=>{
    const timer=setTimeout(()=>{
      setLoading(true);setError("");
      void apiRequest<ReportData>(`/reports/${key}`).then(setData).catch(e=>setError(e instanceof Error?e.message:"Failed to load report")).finally(()=>setLoading(false));
    },0);
    return()=>clearTimeout(timer);
  },[key]);
  const columns=useMemo(()=>data?.rows[0]?Object.keys(data.rows[0]):[],[data]);
  const rows=useMemo(()=>{const term=search.trim().toLocaleLowerCase();return term?(data?.rows??[]).filter(row=>Object.values(row).some(v=>String(v??"").toLocaleLowerCase().includes(term))):(data?.rows??[]);},[data,search]);
  async function apply(e:FormEvent){e.preventDefault();await load();}
  async function download(){setExporting(true);try{const q=parameters(),result=await apiDownload(`/reports/${key}?${q?`${q}&`:""}format=csv`),url=URL.createObjectURL(result.blob),a=document.createElement("a");a.href=url;a.download=result.filename;a.click();URL.revokeObjectURL(url);}catch(e){setError(e instanceof Error?e.message:"Export failed");}finally{setExporting(false);}}
  const title=ar?(arabicTitles[key]??data?.title??key):(data?.title??key.replaceAll("-"," ").replace("/"," / "));
  return <AppLayout>
    <nav className="mb-5 flex items-center gap-2 text-sm text-navy-500" aria-label={ar?"مسار التنقل":"Breadcrumb"}><Link href="/reports">{ar?"التقارير":"Reports"}</Link><ChevronLeft className="h-4 w-4"/><span>{title}</span></nav>
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-primary-600"><BarChart3 className="h-5 w-5"/>{ar?"تقرير مرتبط بقاعدة البيانات":"Database-backed report"}</div><h1 className="text-2xl font-bold">{title}</h1>{data&&<p className="mt-1 text-xs text-navy-500">{ar?"آخر تحديث":"Generated"}: {formatReportDateTime(data.generatedAt)}</p>}</div><button type="button" className="btn btn-secondary" disabled={exporting||loading} onClick={()=>void download()}>{exporting?<Loader2 className="h-4 w-4 animate-spin"/>:<Download className="h-4 w-4"/>}{ar?"تصدير CSV":"Export CSV"}</button></header>
    <form onSubmit={e=>void apply(e)} className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_auto]"><label className="text-sm">{ar?"من تاريخ":"From"}<input type="date" className="input mt-1 w-full" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="text-sm">{ar?"إلى تاريخ":"To"}<input type="date" className="input mt-1 w-full" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label><label className="text-sm">{ar?"بحث داخل النتائج":"Search results"}<span className="relative mt-1 block"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"/><input className="input w-full ps-10" value={search} onChange={e=>setSearch(e.target.value)}/></span></label><button className="btn btn-primary self-end" disabled={loading}><RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`}/>{ar?"تحديث":"Refresh"}</button></form>
    {error&&<div role="alert" className="mb-5 rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-danger-700">{error}</div>}
    {data?.note&&<div role="note" className="mb-5 rounded-xl border border-warning-500/30 bg-warning-50 p-4 text-sm text-warning-700">{data.note}</div>}
    <section className="card overflow-hidden" aria-busy={loading}>{loading?<div className="flex items-center justify-center gap-3 p-16 text-navy-500"><Loader2 className="h-6 w-6 animate-spin"/>{ar?"جارٍ تحميل التقرير...":"Loading report…"}</div>:rows.length?<div className="overflow-x-auto"><table className="table"><thead><tr>{columns.map(c=><th key={c}>{label(c,ar)}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}>{columns.map(c=><td key={c}>{display(row[c],c,ar)}</td>)}</tr>)}</tbody></table></div>:<div className="empty-state"><FileSpreadsheet className="empty-state-icon"/><h2 className="empty-state-title">{ar?"لا توجد بيانات ضمن الفترة المحددة":"No data for the selected period"}</h2><p className="empty-state-description">{ar?"غيّر الفترة أو أضف معاملات أعمال ثم حدّث التقرير.":"Change the period or add business transactions, then refresh."}</p></div>}{!loading&&<footer className="border-t p-3 text-sm text-navy-500">{ar?"عدد النتائج":"Rows"}: {rows.length}</footer>}</section>
  </AppLayout>;
}

function label(key:string,ar:boolean){const text=key.replaceAll("_"," ");if(!ar)return text.replace(/\b\w/g,c=>c.toUpperCase());const map:Record<string,string>={date:"التاريخ",month:"الشهر",name:"الاسم",name_ar:"الاسم العربي",customer:"العميل",supplier:"المورد",product:"المنتج",warehouse:"المخزن",branch:"الفرع",total:"الإجمالي",sales:"المبيعات",paid:"المدفوع",outstanding:"المستحق",quantity:"الكمية",cost:"التكلفة",revenue:"الإيراد",balance:"الرصيد",status:"الحالة",employee:"الموظف",department:"القسم",shift:"الوردية",tax:"الضريبة",value:"القيمة",code:"الكود",sku:"SKU"};return map[key]??text;}
function display(value:unknown,key:string,ar:boolean){if(value==null||value==="")return"—";const text=String(value);if(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/.test(text))return formatReportDateTime(text);if(/^\d{2}:\d{2}(?::\d{2})?$/.test(text))return text.length===5?`${text}:00`:text;if(typeof value==="boolean")return value?(ar?"نعم":"Yes"):(ar?"لا":"No");if(typeof value==="number"||(/^[-+]?\d+(\.\d+)?$/.test(text)&&/(total|amount|balance|cost|price|value|sales|paid|revenue|profit|salary|tax|debit|credit)/.test(key)))return new Intl.NumberFormat(ar?"ar-EG":"en-EG",{maximumFractionDigits:2}).format(Number(value));return text;}
function formatReportDateTime(value:string){const match=/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2}))?/.exec(value);if(!match)return value;const date=`${match[1].slice(-2)}-${match[2]}-${match[3]}`;return match[4]?`${date} ${match[4]}:${match[5]}:${match[6]}`:date;}
