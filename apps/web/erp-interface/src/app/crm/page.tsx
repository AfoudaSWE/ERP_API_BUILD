import { useState } from 'react';
import Link from '@/components/router/Link';
import {
  Search, Plus, Filter, Users, TrendingUp, Target,
  Phone, Mail, Calendar, ChevronRight, MoreHorizontal
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useApiData } from '@/lib/api-data';

const pipelineStages = [
  { id: 'new', label: 'New', labelAr: 'جديد', color: 'bg-gray-500' },
  { id: 'contacted', label: 'Contacted', labelAr: 'تم التواصل', color: 'bg-blue-500' },
  { id: 'qualified', label: 'Qualified', labelAr: 'مؤهل', color: 'bg-purple-500' },
  { id: 'proposal', label: 'Proposal', labelAr: 'عرض سعر', color: 'bg-orange-500' },
  { id: 'negotiation', label: 'Negotiation', labelAr: 'تفاوض', color: 'bg-yellow-500' },
  { id: 'won', label: 'Won', labelAr: 'ناجح', color: 'bg-green-500' },
  { id: 'lost', label: 'Lost', labelAr: 'خاسر', color: 'bg-red-500' },
];

export default function CRMPage() {
  const { i18n } = useTranslation();
  const { leads } = useApiData();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const isRTL = locale === 'ar';
  const formatPrice = (value: number) => formatCurrency(value, 'EGP', locale === 'ar' ? 'ar-EG' : 'en-EG');

  const getStageLeads = (stageId: string) => leads.filter(lead => lead.status === stageId);

  const stats = {
    totalLeads: leads.length,
    totalValue: leads.reduce((sum, l) => sum + (l.value || 0), 0),
    wonValue: leads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.value || 0), 0),
    avgProbability: leads.length ? Math.round(leads.reduce((sum, l) => sum + l.probability, 0) / leads.length) : 0,
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
              {locale === 'ar' ? 'إدارة علاقات العملاء' : 'CRM'}
            </h1>
            <p className="text-navy-500 dark:text-navy-400 mt-1">
              {locale === 'ar' 
                ? 'إدارة العملاء المحتملين وخط المبيعات' 
                : 'Manage leads and sales pipeline'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-navy-100 dark:bg-navy-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-navy-700 text-navy-900 dark:text-white shadow-sm'
                    : 'text-navy-600 dark:text-navy-400'
                )}
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  viewMode === 'list'
                    ? 'bg-white dark:bg-navy-700 text-navy-900 dark:text-white shadow-sm'
                    : 'text-navy-600 dark:text-navy-400'
                )}
              >
                {locale === 'ar' ? 'قائمة' : 'List'}
              </button>
            </div>
            <Link href="/crm/leads/new" className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              {locale === 'ar' ? 'عميل محتمل' : 'New Lead'}
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="stat-label">{locale === 'ar' ? 'العملاء المحتملين' : 'Total Leads'}</p>
              <p className="stat-value">{stats.totalLeads}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="stat-label">{locale === 'ar' ? 'إجمالي القيمة' : 'Pipeline Value'}</p>
              <p className="stat-value text-lg">{formatPrice(stats.totalValue)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success-50 dark:bg-success-900/30 rounded-lg">
              <Target className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="stat-label">{locale === 'ar' ? 'الصفقات الناجحة' : 'Won Value'}</p>
              <p className="stat-value text-lg text-success-600">{formatPrice(stats.wonValue)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="stat-label">{locale === 'ar' ? 'متوسط الاحتمالية' : 'Avg Probability'}</p>
              <p className="stat-value">{stats.avgProbability}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {pipelineStages.slice(0, 5).map((stage) => {
            const stageLeads = getStageLeads(stage.id);
            const stageValue = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0);

            return (
              <div key={stage.id} className="flex-shrink-0 w-72">
                <div className="bg-navy-100 dark:bg-navy-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded-full', stage.color)} />
                      <h3 className="font-semibold text-navy-900 dark:text-white">
                        {locale === 'ar' ? stage.labelAr : stage.label}
                      </h3>
                      <span className="badge badge-gray">{stageLeads.length}</span>
                    </div>
                  </div>
                  <p className="text-sm text-navy-500 mb-3">
                    {formatPrice(stageValue)}
                  </p>

                  <div className="space-y-2">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-white dark:bg-navy-900 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-navy-900 dark:text-white">
                            {locale === 'ar' && lead.nameAr ? lead.nameAr : lead.name}
                          </h4>
                          <button className="p-1 hover:bg-navy-100 dark:hover:bg-navy-800 rounded">
                            <MoreHorizontal className="w-4 h-4 text-navy-400" />
                          </button>
                        </div>
                        {lead.company && (
                          <p className="text-sm text-navy-500 mb-2">{lead.company}</p>
                        )}
                        {lead.value && (
                          <p className="text-sm font-semibold text-primary-600 mb-2">
                            {formatPrice(lead.value)}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-navy-400">
                          <span>{lead.probability}%</span>
                          {lead.expectedCloseDate && (
                            <span>{formatDate(lead.expectedCloseDate, 'ar-EG')}</span>
                          )}
                        </div>
                      </div>
                    ))}

                    {stageLeads.length === 0 && (
                      <div className="text-center py-4 text-navy-400 text-sm">
                        {locale === 'ar' ? 'لا يوجد عملاء' : 'No leads'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th>{locale === 'ar' ? 'الشركة' : 'Company'}</th>
                  <th>{locale === 'ar' ? 'القيمة' : 'Value'}</th>
                  <th>{locale === 'ar' ? 'المرحلة' : 'Stage'}</th>
                  <th>{locale === 'ar' ? 'الاحتمالية' : 'Probability'}</th>
                  <th>{locale === 'ar' ? 'المصدر' : 'Source'}</th>
                  <th className="text-end">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const stage = pipelineStages.find(s => s.id === lead.status);
                  
                  return (
                    <tr key={lead.id}>
                      <td>
                        <div>
                          <p className="font-medium text-navy-900 dark:text-white">
                            {locale === 'ar' && lead.nameAr ? lead.nameAr : lead.name}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            {lead.phone && (
                              <span className="text-xs text-navy-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {lead.phone}
                              </span>
                            )}
                            {lead.email && (
                              <span className="text-xs text-navy-500 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {lead.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{lead.company || '-'}</td>
                      <td className="font-semibold">{lead.value ? formatPrice(lead.value) : '-'}</td>
                      <td>
                        <span className={cn('badge', stage?.color.replace('bg-', 'bg-').concat('/20'), stage?.color.replace('bg-', 'text-'))}>
                          {locale === 'ar' ? stage?.labelAr : stage?.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-navy-200 dark:bg-navy-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-primary-500"
                              style={{ width: `${lead.probability}%` }}
                            />
                          </div>
                          <span className="text-sm">{lead.probability}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-gray">{lead.source || '-'}</span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/crm/leads/${lead.id}`}
                            className="btn btn-ghost btn-sm"
                          >
                            {locale === 'ar' ? 'عرض' : 'View'}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
