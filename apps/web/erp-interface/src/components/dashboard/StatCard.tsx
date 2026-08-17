import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { formatStatCardValue, STAT_CARD_LAYOUT_CLASS, type StatCardFormat } from './stat-card-format';

interface StatCardProps {
  title: string;
  value: unknown;
  format?: StatCardFormat;
  locale?: string;
  currency?: string;
  prefix?: string;
  suffix?: string;
  fallback?: string;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  href?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon,
  iconBg = 'bg-primary-100 dark:bg-primary-900/30',
  trend,
  className,
  href,
  format = 'auto',
  locale = 'en-EG',
  currency = 'EGP',
  prefix = '',
  suffix = '',
  fallback = '—',
}: StatCardProps) {
  const formattedValue = formatStatCardValue({ value, format, locale, currency, fallback });
  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowUp className="w-3 h-3" />;
    if (trend === 'down') return <ArrowDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-success-600';
    if (trend === 'down') return 'text-danger-500';
    return 'text-navy-500';
  };

  const content = (
    <div className={cn(STAT_CARD_LAYOUT_CLASS, href && 'cursor-pointer', className)}>
      <div className="flex min-h-0 items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="stat-label mb-1">{title}</p>
          <p className="stat-value truncate" title={`${prefix}${formattedValue}${suffix}`}>{prefix}{formattedValue}{suffix}</p>
          {subtitle && (
            <p className="text-xs text-navy-400 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={cn('rounded-lg p-2.5', iconBg)}>
            {icon}
          </div>
        )}
      </div>
      
      {(change !== undefined || changeLabel) && (
        <div className="flex items-center gap-1 mt-3">
          {change !== undefined && (
            <span className={cn('stat-change flex items-center gap-0.5', getTrendColor())}>
              {getTrendIcon()}
              {Number.isFinite(change) ? Math.abs(change).toFixed(1) : '—'}%
            </span>
          )}
          {changeLabel && (
            <span className="text-xs text-navy-400">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block h-full">
        {content}
      </a>
    );
  }

  return content;
}
