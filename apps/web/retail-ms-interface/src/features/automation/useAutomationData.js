import { useCallback, useEffect, useMemo, useState } from 'react';
import { automationApi } from '../../services/automationApi';
import { useAppStore } from '../../store/appStore';

export function useAutomationData(filters) {
  const user = useAppStore(state => state.authUser);
  const [state, setState] = useState({ loading: true, error: null, status: null, workflows: [], executions: [], total: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: null }));
    Promise.all([
      automationApi.status(user, controller.signal),
      automationApi.workflows(user, {
        page: filters.page, pageSize: filters.pageSize, search: filters.search,
        ...(filters.active !== '' ? { active: filters.active } : {}),
        ...(filters.category ? { category: filters.category } : {}),
      }, controller.signal),
      automationApi.executions(user, { page: 1, pageSize: 25 }, controller.signal),
    ]).then(([status, workflows, executions]) => setState({
      loading: false, error: null, status, workflows: workflows.data,
      executions: executions.data, total: workflows.total,
    })).catch(error => {
      if (error.name !== 'AbortError') setState(previous => ({ ...previous, loading: false, error }));
    });
    return () => controller.abort();
  }, [user, filters.page, filters.pageSize, filters.search, filters.active, filters.category, refreshKey]);

  const metrics = useMemo(() => {
    const today = new Date().toDateString();
    const executionsToday = state.executions.filter(item => item.startedAt && new Date(item.startedAt).toDateString() === today);
    const successful = executionsToday.filter(item => item.status === 'success').length;
    const failed = executionsToday.filter(item => item.status === 'failed').length;
    const completed = successful + failed;
    const durations = executionsToday.map(item => item.durationMs).filter(Number.isFinite);
    return {
      active: state.workflows.filter(item => item.active).length,
      today: executionsToday.length, successful, failed,
      running: executionsToday.filter(item => item.status === 'running').length,
      successRate: completed ? (successful / completed) * 100 : null,
      averageDuration: durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null,
    };
  }, [state.workflows, state.executions]);
  return { ...state, metrics, refresh };
}
