import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import useAsyncData from '../../hooks/useAsyncData';
import { getAlerts } from '../../services/mock/alertService';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx';
import {
  AlertTriangle, Bell, CheckCircle, Clock, User, MapPin,
  Filter, X, Eye, UserPlus, Check
} from 'lucide-react';
import { format } from 'date-fns';

const SEVERITY_ICONS = {
  critical: { icon: AlertTriangle, color: 'text-red-400' },
  high: { icon: AlertTriangle, color: 'text-amber-400' },
  medium: { icon: Bell, color: 'text-blue-400' },
  low: { icon: Bell, color: 'text-gray-400' },
};

export default function AlertsPage() {
  const storeId = useAppStore(s => s.selectedStoreId);
  const { data: initialAlerts, loading } = useAsyncData(() => getAlerts(), []);
  const [alerts, setAlerts] = useState([]);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    if (initialAlerts) setAlerts(initialAlerts);
  }, [initialAlerts]);

  const handleAcknowledge = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged', acknowledgedAt: new Date().toISOString() } : a));
  };

  const handleAssign = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged', assignedTo: 'Current User', acknowledgedAt: new Date().toISOString() } : a));
  };

  const handleResolve = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved', resolvedAt: new Date().toISOString() } : a));
  };

  if (loading) return <div><PageHeader title="Alerts" /><LoadingSkeleton rows={8} /></div>;

  let filtered = alerts;
  if (severityFilter !== 'all') filtered = filtered.filter(a => a.severity === severityFilter);
  if (statusFilter !== 'all') filtered = filtered.filter(a => a.status === statusFilter);

  const activeCount = alerts.filter(a => a.status === 'active').length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && a.status === 'active').length;

  return (
    <div>
      <PageHeader title="Alerts" subtitle={`${activeCount} active alerts, ${criticalCount} critical`} />

      {/* Summary */}
      <div data-tour="alerts-summary" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {['critical', 'high', 'medium', 'low'].map(sev => {
          const count = alerts.filter(a => a.severity === sev && a.status === 'active').length;
          const info = SEVERITY_ICONS[sev];
          return (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev === severityFilter ? 'all' : sev)}
              className={`glass rounded-xl p-4 text-left transition-colors ${
                severityFilter === sev ? 'border-white/[0.15]' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <info.icon size={14} className={info.color} />
                <span className="text-xs font-medium text-gray-400 capitalize">{sev}</span>
              </div>
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-[10px] text-gray-500">active alerts</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div data-tour="alerts-filters" className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Filter size={12} />
          Filters:
        </div>
        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-gray-300 focus:outline-none"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-gray-300 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
        {(severityFilter !== 'all' || statusFilter !== 'all') && (
          <button
            onClick={() => { setSeverityFilter('all'); setStatusFilter('all'); }}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Alert List */}
      <div data-tour="alerts-list" className="space-y-2">
        {filtered.map(alert => {
          const info = SEVERITY_ICONS[alert.severity] || SEVERITY_ICONS.low;
          const isExpanded = selectedAlert === alert.id;

          return (
            <div
              key={alert.id}
              className={`glass rounded-xl overflow-hidden transition-all ${
                alert.status === 'resolved' ? 'opacity-60' : ''
              }`}
            >
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02]"
                onClick={() => setSelectedAlert(isExpanded ? null : alert.id)}
              >
                <info.icon size={16} className={info.color} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-200">{alert.title}</span>
                    <StatusBadge status={alert.severity} />
                    <StatusBadge status={alert.status} />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1"><MapPin size={10} />{alert.storeName} — {alert.zone}</span>
                    <span className="flex items-center gap-1"><Clock size={10} />{format(new Date(alert.createdAt), 'HH:mm')}</span>
                    {alert.assignedTo && <span className="flex items-center gap-1"><User size={10} />{alert.assignedTo}</span>}
                  </div>
                </div>

                {alert.status === 'active' && (
                  <div className="flex gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); handleAcknowledge(alert.id); }}
                      className="px-2 py-1 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleAssign(alert.id); }}
                      className="px-2 py-1 rounded-md text-[10px] font-medium bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
                    >
                      Assign
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleResolve(alert.id); }}
                      className="px-2 py-1 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    >
                      Resolve
                    </button>
                  </div>
                )}
                {alert.status === 'acknowledged' && (
                  <button
                    onClick={e => { e.stopPropagation(); handleResolve(alert.id); }}
                    className="px-2 py-1 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  >
                    Resolve
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-white/[0.04]">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-gray-500">Type:</span> <span className="text-gray-300 capitalize">{alert.type.replace(/_/g, ' ')}</span></div>
                    <div><span className="text-gray-500">Store:</span> <span className="text-gray-300">{alert.storeName}</span></div>
                    <div><span className="text-gray-500">Zone/Device:</span> <span className="text-gray-300">{alert.zone}</span></div>
                    <div><span className="text-gray-500">Created:</span> <span className="text-gray-300">{format(new Date(alert.createdAt), 'dd MMM HH:mm')}</span></div>
                    {alert.acknowledgedAt && <div><span className="text-gray-500">Acknowledged:</span> <span className="text-gray-300">{format(new Date(alert.acknowledgedAt), 'HH:mm')}</span></div>}
                    {alert.resolvedAt && <div><span className="text-gray-500">Resolved:</span> <span className="text-gray-300">{format(new Date(alert.resolvedAt), 'HH:mm')}</span></div>}
                    {alert.assignedTo && <div><span className="text-gray-500">Assigned:</span> <span className="text-gray-300">{alert.assignedTo}</span></div>}
                  </div>
                  <div className="mt-3 p-2.5 rounded-lg bg-cyan-500/[0.04] border border-cyan-500/10">
                    <p className="text-[11px] text-cyan-400 font-medium mb-0.5">Suggested Action</p>
                    <p className="text-xs text-gray-300">{alert.suggestedAction}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No alerts match your filters</p>
        </div>
      )}
    </div>
  );
}
