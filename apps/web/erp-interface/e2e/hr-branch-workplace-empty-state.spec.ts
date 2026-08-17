import { test, expect } from './fixtures/auth';

test('new signup gets a default branch so HR onboarding is not blocked', async ({ page, request }) => {
  const email = `branchfix.${Date.now()}@example.com`;
  const signup = await request.post('http://127.0.0.1:3333/api/auth/signup', {
    data: { companyName: `Branch Fix Co ${Date.now()}`, companyNameAr: 'شركة اختبار الفروع', name: 'Test Owner', email, password: 'Test1234!' },
  });
  expect(signup.ok()).toBeTruthy();
  const body = await signup.json() as { data: { accessToken: string } };
  await page.addInitScript((token) => localStorage.setItem('erp_access_token', token), body.data.accessToken);
  await page.goto('/hr');
  await page.getByRole('button', { name: /Add employee|إضافة موظف/i }).first().click();
  const branchesFieldset = page.locator('fieldset', { has: page.getByText(/Branches \(required\)|الفروع \(مطلوب\)/i) });
  await expect(branchesFieldset.getByRole('checkbox').first()).toBeVisible();
  await expect(branchesFieldset.getByText(/Main Branch|الفرع الرئيسي/i)).toBeVisible();
});

test('workplaces field shows helpful guidance instead of a blank box when empty', async ({ page, loginAs }) => {
  await loginAs('owner');
  await page.goto('/hr');
  await page.getByRole('button', { name: /Add employee|إضافة موظف/i }).first().click();
  const workplacesFieldset = page.locator('fieldset', { has: page.getByText(/^Workplaces$|^مواقع العمل$/i) });
  const checkboxCount = await workplacesFieldset.getByRole('checkbox').count();
  if (checkboxCount === 0) {
    await expect(workplacesFieldset.getByRole('link', { name: /Open page|فتح الصفحة/i })).toBeVisible();
  }
});
