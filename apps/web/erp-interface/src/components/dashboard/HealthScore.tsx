import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus, Info } from 'lucide-react';
import type { BusinessHealthScore, HealthFactor } from '@/types';

interface HealthScoreProps {
  score: BusinessHealthScore;
  locale: 'ar' | 'en';
}

export function HealthScoreGauge({ value, size = 'lg' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const radius = size === 'lg' ? 52 : size === 'md' ? 40 : 28;
  const strokeWidth = size === 'lg' ? 10 : size === 'md' ? 8 : 6;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  const dashOffset = circumference - progress;

  const getColor = () => {
    if (value >= 80) return '#10b981'; // success
    if (value >= 60) return '#3b82f6'; // primary
    if (value >= 40) return '#f59e0b'; // warning
    return '#ef4444'; // danger
  };

  const containerSize = size === 'lg' ? 140 : size === 'md' ? 100 : 72;

  return (
    <div className="relative" style={{ width: containerSize, height: containerSize }}>
      <svg
        className="transform -rotate-90"
        width={containerSize}
        height={containerSize}
      >
        {/* Background circle */}
        <circle
          cx={containerSize / 2}
          cy={containerSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-navy-200 dark:text-navy-700"
        />
        {/* Progress circle */}
        <circle
          cx={containerSize / 2}
          cy={containerSize / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn(
          'font-bold',
          size === 'lg' && 'text-3xl',
          size === 'md' && 'text-2xl',
          size === 'sm' && 'text-lg'
        )}>
          {value}
        </span>
      </div>
    </div>
  );
}

function FactorRow({ factor, locale }: { factor: HealthFactor; locale: 'ar' | 'en' }) {
  const getTrendIcon = () => {
    if (factor.trend === 'up') return <ArrowUp className="w-3 h-3 text-success-600" />;
    if (factor.trend === 'down') return <ArrowDown className="w-3 h-3 text-danger-500" />;
    return <Minus className="w-3 h-3 text-navy-400" />;
  };

  const getScoreColor = () => {
    if (factor.score >= 80) return 'bg-success-500';
    if (factor.score >= 60) return 'bg-primary-500';
    if (factor.score >= 40) return 'bg-warning-500';
    return 'bg-danger-500';
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-navy-700 dark:text-navy-200 truncate">
            {locale === 'ar' ? factor.nameAr : factor.name}
          </span>
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className="text-sm font-semibold text-navy-900 dark:text-white">{factor.score}</span>
          </div>
        </div>
        <div className="w-full bg-navy-200 dark:bg-navy-700 rounded-full h-1.5">
          <div
            className={cn('h-1.5 rounded-full transition-all duration-500', getScoreColor())}
            style={{ width: `${factor.score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function HealthScoreCard({ score, locale }: HealthScoreProps) {
  const categoryScores = [
    { key: 'sales', value: score.sales, labelAr: 'المبيعات', label: 'Sales' },
    { key: 'cashFlow', value: score.cashFlow, labelAr: 'التدفق النقدي', label: 'Cash Flow' },
    { key: 'profitability', value: score.profitability, labelAr: 'الربحية', label: 'Profitability' },
    { key: 'inventory', value: score.inventory, labelAr: 'المخزون', label: 'Inventory' },
    { key: 'customers', value: score.customers, labelAr: 'العملاء', label: 'Customers' },
    { key: 'suppliers', value: score.suppliers, labelAr: 'الموردون', label: 'Suppliers' },
    { key: 'workforce', value: score.workforce, labelAr: 'القوى العاملة', label: 'Workforce' },
  ];

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-semibold text-navy-900 dark:text-white">
          {locale === 'ar' ? 'مؤشر صحة العمل' : 'Business Health Score'}
        </h3>
        <button className="btn btn-ghost btn-icon btn-sm">
          <Info className="w-4 h-4" />
        </button>
      </div>
      <div className="card-body">
        <div className="flex items-center gap-6 mb-6">
          <HealthScoreGauge value={score.overall} size="lg" />
          <div className="flex-1">
            <p className="text-sm text-navy-500 dark:text-navy-400 mb-3">
              {locale === 'ar'
                ? 'يعكس هذا المؤشر الصحة العامة لعملك بناءً على عدة عوامل'
                : 'This score reflects your overall business health based on multiple factors'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {categoryScores.slice(0, 4).map((cat) => (
                <div key={cat.key} className="flex items-center gap-2">
                  <HealthScoreGauge value={cat.value} size="sm" />
                  <span className="text-xs text-navy-600 dark:text-navy-300">
                    {locale === 'ar' ? cat.labelAr : cat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-navy-200 dark:border-navy-700 pt-4">
          <h4 className="text-sm font-semibold text-navy-700 dark:text-navy-200 mb-3">
            {locale === 'ar' ? 'تفاصيل العوامل' : 'Factor Details'}
          </h4>
          <div className="space-y-1">
            {score.factors.slice(0, 5).map((factor) => (
              <FactorRow key={factor.name} factor={factor} locale={locale} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
