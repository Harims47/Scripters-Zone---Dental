import { test, expect } from '@playwright/test';

test('API test', async ({ page }) => {
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log('<<', response.status(), response.url());
      response.text().then(text => console.log('body:', text.substring(0, 200))).catch(() => {});
    }
  });

  await page.goto('/login');
  await page.getByLabel('Username').fill('receptionist');
  await page.getByLabel('Password').fill('demo123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/dashboard');
  
  await page.goto('/patients');
  await page.waitForTimeout(2000);
});
