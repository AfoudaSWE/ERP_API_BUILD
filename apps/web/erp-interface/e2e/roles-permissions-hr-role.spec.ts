import { test, expect } from './fixtures/auth';

test('roles page has no create-user form and shows an editable permission table', async ({ page, loginAs }) => {
  await loginAs('owner');
  await page.goto('/settings/roles');
  await expect(page.getByRole('heading', { name: /Create user|إنشاء مستخدم/i })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Permission table|جدول الصلاحيات/i })).toBeVisible();
  await expect(page.locator('table').last()).toBeVisible();
  const checkbox = page.locator('table').last().locator('tbody input[type="checkbox"]').first();
  await expect(checkbox).toBeVisible();
});

test('owner can toggle a permission for a role and save it', async ({ page, loginAs }) => {
  await loginAs('owner');
  await page.goto('/settings/roles');
  const roleSelect = page.getByRole('heading', { name: /Permission table|جدول الصلاحيات/i }).locator('xpath=../..').getByRole('combobox').first();
  await roleSelect.selectOption('sales_rep');
  await page.getByPlaceholder(/Search permission|بحث عن صلاحية/i).fill('crm.write');
  const checkbox = page.getByRole('checkbox', { name: 'crm.write' });
  await expect(checkbox).toBeVisible();
  const wasChecked = await checkbox.isChecked();
  await checkbox.click();
  await expect(checkbox).toBeChecked({ checked: !wasChecked });
  await page.getByRole('button', { name: /Save changes|حفظ التعديلات/i }).click();
  await expect(page.getByRole('button', { name: /Save changes|حفظ التعديلات/i })).toBeDisabled({ timeout: 10000 });
});

test('HR employee creation form includes a role selector', async ({ page, loginAs }) => {
  await loginAs('owner');
  await page.goto('/hr');
  await page.getByRole('button', { name: /Add employee|إضافة موظف/i }).first().click();
  await expect(page.getByText(/Role \/ permission|الدور \/ الصلاحية/i)).toBeVisible();
});
