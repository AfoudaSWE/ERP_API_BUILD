import { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import useAsyncData from '../../hooks/useAsyncData';
import { getInventory } from '../../services/mock/inventoryService';
import PageHeader from '../../components/common/PageHeader.jsx';
import MetricCard from '../../components/common/MetricCard.jsx';
import ChartCard from '../../components/common/ChartCard.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx';
import { formatEGP, formatPercent, CATEGORIES } from '../../constants';
import {
  Package, AlertTriangle, XCircle, Archive, CheckCircle,
  RefreshCw, ArrowLeftRight, Search, Download, ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a2236] border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: p.color || p.fill }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

export default function InventoryPage() {
  const storeId = useAppStore(s => s.selectedStoreId);
  const { data, loading } = useAsyncData(() => getInventory(storeId), [storeId]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('status');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const filteredInventory = useMemo(() => {
    if (!data) return [];
    let items = data.inventory;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      items = items.filter(p => p.name.toLowerCase().includes(lower) || p.sku.toLowerCase().includes(lower));
    }
    if (statusFilter !== 'all') items = items.filter(p => p.status === statusFilter);
    if (categoryFilter !== 'all') items = items.filter(p => p.category === categoryFilter);

    const statusOrder = { out_of_stock: 0, critical: 1, low_stock: 2, healthy: 3, overstock: 4, dead_stock: 5 };
    items.sort((a, b) => {
      if (sortField === 'status') return (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
      if (sortField === 'name') return a.name.localeCompare(b.name);
      if (sortField === 'available') return a.available - b.available;
      return 0;
    });
    if (sortDir === 'desc') items.reverse();
    return items;
  }, [data, searchTerm, statusFilter, categoryFilter, sortField, sortDir]);

  const perPage = 10;
  const totalPages = Math.ceil(filteredInventory.length / perPage);
  const pageItems = filteredInventory.slice(page * perPage, (page + 1) * perPage);

  if (loading) return <div><PageHeader title="Inventory" /><LoadingSkeleton type="metrics" rows={8} /></div>;
  if (!data) return null;

  const { kpis } = data;

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Stock management and replenishment" />

      <div data-tour="inventory-kpis" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard title="Stock Value" value={formatEGP(kpis.totalStockValue)} icon={Package} color="emerald" />
        <MetricCard title="Total Products" value={kpis.totalProducts} icon={Archive} color="blue" />
        <MetricCard title="Low Stock" value={kpis.lowStock} icon={AlertTriangle} color="amber" />
        <MetricCard title="Out of Stock" value={kpis.outOfStock} icon={XCircle} color="red" />
        <MetricCard title="Critical" value={kpis.critical} icon={AlertTriangle} color="red" />
        <MetricCard title="Stock Accuracy" value={formatPercent(kpis.stockAccuracy)} icon={CheckCircle} color="emerald" />
        <MetricCard title="Turnover Rate" value={`${kpis.turnover}x`} icon={RefreshCw} color="blue" />
        <MetricCard title="Pending Transfers" value={kpis.pendingTransfers} icon={ArrowLeftRight} color="violet" />
      </div>

      <div data-tour="inventory-health" className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <ChartCard title="Inventory Health" subtitle="Stock status distribution">
          <div className="h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.healthDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="count" nameKey="status">
                  {data.healthDistribution.map((d, i) => (<Cell key={i} fill={d.color} />))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {data.healthDistribution.map(d => (
              <div key={d.status} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                {d.status} ({d.count})
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Stock by Category" subtitle="Value distribution" className="lg:col-span-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.stockByCategory} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="category" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} angle={-35} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={50} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="totalValue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={18} name="Stock Value (EGP)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Inventory Table */}
      <ChartCard tour="inventory-products" title="Product Inventory" subtitle={`${filteredInventory.length} products`} actions={
        <button className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-gray-400 hover:text-white bg-white/[0.04]">
          <Download size={11} /> CSV
        </button>
      }>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
              placeholder="Search products or SKUs..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/30"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-gray-300 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="healthy">Healthy</option>
            <option value="low_stock">Low Stock</option>
            <option value="critical">Critical</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="overstock">Overstock</option>
          </select>
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-gray-300 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 uppercase text-[10px]">
                <th className="text-left py-2 px-3">Product</th>
                <th className="text-left py-2 px-3">SKU</th>
                <th className="text-left py-2 px-3">Category</th>
                <th className="text-right py-2 px-3">On Hand</th>
                <th className="text-right py-2 px-3">Available</th>
                <th className="text-right py-2 px-3">Reorder Pt</th>
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-left py-2 px-3">Velocity</th>
                <th className="text-right py-2 px-3">Days Cover</th>
                <th className="text-left py-2 px-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(p => (
                <tr
                  key={p.id}
                  className="border-t border-white/[0.03] hover:bg-white/[0.02] cursor-pointer"
                  onClick={() => setSelectedProduct(selectedProduct?.id === p.id ? null : p)}
                >
                  <td className="py-2.5 px-3 font-medium text-gray-200 max-w-[200px] truncate">{p.name}</td>
                  <td className="py-2.5 px-3 font-mono text-gray-400 text-[10px]">{p.sku}</td>
                  <td className="py-2.5 px-3 text-gray-400">{p.category}</td>
                  <td className="py-2.5 px-3 text-right text-gray-300">{p.onHand}</td>
                  <td className="py-2.5 px-3 text-right text-gray-300">{p.available}</td>
                  <td className="py-2.5 px-3 text-right text-gray-400">{p.reorderPoint}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={p.status} /></td>
                  <td className="py-2.5 px-3 text-gray-400">{p.salesVelocity}</td>
                  <td className="py-2.5 px-3 text-right text-gray-300">{p.daysOfCover ?? '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] font-medium ${
                      p.suggestedAction.includes('Urgent') ? 'text-red-400' :
                      p.suggestedAction.includes('Now') ? 'text-amber-400' :
                      'text-gray-500'
                    }`}>{p.suggestedAction}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail Drawer */}
        {selectedProduct && (
          <div className="mt-3 p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white">{selectedProduct.name}</h4>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-500 hover:text-white text-xs">Close</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div><span className="text-gray-500">SKU:</span> <span className="text-gray-200 font-mono">{selectedProduct.sku}</span></div>
              <div><span className="text-gray-500">Category:</span> <span className="text-gray-200">{selectedProduct.category}</span></div>
              <div><span className="text-gray-500">Price:</span> <span className="text-emerald-400">{formatEGP(selectedProduct.price)}</span></div>
              <div><span className="text-gray-500">Cost:</span> <span className="text-gray-200">{formatEGP(selectedProduct.cost)}</span></div>
              <div><span className="text-gray-500">On Hand:</span> <span className="text-gray-200">{selectedProduct.onHand}</span></div>
              <div><span className="text-gray-500">Reserved:</span> <span className="text-gray-200">{selectedProduct.reserved}</span></div>
              <div><span className="text-gray-500">Damaged:</span> <span className="text-gray-200">{selectedProduct.damaged}</span></div>
              <div><span className="text-gray-500">Available:</span> <span className="text-white font-bold">{selectedProduct.available}</span></div>
              <div><span className="text-gray-500">Daily Sales:</span> <span className="text-gray-200">{selectedProduct.avgDailySales}/day</span></div>
              <div><span className="text-gray-500">Days of Cover:</span> <span className="text-gray-200">{selectedProduct.daysOfCover ?? '—'}</span></div>
              <div><span className="text-gray-500">Stock Value:</span> <span className="text-gray-200">{formatEGP(selectedProduct.stockValue)}</span></div>
              <div><span className="text-gray-500">Velocity:</span> <span className="text-gray-200">{selectedProduct.salesVelocity}</span></div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
          <span className="text-[11px] text-gray-500">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs rounded-md bg-white/[0.04] text-gray-400 hover:text-white disabled:opacity-30">Prev</button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs rounded-md bg-white/[0.04] text-gray-400 hover:text-white disabled:opacity-30">Next</button>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}
