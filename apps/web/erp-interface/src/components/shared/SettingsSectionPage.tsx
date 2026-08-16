import Link from '@/components/router/Link';
import { HelpCircle, Settings, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';

const names: Record<string, { en: string; ar: string }> = {
  company: { en: 'Company information', ar: 'بيانات الشركة' },
  preferences: { en: 'Preferences', ar: 'التفضيلات' },
  billing: { en: 'Billing', ar: 'الفوترة' },
  notifications: { en: 'Notification settings', ar: 'إعدادات الإشعارات' },
  security: { en: 'Security', ar: 'الأمان' },
  appearance: { en: 'Appearance', ar: 'المظهر' },
  printers: { en: 'Printers', ar: 'الطابعات' },
  integrations: { en: 'Integrations', ar: 'التكاملات' },
  data: { en: 'Data and backups', ar: 'البيانات والنسخ الاحتياطي' },
  profile: { en: 'Profile', ar: 'الملف الشخصي' },
  help: { en: 'Help center', ar: 'مركز المساعدة' },
};

export function SettingsSectionPage({ section }: { section: string }) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');

  if (section === 'users') {
    return <AppLayout><section className="card empty-state"><ShieldCheck className="empty-state-icon" /><h1 className="empty-state-title">{isArabic ? 'المستخدمون والأدوار' : 'Users and roles'}</h1><p className="empty-state-description">{isArabic ? 'تتم إدارة المستخدمين والصلاحيات من صفحة الأدوار المتصلة بقاعدة البيانات.' : 'Manage database-backed users and permissions from the roles page.'}</p><Link href="/settings/roles" className="btn btn-primary btn-sm mt-4">{isArabic ? 'فتح إدارة الأدوار' : 'Open role management'}</Link></section></AppLayout>;
  }

  const name = names[section];
  if (!name) return <AppLayout><section className="card empty-state"><Settings className="empty-state-icon" /><h1 className="empty-state-title">{isArabic ? 'القسم غير موجود' : 'Section not found'}</h1></section></AppLayout>;
  const Icon = section === 'help' ? HelpCircle : Settings;
  return <AppLayout><section className="card empty-state"><Icon className="empty-state-icon" /><h1 className="empty-state-title">{isArabic ? name.ar : name.en}</h1><p className="empty-state-description">{isArabic ? 'لا توجد بيانات محفوظة لهذا القسم بعد.' : 'No saved data exists for this section yet.'}</p></section></AppLayout>;
}
