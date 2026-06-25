// @zephyrId SFT-T500
// @startUrl https://qa3-kms.kinesis.money/login

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
    text.id = 'sfqa-indicator-text';
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

async function updateIndicator(page, text) {
  await page.evaluate((t) => {
    const span = document.getElementById('sfqa-indicator-text');
    if (span) span.textContent = t;
  }, text).catch(() => {});
}

async function findElementWithFallback(page, selectors) {
  // Instantly pick first visible selector — Playwright auto-wait on action handles the rest
  for (const sel of selectors) {
    if (!sel) continue;
    try {
      if (await page.locator(sel).first().isVisible()) {
        return page.locator(sel).first();
      }
    } catch (e) {}
  }
  // Last resort: stable selector
  const stable = selectors.find(s => s && !s.startsWith('#_r_'));
  return page.locator(stable || selectors[0] || 'body');
}

test('Test Run 7', async ({ page }) => {
  // Position window on left half via CDP
  const cdp = await page.context().newCDPSession(page);
  const { windowId } = await cdp.send('Browser.getWindowForTarget');
  const screen = await page.evaluate(() => ({ width: window.screen.availWidth, height: window.screen.availHeight }));
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal', left: 0, top: 0, width: Math.floor(screen.width / 2), height: screen.height } });
  await cdp.send('Page.enable');
  page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));


  // Step 1: Navigate (manual)
  await page.goto(`https://qa3-kms.kinesis.money/login`);
  await showAutomationIndicator(page);
  await updateIndicator(page, `Running Step 1: Navigate`);

});
