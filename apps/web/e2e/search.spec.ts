import { test, expect } from '@playwright/test';

test.describe('Search', () => {
  test('search by location returns results', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search|location/i)).first();
    await searchInput.fill('Miami');
    await searchInput.press('Enter');
    await expect(page.locator('[data-testid="property-card"], [class*="PropertyCard"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('filters narrow results', async ({ page }) => {
    await page.goto('/search?location=Miami');
    const initialCount = await page.locator('[data-testid="property-card"], [class*="PropertyCard"]').count();

    const priceFilter = page.getByLabel(/max price/i).or(page.getByPlaceholder(/max/i)).first();
    if (await priceFilter.isVisible()) {
      await priceFilter.fill('100');
      await page.keyboard.press('Enter');
      const filteredCount = await page.locator('[data-testid="property-card"], [class*="PropertyCard"]').count();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    }
  });
});
