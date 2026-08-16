import { beforeAll, describe, expect, it } from 'vitest';

let visibleNavItems: typeof import('./Sidebar').visibleNavItems;
beforeAll(async () => {
  Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } });
  ({ visibleNavItems } = await import('./Sidebar'));
});

describe('Sidebar permission visibility', () => {
  it('matches page permissions and hides unauthorized modules', () => {
    const permissions = new Set(['dashboard.read', 'reports.read']);
    expect(visibleNavItems((permission) => permissions.has(permission)).map((item) => item.href)).toEqual(['/', '/reports']);
  });
  it('shows no company modules to a self-service-only employee', () => {
    const permissions = new Set(['self_service.view', 'self_service.leave', 'self_service.payslip']);
    expect(visibleNavItems((permission) => permissions.has(permission))).toEqual([]);
  });
  it('shows only POS to a cashier', () => {
    const permissions = new Set(['pos.use']);
    expect(visibleNavItems((permission) => permissions.has(permission)).map((item) => item.href)).toEqual(['/pos']);
  });
});
