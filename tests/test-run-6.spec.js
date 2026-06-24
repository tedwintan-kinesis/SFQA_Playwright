// @zephyrId SFT-T502
// @startUrl https://qa6-kms.kinesis.money/login

const { test, expect } = require('@playwright/test');

async function showAutomationIndicator(page) {
  await page.evaluate(() => {
    const id = 'sfqa-automation-indicator';
    const existing = document.getElementById(id);
    if (existing) return;

    const bar = document.createElement('div');
    bar.id = id;
    bar.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'right:0',
      'z-index:2147483647',
      'height:56px',
      'display:flex',
      'align-items:center',
      'gap:16px',
      'padding:0 18px',
      'box-sizing:border-box',
      'background:#2f1f46',
      'color:#ffffff',
      'font:14px Arial, sans-serif',
      'box-shadow:0 2px 10px rgba(0,0,0,0.18)'
    ].join(';');

    const text = document.createElement('span');
    text.textContent = '"SFQA Reflect" Automation Testing started debugging this browser';
    text.style.cssText = 'font-weight:600';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Cancel';
    button.style.cssText = [
      'border:0',
      'border-radius:18px',
      'padding:9px 18px',
      'background:#c7c2ff',
      'color:#170f29',
      'font:600 13px Arial, sans-serif',
      'cursor:pointer'
    ].join(';');
    button.addEventListener('click', () => bar.remove());

    const closeBtn = document.createElement('span');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = [
      'margin-left:auto',
      'cursor:pointer',
      'font-size:18px',
      'opacity:0.85',
      'user-select:none',
      'padding:4px'
    ].join(';');
    closeBtn.addEventListener('click', () => bar.remove());

    bar.appendChild(text);
    bar.appendChild(button);
    bar.appendChild(closeBtn);
    document.documentElement.appendChild(bar);
  }).catch(() => {});
}

async function findElementWithFallback(page, selectors) {
  // Try each selector with a short wait
  for (const sel of selectors) {
    if (!sel) continue;
    try {
      const locator = page.locator(sel).first();
      await locator.waitFor({ state: 'visible', timeout: 3000 });
      return locator;
    } catch (e) {}
  }
  // Last resort: use first stable (non-dynamic) selector
  const stable = selectors.find(s => s && !s.startsWith('#_r_'));
  return page.locator(stable || selectors[0] || 'body');
}

test('Test run 6', async ({ page }) => {
  await page.goto('https://qa6-kms.kinesis.money/login');
  await page.waitForLoadState('networkidle');
  await showAutomationIndicator(page);

  // Step 1: Navigate (manual)
  await page.goto('https://qa6-kms.kinesis.money/login');
  await page.waitForLoadState('networkidle');
  await showAutomationIndicator(page);

  // Step 2: Click (manual)
  const el2 = await findElementWithFallback(page, ["#_r_j_","input[name=\"email\"]","input.css-lukafr"]);
  await el2.click();

  // Step 3: Type (manual)
  const el3 = await findElementWithFallback(page, ["#_r_j_","input[name=\"email\"]","input.css-lukafr"]);
  await el3.fill('fatin.nadhirah+qa6.71@abx.com');

  // Step 4: Click (manual)
  const el4 = await findElementWithFallback(page, ["#_r_k_","input[name=\"password\"]","input.css-69tkhw"]);
  await el4.click();

  // Step 5: Type (manual)
  const el5 = await findElementWithFallback(page, ["#_r_k_","input[name=\"password\"]","input.css-69tkhw"]);
  await el5.fill('Test123$');

  // Step 6: Click (manual)
  const el6 = await findElementWithFallback(page, ["[data-testid=\"continue-with-email\"]","[data-qa=\"continue-with-email\"]","[data-cy=\"continue-with-email\"]"]);
  await el6.click();

  // Step 7: Click (manual)
  const el7 = await findElementWithFallback(page, ["[data-testid=\"logout-button\"]","[data-qa=\"logout-button\"]","[data-cy=\"logout-button\"]"]);
  await el7.click();

});
