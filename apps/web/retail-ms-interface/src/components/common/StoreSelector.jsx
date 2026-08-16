import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { Building2, ChevronDown, Check } from 'lucide-react';

export default function StoreSelector() {
  const { stores, selectedStoreId, setSelectedStore } = useAppStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = stores.find(s => s.id === selectedStoreId);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="ui-button px-3 py-2"
      >
        <Building2 size={14} className="text-orange-500" />
        <span className="text-sm font-medium text-[var(--foreground)] max-w-[160px] truncate">
          {selected?.name || 'Select Store'}
        </span>
        <ChevronDown size={14} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 popover-surface border rounded-xl shadow-2xl shadow-black/15 overflow-hidden z-50">
          <div className="p-2">
            {stores.map(store => (
              <button
                key={store.id}
                onClick={() => { setSelectedStore(store.id); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  store.id === selectedStoreId
                    ? 'bg-orange-500/10 text-orange-500'
                    : 'text-[var(--foreground)] hover:bg-[var(--muted)]'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${store.status === 'live' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{store.name}</p>
                  <p className="text-[11px] text-gray-500">{store.city}</p>
                </div>
                {store.id === selectedStoreId && <Check size={14} className="text-orange-500" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
