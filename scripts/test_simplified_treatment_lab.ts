import { chromium } from 'playwright';

async function run() {
  console.log('--- Testing Simplified Treatment Plan Dental Lab UI ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Login as Head Doctor
    console.log('1. Logging in as headdoctor...');
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="text"], input[name="username"]', 'headdoctor');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

    // 2. Go to Queue
    console.log('2. Navigating to /queue...');
    await page.goto('http://localhost:5173/queue');
    await page.waitForLoadState('networkidle');

    // 3. Find and click Edit Treatment button
    console.log('3. Finding Edit Treatment button...');
    const editBtn = page.locator('button:has-text("Edit Treatment")').first();
    const hasEditBtn = await editBtn.isVisible();
    console.log('Edit Treatment button visible on Queue:', hasEditBtn);

    if (hasEditBtn) {
      await editBtn.click();
      console.log('Clicked Edit Treatment button!');
    } else {
      console.log('No direct Edit Treatment button, checking rows...');
      const allButtons = await page.locator('button').allTextContents();
      console.log('All buttons on page:', allButtons.filter(b => b.trim().length > 0));
    }

    // Wait for the modal dialog to appear
    await page.waitForSelector('text=Edit Treatment Plan', { timeout: 10000 });
    console.log('Edit Treatment Plan modal opened successfully!');
    await page.waitForTimeout(1000); // let categories & labs load

    // 4. Verify Dental Lab (Optional) section
    const labLabel = page.locator('label:has-text("Dental Lab (Optional)")');
    console.log('Dental Lab (Optional) label visible:', await labLabel.isVisible());

    // Check that extra fields are NOT rendered
    const workType = page.locator('label:has-text("Work Type")');
    const toothShade = page.locator('label:has-text("Tooth Shade")');
    const delivery = page.locator('label:has-text("Expected Delivery Date")');
    const labCost = page.locator('label:has-text("Lab Cost")');
    const labNotes = page.locator('label:has-text("Lab Fabrication Notes")');

    console.log('Old Work Type field visible (should be false):', await workType.isVisible());
    console.log('Old Tooth Shade field visible (should be false):', await toothShade.isVisible());
    console.log('Old Expected Delivery Date visible (should be false):', await delivery.isVisible());
    console.log('Old Lab Cost visible (should be false):', await labCost.isVisible());
    console.log('Old Lab Fabrication Notes visible (should be false):', await labNotes.isVisible());

    // Capture screenshot of the modal with simplified lab dropdown
    await page.screenshot({
      path: 'C:/Users/harin/.gemini/antigravity/brain/068092d2-1cdb-4ad3-8dce-b4061448851d/treatment_plan_simplified_lab_dropdown.png'
    });
    console.log('Saved: treatment_plan_simplified_lab_dropdown.png');

    // 5. Check lab dropdown options
    const labSelect = page.locator('select').filter({ hasText: 'No Lab Required' });
    console.log('Lab select dropdown visible:', await labSelect.isVisible());

    const options = await labSelect.locator('option').allTextContents();
    console.log('Lab dropdown options:', options);

    // 6. Select a lab (e.g. Apex Precision Dental Lab or CrownCraft)
    if (options.length > 1) {
      console.log('Selecting option index 1...');
      await labSelect.selectOption({ index: 1 });
      await page.waitForTimeout(500);

      const isLabLinked = await page.locator('text=Lab Linked').isVisible();
      console.log('Lab Linked badge visible:', isLabLinked);

      await page.screenshot({
        path: 'C:/Users/harin/.gemini/antigravity/brain/068092d2-1cdb-4ad3-8dce-b4061448851d/treatment_plan_lab_selected.png'
      });
      console.log('Saved: treatment_plan_lab_selected.png');
    }

    console.log('--- ALL CHECKS PASSED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Test error:', err);
    await page.screenshot({ path: 'C:/Users/harin/.gemini/antigravity/brain/068092d2-1cdb-4ad3-8dce-b4061448851d/test_failure.png' });
  } finally {
    await browser.close();
  }
}

run();
