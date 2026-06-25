// @zephyrId -
// @startUrl https://qa3-kms.kinesis.money/home

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

test('test run from playwright recorder', async ({ page }) => {
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

  // Step 2: Type (manual)
  const el2 = await findElementWithFallback(page, ["#_r_m_","input[name=\"email\"]","input.css-lukafr"]);
  await el2.fill(`tedwin.tan+qa3_1@kinesis.money`);

  // Step 3: Type (manual)
  const el3 = await findElementWithFallback(page, ["#_r_n_","input[name=\"password\"]","input.css-69tkhw"]);
  await el3.fill(`Ttd@11190`);

  // Step 4: Click (manual)
  const el4 = await findElementWithFallback(page, ["[data-cy=\"continue-with-email\"]","[data-qa=\"continue-with-email\"]","[data-cy=\"continue-with-email\"]"]);
  await el4.click();

  // Step 5: Javascript (manual)
  process.env['2FA_Code'] = await page.evaluate(async () => {
    const secret = "FEYTMWZDOBJD6VRUEVOS6ZRDMJUEOZLMKJRUESR6KRCU6RDXGF4A";
    
        // 1. Base32 Decoding logic
        const decoding = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let hex = "";
        for (let i = 0; i < secret.length; i++) {
            const val = decoding.indexOf(secret.charAt(i).toUpperCase());
            let bits = val.toString(2);
            while (bits.length < 5) bits = "0" + bits;
            hex += bits;
        }
        while (hex.length % 8 !== 0) hex += "0";
        const bin = [];
        for (let i = 0; i < hex.length; i += 8) {
            bin.push(parseInt(hex.substr(i, 8), 2));
        }
    
        // 2. Math & Time window calculations
        const epoch = Math.round(new Date().getTime() / 1000.0);
        let time = Math.floor(epoch / 30);
    
        const msg = new Uint8Array(8);
        for (let i = 7; i >= 0; i--) {
            msg[i] = time & 0xff;
            time >>= 8;
        }
    
        // 3. Cryptography steps to build the security key
        const key = new Uint8Array(bin);
        const cryptoKey = await crypto.subtle.importKey(
            "raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
        );
        const signature = await crypto.subtle.sign("HMAC", cryptoKey, msg);
        const hash = new Uint8Array(signature);
    
        const offset = hash[hash.length - 1] & 0xf;
        const binary = ((hash[offset] & 0x7f) << 24) |
            ((hash[offset + 1] & 0xff) << 16) |
            ((hash[offset + 2] & 0xff) << 8) |
            (hash[offset + 3] & 0xff);
    
        // 4. Generate the final 6-digit code
        const otp = (binary % 1000000).toString().padStart(6, "0");
    
        // 5. Return the result
        return otp;
  });

  // Step 6: Wait (manual)
  await page.waitForTimeout(5000);

  // Step 7: Click (manual)
  const el7 = await findElementWithFallback(page, ["#_r_p_","input.css-cpz9ua",".css-cpz9ua"]);
  await el7.click();

  // Step 8: Type (manual)
  const el8 = await findElementWithFallback(page, ["#_r_p_","input.css-cpz9ua",".css-cpz9ua"]);
  await el8.fill(`${process.env['2FA_Code']}`);

});
