import { test, expect } from '@playwright/test';

test('login page renders the redesigned dark auth shell with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /Welcome|مرحبًا/i })).toBeVisible();
  expect(errors, `console errors: ${errors.join('; ')}`).toHaveLength(0);
});

test('signup page renders the redesigned dark auth shell with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: /Your company|شركتك/i })).toBeVisible();
  expect(errors, `console errors: ${errors.join('; ')}`).toHaveLength(0);
});

test('login still works end to end after the redesign', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/^Email$|^البريد الإلكتروني$/i).fill('owner@demo.erp');
  await page.getByLabel(/^Password$|^كلمة المرور$/i).fill('Demo1234!');
  await page.getByRole('button', { name: /Sign in|تسجيل الدخول/i }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 10000 });
});

test('signup accepts a freely-typed email address', async ({ page }) => {
  await page.goto('/signup');
  const emailInput = page.locator('#email');
  await expect(emailInput).toBeEditable();
  await emailInput.fill('freelychosen@example.com');
  await expect(emailInput).toHaveValue('freelychosen@example.com');
});
