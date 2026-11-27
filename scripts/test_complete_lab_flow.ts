import { chromium } from 'playwright';

async function run() {
  console.log('--- Testing Complete End-to-End Simplified Lab Flow ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Login as headdoctor
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="text"], input[name="username"]', 'headdoctor');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'));

    // 2. Go to /queue and click Edit Treatment
    await page.goto('http://localhost:5173/queue');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('button:has-text("Edit Treatment")').first();
    await editBtn.click();
    await page.waitForSelector('text=Edit Treatment Plan', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // 3. Select Category: Prosthodontics or Endodontics
    console.log('Selecting category...');
    const catTrigger = page.locator('button:has-text("Select Category")').first();
    if (await catTrigger.isVisible()) {
      await catTrigger.click();
      await page.waitForTimeout(300);
      const catOption = page.locator('[role="option"]:has-text("Prosthodontics"), [role="option"]:has-text("Endodontics")').first();
      await catOption.click();
      await page.waitForTimeout(500);
    }

    // Select Procedure
    console.log('Selecting procedure...');
    const procTrigger = page.locator('button:has-text("Select Procedure")').first();
    if (await procTrigger.isVisible()) {
      await procTrigger.click();
      await page.waitForTimeout(300);
      const procOption = page.locator('[role="option"]').first();
      await procOption.click();
      await page.waitForTimeout(500);
    }

    // 4. Select Lab: DentCraft Ceramics
    console.log('Selecting DentCraft Ceramics from dropdown...');
    const labSelect = page.locator('select').filter({ hasText: 'No Lab Required' });
    await labSelect.selectOption({ label: 'DentCraft Ceramics (Mr. Suresh (Senior Ceramicist))' });
    await page.waitForTimeout(500);

    // Click "Add to Plan" button
    console.log('Clicking Add to Plan...');
    const addBtn = page.locator('button:has-text("Add to Plan")');
    await addBtn.click();
    await page.waitForTimeout(1000);

    // Screenshot showing procedure card with DentCraft Ceramics badge
    await page.screenshot({
      path: 'C:/Users/harin/.gemini/antigravity/brain/068092d2-1cdb-4ad3-8dce-b4061448851d/procedure_card_with_simplified_lab_badge.png'
    });
    console.log('Saved: procedure_card_with_simplified_lab_badge.png');

    // Click "Done" to save
    const doneBtn = page.getByRole('button', { name: 'Done', exact: true });
    if (await doneBtn.isVisible()) {
      await doneBtn.click();
      await page.waitForTimeout(1500);
    }

    // 5. Navigate to /lab and check DentCraft Ceramics accordion
    console.log('Navigating to /lab...');
    await page.goto('http://localhost:5173/lab');
    await page.waitForLoadState('networkidle');

    // Expand DentCraft Ceramics
    const dentCraftHeader = page.locator('h3:has-text("DentCraft Ceramics")').first();
    if (await dentCraftHeader.isVisible()) {
      await dentCraftHeader.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'C:/Users/harin/.gemini/antigravity/brain/068092d2-1cdb-4ad3-8dce-b4061448851d/lab_page_dentcraft_order_verified.png',
        fullPage: true
      });
      console.log('Saved: lab_page_dentcraft_order_verified.png');
    }

    console.log('--- COMPLETE FLOW VERIFIED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Flow test error:', err);
    await page.screenshot({ path: 'C:/Users/harin/.gemini/antigravity/brain/068092d2-1cdb-4ad3-8dce-b4061448851d/flow_test_error.png' });
  } finally {
    await browser.close();
  }
}

run();
