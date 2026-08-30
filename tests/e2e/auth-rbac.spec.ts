import { test, expect } from '@playwright/test';

test.describe('Authentication and RBAC', () => {

  test('Valid Login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Username')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    
    await page.getByLabel('Username').fill('receptionist');
    await page.getByLabel('Password').fill('demo123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify navigation to authenticated page
    await page.waitForURL('**/dashboard');
    await expect(page.getByText('Receptionist', { exact: true })).toBeVisible();
  });

  test('Invalid Login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('invaliduser');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify error message from UI
    await expect(page.getByText('Invalid credentials')).toBeVisible();
    await expect(page.url()).toContain('/login');
  });

  test('Session Persistence', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('receptionist');
    await page.getByLabel('Password').fill('demo123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    // Reload page
    await page.reload();
    await page.waitForURL('**/dashboard');
    await expect(page.locator('body')).toContainText('Receptionist', { timeout: 10000 });
  });

  test('Logout', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('receptionist');
    await page.getByLabel('Password').fill('demo123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    const logoutBtn = page.getByRole('button', { name: 'Logout' }).first();
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();
    await page.waitForURL('**/login');

    // Try going back to a protected route
    await page.goto('/dashboard');
    // Verify it redirects back to login or shows unauthorized
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('Receptionist Boundaries', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('receptionist');
    await page.getByLabel('Password').fill('demo123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/inventory');
    await page.waitForURL('**/unauthorized');
    await expect(page.getByText('Access Denied')).toBeVisible();
  });

  test('Duty Doctor Boundaries', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('dutydoctor');
    await page.getByLabel('Password').fill('demo123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/billing');
    await page.waitForURL('**/unauthorized');
  });

  test('Head Doctor Access', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill('headdoctor');
    await page.getByLabel('Password').fill('demo123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    // Can access inventory
    await page.goto('/inventory');
    await expect(page.getByRole('heading', { name: 'Inventory', exact: true })).toBeVisible();

    // Can access reports
    await page.goto('/reports');
    await expect(page.locator('body')).toContainText('Clinic Reports', { timeout: 10000 });
  });
});
