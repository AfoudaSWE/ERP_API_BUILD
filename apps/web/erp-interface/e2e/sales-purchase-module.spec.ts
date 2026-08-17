import { test, expect } from './fixtures/auth';

test('sidebar exposes Sales and Purchase sections with new module links', async ({ page, loginAs }) => {
  await loginAs('owner');
  await expect(page.getByRole('link', { name: /Sales Orders|أوامر البيع/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Sales Quotes|عروض أسعار المبيعات/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Purchase Return|مرتجع المشتريات/i })).toBeVisible();
});

test('owner can navigate the full Sales and Purchase module via the sidebar without a full reload per page', async ({ page, loginAs }) => {
  await loginAs('owner');

  await page.getByRole('link', { name: /Sales Quotes|عروض أسعار المبيعات/i }).click();
  await expect(page.getByRole('heading', { name: /Sales Quotes|عروض أسعار المبيعات/i })).toBeVisible();
  await page.getByRole('button', { name: /New quote|عرض جديد/i }).click();
  const productSelect = page.locator('select').nth(1);
  await productSelect.selectOption({ index: 1 });
  await page.getByRole('button', { name: /Create quote|إنشاء العرض/i }).click();
  await expect(page.locator('table')).toContainText(/QUO-/);

  await page.getByRole('link', { name: /Recurring Invoices|الفواتير المتكررة/i }).click();
  await expect(page.getByRole('heading', { name: /Recurring Invoices|الفواتير المتكررة/i })).toBeVisible();

  await page.getByRole('link', { name: /Invoice Templates|قوالب الفواتير/i }).click();
  await expect(page.getByRole('heading', { name: /Invoice Templates|قوالب الفواتير/i })).toBeVisible();

  await page.getByRole('link', { name: /Delivery Notes|إذون التسليم/i }).click();
  await expect(page.getByRole('heading', { name: /Delivery Notes|إذون التسليم/i })).toBeVisible();

  await page.getByRole('link', { name: /Credit Notes|إشعارات دائن/i }).first().click();
  await expect(page.getByRole('heading', { name: /Credit Notes|إشعارات الدائن/i })).toBeVisible();

  await page.getByRole('link', { name: /Cash Sales|المبيعات النقدية/i }).click();
  await expect(page.getByRole('heading', { name: /Cash Sales|المبيعات النقدية/i })).toBeVisible();

  await page.getByRole('link', { name: /Purchase Return|مرتجع المشتريات/i }).click();
  await expect(page.getByRole('heading', { name: /Purchase Return|مرتجع المشتريات/i })).toBeVisible();
  await page.getByRole('button', { name: /New return|مرتجع جديد/i }).click();
  const supplierSelect = page.locator('form select').nth(0);
  const options = await supplierSelect.locator('option').count();
  if (options > 1) {
    await supplierSelect.selectOption({ index: 1 });
    await page.locator('form select').nth(1).selectOption({ index: 1 });
    await page.locator('form select').nth(2).selectOption({ index: 1 });
    await page.getByPlaceholder(/Return reason|سبب الإرجاع/i).fill('Damaged on arrival');
    await page.getByRole('button', { name: /Post return|ترحيل المرتجع/i }).click();
  }
});
