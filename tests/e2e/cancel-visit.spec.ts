import { test, expect } from '@playwright/test';

test.describe('Phase 9.1: Cancel Visit & Payment Status', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate and login as Receptionist
    await page.goto('http://localhost:5173');
    await page.fill('input[type="email"]', 'receptionist@dental.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Sign in")');
    await expect(page).toHaveURL('http://localhost:5173/reception');
  });

  test('Should display Payment Status column and register a walk-in to test cancellation', async ({ page }) => {
    // 1. Verify Payment Status column exists
    await expect(page.locator('th:has-text("Payment Status")')).toBeVisible();

    // 2. Register a new walk-in visit
    await page.click('button:has-text("Register Patient")');
    await page.fill('input[name="name"]', 'Cancel Test Patient');
    await page.fill('input[name="phone"]', '9998887776');
    await page.fill('input[name="age"]', '25');
    await page.click('button:has-text("Register & Add to Queue")');
    
    // Accept Swal registration success
    await page.click('button:has-text("OK")');

    // 3. Find the newly created visit row
    const row = page.locator('tr').filter({ hasText: 'Cancel Test Patient' });
    
    // Verify Payment Status is Unpaid
    await expect(row.locator('td').filter({ hasText: 'Unpaid' })).toBeVisible();

    // Verify Action buttons: Cancel Visit icon should be present (title="Cancel Visit")
    const cancelBtn = row.locator('button[title="Cancel Visit"]');
    await expect(cancelBtn).toBeVisible();

    // 4. Click Cancel Visit
    await cancelBtn.click();
    
    // Expect SweetAlert warning
    await expect(page.locator('.swal2-popup:has-text("Cancel this visit?")')).toBeVisible();

    // 5. Dismiss with Keep Visit first
    await page.click('button:has-text("Keep Visit")');
    await expect(row.locator('td').filter({ hasText: 'Waiting' })).toBeVisible();

    // 6. Click Cancel Visit again and confirm
    await cancelBtn.click();
    await page.click('button:has-text("Cancel Visit")');
    
    // Expect Success SweetAlert
    await page.click('button:has-text("OK")');

    // 7. Verify the row now displays "Cancelled"
    await expect(row.locator('td').filter({ hasText: 'Cancelled' })).toBeVisible();

    // 8. Verify action buttons for Cancelled visit are hidden (Send to Doctor, Process, Cancel)
    await expect(row.locator('button[title="Send to Doctor"]')).toBeHidden();
    await expect(row.locator('button[title="Process Visit"]')).toBeHidden();
    await expect(row.locator('button[title="Cancel Visit"]')).toBeHidden();
    
    // Edit and View History should still exist
    await expect(row.locator('button[title="Edit Patient"]')).toBeVisible();
    await expect(row.locator('button[title="View History"]')).toBeVisible();
  });
});
