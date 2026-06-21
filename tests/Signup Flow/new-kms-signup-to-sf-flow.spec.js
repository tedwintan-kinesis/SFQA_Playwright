// @zephyrId SFT-T74
// @startUrl https://qa3-kms.kinesis.money/signup

const { test, expect } = require('@playwright/test');

test('New KMS Signup to SF flow', async ({ page }) => {
  await page.goto('https://qa3-kms.kinesis.money/signup');
});
