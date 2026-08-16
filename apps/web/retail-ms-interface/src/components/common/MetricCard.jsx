import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { useState } from 'react';
import MiniSparkline from '../charts/MiniSparkline.jsx';

export default function MetricCard({
  title, value, change, format = 'number', suffix = '',
  sparklineData, icon: Icon, tooltip, loading, color = 'cyan'
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (loading) {
    return (
      <div className="glass rounded-xl p-4 animate-pulse">
        <div className="h-3 w-24 bg-white/[0.06] rounded mb-3" />
        <div className="h-8 w-20 bg-white/[0.06] rounded mb-2" />
        <div className="h-3 w-16 bg-white/[0.06] rounded" />
      </div>
    );
  }

  const isPositive = change > 0;
  const isNeutral = change === 0 || change == null;
  const isNegative = change < 0;

  const changeColor = isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-gray-500';
  const ChangeTrend = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  const colorMap = {
    cyan: 'from-orange-400/10 to-transparent border-orange-500/10',
    blue: 'from-orange-400/10 to-transparent border-orange-500/10',
    emerald: 'from-emerald-400/10 to-transparent border-emerald-500/10',
    amber: 'from-amber-400/10 to-transparent border-amber-500/10',
    red: 'from-red-400/10 to-transparent border-red-500/10',
    violet: 'from-orange-400/10 to-transparent border-orange-500/10',
  };

  const displayValue = value != null ? (typeof value === 'string' ? value : value.toLocaleString('en-EG')) : '—';

  return (
    <div className={`metric-card relative rounded-xl p-4 bg-gradient-to-br ${colorMap[color] || colorMap.cyan} border overflow-hidden group transition-all duration-300`}>
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-gray-400" />}
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</span>
        </div>
        {tooltip && (
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-gray-600 hover:text-gray-400 transition-colors"
            >
              <Info size={13} />
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-6 w-48 p-2 bg-gray-900 border border-white/10 rounded-lg shadow-xl z-50">
                <p className="text-[11px] text-gray-300 leading-relaxed">{tooltip}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between mt-2">
        <div>
          <p className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
            {displayValue}
            {suffix && <span className="text-sm font-normal text-gray-400 ml-1">{suffix}</span>}
          </p>
          {change != null && (
            <div className={`flex items-center gap-1 mt-1.5 ${changeColor}`}>
              <ChangeTrend size={12} />
              <span className="text-xs font-medium">
                {isPositive ? '+' : ''}{change}%
              </span>
              <span className="text-[10px] text-gray-500 ml-0.5">vs yesterday</span>
            </div>
          )}
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <div className="w-20 h-10 opacity-60 group-hover:opacity-100 transition-opacity">
            <MiniSparkline data={sparklineData} color={color} />
          </div>
        )}
      </div>
    </div>
  );
}
