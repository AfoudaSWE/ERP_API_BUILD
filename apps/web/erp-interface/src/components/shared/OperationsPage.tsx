import { useMemo, useState } from 'react';
import { Bell, Building2, Clock3, Landmark, Search, WalletCards } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTranslation } from 'react-i18next';

type Kind = 'cash-banks' | 'attendance' | 'payroll' | 'branches' | 'notifications';

const contentByKind = {
  'cash-banks': { en: 'Cash and banks', ar: 'النقدية والبنوك', icon: Landmark },
  attendance: { en: 'Attendance', ar: 'الحضور والانصراف', icon: Clock3 },
  payroll: { en: 'Payroll', ar: 'الرواتب', icon: WalletCards },
  branches: { en: 'Branches', ar: 'الفروع', icon: Building2 },
  notifications: { en: 'Notifications', ar: 'الإشعارات', icon: Bell },
} satisfies Record<Kind, { en: string; ar: string; icon: typeof Bell }>;

export function OperationsPage({ kind }: { kind: Kind }) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
  const [query, setQuery] = useState('');
  const content = useMemo(() => contentByKind[kind], [kind]);
  const Icon = content.icon;

  return (
    <AppLayout>
      <section className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary-600">
          <Icon className="h-4 w-4" />
          {isArabic ? 'العمليات' : 'Operations'}
        </div>
        <h1 className="text-2xl font-bold text-navy-900 dark:text-white">{isArabic ? content.ar : content.en}</h1>
        <p className="mt-1 text-navy-500">{isArabic ? 'ابدأ بإضافة أول سجل.' : 'Start by adding your first record.'}</p>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="stat-card">
            <p className="stat-label">{isArabic ? 'الإجمالي' : 'Total'}</p>
            <p className="mt-2 text-xl font-bold text-navy-900 dark:text-white">0</p>
          </div>
        ))}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-navy-200 p-4 dark:border-navy-700">
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="input ps-10" placeholder={isArabic ? 'بحث...' : 'Search...'} />
          </div>
        </div>
        <div className="empty-state">
          <Icon className="empty-state-icon" />
          <h3 className="empty-state-title">{isArabic ? 'لا توجد بيانات بعد' : 'No data yet'}</h3>
        </div>
      </section>
    </AppLayout>
  );
}
