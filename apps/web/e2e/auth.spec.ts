import { test, expect } from '@playwright/test';

test.describe('Auth', () => {
  test('register flow', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/email/i).fill(`test+${Date.now()}@example.com`);
    await page.getByLabel(/password/i).first().fill('Password123!');
    await page.getByRole('button', { name: /register|sign up/i }).click();
    // Expect redirect away from register or success message
    await expect(page).not.toHaveURL('/register', { timeout: 10000 });
  });

  test('login flow', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('user@example.com');
    await page.getByLabel(/password/i).first().fill('Password123!');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await expect(page).not.toHaveURL('/login', { timeout: 10000 });
  });

  test('protected route redirects unauthenticated user', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login|auth/, { timeout: 10000 });
  });
});
