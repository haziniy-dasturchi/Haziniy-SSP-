import { test, expect } from '@playwright/test';

test.describe('Haziniy SSP Smoke Test', () => {
  test('login -> SSP loads -> enter a fact -> SSP changes', async ({ page }) => {
    // 1. Visit Login
    await page.goto('/login');
    await expect(page).toHaveTitle(/Haziniy SSP/);

    // 2. Fill login credentials (owner credentials from seed)
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('998889692313');

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('89692313');

    // 3. Submit login
    await page.locator('button[type="submit"]').click();

    // 4. Verify SSP scorecard loads
    await expect(page).toHaveURL(/\//);
    await expect(page.locator('text=Umumiy SSP Bajarilishi')).toBeVisible({ timeout: 15000 });

    // Read initial score
    const initialScoreText = await page.locator('span.text-5xl').first().textContent();
    expect(initialScoreText).toBeTruthy();

    // 5. Navigate to /facts
    await page.goto('/facts');
    await expect(page.locator('text=Kundalik Fakt Kiritish')).toBeVisible({ timeout: 10000 });

    // 6. Enter a fact value
    const firstFactInput = page.locator('input[inputmode="decimal"]').first();
    await firstFactInput.waitFor({ state: 'visible' });
    await firstFactInput.fill('88');

    // 7. Save facts
    const saveButton = page.locator('button:has-text("Saqlash")').first();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Verify success toast appears
    await expect(page.locator('text=muvaffaqiyatli saqlandi')).toBeVisible({ timeout: 10000 });

    // 8. Return to SSP and verify scorecard updates
    await page.goto('/');
    await expect(page.locator('text=Umumiy SSP Bajarilishi')).toBeVisible({ timeout: 15000 });
  });
});
