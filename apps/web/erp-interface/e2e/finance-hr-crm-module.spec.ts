import { test, expect } from './fixtures/auth';

test('sidebar exposes Finance, HRM, and CRM sections with new module links', async ({ page, loginAs }) => {
  await loginAs('owner');
  await expect(page.getByRole('link', { name: /Expense Category|فئات المصروفات/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Budgeting|الموازنات/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Designations|المسميات/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Recruitment|التوظيف/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Pipeline|خط سير/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Contacts|جهات الاتصال/i })).toBeVisible();
});

test('owner can walk the full Finance, HRM, and CRM module via the sidebar', async ({ page, loginAs }) => {
  await loginAs('owner');

  await page.getByRole('link', { name: /Expense Category|فئات المصروفات/i }).click();
  await expect(page.getByRole('heading', { name: /Expense Categories|فئات المصروفات/i })).toBeVisible();
  await page.getByPlaceholder(/English name|الاسم بالإنجليزية/i).fill('Office Supplies');
  await page.getByRole('button', { name: /^Add$|^إضافة$/i }).click();
  await expect(page.getByText('Office Supplies')).toBeVisible();

  await page.getByRole('link', { name: /Payments|المدفوعات/i }).click();
  await expect(page.getByRole('heading', { name: /Payments|المدفوعات/i })).toBeVisible();

  await page.getByRole('link', { name: /Cashflow|التدفق النقدي/i }).click();
  await expect(page.getByRole('heading', { name: /Cashflow|التدفق النقدي/i })).toBeVisible();

  await page.getByRole('link', { name: /Budgeting|الموازنات/i }).click();
  await expect(page.getByRole('heading', { name: /Budgeting|الموازنات/i })).toBeVisible();

  await page.getByRole('link', { name: /Taxes|الضرائب/i }).click();
  await expect(page.getByRole('heading', { name: /Tax Rates|نسب الضرائب/i })).toBeVisible();

  await page.getByRole('link', { name: /Designations|المسميات/i }).click();
  await expect(page.getByRole('heading', { name: /Designations|المسميات/i })).toBeVisible();

  await page.getByRole('button', { name: /Leave$|الإجازات$/i }).click();
  await page.getByRole('link', { name: /^Leaves$|^الإجازات$/i }).click();
  await expect(page.getByRole('heading', { name: /^Leaves$|^الإجازات$/i })).toBeVisible();

  await page.getByRole('link', { name: /Holidays|الإجازات الرسمية/i }).click();
  await expect(page.getByRole('heading', { name: /Holidays|الإجازات الرسمية/i })).toBeVisible();

  await page.getByRole('link', { name: /Recruitment|التوظيف/i }).click();
  await expect(page.getByRole('heading', { name: /Recruitment|التوظيف/i })).toBeVisible();

  await page.getByRole('link', { name: /Performance|الأداء/i }).click();
  await expect(page.getByRole('heading', { name: /Performance|الأداء/i })).toBeVisible();

  await page.getByRole('link', { name: /Training|التدريب/i }).click();
  await expect(page.getByRole('heading', { name: /Training|التدريب/i })).toBeVisible();

  await page.getByRole('link', { name: /HR Analytics|تحليلات الموارد/i }).click();
  await expect(page.getByRole('heading', { name: /HR Analytics|تحليلات الموارد/i })).toBeVisible();

  await page.getByRole('link', { name: /Contacts|جهات الاتصال/i }).click();
  await expect(page.getByRole('heading', { name: /Contacts|جهات الاتصال/i })).toBeVisible();

  await page.getByRole('link', { name: /Pipeline|خط سير/i }).click();
  await expect(page.getByRole('heading', { name: /Pipeline|خط سير/i })).toBeVisible();

  await page.getByRole('link', { name: /Campaigns|الحملات/i }).click();
  await expect(page.getByRole('heading', { name: /Campaigns|الحملات/i })).toBeVisible();

  await page.getByRole('link', { name: /Customer Feedback|آراء العملاء/i }).click();
  await expect(page.getByRole('heading', { name: /Customer Feedback|آراء العملاء/i })).toBeVisible();

  await page.getByRole('link', { name: /Customer Analytics|تحليلات العملاء/i }).click();
  await expect(page.getByRole('heading', { name: /Customer Analytics|تحليلات العملاء/i })).toBeVisible();
});
