import { useAppStore } from '../../store/appStore';
import useAsyncData from '../../hooks/useAsyncData';
import { getQueueMetrics } from '../../services/mock/queueService';
import PageHeader from '../../components/common/PageHeader.jsx';
import MetricCard from '../../components/common/MetricCard.jsx';
import ChartCard from '../../components/common/ChartCard.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx';
import { formatDuration, formatEGP } from '../../constants';
import {
  Users, Clock, Timer, Gauge, Ban, BarChart, Monitor, Lightbulb
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart as RBarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a2236] border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

export default function QueueAnalytics() {
  const storeId = useAppStore(s => s.selectedStoreId);
  const { data, loading } = useAsyncData(() => getQueueMetrics(storeId), [storeId]);

  if (loading) return <div><PageHeader title="Queue Analytics" /><LoadingSkeleton type="metrics" rows={8} /></div>;
  if (!data) return null;

  const { kpis, terminals } = data;

  return (
    <div>
      <PageHeader title="Queue Analytics" subtitle="Checkout operations and wait time monitoring" />

      {/* KPIs */}
      <div data-tour="queue-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard title="Currently Waiting" value={kpis.currentlyWaiting} icon={Users} color="cyan" tooltip="People currently in checkout queues" />
        <MetricCard title="Avg Wait Time" value={formatDuration(kpis.avgWaitTime)} icon={Clock} color={kpis.avgWaitTime > 300 ? 'red' : 'amber'} tooltip="Average queue waiting time" />
        <MetricCard title="P95 Wait Time" value={formatDuration(kpis.p95WaitTime)} icon={Timer} color="red" tooltip="95th percentile wait time" />
        <MetricCard title="Avg Service Time" value={formatDuration(kpis.avgServiceTime)} icon={Gauge} color="blue" tooltip="Average checkout service duration" />
        <MetricCard title="Payment Gap" value={formatDuration(kpis.paymentGap)} icon={Clock} color="violet" tooltip="Average time between completed payments" />
        <MetricCard title="Abandonment Rate" value={`${kpis.abandonmentRate}%`} icon={Ban} color="red" tooltip="Percentage of customers who left queue" />
        <MetricCard title="Served / Hour" value={kpis.servedPerHour} icon={BarChart} color="emerald" tooltip="Customers served per hour across all counters" />
        <MetricCard title="Open Counters" value={`${kpis.openCounters} / ${kpis.totalCounters}`} icon={Monitor} color="cyan" tooltip="Active checkout counters" />
      </div>

      {/* POS Terminal Cards */}
      <h2 className="text-sm font-semibold text-gray-300 mb-3">Checkout Counters</h2>
      <div data-tour="queue-counters" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {terminals.map(pos => (
          <div key={pos.id} className="glass rounded-xl p-4 hover:border-white/[0.12] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white">{pos.name}</span>
              <StatusBadge status={pos.status} pulse={pos.status === 'open' || pos.status === 'busy'} />
            </div>
            <p className="text-xs text-gray-400 mb-3">{pos.cashier}</p>

            <div className="grid grid-cols-2 gap-2">
              <PosField label="Queue" value={pos.queueLength} />
              <PosField label="Service Time" value={formatDuration(pos.currentServiceDuration)} />
              <PosField label="Avg Service" value={formatDuration(pos.avgServiceTime)} />
              <PosField label="TX/Hour" value={pos.transactionsPerHour} />
              <PosField label="Sales" value={formatEGP(pos.salesValue)} />
              <PosField label="Since Last TX" value={formatDuration(pos.timeSinceLastTx)} />
            </div>

            {/* Visual queue lane */}
            {pos.queueLength > 0 && (
              <div className="mt-3 flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/[0.02]">
                <span className="text-[10px] text-gray-500 mr-1">Queue:</span>
                {Array.from({ length: Math.min(pos.queueLength, 8) }).map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-amber-400/60' : 'bg-cyan-400/30'}`} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div data-tour="queue-analysis" className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Queue Length Over Time" subtitle="Total customers waiting">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.queueOverTime} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={25} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="queueLength" stroke="#06b6d4" strokeWidth={2} dot={false} name="Queue Length" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Wait Time by Hour" subtitle="Avg and P95 wait times">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.waitByHour} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={30} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="avgWait" stroke="#f59e0b" strokeWidth={2} dot={false} name="Avg Wait (s)" />
                <Line type="monotone" dataKey="p95Wait" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="P95 Wait (s)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Cashier Throughput" subtitle="Transactions and efficiency">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RBarChart data={data.cashierThroughput} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="cashier" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={30} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="transactions" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} name="Transactions" />
              </RBarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Recommendations */}
        <ChartCard tour="queue-recommendations" title="Operational Recommendations" subtitle="Queue optimization suggestions" actions={
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 text-[10px] font-medium">
            <Lightbulb size={10} /> AI Insight
          </span>
        }>
          <div className="space-y-2.5">
            {data.recommendations.map(rec => (
              <div key={rec.id} className={`flex gap-3 p-3 rounded-lg border ${
                rec.priority === 'high' ? 'border-amber-500/20 bg-amber-500/[0.03]' : 'border-white/[0.04] bg-white/[0.01]'
              }`}>
                <Lightbulb size={14} className={rec.priority === 'high' ? 'text-amber-400' : 'text-blue-400'} />
                <div className="flex-1">
                  <p className="text-xs text-gray-300">{rec.message}</p>
                  <button className="mt-1.5 text-[10px] font-medium text-cyan-400 hover:text-cyan-300">{rec.action} →</button>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function PosField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
      <p className="text-xs font-semibold text-gray-200">{value}</p>
    </div>
  );
}
