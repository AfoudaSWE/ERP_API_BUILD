import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import useAsyncData from '../../hooks/useAsyncData';
import { getProductPerformance } from '../../services/mock/productService';
import PageHeader from '../../components/common/PageHeader.jsx';
import MetricCard from '../../components/common/MetricCard.jsx';
import ChartCard from '../../components/common/ChartCard.jsx';
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx';
import { formatEGP, formatPercent } from '../../constants';
import {
  Eye, MousePointer, Hand, ShoppingCart, RotateCcw, TrendingDown,
  TrendingUp, Minus, AlertTriangle, Search
} from 'lucide-react';

const FUNNEL_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

const FLAG_LABELS = {
  high_engagement_low_conversion: { label: 'High Engagement, Low Conversion', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  high_sales_low_stock: { label: 'High Sales, Low Stock', color: 'text-red-400', bg: 'bg-red-500/10' },
  low_engagement: { label: 'Low Engagement', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  high_returns: { label: 'High Returns', color: 'text-red-400', bg: 'bg-red-500/10' },
  pickup_no_purchase: { label: 'Picked Up, Not Purchased', color: 'text-violet-400', bg: 'bg-violet-500/10' },
};

export default function ProductPerformance() {
  const storeId = useAppStore(s => s.selectedStoreId);
  const { data, loading } = useAsyncData(() => getProductPerformance(storeId), [storeId]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFlag, setFilterFlag] = useState('all');

  if (loading) return <div><PageHeader title="Product Performance" /><LoadingSkeleton type="metrics" rows={6} /></div>;
  if (!data) return null;

  const { kpis, funnel, products } = data;
  const TrendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus };

  let filtered = products;
  if (searchTerm) {
    const lower = searchTerm.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(lower));
  }
  if (filterFlag !== 'all') {
    filtered = filtered.filter(p => p.flag === filterFlag);
  }

  return (
    <div>
      <PageHeader title="Product Performance" subtitle="Customer behavior and product engagement analytics" />

      <div data-tour="product-kpis" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <MetricCard title="Product Views" value={kpis.productViews} icon={Eye} color="cyan" />
        <MetricCard title="Engagement Rate" value={formatPercent(kpis.engagementRate)} icon={MousePointer} color="blue" />
        <MetricCard title="Pick-up Rate" value={formatPercent(kpis.pickupRate)} icon={Hand} color="violet" />
        <MetricCard title="Purchase Conv." value={formatPercent(kpis.purchaseConversion)} icon={ShoppingCart} color="emerald" />
        <MetricCard title="Return Rate" value={formatPercent(kpis.returnRate)} icon={RotateCcw} color="red" />
        <MetricCard title="Lost Sales Est." value={formatEGP(kpis.lostSales)} icon={TrendingDown} color="amber" tooltip="Estimated revenue from products picked up but not purchased" />
      </div>

      {/* Engagement Funnel */}
      <ChartCard tour="product-funnel" title="Product Engagement Funnel" subtitle="From zone visitors to purchase" className="mb-4">
        <div className="flex items-end gap-3 h-44 px-4">
          {funnel.map((step, i) => {
            const maxVal = funnel[0].value;
            const pct = step.value / maxVal;
            return (
              <div key={step.stage} className="flex-1 flex flex-col items-center">
                <span className="text-sm font-bold text-white mb-1">{step.value.toLocaleString()}</span>
                <div className="w-full rounded-t-lg transition-all duration-500" style={{
                  height: `${Math.max(pct * 100, 5)}%`,
                  background: `linear-gradient(180deg, ${FUNNEL_COLORS[i]}, ${FUNNEL_COLORS[i]}50)`,
                }} />
                <span className="text-[10px] text-gray-400 mt-2 text-center leading-tight">{step.stage}</span>
                {i < funnel.length - 1 && (
                  <span className="text-[9px] text-gray-600 mt-0.5">
                    {((funnel[i + 1].value / step.value) * 100).toFixed(0)}% →
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </ChartCard>

      {/* Filters */}
      <div data-tour="product-filters" className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/30"
          />
        </div>
        <select
          value={filterFlag}
          onChange={e => setFilterFlag(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-gray-300 focus:outline-none"
        >
          <option value="all">All Products</option>
          <option value="high_engagement_low_conversion">High Engagement, Low Conv.</option>
          <option value="high_sales_low_stock">High Sales, Low Stock</option>
          <option value="low_engagement">Low Engagement</option>
          <option value="high_returns">High Returns</option>
          <option value="pickup_no_purchase">Picked Up, Not Purchased</option>
        </select>
      </div>

      {/* Product Cards */}
      <div data-tour="product-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.slice(0, 18).map(p => {
          const Icon = TrendIcon[p.trend] || Minus;
          const flagInfo = p.flag ? FLAG_LABELS[p.flag] : null;

          return (
            <div key={p.id} className="glass rounded-xl p-4 hover:border-white/[0.12] transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-sm font-semibold text-gray-200 truncate">{p.name}</p>
                  <p className="text-[11px] text-gray-500">{p.category} • {p.zone}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Icon size={12} className={p.trend === 'up' ? 'text-emerald-400' : p.trend === 'down' ? 'text-red-400' : 'text-gray-500'} />
                  <span className="text-[10px] text-gray-500">{p.trend}</span>
                </div>
              </div>

              {/* Placeholder image area */}
              <div className="h-12 bg-white/[0.02] rounded-lg mb-3 flex items-center justify-center">
                <span className="text-gray-700 text-[10px] font-mono">{p.sku}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="py-1.5 rounded-md bg-white/[0.02]">
                  <p className="text-xs font-bold text-gray-200">{p.engagement}</p>
                  <p className="text-[9px] text-gray-500">Engagements</p>
                </div>
                <div className="py-1.5 rounded-md bg-white/[0.02]">
                  <p className="text-xs font-bold text-gray-200">{p.sales}</p>
                  <p className="text-[9px] text-gray-500">Sales</p>
                </div>
                <div className="py-1.5 rounded-md bg-white/[0.02]">
                  <p className="text-xs font-bold text-gray-200">{p.conversion}%</p>
                  <p className="text-[9px] text-gray-500">Conv.</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] mb-2">
                <span className="text-gray-500">Stock: <span className="text-gray-300">{p.stock}</span></span>
                <span className="text-gray-500">Revenue: <span className="text-emerald-400">{formatEGP(p.revenue)}</span></span>
              </div>

              {flagInfo && (
                <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md ${flagInfo.bg} mt-1`}>
                  <AlertTriangle size={10} className={flagInfo.color} />
                  <span className={`text-[10px] font-medium ${flagInfo.color}`}>{flagInfo.label}</span>
                </div>
              )}

              <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">{p.recommendation}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
