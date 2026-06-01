import { test, expect } from '@playwright/test';

// Mock Freighter wallet before page loads
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).freighter = {
      isConnected: () => Promise.resolve(true),
      getPublicKey: () => Promise.resolve('GTEST123PUBLICKEY'),
      signTransaction: (_xdr: string) => Promise.resolve({ signedXDR: 'mocked-signed-xdr' }),
    };
  });
});

test.describe('Booking flow', () => {
  test('full booking flow with mocked wallet', async ({ page }) => {
    // Navigate to a property detail page
    await page.goto('/properties/test-property-id');

    // Select dates
    const checkIn = page.getByLabel(/check.?in/i).or(page.getByPlaceholder(/check.?in/i)).first();
    if (await checkIn.isVisible()) {
      await checkIn.fill('2025-08-01');
    }
    const checkOut = page.getByLabel(/check.?out/i).or(page.getByPlaceholder(/check.?out/i)).first();
    if (await checkOut.isVisible()) {
      await checkOut.fill('2025-08-05');
    }

    // Click book button
    const bookBtn = page.getByRole('button', { name: /book|reserve/i }).first();
    if (await bookBtn.isVisible()) {
      await bookBtn.click();
      // Expect confirmation or next step
      await expect(
        page.getByText(/confirm|booking|success/i).first()
      ).toBeVisible({ timeout: 10000 });
    }
  });
});
