import { useEffect, useMemo, useState } from 'react';
import Link from '@/components/router/Link';
import { BookOpen, Plus, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTranslation } from 'react-i18next';
import { apiGet } from '@/lib/api-client';

type Journal = { id: string; entry_number: string; business_date: string; description: string; status: string; total_debit: string };
type Account = { id: string; account_type: 'asset'|'liability'|'equity'|'revenue'|'expense' };

export default function AccountingPage() {
  const { i18n } = useTranslation(); const ar = i18n.language.startsWith('ar');
  const [journals, setJournals] = useState<Journal[]>([]); const [accounts, setAccounts] = useState<Account[]>([]); const [error, setError] = useState('');
  const load = () => { setError(''); Promise.all([apiGet<Journal[]>('/accounting/journals'), apiGet<Account[]>('/accounting/accounts')]).then(([j,a]) => { setJournals(j); setAccounts(a); }).catch((e: Error) => setError(e.message)); };
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, []);
  const counts = useMemo(() => ['asset','liability','revenue','expense'].map((type) => accounts.filter((a) => a.account_type === type).length), [accounts]);
  const labels = ar ? ['الأصول','الالتزامات','الإيرادات','المصروفات'] : ['Assets','Liabilities','Revenue','Expenses'];
  return <AppLayout>
    <section className="mb-6 flex items-center justify-between"><div><div className="mb-2 flex items-center gap-2 text-primary-600"><BookOpen className="h-5 w-5" />{ar?'المحاسبة':'Accounting'}</div><h1 className="text-2xl font-bold text-navy-900 dark:text-white">{ar?'نظرة عامة مالية':'Financial overview'}</h1></div><div className="flex gap-2"><button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw className="h-4 w-4" /></button><Link href="/accounting/journals/new" className="btn btn-primary btn-sm"><Plus className="h-4 w-4" />{ar?'قيد جديد':'New entry'}</Link></div></section>
    {error&&<div className="mb-4 rounded-xl bg-danger-50 p-4 text-danger-700">{error}</div>}
    <section className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">{labels.map((label,i)=><div key={label} className="stat-card"><p className="stat-label">{label}</p><p className="mt-2 text-xl font-bold">{counts[i]}</p></div>)}</section>
    <section className="card overflow-hidden"><div className="border-b p-4 font-bold">{ar?'أحدث القيود':'Recent journals'}</div>{journals.length===0?<div className="p-8 text-center text-slate-500">{ar?'لا توجد قيود بعد':'No journals yet'}</div>:journals.slice(0,10).map((j)=><div key={j.id} className="flex items-center justify-between border-b p-4 last:border-0"><div><p className="font-semibold">{j.entry_number} · {j.description}</p><p className="text-sm text-slate-500">{j.business_date}</p></div><div className="text-end"><p className="font-bold">{Number(j.total_debit).toLocaleString()} EGP</p><span className="text-xs text-slate-500">{j.status}</span></div></div>)}</section>
  </AppLayout>;
}
