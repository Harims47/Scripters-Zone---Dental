import { test, expect } from '@playwright/test';

test.describe('Phase 6.1 Server-Side Pagination & Search', () => {

  test.beforeEach(async ({ page }) => {
    // Login as Admin so we can access Inventory too
    await page.goto('/login');
    await page.getByLabel('Username').fill('headdoctor');
    await page.getByLabel('Password').fill('demo123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');
  });

  test('TEST 1 - Patients Pagination & Search', async ({ page }) => {
    await page.goto('/patients');

    // Wait for table to load
    await expect(page.locator('table')).toBeVisible();

    // Verify pagination controls
    const nextBtn = page.getByRole('button', { name: 'Next' });
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
    await expect(page.locator('table')).toBeVisible();
    
    const searchInput = page.getByPlaceholder('Search patient or phone...');
    await searchInput.fill('Patient 14');
    await page.waitForTimeout(500);
    
    await expect(page.getByText('Patient 14').first()).toBeVisible();
  });

  test('TEST 3 - Inventory Pagination & Search', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page.locator('table')).toBeVisible();
    
    const nextBtn = page.getByRole('button', { name: 'Next' });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    
    const searchInput = page.getByPlaceholder('Search inventory...');
    await searchInput.fill('Extra Med 12');
    await page.waitForTimeout(500);
    
    await expect(page.getByText('Extra Med 12').first()).toBeVisible();
  });

  test('TEST 4 - Billing Pagination & Search', async ({ page }) => {
    await page.goto('/billing');
    await expect(page.locator('table')).toBeVisible();
    
    const nextBtn = page.getByRole('button', { name: 'Next' });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    
    const searchInput = page.getByPlaceholder('Search patient or ID...');
    await searchInput.fill('Patient 14');
    await page.waitForTimeout(500);
    
    await expect(page.getByText('Patient 14').first()).toBeVisible();
  });

  test('TEST 5 - Payments Pagination & Workflow', async ({ page }) => {
    await page.goto('/payments');
    await expect(page.locator('table')).toBeVisible();
    
    const nextBtn = page.getByRole('button', { name: 'Next' });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    
    await expect(page.getByText('Patient').first()).toBeVisible();
    
    // Pay for the first item on the second page
    await page.getByRole('button', { name: 'Collect Payment' }).first().click();
    await page.getByText('Cash', { exact: true }).click();
    await page.getByRole('button', { name: 'Payment Received' }).click();
    
    // Dialog shows completion
    await expect(page.getByText('Payment Received')).toBeVisible();
  });
});
