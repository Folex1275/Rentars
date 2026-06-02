import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('page loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Rentars/i);
  });

  test('property grid renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="property-grid"], .property-grid, [class*="grid"]').first()).toBeVisible();
  });

  test('search bar is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('searchbox').or(page.getByPlaceholder(/search/i)).first()).toBeVisible();
  });
});
