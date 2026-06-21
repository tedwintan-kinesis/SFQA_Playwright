import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readTests } from '../../lib/dataStore';

function escapeString(value) {
  return (value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildPrepSpec(test, throughStepIndex) {
  const steps = (test.steps || []).slice(0, throughStepIndex + 1);
  let body = `  await page.goto('${escapeString(test.url)}');\n`;

  steps.forEach((step, idx) => {
    if (idx === 0 || step.action === 'Navigate') {
      body += `  await page.goto('${escapeString(step.value || test.url)}');\n`;
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
  const test = readTests().find(t => t.id === testId);
  if (!test) return res.status(404).json({ error: 'Test not found' });

  const rootDir = process.cwd();
  const playwrightCli = path.join(rootDir, 'node_modules', '@playwright', 'test', 'cli.js');
  const hasStepTarget = Number.isInteger(throughStepIndex);

  let args;
  let env = process.env;
  if (hasStepTarget) {
    const tmpSpec = path.join(os.tmpdir(), `sfqa-record-${test.id}-${Date.now()}.spec.js`);
    fs.writeFileSync(tmpSpec, buildPrepSpec(test, throughStepIndex), 'utf-8');
    args = [playwrightCli, 'test', tmpSpec, '--headed', '--debug', '--reporter=line'];
    env = { ...process.env, PWDEBUG: '1' };
  } else {
    args = [playwrightCli, 'codegen', test.url || 'about:blank'];
  }

  const child = spawn(process.execPath, args, {
    cwd: rootDir,
    detached: true,
    stdio: 'ignore',
    env,
  });
  child.unref();

  return res.status(200).json({
    success: true,
    message: hasStepTarget ? 'Recorder opened after replaying selected steps.' : 'Recorder opened.',
  });
}
