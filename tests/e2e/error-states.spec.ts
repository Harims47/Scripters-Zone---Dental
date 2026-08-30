import { test, expect } from '@playwright/test';

test.describe('Error States', () => {

  const testPatientName = `PW_ErrorTest_${Date.now()}`;
  const testPhone = `9${Math.floor(Math.random() * 1000000000)}`;

  test('Duplicate Active Visit', async ({ page }) => {
    // 1. Receptionist Login
    await page.goto('/login');
    await page.getByLabel('Username').fill('receptionist');
    await page.getByLabel('Password').fill('demo123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    // 2. Create Patient
    await page.goto('/patients');
    const regBtn = page.getByRole('button', { name: 'Register Patient' }).first();
    await regBtn.waitFor({ state: 'visible' });
    await regBtn.click();

    await page.getByText('Full Name').locator('..').locator('input').fill(testPatientName);
    await page.getByText('Phone', { exact: true }).locator('..').locator('input').fill(testPhone);
    await page.getByText('Age', { exact: true }).locator('..').locator('input').fill('30');
    await page.getByText('Gender', { exact: true }).locator('..').locator('select').selectOption('Female');

    await page.getByRole('button', { name: 'Register Patient' }).last().click();
    
    // 3. Start first visit
    const doctorSelect = page.getByText('Assign Provider', { exact: true }).locator('..').locator('select');
    await doctorSelect.selectOption({ label: 'Dr. Carter (Duty Doctor)' });
    await page.getByRole('button', { name: /Create & Add to Queue/i }).click();

    // 4. Try to start a second visit for the SAME patient
    // Close the drawer if it's not closed
    // Wait, it should have closed automatically.
    
    // Search for patient
    await page.goto('/patients');
    const patientRow = page.locator('tr', { hasText: testPatientName });
    await patientRow.getByRole('button', { name: 'View' }).click();
    
    // Open "Start Visit" again
    await page.getByRole('button', { name: /Start Visit/i }).click();

    // Verify warning is visible
    await expect(page.getByText('Active Visit Warning')).toBeVisible();

    // Attempt to override and create anyway
    await doctorSelect.selectOption({ label: 'Dr. Carter (Duty Doctor)' });
    
    // Handle JS alert dialog for failure since Patients.tsx uses `alert(err.response.data?.error ...)`
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('active visit');
      dialog.accept();
    });

    await page.getByRole('button', { name: /Create & Add to Queue/i }).click();
    // The dialog handler will catch the error, proving the backend caught it.
  });

});
