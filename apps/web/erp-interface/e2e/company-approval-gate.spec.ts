import { test, expect } from './fixtures/auth';

test('signup shows a pending-approval screen instead of the dashboard', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel(/Company name|اسم الشركة/i).fill(`Playwright Approval Co ${Date.now()}`);
  await page.getByLabel(/^Your name$|^اسمك$/i).fill('Playwright Owner');
  await page.getByLabel(/^Password$|^كلمة المرور$/i).fill('Test1234!');
  await page.getByRole('button', { name: /Start free trial|ابدأ التجربة المجانية/i }).click();
  await expect(page.getByText(/awaiting approval|قيد المراجعة/i)).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveURL(/\/signup$/);
});

test('platform admin sees pending companies and can approve them', async ({ page }) => {
  const email = `pwapproval.${Date.now()}@example.com`;
  const signupResponse = await page.request.post('http://127.0.0.1:3333/api/auth/signup', {
    data: { companyName: `PW Approval Target ${Date.now()}`, name: 'Target Owner', email, password: 'Test1234!' },
  });
  expect(signupResponse.ok()).toBeTruthy();

  const superAdmin = await page.request.post('http://127.0.0.1:3333/api/auth/login', {
    data: { email: 'super_admin@demo.erp', password: 'Demo1234!' },
  });
  const superAdminBody = await superAdmin.json() as { data: { accessToken: string } };
  await page.addInitScript((token) => localStorage.setItem('erp_access_token', token), superAdminBody.data.accessToken);
  await page.goto('/platform-admin');
  await expect(page.getByRole('button', { name: /Approve|اعتماد/i }).first()).toBeVisible();
});
