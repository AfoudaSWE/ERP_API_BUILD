import { useAppStore } from '../../store/appStore';
import { Clock, Wifi, Download, GitCompare } from 'lucide-react';
import { format } from 'date-fns';

export default function PageHeader({ title, subtitle, actions, showDefaultActions = true }) {
  const { liveMode } = useAppStore();
  const store = useAppStore(s => s.stores.find(st => st.id === s.selectedStoreId));
  const now = new Date();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">{title}</h1>
        <div className="flex items-center gap-3 mt-1">
          {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <Clock size={11} />
            <span>{format(now, 'dd MMM yyyy, HH:mm')}</span>
          </div>
          {liveMode && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
              <Wifi size={11} />
              <span className="pulse-live">Live</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {showDefaultActions && <>
          <button className="ui-button hidden sm:flex px-3 py-2 text-xs font-medium">
            <GitCompare size={13} />
            Compare
          </button>
          <button className="ui-button hidden sm:flex px-3 py-2 text-xs font-medium">
            <Download size={13} />
            Export
          </button>
        </>}
      </div>
    </div>
  );
}
