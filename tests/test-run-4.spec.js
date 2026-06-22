// @zephyrId -
// @startUrl https://www.google.com/

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

test('test run 4', async ({ page }) => {
  await page.goto('https://www.google.com/');

  // Step 1: Navigate (manual)
  await page.goto('https://www.google.com/');

});
