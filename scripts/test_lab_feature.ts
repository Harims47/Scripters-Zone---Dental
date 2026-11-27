import { chromium } from 'playwright';

async function run() {
  console.log('--- Starting Lab Accordion & Receive Verification ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Login as Head Doctor
    console.log('1. Navigating to login...');
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="text"], input[name="username"]', 'headdoctor');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

    // 2. Go to /lab
    console.log('2. Navigating to /lab...');
    await page.goto('http://localhost:5173/lab');
    await page.waitForLoadState('networkidle');

    // Screenshot initial state with unique labs
    await page.screenshot({ path: 'C:/Users/harin/.gemini/antigravity/brain/068092d2-1cdb-4ad3-8dce-b4061448851d/lab_page_deduplicated_unique.png', fullPage: true });
    console.log('Saved: lab_page_deduplicated_unique.png');

    // 3. Click on Apex Precision Dental Lab accordion to expand its orders
    console.log('3. Expanding Apex Precision Dental Lab accordion...');
    const apexHeader = page.locator('h3:has-text("Apex Precision Dental Lab")');
    await apexHeader.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'C:/Users/harin/.gemini/antigravity/brain/068092d2-1cdb-4ad3-8dce-b4061448851d/lab_accordion_expanded_orders.png', fullPage: true });
    console.log('Saved: lab_accordion_expanded_orders.png');

    // 4. Click Receive button on the order
    console.log('4. Clicking Receive button inside the accordion...');
    const receiveBtn = page.locator('table button:has-text("Receive")').first();
    const canReceive = await receiveBtn.isVisible();
    console.log('Receive button visible inside table:', canReceive);

    if (canReceive) {
      await receiveBtn.click();
      await page.waitForSelector('text=Receive Dental Lab Work');
      console.log('Receive modal opened!');

      await page.screenshot({ path: 'C:/Users/harin/.gemini/antigravity/brain/068092d2-1cdb-4ad3-8dce-b4061448851d/receive_modal_open.png' });

      await page.fill('textarea[placeholder*="Fit verified"]', 'Fabricated model fit verified, margin sealed, shade checked.');
      await page.click('button:has-text("Confirm Receipt")');
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'C:/Users/harin/.gemini/antigravity/brain/068092d2-1cdb-4ad3-8dce-b4061448851d/lab_order_received_state.png', fullPage: true });
      console.log('Saved: lab_order_received_state.png');
    }

    // 5. Expand CrownCraft Zirconia Studio (the 0 orders lab) to verify its empty state
    console.log('5. Expanding CrownCraft Zirconia Studio...');
    const crownCraftHeader = page.locator('h3:has-text("CrownCraft Zirconia Studio")').first();
    if (await crownCraftHeader.isVisible()) {
      await crownCraftHeader.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: 'C:/Users/harin/.gemini/antigravity/brain/068092d2-1cdb-4ad3-8dce-b4061448851d/lab_empty_orders_state.png', fullPage: true });
      console.log('Saved: lab_empty_orders_state.png');
    }

    console.log('--- TEST RUN COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
}

run();
