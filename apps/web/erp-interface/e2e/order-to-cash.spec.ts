import { test, expect } from './fixtures/auth';

test('sales representative can open live sales and POS workflows', async ({ page, loginAs }) => {
  await loginAs('salesRepresentative');
  await page.goto('/sales');
  await expect(page.getByRole('heading', { name: /المبيعات|sales/i })).toBeVisible();
  await page.goto('/pos');
  await expect(page.getByText(/السلة|cart/i).first()).toBeVisible();
});

test('sales workflow renders in English', async ({ page, loginAs }) => {
  await loginAs('owner');
  await page.evaluate(() => localStorage.setItem('erp_language', 'en'));
  await page.reload();
  await page.goto('/sales');
  await expect(page.getByRole('heading', { name: 'Sales' })).toBeVisible();
});
