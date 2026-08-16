import { useState } from 'react';
import {
  Building2, Globe, CreditCard, Bell, Shield, Palette,
  Users, Printer, Link2, Database, HelpCircle, ChevronRight
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function SettingsPage() {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';

  const settingsSections = [
    {
      title: locale === 'ar' ? 'الشركة' : 'Company',
      description: locale === 'ar' ? 'إدارة معلومات الشركة والفروع' : 'Manage company information and branches',
      icon: <Building2 className="w-5 h-5" />,
      href: '/settings/company',
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      title: locale === 'ar' ? 'التفضيلات' : 'Preferences',
      description: locale === 'ar' ? 'اللغة، العملة، التنسيقات' : 'Language, currency, formats',
      icon: <Globe className="w-5 h-5" />,
      href: '/settings/preferences',
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    },
    {
      title: locale === 'ar' ? 'الفوترة والاشتراك' : 'Billing & Subscription',
      description: locale === 'ar' ? 'إدارة خطة الاشتراك والفواتير' : 'Manage subscription plan and invoices',
      icon: <CreditCard className="w-5 h-5" />,
      href: '/settings/billing',
      color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      title: locale === 'ar' ? 'الإشعارات' : 'Notifications',
      description: locale === 'ar' ? 'إعدادات التنبيهات والإشعارات' : 'Alert and notification settings',
      icon: <Bell className="w-5 h-5" />,
      href: '/settings/notifications',
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    },
    {
      title: locale === 'ar' ? 'الأمان' : 'Security',
      description: locale === 'ar' ? 'كلمة المرور، المصادقة الثنائية' : 'Password, two-factor authentication',
      icon: <Shield className="w-5 h-5" />,
      href: '/settings/security',
      color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    },
    {
      title: locale === 'ar' ? 'المظهر' : 'Appearance',
      description: locale === 'ar' ? 'السمة، الألوان، التخطيط' : 'Theme, colors, layout',
      icon: <Palette className="w-5 h-5" />,
      href: '/settings/appearance',
      color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
    },
    {
      title: locale === 'ar' ? 'المستخدمين والأدوار' : 'Users & Roles',
      description: locale === 'ar' ? 'إدارة المستخدمين والصلاحيات' : 'Manage users and permissions',
      icon: <Users className="w-5 h-5" />,
      href: '/settings/users',
      color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    },
    {
      title: locale === 'ar' ? 'الطابعات' : 'Printers',
      description: locale === 'ar' ? 'إعدادات الطابعات والإيصالات' : 'Printer and receipt settings',
      icon: <Printer className="w-5 h-5" />,
      href: '/settings/printers',
      color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    },
    {
      title: locale === 'ar' ? 'التكاملات' : 'Integrations',
      description: locale === 'ar' ? 'ربط مع تطبيقات أخرى' : 'Connect with other apps',
      icon: <Link2 className="w-5 h-5" />,
      href: '/settings/integrations',
      color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
    },
    {
      title: locale === 'ar' ? 'البيانات' : 'Data',
      description: locale === 'ar' ? 'النسخ الاحتياطي، الاستيراد، التصدير' : 'Backup, import, export',
      icon: <Database className="w-5 h-5" />,
      href: '/settings/data',
      color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    },
    {
      title: locale === 'ar' ? 'المساعدة' : 'Help & Support',
      description: locale === 'ar' ? 'الدعم الفني والتوثيق' : 'Support and documentation',
      icon: <HelpCircle className="w-5 h-5" />,
      href: '/settings/help',
      color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
            {locale === 'ar' ? 'الإعدادات' : 'Settings'}
          </h1>
          <p className="text-navy-500 dark:text-navy-400 mt-1">
            {locale === 'ar' 
              ? 'إدارة إعدادات الحساب والشركة' 
              : 'Manage your account and company settings'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settingsSections.map((section) => (
            <a
              key={section.title}
              href={section.href}
              className="card p-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start gap-4">
                <div className={cn('p-3 rounded-xl', section.color)}>
                  {section.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-navy-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {section.title}
                  </h3>
                  <p className="text-sm text-navy-500 dark:text-navy-400 mt-1">
                    {section.description}
                  </p>
                </div>
                <ChevronRight className={cn(
                  'w-5 h-5 text-navy-400 group-hover:text-primary-600 transition-colors',
                  locale === 'ar' && 'rotate-180'
                )} />
              </div>
            </a>
          ))}
        </div>

        {/* Version Info */}
        <div className="mt-8 text-center text-sm text-navy-400">
          <p>{locale === 'ar' ? 'منصة الأعمال الإصدار 1.0.0' : 'BizPlatform Version 1.0.0'}</p>
          <p className="mt-1">© 2024 {locale === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}</p>
        </div>
      </div>
    </AppLayout>
  );
}
