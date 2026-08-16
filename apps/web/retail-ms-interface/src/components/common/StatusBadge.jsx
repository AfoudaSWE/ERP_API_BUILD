const STATUS_CONFIG = {
  live: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  online: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  active: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  open: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  busy: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  idle: { bg: 'bg-gray-500/10', text: 'text-gray-400', dot: 'bg-gray-400' },
  offline: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  healthy: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  low_stock: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  out_of_stock: { bg: 'bg-red-500/10', text: 'text-red-300', dot: 'bg-red-500' },
  overstock: { bg: 'bg-violet-500/10', text: 'text-violet-400', dot: 'bg-violet-400' },
  dead_stock: { bg: 'bg-gray-500/10', text: 'text-gray-400', dot: 'bg-gray-500' },
  acknowledged: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  resolved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  high: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  low: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  info: { bg: 'bg-gray-500/10', text: 'text-gray-400', dot: 'bg-gray-400' },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  refunded: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  maintenance: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
};

export default function StatusBadge({ status, label, pulse = false }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.info;
  const displayLabel = label || status?.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${pulse ? 'pulse-live' : ''}`} />
      {displayLabel}
    </span>
  );
}
