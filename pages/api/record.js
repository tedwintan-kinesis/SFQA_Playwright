import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readTests } from '../../lib/dataStore';

function escapeString(value) {
  return (value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildPrepSpec(test, throughStepIndex) {
  const steps = Number.isInteger(throughStepIndex)
    ? (test.steps || []).slice(0, throughStepIndex + 1)
    : [];
  let body = `  await page.goto('${escapeString(test.url)}');\n`;
  body += `  await showRecordingIndicator(page);\n`;

  steps.forEach((step, idx) => {
    if (idx === 0 || step.action === 'Navigate') {
      body += `  await page.goto('${escapeString(step.value || test.url)}');\n`;
      body += `  await showRecordingIndicator(page);\n`;
    } else if (step.action === 'Click') {
      const selector = (step.fallbacks || []).find(s => s && s.trim()) || 'body';
      body += `  await page.locator('${escapeString(selector)}').first().click();\n`;
    } else if (step.action === 'Type') {
      const selector = (step.fallbacks || []).find(s => s && s.trim()) || 'body';
      body += `  await page.locator('${escapeString(selector)}').first().fill('${escapeString(step.value)}');\n`;
    } else if (step.action === 'Assert Visible') {
      const selector = (step.fallbacks || []).find(s => s && s.trim()) || 'body';
      body += `  await page.locator('${escapeString(selector)}').first().waitFor({ state: 'visible' });\n`;
    }
  });

  body += `  await page.pause();\n`;

  return `const { test } = require('@playwright/test');

async function showRecordingIndicator(page) {
  await page.evaluate(() => {
    const id = 'sfqa-recording-indicator';
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

test('record from selected step', async ({ page }) => {
${body}});
`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (process.env.VERCEL === '1') {
    return res.status(400).json({ error: 'Recording requires running the app locally.' });
  }

  const { testId, throughStepIndex } = req.body;
  const tests = await readTests();
  const test = tests.find(t => t.id === testId);
  if (!test) return res.status(404).json({ error: 'Test not found' });

  const rootDir = process.cwd();
  const playwrightCli = path.join(rootDir, 'node_modules', '@playwright', 'test', 'cli.js');
  const hasStepTarget = Number.isInteger(throughStepIndex);

  const tmpSpec = path.join(os.tmpdir(), `sfqa-record-${test.id}-${Date.now()}.spec.js`);
  fs.writeFileSync(tmpSpec, buildPrepSpec(test, throughStepIndex), 'utf-8');

  // Temp playwright config with incognito launch args
  const tmpConfig = path.join(os.tmpdir(), `sfqa-playwright-config-${Date.now()}.js`);
  fs.writeFileSync(tmpConfig, `
const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '${tmpSpec.replace(/\\/g, '/')}',
  use: {
    headless: false,
    launchOptions: {
      args: ['--incognito'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
`, 'utf-8');

  const child = spawn(
    process.execPath,
    [playwrightCli, 'test', tmpSpec, '--config', tmpConfig, '--headed', '--debug', '--reporter=line'],
    {
      cwd: rootDir,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, PWDEBUG: '1' },
    }
  );
  child.unref();

  return res.status(200).json({
    success: true,
    message: hasStepTarget ? 'Recorder opened after replaying selected steps.' : 'Recorder opened.',
  });
}
