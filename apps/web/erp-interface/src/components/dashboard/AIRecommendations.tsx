import Link from '@/components/router/Link';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, TrendingUp, Package, Wallet, Users,
  ChevronRight, Sparkles, X, Check
} from 'lucide-react';
import type { AIRecommendation } from '@/types';

interface AIRecommendationsProps {
  recommendations: AIRecommendation[];
  locale: 'ar' | 'en';
  onDismiss?: (id: string) => void;
  onComplete?: (id: string) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  sales: <TrendingUp className="w-5 h-5" />,
  inventory: <Package className="w-5 h-5" />,
  finance: <Wallet className="w-5 h-5" />,
  purchasing: <Package className="w-5 h-5" />,
  hr: <Users className="w-5 h-5" />,
};

const typeColors: Record<string, string> = {
  sales: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  inventory: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  finance: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  purchasing: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  hr: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
};

const priorityColors: Record<string, string> = {
  critical: 'border-s-4 border-s-danger-500',
  high: 'border-s-4 border-s-warning-500',
  medium: 'border-s-4 border-s-primary-500',
  low: 'border-s-4 border-s-navy-300',
};

function RecommendationCard({
  recommendation,
  locale,
  onDismiss,
  onComplete,
}: {
  recommendation: AIRecommendation;
  locale: 'ar' | 'en';
  onDismiss?: (id: string) => void;
  onComplete?: (id: string) => void;
}) {
  const isRTL = locale === 'ar';

  return (
    <div
      className={cn(
        'bg-white dark:bg-navy-800 rounded-lg p-4 hover:shadow-md transition-shadow',
        priorityColors[recommendation.priority],
        isRTL && 'border-s-0 border-e-4',
        isRTL && recommendation.priority === 'critical' && 'border-e-danger-500',
        isRTL && recommendation.priority === 'high' && 'border-e-warning-500',
        isRTL && recommendation.priority === 'medium' && 'border-e-primary-500',
        isRTL && recommendation.priority === 'low' && 'border-e-navy-300'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg shrink-0', typeColors[recommendation.type])}>
          {typeIcons[recommendation.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-navy-900 dark:text-white text-sm">
              {locale === 'ar' ? recommendation.titleAr : recommendation.title}
            </h4>
            <div className="flex items-center gap-1 shrink-0">
              {onComplete && (
                <button
                  onClick={() => onComplete(recommendation.id)}
                  className="p-1 hover:bg-success-100 dark:hover:bg-success-900/30 rounded text-success-600"
                  title={locale === 'ar' ? 'تم التنفيذ' : 'Mark as done'}
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={() => onDismiss(recommendation.id)}
                  className="p-1 hover:bg-navy-100 dark:hover:bg-navy-700 rounded text-navy-400"
                  title={locale === 'ar' ? 'تجاهل' : 'Dismiss'}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-navy-500 dark:text-navy-400 mt-1 line-clamp-2">
            {locale === 'ar' ? recommendation.descriptionAr : recommendation.description}
          </p>
          {recommendation.impact && (
            <p className="text-xs text-navy-400 mt-2">
              <span className="font-medium">{locale === 'ar' ? 'التأثير:' : 'Impact:'}</span>{' '}
              {locale === 'ar' ? recommendation.impactAr : recommendation.impact}
            </p>
          )}
          {recommendation.actionUrl && (
            <Link
              href={recommendation.actionUrl}
              className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium mt-2"
            >
              {locale === 'ar' ? 'اتخاذ إجراء' : 'Take action'}
              <ChevronRight className={cn('w-3 h-3', isRTL && 'rotate-180')} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function AIRecommendationsCard({
  recommendations,
  locale,
  onDismiss,
  onComplete,
}: AIRecommendationsProps) {
  const activeRecommendations = recommendations.filter((r) => r.status === 'active');
  const highPriorityCount = activeRecommendations.filter(
    (r) => r.priority === 'high' || r.priority === 'critical'
  ).length;

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-ai-500 to-primary-500 rounded-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-navy-900 dark:text-white">
            {locale === 'ar' ? 'توصيات الذكاء الاصطناعي' : 'AI Recommendations'}
          </h3>
          {highPriorityCount > 0 && (
            <span className="badge badge-danger">{highPriorityCount}</span>
          )}
        </div>
        <Link
          href="/ai-assistant"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {locale === 'ar' ? 'عرض الكل' : 'View all'}
        </Link>
      </div>
      <div className="p-4 space-y-3">
        {activeRecommendations.length === 0 ? (
          <div className="text-center py-8 text-navy-500">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-navy-300" />
            <p className="text-sm">
              {locale === 'ar'
                ? 'لا توجد توصيات جديدة حالياً'
                : 'No new recommendations at the moment'}
            </p>
          </div>
        ) : (
          activeRecommendations.slice(0, 4).map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              locale={locale}
              onDismiss={onDismiss}
              onComplete={onComplete}
            />
          ))
        )}
      </div>
    </div>
  );
}
