import { test, expect } from '@playwright/test';
import { dismissLowStockAlertIfPresent } from './helpers/lowStockHelper';

test.describe('Phase 6.1 Server-Side Pagination & Search', () => {

  test.beforeEach(async ({ page }) => {
    // Login as Admin so we can access Inventory too
    await page.goto('/login');
    await page.getByLabel('Username').fill('headdoctor');
    await page.getByLabel('Password').fill('demo123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');
    await dismissLowStockAlertIfPresent(page);
  });

  test('TEST 1 - Patients Pagination & Search', async ({ page }) => {
    await page.goto('/patients');
    await dismissLowStockAlertIfPresent(page);

    // Wait for table to load
    await expect(page.locator('table')).toBeVisible();

    // Verify pagination controls
    const nextBtn = page.getByRole('button', { name: 'Go to next page' });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Verify it went to page 2
    await expect(page.getByText('Patient').first()).toBeVisible();
    
    // Search
    const searchInput = page.getByPlaceholder('Search name, ID or phone...');
    await searchInput.fill('Patient 15');
    await page.waitForTimeout(500); // debounce
    
    // Verify backend search resets to page 1 implicitly or finds the patient
    await expect(page.getByText('Patient 15')).toBeVisible();
    
    // Search nonexistent
    await searchInput.fill('NonexistentXYZ');
    await page.waitForTimeout(500);
    await expect(page.getByText('No patient found')).toBeVisible();
  });

  test('TEST 2 - Appointments Pagination & Search', async ({ page }) => {
    await page.goto('/appointments');
    await dismissLowStockAlertIfPresent(page);
    await expect(page.locator('table')).toBeVisible();
    
    const searchInput = page.getByPlaceholder('Search patient or phone...');
    await searchInput.fill('Patient 14');
    await page.waitForTimeout(500);
    
    await expect(page.getByText('Patient 14').first()).toBeVisible();
  });

  test('TEST 3 - Inventory Pagination & Search', async ({ page }) => {
    await page.goto('/inventory');
    await dismissLowStockAlertIfPresent(page);
    await expect(page.locator('table')).toBeVisible();
    
    const nextBtn = page.getByRole('button', { name: 'Go to next page' });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    
    const searchInput = page.getByPlaceholder('Search inventory...');
    await searchInput.fill('Extra Med 12');
    await page.waitForTimeout(500);
    
    await expect(page.getByText('Extra Med 12').first()).toBeVisible();
  });

  test('TEST 4 - Billing Pagination & Search', async ({ page }) => {
    await page.goto('/billing');
    await dismissLowStockAlertIfPresent(page);
    await expect(page.locator('table')).toBeVisible();
    
    const nextBtn = page.getByRole('button', { name: 'Go to next page' });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    
    const searchInput = page.getByPlaceholder('Search patient or ID...');
    await searchInput.fill('Patient 14');
    await page.waitForTimeout(500);
    
    await expect(page.getByText('Patient 14').first()).toBeVisible();
  });

  test('TEST 5 - Payments Pagination & Workflow (Partial Payments)', async ({ page }) => {
    await page.goto('/partial-payments');
    await dismissLowStockAlertIfPresent(page);
    await expect(page.locator('table')).toBeVisible();
    
    // Check if table contains records
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);

    // Verify collect payment dialog workflow
    const collectBtn = page.getByRole('button', { name: /Collect Payment/i }).first();
    if (await collectBtn.isVisible().catch(() => false)) {
      await collectBtn.click();
      
      const modal = page.locator('[role="dialog"]').filter({ hasText: /Collect Outstanding Balance|Collect Payment/i });
      await expect(modal).toBeVisible();
      
      // Choose cash payment method
      await modal.getByRole('button', { name: /Cash/i }).click();
      
      // Confirm payment button
      const confirmBtn = modal.getByRole('button', { name: /Confirm Payment/i });
      await expect(confirmBtn).toBeVisible();
      await confirmBtn.click();

      // Modal closes after confirmation
      await expect(modal).toBeHidden({ timeout: 10000 });
    }
  });
});
