import { describe, expect, it, vi } from 'vitest';
import { getDashboardMetrics } from '../services/mock/dashboardService';
import { getFootfallAnalytics } from '../services/mock/footfallService';
import { getQueueMetrics } from '../services/mock/queueService';
import { getSalesAnalytics } from '../services/mock/salesService';
import { getInventory } from '../services/mock/inventoryService';
import { getDigitalTwinState, generateLiveEvents } from '../services/mock/digitalTwinService';
import { createRetailEvent, MockWorkflowRuntime } from '../features/agent-workflows/domain/runtime';
import { WORKFLOW_TEMPLATES } from '../features/agent-workflows/domain/templates';
import { useAppStore } from '../store/appStore';

describe('protected Retail characterization', () => {
  it('preserves dashboard KPI relationships', async () => {
    vi.useFakeTimers();
    const pending = getDashboardMetrics('cfc');
    await vi.runAllTimersAsync();
    const metrics = await pending;
    expect(metrics.entriesExits.entries - metrics.entriesExits.exits).toBe(metrics.customersInside.value);
    expect(metrics.avgBasket.value).toBeGreaterThan(0);
    expect(metrics.conversionRate.value).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it('preserves footfall occupancy, queue, sales and inventory contracts', async () => {
    vi.useFakeTimers();
    const pending = Promise.all([
      getFootfallAnalytics('cfc'), getQueueMetrics('cfc'),
      getSalesAnalytics('cfc'), getInventory('cfc'),
    ]);
    await vi.runAllTimersAsync();
    const [footfall, queue, sales, inventory] = await pending;
    expect(footfall.kpis.currentOccupancy).toBe(footfall.kpis.entries - footfall.kpis.exits);
    expect(queue.kpis.avgWaitTime).toBeGreaterThan(0);
    expect(queue.kpis.paymentGap).toBeGreaterThan(0);
    expect(queue.kpis.openCounters).toBe(queue.terminals.filter(item => item.status === 'open').length);
    expect(sales.kpis.avgBasket).toBe(Math.round(sales.kpis.netSales / Math.max(sales.kpis.transactions, 1)));
    expect(sales.kpis.conversionRate).toBeCloseTo(sales.kpis.transactions / Math.max(sales.kpis.visitors, 1) * 100, 1);
    inventory.inventory.forEach(item => expect(item.available).toBe(Math.max(0, item.onHand - item.reserved - item.damaged)));
    vi.useRealTimers();
  });

  it('preserves store selection and date filtering state', () => {
    const original = useAppStore.getState();
    useAppStore.getState().setSelectedStore('moe');
    expect(useAppStore.getState().getSelectedStore().id).toBe('moe');
    const range = { start: new Date('2026-07-01'), end: new Date('2026-07-19') };
    useAppStore.getState().setDateRange(range);
    expect(useAppStore.getState().dateRange).toEqual(range);
    useAppStore.setState({ selectedStoreId: original.selectedStoreId, dateRange: original.dateRange });
  });

  it('preserves Digital Twin, workflow and demo-event behavior', async () => {
    const state = getDigitalTwinState('cfc', 0);
    expect(state.totalInside).toBeTypeOf('number');
    expect(state.zoneOccupancy).toBeTypeOf('object');
    expect(generateLiveEvents(0)).toBeInstanceOf(Array);
    const event = createRetailEvent('QUEUE_THRESHOLD_EXCEEDED', 'cfc', { queueLength: 9 });
    expect(event).toMatchObject({ eventType: 'QUEUE_THRESHOLD_EXCEEDED', storeId: 'cfc', payload: { queueLength: 9 } });
    const runtime = new MockWorkflowRuntime({ toolExecutor: async () => ({ ok: true }) });
    expect(runtime).toBeInstanceOf(MockWorkflowRuntime);
    expect(WORKFLOW_TEMPLATES.length).toBeGreaterThan(0);
    useAppStore.getState().resetDemo();
    useAppStore.getState().triggerDemoEvent({ type: 'customer_rush', label: 'Customer Rush' });
    expect(useAppStore.getState().demoEvents.at(-1).type).toBe('customer_rush');
    useAppStore.getState().resetDemo();
  });
});
