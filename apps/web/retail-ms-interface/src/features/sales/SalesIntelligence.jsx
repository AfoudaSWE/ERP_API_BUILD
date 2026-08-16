import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import useAsyncData from '../../hooks/useAsyncData';
import { getSalesAnalytics } from '../../services/mock/salesService';
import PageHeader from '../../components/common/PageHeader.jsx';
import MetricCard from '../../components/common/MetricCard.jsx';
import ChartCard from '../../components/common/ChartCard.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx';
import { formatEGP, formatPercent } from '../../constants';
import {
  DollarSign, ShoppingCart, ShoppingBag, Target, PercentIcon,
  TrendingUp, RotateCcw, Layers, BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

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

export default function SalesIntelligence() {
  const storeId = useAppStore(s => s.selectedStoreId);
  const { data, loading } = useAsyncData(() => getSalesAnalytics(storeId), [storeId]);
  const [txPage, setTxPage] = useState(0);

  if (loading) return <div><PageHeader title="Sales Intelligence" /><LoadingSkeleton type="metrics" rows={8} /></div>;
  if (!data) return null;

  const { kpis } = data;
  const txPerPage = 10;
  const paginatedTx = data.recentTransactions.slice(txPage * txPerPage, (txPage + 1) * txPerPage);
  const totalPages = Math.ceil(data.recentTransactions.length / txPerPage);

  return (
    <div>
      <PageHeader title="Sales Intelligence" subtitle="Revenue, transactions, and conversion analytics" />

      <div data-tour="sales-kpis" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <MetricCard title="Gross Sales" value={formatEGP(kpis.grossSales)} icon={DollarSign} color="emerald" />
        <MetricCard title="Net Sales" value={formatEGP(kpis.netSales)} icon={DollarSign} color="cyan" tooltip="After returns and refunds" />
        <MetricCard title="Transactions" value={kpis.transactions} icon={ShoppingCart} color="blue" />
        <MetricCard title="Avg Basket" value={formatEGP(kpis.avgBasket)} icon={ShoppingBag} color="amber" tooltip="Net Sales / Transactions" />
        <MetricCard title="Items / Basket" value={kpis.itemsPerBasket} icon={Layers} color="violet" />
        <MetricCard title="Rev / Visitor" value={formatEGP(kpis.revenuePerVisitor)} icon={TrendingUp} color="emerald" tooltip="Net Sales / Visitors" />
        <MetricCard title="Conversion" value={formatPercent(kpis.conversionRate)} icon={Target} color="cyan" tooltip="Transactions / Visitors × 100" />
        <MetricCard title="Return Rate" value={formatPercent(kpis.returnRate)} icon={RotateCcw} color="red" />
        <MetricCard title="Gross Margin" value={formatPercent(kpis.grossMargin)} icon={PercentIcon} color="emerald" />
        <MetricCard title="Total Items Sold" value={kpis.itemsSold} icon={BarChart3} color="blue" />
      </div>

      <div data-tour="sales-trends" className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Sales by Hour" subtitle="Hourly revenue today">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.salesByHour} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesHrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={50} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="sales" stroke="#10b981" fill="url(#salesHrGrad)" strokeWidth={2} dot={false} name="Sales (EGP)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Revenue by Category" subtitle="Top product categories">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByCategory.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={90} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14} name="Revenue (EGP)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div data-tour="sales-mix" className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Payment Methods */}
        <ChartCard title="Payment Methods" subtitle="Distribution of payment types">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.paymentMethods} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="count" nameKey="method">
                  {data.paymentMethods.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-1">
            {data.paymentMethods.map((pm, i) => (
              <div key={pm.method} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {pm.method}
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Top Products */}
        <ChartCard title="Top Selling Products" subtitle="By revenue today" className="lg:col-span-2">
          <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
            {data.topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04]">
                <span className="text-xs font-bold text-gray-500 w-5">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-200 truncate">{p.name}</p>
                  <p className="text-[10px] text-gray-500">{p.category} • {p.unitsSold} units</p>
                </div>
                <span className="text-xs font-semibold text-emerald-400">{formatEGP(p.revenue)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Conversion Funnel */}
      <ChartCard tour="sales-funnel" title="Sales Conversion Funnel" subtitle="From visitor to purchase" className="mb-4">
        <div className="flex items-end gap-2 h-40">
          {data.conversionFunnel.map((step, i) => {
            const maxVal = data.conversionFunnel[0].value;
            const pct = step.value / maxVal;
            return (
              <div key={step.stage} className="flex-1 flex flex-col items-center">
                <span className="text-xs font-bold text-gray-200 mb-1">{step.value.toLocaleString()}</span>
                <div className="w-full rounded-t-md" style={{
                  height: `${pct * 100}%`,
                  minHeight: 8,
                  background: `linear-gradient(180deg, ${COLORS[i]}, ${COLORS[i]}60)`,
                }} />
                <span className="text-[9px] text-gray-500 mt-1.5 text-center leading-tight">{step.stage}</span>
              </div>
            );
          })}
        </div>
      </ChartCard>

      {/* Cashier Leaderboard */}
      <ChartCard tour="sales-cashiers" title="Cashier Leaderboard" subtitle="Performance ranking" className="mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 uppercase text-[10px]">
                <th className="text-left py-2 px-3">#</th>
                <th className="text-left py-2 px-3">Cashier</th>
                <th className="text-left py-2 px-3">POS</th>
                <th className="text-right py-2 px-3">Transactions</th>
                <th className="text-right py-2 px-3">Revenue</th>
                <th className="text-right py-2 px-3">Avg Service</th>
                <th className="text-right py-2 px-3">Avg Basket</th>
              </tr>
            </thead>
            <tbody>
              {data.cashierLeaderboard.map((c, i) => (
                <tr key={c.name} className="border-t border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 font-bold text-gray-400">{i + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-gray-200">{c.name}</td>
                  <td className="py-2.5 px-3 text-gray-400">{c.posId.toUpperCase()}</td>
                  <td className="py-2.5 px-3 text-right text-gray-300">{c.transactions}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 font-medium">{formatEGP(c.revenue)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-300">{Math.round(c.avgServiceTime / 60)}m</td>
                  <td className="py-2.5 px-3 text-right text-gray-300">{formatEGP(c.avgBasket)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Recent Transactions */}
      <ChartCard tour="sales-transactions" title="Recent Transactions" subtitle={`Showing ${paginatedTx.length} of ${data.recentTransactions.length}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 uppercase text-[10px]">
                <th className="text-left py-2 px-3">ID</th>
                <th className="text-left py-2 px-3">POS</th>
                <th className="text-left py-2 px-3">Cashier</th>
                <th className="text-left py-2 px-3">Time</th>
                <th className="text-center py-2 px-3">Items</th>
                <th className="text-right py-2 px-3">Total</th>
                <th className="text-left py-2 px-3">Payment</th>
                <th className="text-left py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTx.map(tx => (
                <tr key={tx.id} className="border-t border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 font-mono text-gray-300">{tx.id}</td>
                  <td className="py-2.5 px-3 text-gray-400">{tx.pos}</td>
                  <td className="py-2.5 px-3 text-gray-300">{tx.cashier}</td>
                  <td className="py-2.5 px-3 text-gray-400">{format(new Date(tx.time), 'HH:mm')}</td>
                  <td className="py-2.5 px-3 text-center text-gray-300">{tx.items}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-gray-200">{formatEGP(tx.total)}</td>
                  <td className="py-2.5 px-3 text-gray-400">{tx.paymentMethod}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={tx.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
          <span className="text-[11px] text-gray-500">Page {txPage + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <button disabled={txPage === 0} onClick={() => setTxPage(p => p - 1)} className="px-3 py-1.5 text-xs rounded-md bg-white/[0.04] text-gray-400 hover:text-white disabled:opacity-30">Prev</button>
            <button disabled={txPage >= totalPages - 1} onClick={() => setTxPage(p => p + 1)} className="px-3 py-1.5 text-xs rounded-md bg-white/[0.04] text-gray-400 hover:text-white disabled:opacity-30">Next</button>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}
