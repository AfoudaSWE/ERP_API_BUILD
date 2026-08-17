import { test, expect } from './fixtures/auth';

test('owner workspace is usable at desktop and mobile widths', async ({ page, loginAs }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loginAs('owner');
  await expect(page.getByRole('heading', { name: /مرحب|welcome/i })).toBeVisible();
  await page.screenshot({ path: '.uizze/review/dashboard-desktop.png', fullPage: true });

  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 360);
  await page.screenshot({ path: '.uizze/review/dashboard-mobile.png', fullPage: true });
});

test('employee remains in the attendance workspace', async ({ page, loginAs }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await loginAs('employee');
  await expect(page).toHaveURL(/\/attendance-portal$/);
  await expect(page.getByRole('button', { name: /check in|check out|تسجيل الحضور|تسجيل الانصراف/i })).toBeVisible();
  await page.screenshot({ path: '.uizze/review/employee-mobile.png', fullPage: true });
});
