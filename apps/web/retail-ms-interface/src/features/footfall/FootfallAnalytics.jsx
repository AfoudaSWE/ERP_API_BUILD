import { useAppStore } from '../../store/appStore';
import useAsyncData from '../../hooks/useAsyncData';
import { getFootfallAnalytics } from '../../services/mock/footfallService';
import PageHeader from '../../components/common/PageHeader.jsx';
import MetricCard from '../../components/common/MetricCard.jsx';
import ChartCard from '../../components/common/ChartCard.jsx';
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx';
import { formatDuration, formatPercent } from '../../constants';
import {
  Users, LogIn, LogOut, UserCheck, Clock, RefreshCw, UsersRound, TrendingUp
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
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

export default function FootfallAnalytics() {
  const storeId = useAppStore(s => s.selectedStoreId);
  const { data, loading } = useAsyncData(() => getFootfallAnalytics(storeId), [storeId]);

  if (loading) return <div><PageHeader title="Footfall Analytics" /><LoadingSkeleton type="metrics" rows={8} /></div>;
  if (!data) return null;

  const { kpis } = data;

  return (
    <div>
      <PageHeader title="Footfall Analytics" subtitle="Customer traffic patterns and occupancy insights" />

      {/* KPIs */}
      <div data-tour="footfall-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard title="Visitors Today" value={kpis.visitorsToday} change={kpis.footfallChange} icon={Users} color="cyan" tooltip="Total unique visitors" />
        <MetricCard title="Entries" value={kpis.entries} icon={LogIn} color="emerald" tooltip="Total entries tracked" />
        <MetricCard title="Exits" value={kpis.exits} icon={LogOut} color="blue" tooltip="Total exits tracked" />
        <MetricCard title="Current Occupancy" value={`${kpis.currentOccupancy} / ${kpis.capacity}`} icon={UserCheck} color="violet" tooltip="Current people inside vs capacity" />
        <MetricCard title="Peak Hour" value={kpis.peakHour} icon={TrendingUp} color="amber" tooltip="Hour with highest footfall" />
        <MetricCard title="Avg Visit Duration" value={formatDuration(kpis.avgVisitDuration)} icon={Clock} color="cyan" tooltip="Average time spent in store" />
        <MetricCard title="Returning Visitors" value={kpis.returningVisitors} icon={RefreshCw} color="blue" tooltip="Estimated repeat visitors" />
        <MetricCard title="Customer:Staff Ratio" value={`${kpis.customerStaffRatio}:1`} icon={UsersRound} color="emerald" tooltip="Ratio of customers to staff on duty" />
      </div>

      {/* Charts */}
      <div data-tour="footfall-trends" className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Entries & Exits by Hour" subtitle="Hourly traffic flow today">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.entriesExitsByHour} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={30} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="entries" fill="#10b981" radius={[2, 2, 0, 0]} barSize={8} name="Entries" />
                <Bar dataKey="exits" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={8} name="Exits" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Daily Traffic Trend" subtitle="Last 30 days">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyTraffic} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={35} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="visitors" stroke="#06b6d4" fill="url(#dailyGrad)" strokeWidth={2} dot={false} name="Visitors" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div data-tour="footfall-patterns" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Traffic by Weekday" subtitle="Average visitors per day">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trafficByWeekday} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={35} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="visitors" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} name="Visitors" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Visit Duration Distribution" subtitle="Time spent in store">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.visitDurationDist} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={35} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={28} name="Visitors" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
