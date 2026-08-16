export default function ChartCard({ title, subtitle, children, className = '', actions, tour }) {
  return (
    <div data-tour={tour} className={`glass rounded-xl overflow-hidden transition-shadow hover:shadow-md ${className}`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
          {subtitle && <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
