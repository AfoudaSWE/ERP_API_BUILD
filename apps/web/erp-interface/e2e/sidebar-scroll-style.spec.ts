import { test, expect } from './fixtures/auth';

test('sidebar section titles are bold and black', async ({ page, loginAs }) => {
  await loginAs('owner');
  const title = page.locator('nav p.font-bold').first();
  await expect(title).toBeVisible();
  await expect(title).toHaveClass(/text-black/);
});

test('sidebar keeps its scroll position after clicking a link far down the list', async ({ page, loginAs }) => {
  await loginAs('owner');
  const nav = page.locator('nav.sidebar-nav');
  await nav.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  const scrollBefore = await nav.evaluate((el) => el.scrollTop);
  expect(scrollBefore).toBeGreaterThan(0);

  const link = page.getByRole('link', { name: /Settings|الإعدادات/i }).first();
  await link.click();
  await expect(page).toHaveURL(/\/settings$/);

  const scrollAfter = await page.locator('nav.sidebar-nav').evaluate((el) => el.scrollTop);
  expect(scrollAfter).toBeGreaterThan(0);
});
