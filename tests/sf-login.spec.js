// @zephyrId SFT-T510
// @startUrl kinesismoney--uat2022.sandbox.lightning.force.com/lightning/page/home

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

test('SF Login', async ({ page }) => {
  // Position window on left half via CDP
  const cdp = await page.context().newCDPSession(page);
  const { windowId } = await cdp.send('Browser.getWindowForTarget');
  const screen = await page.evaluate(() => ({ width: window.screen.availWidth, height: window.screen.availHeight }));
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal', left: 0, top: 0, width: Math.floor(screen.width / 2), height: screen.height } });
  await cdp.send('Page.enable');
  page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));


  // Step 1: Navigate (manual)
  await page.goto(`https://kinesismoney--uat2022.sandbox.my.salesforce.com/_ui/identity/verification/method/LLVerificationFinishUi/e?tck=837aa505-9ff7-455e-874a-df70cc0741a4&vcsrf=kSE8Rs4M81kcZFXOF7hESue5UQYIsDucOma35E_TC_wvo2V3KRIsIQT0BKgoeoVji1dgNgxLXAJTQz74larRQyv3Nm79dMkzFc68M_Ljd2H7QZjRslyPEmMS5yMC7GB2T23wzB8f8KbqNmCVt2iLCfiCf4_kcYXVnI7Tm21Dt1QoSLowVfLFa8C2d4ydJ7smum8bxJhw7XRC0RFFJw4JHAJWLc04feb-9faKgCIA6GauRrsX747qbrC_tvcJJYOB6ERB7tqEZHKxfgBA7MyXUWOEL--j7IznvaoKWYQ_14UuDezWBdIP9JhpdmZtfD83E7KYXdDraZjhdEsMsFTpBrs0Hke14xu9AixITsWa2ZXC7vvqcF1JtusiMP4MpvPpUzKSYFBo_XE9NBJR763Ky2YuXO3euU35uVtuwltfYy1_zjTB_84Lk8UyVsdO6TMPi0nlOhJqvnsaxG0XluExAQzjviB_RkjvM-0goNAO1vYGWMfxS-5eqPTsQfzVIGCwAmFsTxkOzVgHEU5DA14huP46GwZ1fLu2hWUjDWq5ziS2Qay2KzlWmnLDNoHuOLYkNR-PVhXDvd2mTC0CuEV1_Ae0ItRDx8DiSqZ_1xDPCZkFd8Os5qjBBFNxDTvIrwihxy0U5ljCG2hU5OYzlzlSIckHDFRbZHphMkC5eUkAVA8%3D&vpol=ll&vflid=0&vfgrp=2131952913&retURL=%2Fsecur%2Ffrontdoor.jsp%3Fallp%3D1%26retURL%3D%252Fvisualforce%252Fsession%253Furl%253Dhttps%25253A%25252F%25252Fkinesismoney--uat2022.sandbox.lightning.force.com%25252Flightning%25252Fpage%25252Fhome%26cshc%3Dg00000T24TSO0000008lYi%26apv%3D1%26display%3Dpage%26appkp%3D1%26ucs%3D1`);
  await showAutomationIndicator(page);
  await updateIndicator(page, `Running Step 1: Navigate`);

  // Step 2: Input (manual)
  await updateIndicator(page, `Running Step 2: Input`);
  const el2 = await findElementWithFallback(page, ["#username","input[name=\"username\"]","input.input.wide.mb16.mt8.username"]);
  await el2.click();
  await el2.fill('');
  await page.keyboard.type(`tedwin.tan@kinesis.money.uat2022`, { delay: 50 });

  // Step 3: Click (manual)
  await updateIndicator(page, `Running Step 3: Click`);
  const el3 = await findElementWithFallback(page, ["#Login","input[name=\"Login\"]","input.button.wide.primary"]);
  await el3.click();

});
