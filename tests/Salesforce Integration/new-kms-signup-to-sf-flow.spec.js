// @zephyrId SFT-T74
// @startUrl https://qa3-kms.kinesis.money/signup

const { test, expect } = require('@playwright/test');

async function findElementWithFallback(page, selectors) {
  for (const sel of selectors) {
    if (!sel) continue;
    try {
      const locator = page.locator(sel);
      if (await locator.count() > 0 && await locator.first().isVisible()) {
        return locator.first();
      }
    } catch (e) {}
  }
  return page.locator(selectors[0] || 'body');
}

test('New KMS Signup to SF flow', async ({ page }) => {
  await page.goto('https://qa3-kms.kinesis.money/signup');

  // Step 1: Click (manual)
  const el1 = await findElementWithFallback(page, [".button"]);
  await el1.click();

  // Step 2: Navigate (global)
  await page.goto('https://google.com');

});
