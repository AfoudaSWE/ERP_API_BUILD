import { test, expect } from './fixtures/auth';

test('critical roles can access their procure-to-stock workspaces', async ({ page, loginAs }) => {
  await loginAs('purchasingManager');
  await page.goto('/purchases');
  await expect(page.getByRole('heading', { name: /المشتريات|purchases/i })).toBeVisible();
});

test('inventory manager can inspect live availability', async ({ page, loginAs }) => {
  await loginAs('inventoryManager');
  await page.goto('/inventory');
  await expect(page.getByRole('heading', { name: /المخزون|inventory/i })).toBeVisible();
});

test('employee is denied purchase-order administration', async ({ page, loginAs }) => {
  await loginAs('employee');
  await page.goto('/purchases');
  await expect(page).toHaveURL('/');
});
