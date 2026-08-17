import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Receipt, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { apiGet, apiRequest } from '@/lib/api-client';

type Expense = { id:string; expense_number:string; description:string; total:string; expense_date:string; payment_method:string; status:string };
type ExpenseCategory = { id: string; name: string; nameAr?: string };
export default function ExpensesPage() {
  const { i18n }=useTranslation(); const ar=i18n.language.startsWith('ar');
  const [rows,setRows]=useState<Expense[]>([]); const [error,setError]=useState(''); const [show,setShow]=useState(false);
  const [categories,setCategories]=useState<ExpenseCategory[]>([]);
  const load=()=>apiGet<Expense[]>('/finance/expenses').then(setRows).catch((e:Error)=>setError(e.message));
  useEffect(()=>{ void load(); void apiGet<ExpenseCategory[]>('/finance/expense-categories').then(setCategories).catch(()=>undefined); },[]);
  const total=useMemo(()=>rows.reduce((sum,row)=>sum+Number(row.total),0),[rows]);
  const submit=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const form=new FormData(event.currentTarget);const categoryId=form.get('categoryId');try{await apiRequest('/finance/expenses',{method:'POST',body:JSON.stringify({description:form.get('description'),amount:Number(form.get('amount')).toFixed(2),taxAmount:Number(form.get('tax')).toFixed(2),expenseDate:form.get('date'),paymentMethod:form.get('method'),categoryId:categoryId||undefined})});setShow(false);await load();}catch(c){setError(c instanceof Error?c.message:'Failed');}};
  const action=async(row:Expense,name:string)=>{try{await apiRequest(`/finance/expenses/${row.id}/actions`,{method:'POST',body:JSON.stringify({action:name})});await load();}catch(c){setError(c instanceof Error?c.message:'Failed');}};
  return <AppLayout>
    <section className="mb-6 flex justify-between"><div><div className="mb-2 flex gap-2 text-primary-600"><Receipt className="h-5 w-5"/>{ar?'الإدارة المالية':'Financial management'}</div><h1 className="text-2xl font-bold">{ar?'المصروفات':'Expenses'}</h1></div><button onClick={()=>setShow(true)} className="btn btn-primary btn-sm"><Plus className="h-4 w-4"/>{ar?'مصروف جديد':'New expense'}</button></section>
    {error&&<div className="mb-4 rounded-xl bg-danger-50 p-4 text-danger-700">{error}</div>}
    <section className="mb-6 grid grid-cols-2 gap-4"><div className="stat-card"><p className="stat-label">{ar?'الإجمالي':'Total'}</p><p className="mt-2 text-xl font-bold">{total.toLocaleString()} EGP</p></div><div className="stat-card"><p className="stat-label">{ar?'عدد السجلات':'Records'}</p><p className="mt-2 text-xl font-bold">{rows.length}</p></div></section>
    <section className="card overflow-hidden">{rows.map(row=><div key={row.id} className="flex items-center justify-between border-b p-4"><div><p className="font-semibold">{row.expense_number} · {row.description}</p><p className="text-sm text-slate-500">{row.expense_date} · {row.payment_method}</p></div><div className="flex items-center gap-3"><b>{row.total} EGP</b><span className="badge badge-gray">{row.status}</span>{row.status==='draft'&&<button onClick={()=>action(row,'submit')} className="btn btn-secondary btn-sm">{ar?'إرسال':'Submit'}</button>}{row.status==='submitted'&&<button onClick={()=>action(row,'approve')} className="btn btn-primary btn-sm">{ar?'اعتماد':'Approve'}</button>}</div></div>)}</section>
    {show&&<div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/60 p-4"><form onSubmit={submit} className="card w-full max-w-lg p-5"><h2 className="mb-4 text-lg font-bold">{ar?'مصروف جديد':'New expense'}</h2><input name="description" minLength={3} required className="input mb-3" placeholder={ar?'البيان':'Description'}/><div className="grid grid-cols-2 gap-3"><input name="amount" type="number" min="0.01" step="0.01" required className="input" placeholder="Amount"/><input name="tax" type="number" min="0" step="0.01" defaultValue="0" className="input"/><input name="date" type="date" required defaultValue={new Date().toISOString().slice(0,10)} className="input"/><select name="method" className="select"><option value="cash">Cash</option><option value="bank_transfer">Bank</option></select><select name="categoryId" className="select col-span-2"><option value="">{ar?'بدون فئة':'No category'}</option>{categories.map((c)=><option key={c.id} value={c.id}>{ar?c.nameAr||c.name:c.name}</option>)}</select></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setShow(false)} className="btn btn-secondary">{ar?'إلغاء':'Cancel'}</button><button className="btn btn-primary">{ar?'حفظ':'Save'}</button></div></form></div>}
  </AppLayout>;
}
