import { expect, test } from './fixtures/auth';
test('accountant can trace journals while routes stay guarded',async({page,loginAs})=>{await loginAs('accountant');await page.goto('/accounting');await expect(page.getByText(/Financial overview|نظرة عامة مالية/)).toBeVisible();await page.goto('/accounting/journals');await expect(page.getByText(/Journals|دفتر اليومية/)).toBeVisible();});
