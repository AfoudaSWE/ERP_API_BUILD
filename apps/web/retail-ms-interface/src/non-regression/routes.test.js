import { describe, expect, it } from 'vitest';
import { RETAIL_ROUTE_PATHS } from '../App.jsx';

const protectedRoutes = [
  '/', '/digital-twin', '/ai-intelligence', '/agent-workflows', '/agent-workflows/new',
  '/agent-workflows/:workflowId', '/agent-workflows/:workflowId/executions',
  '/agent-workflows/:workflowId/settings', '/agent-tools', '/agent-connections', '/footfall',
  '/queues', '/sales', '/inventory', '/products', '/stores', '/alerts', '/settings',
  '/automation',
];

describe('protected Retail routes', () => {
  it('keeps every route registered in order', () => {
    expect(RETAIL_ROUTE_PATHS).toEqual(protectedRoutes);
  });
});
