// @ts-check
const { test, expect } = require('@playwright/test');

test('New KMS Signup to SF flow', async ({ browser }) => {
  // Generate unique email per run
  const timestamp = Date.now();
  const generatedEmail = `${timestamp}.etiqoodhhm@testmail.getscandium.com`;

  const context = await browser.newContext();
  const page = await context.newPage();

  // ── Step 1: Navigate to signup ──────────────────────────────────────────────
  await page.goto('https://qa3-kms.kinesis.money/signup');

  // ── Step 2: Fill email ──────────────────────────────────────────────────────
  const emailInput = await page.$('#root > main > div.MuiStack-root.css-rvd1ty > form > div.MuiFormControl-root.MuiFormControl-fullWidth.css-1mvs7q6 > div > div > input');
  await emailInput.isVisible();
  await emailInput.fill(generatedEmail);

  // ── Step 3: Click "Continue with email" ────────────────────────────────────
  const continueEmailBtn = await page.$('#root > main > div.MuiStack-root.css-rvd1ty > form > div.MuiStack-root.css-hk3vud > button');
  await continueEmailBtn.isVisible();
  await continueEmailBtn.click();

  // ── Step 4: Click first name input ─────────────────────────────────────────
  const firstNameInput = await page.$('#root > main > div.MuiStack-root.css-rvd1ty > form > div.MuiStack-root.css-vesh82 > div:nth-child(1) > div > div > input');
  await firstNameInput.isVisible();
  await firstNameInput.click();

  // ── Step 5: Fill first name "SFQA" ─────────────────────────────────────────
  const firstNameInput2 = await page.$('#root > main > div.MuiStack-root.css-rvd1ty > form > div.MuiStack-root.css-vesh82 > div:nth-child(1) > div > div > input');
  await firstNameInput2.isVisible();
  await firstNameInput2.fill('SFQA');

  // ── Step 6: Fill last name "oUlAVanhRHMr" ──────────────────────────────────
  const lastNameInput = await page.$('#root > main > div.MuiStack-root.css-rvd1ty > form > div.MuiStack-root.css-vesh82 > div:nth-child(2) > div > div > input');
  await lastNameInput.isVisible();
  await lastNameInput.fill('oUlAVanhRHMr');

  // ── Step 7: Click "Create your password" ───────────────────────────────────
  const createPasswordBtn = await page.$('#root > main > div.MuiStack-root.css-rvd1ty > form > div.MuiStack-root.css-1ofqig9 > button');
  await createPasswordBtn.isVisible();
  await createPasswordBtn.click();

  // ── Step 8: Click password input ───────────────────────────────────────────
  const passwordInputClick = await page.$('#root > main > div.MuiStack-root.css-rvd1ty > form > div.MuiFormControl-root.MuiFormControl-fullWidth.css-1mvs7q6 > div > div > input');
  await passwordInputClick.isVisible();
  await passwordInputClick.click();

  // ── Step 9: Click T&C checkbox ─────────────────────────────────────────────
  const tcCheckbox = await page.$('#root > main > div.MuiStack-root.css-rvd1ty > form > label > span.MuiButtonBase-root.MuiCheckbox-root.MuiCheckbox-colorPrimary.MuiCheckbox-sizeSmall.PrivateSwitchBase-root.MuiCheckbox-root.MuiCheckbox-colorPrimary.MuiCheckbox-sizeSmall.MuiCheckbox-root.MuiCheckbox-colorPrimary.MuiCheckbox-sizeSmall.css-ctqayu > input');
  await tcCheckbox.click();

  // ── Step 10: Fill password ─────────────────────────────────────────────────
  const passwordInput = await page.$('#root > main > div.MuiStack-root.css-rvd1ty > form > div.MuiFormControl-root.MuiFormControl-fullWidth.css-1mvs7q6 > div > div > input');
  await passwordInput.isVisible();
  await passwordInput.fill('SFQAtest@12345');

  // ── Step 11: Click "Create your account" ───────────────────────────────────
  const createAccountBtn = await page.$('#root > main > div.MuiStack-root.css-rvd1ty > form > div.MuiStack-root.css-4w2mif > button');
  await createAccountBtn.isVisible();
  await createAccountBtn.click();

  // ── Step 12: Navigate to Scandium mailbox ──────────────────────────────────
  await page.goto('https://app.getscandium.com/projects/a20699eb-0d86-49e3-a0af-cc52f0907d70/mailbox');

  // ── Step 13: Click verification email ─────────────────────────────────────
  const verifyEmail = await page.$('#scandium--latest-mail > div > p.MuiTypography-root.MuiTypography-body2.MuiListItemText-secondary.css-aclo5e > p.MuiTypography-root.MuiTypography-body2.css-el5ng7');
  await verifyEmail.isVisible();
  await verifyEmail.click();

  // ── Step 14: Scroll to email body ──────────────────────────────────────────
  const emailBody = await page.$('#root > div.App > div > div.MuiGrid-root.MuiGrid-container.css-1d3bbye > div.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-12.MuiGrid-grid-sm-12.MuiGrid-grid-md-8.css-efwuvd > div > div > div > div.MuiBox-root.css-1hf44su');
  await page.evaluate("window.scrollTo('0', '110.69183349609375')");

  // ── Step 15: Click "Verify email address" link ─────────────────────────────
  const verifyLink = await page.$('#root > div.App > div > div.MuiGrid-root.MuiGrid-container.css-1d3bbye > div.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-12.MuiGrid-grid-sm-12.MuiGrid-grid-md-8.css-efwuvd > div > div > div > div.MuiBox-root.css-1hf44su > div:nth-child(1) > div > p > div:nth-child(17) > div:nth-child(8) > table > tbody > tr > td > div > table > tbody > tr > td > table > tbody > tr > td > a > span');
  await verifyLink.isVisible();
  await verifyLink.click();

  // ── Step 16: Click email field on login page ────────────────────────────────
  const loginEmailClick = await page.$('#root > main > div.MuiStack-root.css-rvd1ty > form > div.MuiStack-root.css-vesh82 > div:nth-child(1) > div > div > div > input');
  await loginEmailClick.isVisible();
  await loginEmailClick.click();

  // ── Step 17: Fill generated email ──────────────────────────────────────────
  const loginEmailInput = await page.$('#root > main > div.MuiStack-root.css-rvd1ty > form > div.MuiStack-root.css-vesh82 > div:nth-child(1) > div > div > div > input');
  await loginEmailInput.isVisible();
  await loginEmailInput.fill(generatedEmail);

  // ── Step 18: Fill login password ───────────────────────────────────────────
  const loginPasswordInput = await page.$('#root > main > div.MuiStack-root.css-rvd1ty > form > div.MuiStack-root.css-vesh82 > div:nth-child(2) > div > div > div > input');
  await loginPasswordInput.isVisible();
  await loginPasswordInput.fill('SFQAtest@12345');

  // ── Step 19: Click "Continue with email" on login ──────────────────────────
  const loginContinueBtn = await page.$('#root > main > div.MuiStack-root.css-rvd1ty > form > div.MuiStack-root.css-hk3vud > button.MuiButtonBase-root.MuiButton-root.MuiButton-contained.MuiButton-sizeLarge.MuiButton-colorPrimary.MuiButton-disableElevation.MuiButton-fullWidth.css-ptai0y');
  await loginContinueBtn.isVisible();
  await loginContinueBtn.click();

  await context.close();
});
