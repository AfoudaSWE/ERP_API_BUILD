import { test, expect } from './fixtures/auth';

test('owner can open the API-backed dashboard', async ({ page, loginAs }) => {
  await loginAs('owner');
  await expect(page.getByRole('heading', { name: /مرحب|welcome/i })).toBeVisible();
});

test('employee cannot open purchasing administration', async ({ page, loginAs }) => {
  await loginAs('employee');
  await page.goto('/purchases');
  await expect(page).toHaveURL('/attendance-portal');
});
