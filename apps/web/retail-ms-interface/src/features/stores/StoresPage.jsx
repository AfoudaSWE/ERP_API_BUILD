import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import useAsyncData from '../../hooks/useAsyncData';
import { getStores } from '../../services/mock/storeService';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx';
import { formatEGP, formatPercent, formatDuration } from '../../constants';
import {
  MapPin, Users, DollarSign, Target, Clock, AlertTriangle,
  Monitor, Award, ChevronRight, X
} from 'lucide-react';

export default function StoresPage() {
  const { data: stores, loading } = useAsyncData(() => getStores(), []);
  const [selectedStore, setSelectedStore] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const setSelectedStoreGlobal = useAppStore(s => s.setSelectedStore);

  if (loading) return <div><PageHeader title="Stores" /><LoadingSkeleton rows={5} /></div>;
  if (!stores) return null;

  const best = stores[0];
  const atRisk = stores.filter(s => s.performanceScore < 60);

  const toggleCompare = (id) => {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  return (
    <div>
      <PageHeader title="Stores" subtitle="Multi-branch command center — 5 Egyptian branches" />

      {/* Map-style summary */}
      <div data-tour="stores-network" className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={16} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Branch Network — Egypt</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stores.map(store => (
            <button
              key={store.id}
              onClick={() => { setSelectedStoreGlobal(store.id); setSelectedStore(store); }}
              className={`p-3 rounded-lg border text-left transition-all hover:border-white/[0.12] ${
                selectedStore?.id === store.id ? 'border-cyan-500/30 bg-cyan-500/[0.04]' : 'border-white/[0.04] bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <StatusBadge status={store.status} pulse />
              </div>
              <p className="text-xs font-semibold text-white truncate">{store.name}</p>
              <p className="text-[10px] text-gray-500">{store.city}, {store.area}</p>
              <div className="mt-2 flex items-center gap-1">
                <Award size={10} className="text-amber-400" />
                <span className="text-xs font-bold text-amber-400">{store.performanceScore}</span>
                <span className="text-[10px] text-gray-500">score</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Best / At Risk */}
      <div data-tour="stores-focus" className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award size={14} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-gray-200">Best Performing</h3>
          </div>
          <p className="text-lg font-bold text-white">{best.name}</p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <MiniStat label="Score" value={best.performanceScore} />
            <MiniStat label="Sales" value={formatEGP(best.netSales)} />
            <MiniStat label="Conv." value={formatPercent(best.conversionRate)} />
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-gray-200">Needs Attention</h3>
          </div>
          {atRisk.length > 0 ? (
            atRisk.map(s => (
              <div key={s.id} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-300">{s.name}</span>
                <span className="text-xs text-amber-400 font-bold">{s.performanceScore} pts</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">All branches performing well</p>
          )}
        </div>
      </div>

      {/* Store Cards */}
      <h2 className="text-sm font-semibold text-gray-300 mb-3">Branch Overview</h2>
      <div data-tour="stores-overview" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {stores.map(store => (
          <div key={store.id} className="glass rounded-xl p-4 hover:border-white/[0.12] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-white">{store.name}</p>
                <p className="text-[11px] text-gray-500">{store.city} — {store.area}</p>
              </div>
              <StatusBadge status={store.status} pulse />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <StatItem icon={Users} label="Inside Now" value={store.customersInside} />
              <StatItem icon={Users} label="Visitors" value={store.visitorsToday} />
              <StatItem icon={DollarSign} label="Net Sales" value={formatEGP(store.netSales)} />
              <StatItem icon={Target} label="Conversion" value={formatPercent(store.conversionRate)} />
              <StatItem icon={Clock} label="Queue Wait" value={formatDuration(store.avgQueueTime)} />
              <StatItem icon={AlertTriangle} label="Stock Alerts" value={store.lowStockAlerts} />
              <StatItem icon={Monitor} label="Devices" value={`${store.deviceHealth}%`} />
              <StatItem icon={Award} label="Score" value={store.performanceScore} />
            </div>

            <div className="flex gap-2 mt-1">
              <button
                onClick={() => { setSelectedStoreGlobal(store.id); setSelectedStore(store); }}
                className="flex-1 py-1.5 text-[11px] font-medium text-cyan-400 text-center rounded-md bg-cyan-500/10 hover:bg-cyan-500/20"
              >
                View Details
              </button>
              <button
                onClick={() => toggleCompare(store.id)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
                  compareIds.includes(store.id) ? 'bg-violet-500/20 text-violet-400' : 'bg-white/[0.04] text-gray-400 hover:text-white'
                }`}
              >
                {compareIds.includes(store.id) ? '✓ Compare' : 'Compare'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      {compareIds.length >= 2 && (
        <div data-tour="stores-comparison" className="glass rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Branch Comparison</h3>
            <button onClick={() => setCompareIds([])} className="text-gray-500 hover:text-white text-xs">Clear</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 uppercase text-[10px]">
                  <th className="text-left py-2 px-3">Metric</th>
                  {compareIds.map(id => {
                    const s = stores.find(st => st.id === id);
                    return <th key={id} className="text-right py-2 px-3">{s?.name}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Visitors', key: 'visitorsToday' },
                  { label: 'Net Sales', key: 'netSales', fmt: formatEGP },
                  { label: 'Conversion', key: 'conversionRate', fmt: v => formatPercent(v) },
                  { label: 'Queue Wait', key: 'avgQueueTime', fmt: formatDuration },
                  { label: 'Score', key: 'performanceScore' },
                  { label: 'Staff', key: 'staffOnDuty' },
                ].map(row => (
                  <tr key={row.label} className="border-t border-white/[0.03]">
                    <td className="py-2.5 px-3 text-gray-400">{row.label}</td>
                    {compareIds.map(id => {
                      const s = stores.find(st => st.id === id);
                      const val = s?.[row.key];
                      return (
                        <td key={id} className="py-2.5 px-3 text-right text-gray-200 font-medium">
                          {row.fmt ? row.fmt(val) : val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ranking Table */}
      <div data-tour="stores-ranking" className="glass rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.04]">
          <h3 className="text-sm font-semibold text-gray-200">Store Ranking</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 uppercase text-[10px]">
                <th className="text-left py-2 px-4">#</th>
                <th className="text-left py-2 px-3">Store</th>
                <th className="text-right py-2 px-3">Score</th>
                <th className="text-right py-2 px-3">Visitors</th>
                <th className="text-right py-2 px-3">Sales</th>
                <th className="text-right py-2 px-3">Conversion</th>
                <th className="text-right py-2 px-3">Queue Wait</th>
                <th className="text-left py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store, i) => (
                <tr key={store.id} className="border-t border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-2.5 px-4 font-bold text-gray-400">{i + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-gray-200">{store.name}</td>
                  <td className="py-2.5 px-3 text-right"><span className={`font-bold ${store.performanceScore >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{store.performanceScore}</span></td>
                  <td className="py-2.5 px-3 text-right text-gray-300">{store.visitorsToday}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400">{formatEGP(store.netSales)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-300">{formatPercent(store.conversionRate)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-300">{formatDuration(store.avgQueueTime)}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={store.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={11} className="text-gray-500 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500">{label}</p>
        <p className="text-xs font-semibold text-gray-200 truncate">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="px-2 py-1.5 rounded-md bg-white/[0.03] text-center">
      <p className="text-xs font-bold text-white">{value}</p>
      <p className="text-[9px] text-gray-500">{label}</p>
    </div>
  );
}
