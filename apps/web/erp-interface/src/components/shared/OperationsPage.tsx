import { useMemo } from 'react';
import { Bell, Building2, Clock3, Landmark, WalletCards } from 'lucide-react';
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
  const content = useMemo(() => contentByKind[kind], [kind]);
  const Icon = content.icon;

  return (
    <AppLayout>
      <section className="mb-6 flex items-start gap-3 border-b border-navy-200 pb-5 dark:border-navy-700">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200"><Icon className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-navy-950 dark:text-white">{isArabic ? content.ar : content.en}</h1>
          <p className="mt-1 max-w-2xl text-sm text-navy-500">{isArabic ? 'ستظهر السجلات هنا عند توفرها.' : 'Records will appear here when they are available.'}</p>
        </div>
      </section>
      <section className="card overflow-hidden">
        <div className="empty-state">
          <Icon className="empty-state-icon" />
          <h2 className="empty-state-title">{isArabic ? 'لا توجد سجلات بعد' : 'No records yet'}</h2>
          <p className="empty-state-description">{isArabic ? 'لا توجد بيانات متاحة لهذا القسم حالياً.' : 'There is no data available for this area yet.'}</p>
        </div>
      </section>
    </AppLayout>
  );
}
