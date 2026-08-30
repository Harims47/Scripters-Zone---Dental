import { test, expect } from '@playwright/test';

test.describe('Clinical Journey', () => {

  const testPatientName = `PW_TestPatient_${Date.now()}`;
  const testPhone = `9${Math.floor(Math.random() * 1000000000)}`;

  test('Complete end-to-end clinical workflow', async ({ page }) => {
    
    // ==========================================
    // PART A - RECEPTIONIST LOGIN & CREATE PATIENT
    // ==========================================
    await page.goto('/login');
    await page.getByLabel('Username').fill('receptionist');
    await page.getByLabel('Password').fill('demo123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    // Create Patient
    await page.goto('/patients');
    
    const regBtn = page.getByRole('button', { name: 'Register Patient' }).first();
    await regBtn.waitFor({ state: 'visible' });
    await regBtn.click();

    await page.getByText('Full Name').locator('..').locator('input').fill(testPatientName);
    await page.getByText('Phone', { exact: true }).locator('..').locator('input').fill(testPhone);
    await page.getByText('Age', { exact: true }).locator('..').locator('input').fill('45');
    await page.getByText('Gender', { exact: true }).locator('..').locator('select').selectOption('Female');

    await page.getByRole('button', { name: 'Register Patient' }).last().click();
    await expect(page.getByText('Start Clinic Visit')).toBeVisible();

    // ==========================================
    // PART C - START WALK-IN
    // ==========================================
    const doctorSelect = page.getByText('Assign Provider', { exact: true }).locator('..').locator('select');
    await doctorSelect.selectOption({ label: 'Dr. Carter (Duty Doctor)' });

    await page.getByRole('button', { name: /Create & Add to Queue/i }).click();
    await expect(page.getByText('Start Clinic Visit')).toBeHidden();

    // ==========================================
    // PART D - QUEUE (RECEPTIONIST CALLS PATIENT)
    // ==========================================
    await page.goto('/queue');
    const queueRow = page.locator('tr', { hasText: testPatientName });
    await expect(queueRow).toBeVisible();
    await expect(queueRow).toContainText('Waiting');

    await queueRow.getByRole('button', { name: 'Call Patient', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Call Patient', exact: true }).click();
    await expect(queueRow).toContainText('Called');
    
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForURL('**/login');

    // ==========================================
    // PART E - DOCTOR HANDOFF
    // ==========================================
    await page.getByLabel('Username').fill('dutydoctor');
    await page.getByLabel('Password').fill('demo123');
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/auth/login') && resp.status() === 200),
      page.getByRole('button', { name: 'Sign In' }).click()
    ]);
    await page.goto('/queue');
    const doctorQueueRow = page.locator('tr', { hasText: testPatientName });
    await expect(doctorQueueRow).toBeVisible();

    await doctorQueueRow.getByRole('button', { name: 'Start', exact: true }).click();
    await page.waitForURL('**/doctor/patient/*');
    await expect(page.getByText(testPatientName).first()).toBeVisible();

    // ==========================================
    // PART F & G - CONSULTATION & PRESCRIPTION
    // ==========================================
    // Fill clinical notes
    await page.getByPlaceholder('e.g. Toothache, Routine Checkup...').fill('Toothache'); // Reason
    await page.locator('textarea').first().fill('Patient complains of toothache. Recommend filling.');

    await page.getByRole('button', { name: /Next: Prescription/i }).click();
    
    // Add medicine
    await page.getByRole('button', { name: /Add/i }).first().click();

    // Fill prescription row details
    await page.getByPlaceholder('e.g. 1 tablet').fill('1 tablet');
    await page.getByPlaceholder('e.g. Twice daily').fill('Twice daily');
    await page.getByPlaceholder('e.g. 5 days').fill('5 days');
    
    // Complete Consultation
    await page.getByRole('button', { name: /Complete Consultation & Generate Bill/i }).click();
    
    // Verify success state
    await expect(page.getByText('Consultation Completed')).toBeVisible();

    // Log out doctor
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForURL('**/login');

    // ==========================================
    // PART H, I, J - BILLING, DISPENSING, PAYMENT
    // ==========================================
    await page.getByLabel('Username').fill('receptionist');
    await page.getByLabel('Password').fill('demo123');
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/auth/login') && resp.status() === 200),
      page.getByRole('button', { name: 'Sign In' }).click()
    ]);
    await page.goto('/billing');

    const billingRow = page.locator('tr', { hasText: testPatientName });
    await expect(billingRow).toBeVisible();
    await expect(billingRow).toContainText('Pending'); // For dispensing

    await billingRow.getByRole('button', { name: 'Process Billing' }).click();

    // Verify Dispensing drawer
    await expect(page.getByRole('heading', { name: '1. Dispensing' })).toBeVisible();
    
    // Dispense (assumes default qty is already filled correctly from prescription)
    await page.getByRole('button', { name: 'Complete Dispensing' }).click();
    await expect(page.getByText('Dispensed').first()).toBeVisible();

    // Payment Section
    // Select Cash
    await page.getByText('Cash', { exact: true }).click(); // the PaymentMethodSelector probably has text 'Cash'
    
    await page.getByRole('button', { name: 'Collect Payment' }).click();
    
    // Verify Success
    await expect(page.getByText('Billing Completed')).toBeVisible();
    
    // Close drawer
    await page.getByRole('button', { name: 'Close' }).first().click();

    // ==========================================
    // PART K - PATIENT HISTORY
    // ==========================================
    await page.goto('/patients');
    
    const patientRow = page.locator('tr', { hasText: testPatientName });
    await patientRow.getByRole('button', { name: 'View' }).click();

    // Verify historical visit displays
    await expect(page.getByText('Completed Visit')).toBeVisible();
  });
});
