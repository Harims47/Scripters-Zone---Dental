import { Page, expect } from '@playwright/test';

export interface UserCredentials {
  username: string;
  role: 'Receptionist' | 'Duty Doctor' | 'Head Doctor';
}

/**
 * Standard test credentials
 */
export const TEST_USERS = {
  receptionist: { username: 'receptionist', password: 'demo123', role: 'Receptionist', expectedPath: '/reception-desk' },
  dutyDoctor: { username: 'dutydoctor', password: 'demo123', role: 'Duty Doctor', expectedPath: '/dashboard' },
  headDoctor: { username: 'headdoctor', password: 'demo123', role: 'Head Doctor', expectedPath: '/dashboard' },
};

/**
 * Robust login helper supporting role-aware landing paths
 */
export async function loginAs(page: Page, roleKey: keyof typeof TEST_USERS) {
  const user = TEST_USERS[roleKey];
  await page.goto('/login');
  
  await page.getByLabel('Username').fill(user.username);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for the role-specific landing path
  await page.waitForURL(`**${user.expectedPath}`);
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  const logoutBtn = page.getByRole('button', { name: /Logout/i }).first();
  await expect(logoutBtn).toBeVisible();
  await logoutBtn.click();
  await page.waitForURL('**/login');
}
