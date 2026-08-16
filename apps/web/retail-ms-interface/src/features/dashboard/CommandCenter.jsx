import { useAppStore } from '../../store/appStore';
import useAsyncData from '../../hooks/useAsyncData';
import { getDashboardMetrics, getDashboardCharts, getAIInsights } from '../../services/mock/dashboardService';
import PageHeader from '../../components/common/PageHeader.jsx';
import MetricCard from '../../components/common/MetricCard.jsx';
import ChartCard from '../../components/common/ChartCard.jsx';
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx';
import { formatEGP, formatPercent, formatDuration } from '../../constants';
import {
  Users, UserCheck, ArrowLeftRight, DollarSign, Target,
  ShoppingBag, Clock, AlertTriangle, Lightbulb, Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, FunnelChart, Funnel, LabelList,
} from 'recharts';

const CHART_COLORS = ['#f97316', '#fb923c', '#fdba74', '#111113', '#71717a', '#ea580c', '#fed7aa', '#3f3f46', '#c2410c', '#a1a1aa'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="popover-surface border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

export default function CommandCenter() {
  const storeId = useAppStore(s => s.selectedStoreId);
  const { data: metrics, loading: mLoading } = useAsyncData(() => getDashboardMetrics(storeId), [storeId]);
  const { data: charts, loading: cLoading } = useAsyncData(() => getDashboardCharts(storeId), [storeId]);
  const { data: insights, loading: iLoading } = useAsyncData(() => getAIInsights(storeId), [storeId]);

  return (
    <div>
      <PageHeader
        title="Command Center"
        subtitle="Executive overview of store operations"
      />

      {/* KPI Cards */}
      {mLoading ? (
        <LoadingSkeleton type="metrics" rows={8} />
      ) : metrics ? (
        <div data-tour="command-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetricCard
            title="Customers Inside"
            value={metrics.customersInside.value}
            change={metrics.customersInside.change}
            sparklineData={metrics.customersInside.sparkline}
            icon={Users}
            color="cyan"
            tooltip="Current number of customers in the store based on entry/exit tracking"
          />
          <MetricCard
            title="Visitors Today"
            value={metrics.visitorsToday.value}
            change={metrics.visitorsToday.change}
            sparklineData={metrics.visitorsToday.sparkline}
            icon={UserCheck}
            color="blue"
            tooltip="Total unique visitors who entered the store today"
          />
          <MetricCard
            title="Net Sales Today"
            value={formatEGP(metrics.netSales.value)}
            change={metrics.netSales.change}
            sparklineData={metrics.netSales.sparkline}
            icon={DollarSign}
            color="emerald"
            tooltip="Total net sales after returns and refunds"
          />
          <MetricCard
            title="Conversion Rate"
            value={formatPercent(metrics.conversionRate.value)}
            change={metrics.conversionRate.change}
            icon={Target}
            color="violet"
            tooltip="Percentage of visitors who completed a purchase"
          />
          <MetricCard
            title="Entries / Exits"
            value={`${metrics.entriesExits.entries} / ${metrics.entriesExits.exits}`}
            change={metrics.entriesExits.change}
            icon={ArrowLeftRight}
            color="blue"
            tooltip="Total entries and exits tracked today"
          />
          <MetricCard
            title="Avg Basket Value"
            value={formatEGP(metrics.avgBasket.value)}
            change={metrics.avgBasket.change}
            icon={ShoppingBag}
            color="amber"
            tooltip="Average transaction value = Net Sales / Transactions"
          />
          <MetricCard
            title="Avg Queue Wait"
            value={formatDuration(metrics.avgQueueWait.value)}
            change={metrics.avgQueueWait.change}
            icon={Clock}
            color={metrics.avgQueueWait.value > 300 ? 'red' : 'cyan'}
            tooltip="Average time customers wait in checkout queues"
          />
          <MetricCard
            title="Inventory Alerts"
            value={metrics.inventoryAlerts.value}
            change={metrics.inventoryAlerts.change}
            icon={AlertTriangle}
            color="red"
            tooltip="Number of products with low stock or out of stock alerts"
          />
        </div>
      ) : null}

      {/* Charts Grid */}
      {cLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <LoadingSkeleton type="chart" />
          <LoadingSkeleton type="chart" />
        </div>
      ) : charts ? (
        <>
          <div data-tour="command-demand" className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Footfall vs Sales */}
            <ChartCard title="Footfall vs Sales" subtitle="Hourly comparison today">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.footfallVsSales} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="footfallGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.24} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval={2} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={35} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={50} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area yAxisId="left" type="monotone" dataKey="visitors" stroke="#f97316" fill="url(#footfallGrad)" strokeWidth={2} dot={false} name="Visitors" />
                    <Area yAxisId="right" type="monotone" dataKey="sales" stroke="#10b981" fill="url(#salesGrad)" strokeWidth={2} dot={false} name="Sales (EGP)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Occupancy Trend */}
            <ChartCard title="Occupancy Trend" subtitle="Store capacity utilization">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.occupancyTrend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fb923c" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval={2} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={35} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="occupancy" stroke="#fb923c" fill="url(#occGrad)" strokeWidth={2} dot={false} name="Occupancy" />
                    <Line type="monotone" dataKey="capacity" stroke="#374151" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Capacity" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div data-tour="command-performance" className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Conversion Funnel */}
            <ChartCard title="Sales Conversion Funnel" subtitle="Visitor to purchase journey">
              <div className="space-y-2">
                {charts.conversionFunnel.map((step, i) => {
                  const maxVal = charts.conversionFunnel[0].value;
                  const pct = (step.value / maxVal * 100).toFixed(0);
                  return (
                    <div key={step.stage}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-400">{step.stage}</span>
                        <span className="text-gray-300 font-medium">{step.value.toLocaleString()}</span>
                      </div>
                      <div className="h-6 bg-white/[0.03] rounded-md overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${CHART_COLORS[i]}, ${CHART_COLORS[i]}88)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            {/* Zone Performance */}
            <ChartCard title="Zone Performance" subtitle="Visitors and conversion by zone">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.zonePerformance} layout="vertical" margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="zone" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="visitors" fill="#f97316" radius={[0, 4, 4, 0]} barSize={14} name="Visitors" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Revenue by Category */}
            <ChartCard title="Revenue by Category" subtitle="Sales distribution today">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.revenueByCategory.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="revenue"
                      nameKey="category"
                    >
                      {charts.revenueByCategory.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {charts.revenueByCategory.slice(0, 6).map((cat, i) => (
                  <div key={cat.category} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i] }} />
                    {cat.category}
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* Queue Wait Trend */}
          <div data-tour="command-actions" className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <ChartCard title="Queue Wait Time Trend" subtitle="Average and P95 wait times">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.queueWaitTrend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval={2} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={35} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="avgWait" stroke="#f59e0b" strokeWidth={2} dot={false} name="Avg Wait (s)" />
                    <Line type="monotone" dataKey="p95Wait" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="P95 Wait (s)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* AI Insights */}
            <ChartCard
              title="AI Operations Brief"
              subtitle="Generated recommendations"
              actions={
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-medium">
                  <Sparkles size={10} />
                  AI Insight
                </span>
              }
            >
              <div className="space-y-2.5 max-h-56 overflow-y-auto no-scrollbar">
                {iLoading ? (
                  <LoadingSkeleton rows={4} />
                ) : insights?.map(insight => (
                  <div
                    key={insight.id}
                    className={`flex gap-3 p-3 rounded-lg border transition-colors hover:bg-white/[0.02] ${
                      insight.priority === 'high'
                        ? 'border-amber-500/20 bg-amber-500/[0.03]'
                        : 'border-white/[0.04] bg-white/[0.01]'
                    }`}
                  >
                    <Lightbulb size={14} className={
                      insight.priority === 'high' ? 'text-amber-400' :
                      insight.priority === 'medium' ? 'text-blue-400' : 'text-gray-500'
                    } />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 leading-relaxed">{insight.message}</p>
                      <span className="text-[10px] text-gray-500 mt-1 inline-block">{insight.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
