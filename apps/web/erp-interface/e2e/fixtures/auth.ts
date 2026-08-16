import { test as base, expect, type Page } from '@playwright/test';

export const roleCredentials = {
  owner: { email: 'owner@demo.erp', password: 'Demo1234!' },
  purchasingManager: { email: 'purchasing_manager@demo.erp', password: 'Demo1234!' },
  inventoryManager: { email: 'inventory_manager@demo.erp', password: 'Demo1234!' },
  salesRepresentative: { email: 'sales_rep@demo.erp', password: 'Demo1234!' },
  accountant: { email: 'accountant@demo.erp', password: 'Demo1234!' },
  financeManager: { email: 'finance_manager@demo.erp', password: 'Demo1234!' },
  auditor: { email: 'auditor@demo.erp', password: 'Demo1234!' },
  employee: { email: 'employee@demo.erp', password: 'Demo1234!' },
} as const;

export type TestRole = keyof typeof roleCredentials;

export async function loginAs(page: Page, role: TestRole) {
  const response = await page.request.post('http://127.0.0.1:3333/api/auth/login', { data: roleCredentials[role] });
  expect(response.ok(), `Login failed for ${role}`).toBeTruthy();
  const body = await response.json() as { data: { accessToken: string } };
  await page.addInitScript((token) => localStorage.setItem('erp_access_token', token), body.data.accessToken);
  await page.goto('/');
  await expect(page).not.toHaveURL(/login/);
}

export const test = base.extend<{ loginAs: (role: TestRole) => Promise<void> }>({
  loginAs: async ({ page }, use) => { await use((role) => loginAs(page, role)); },
});

export { expect };
