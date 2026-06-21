/**
 * /api/trigger-run
 * Spawns a LOCAL Playwright test run via child_process.
 * Cloud execution is reserved for a future GitHub Actions integration.
 *
 * NOTE: This only works when Next.js is running locally (npm run dev).
 * On Vercel it will return a 501 — use local execution only.
 */

import { readTests, readRuns, writeRuns, writeTests } from '../../lib/dataStore';
import { spawn } from 'child_process';
import path from 'path';
import { v4 as uuid } from 'uuid';
import fs from 'fs';

function findNewScreenshots(dir, startTime) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(findNewScreenshots(filePath, startTime));
    } else if (path.extname(file).toLowerCase() === '.png') {
      if (stat.mtimeMs >= startTime) {
        results.push({
          path: filePath,
          name: file
        });
      }
    }
  }
  return results;
}


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Cloud execution not yet implemented
  if (req.body.mode === 'cloud') {
    return res.status(501).json({
      error: 'Cloud execution via GitHub Actions is coming soon.',
    });
  }

  // Block execution from Vercel production
  if (process.env.VERCEL === '1') {
    return res.status(400).json({
      error: 'Local browser execution requires running the app locally (npm run dev). Cloud execution is coming soon.',
    });
  }

  const { testId } = req.body;

  let tests;
  try {
    tests = readTests();
  } catch (e) {
    return res.status(500).json({ error: 'Cannot read tests.json' });
  }

  const test = tests.find(t => t.id === testId);
  if (!test) return res.status(404).json({ error: 'Test not found' });

  const runId = `run-${uuid().split('-')[0]}`;
  const startTime = Date.now();

  // Update test status to running
  const idx = tests.findIndex(t => t.id === testId);
  tests[idx].status = 'running';
  await writeTests(tests);

  // Set SSE headers for streaming console output
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const runLogs = [];
  const send = (line, type = 'log') => {
    runLogs.push(line);
    res.write(`data: ${JSON.stringify({ type, line })}\n\n`);
  };


  send(`[SFQA] Starting local Playwright run for: ${test.name}`, 'info');
  send(`[SFQA] Spec: ${test.specFile || 'tests/new-kms-signup.spec.js'}`, 'info');
  send(`[SFQA] Mode: headed (local browser)`, 'info');

  const rootDir = process.cwd();
  const playwrightCli = path.join(rootDir, 'node_modules', '@playwright', 'test', 'cli.js');
  const specFile = test.specFile || 'tests/new-kms-signup.spec.js';

  const child = spawn(
    process.execPath,
    [playwrightCli, 'test', specFile, '--headed', '--reporter=line'],
    { cwd: rootDir }
  );

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => send(line, 'log'));
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => send(line, 'error'));
  });

  child.on('close', async (code) => {
    const duration = `${Math.round((Date.now() - startTime) / 1000)}s`;
    const status = code === 0 ? 'passed' : 'failed';

    send(`[SFQA] Run finished: ${status.toUpperCase()} in ${duration}`, status === 'passed' ? 'success' : 'error');

    // Update test status
    const testsNow = readTests();
    const testIdx = testsNow.findIndex(t => t.id === testId);
    if (testIdx !== -1) {
      testsNow[testIdx].status = status;
      testsNow[testIdx].lastRun = new Date().toISOString();
      await writeTests(testsNow);
    }

    let zephyrId = test.zephyrId || '-';
    let zephyrCycle = '-';

    // Post to Zephyr if token is set and test is linked
    if (process.env.ZEPHYR_TOKEN && test.zephyrId && test.zephyrId !== '-') {
      send(`[Zephyr] Reporting result to ${test.zephyrId}...`, 'info');
      try {
        const axios = require('axios');
        const cyclesRes = await axios.get('https://api.zephyrscale.smartbear.com/v2/testcycles', {
          headers: { Authorization: `Bearer ${process.env.ZEPHYR_TOKEN}` },
          params: { projectKey: 'SFT', maxResults: 100 },
        });
        const cycles = cyclesRes.data.values || [];
        cycles.sort((a, b) => b.id - a.id);
        const latestCycle = cycles[0];

        if (latestCycle) {
          zephyrCycle = latestCycle.key || '-';
          
          const failureSummary = status === 'failed'
            ? '\n\nError Output:\n' + runLogs.filter(l => !l.startsWith('[SFQA]')).slice(-10).join('\n')
            : '';
          const comment = `SFQA Dashboard automated run — ${new Date().toISOString()}${failureSummary}`;

          const execRes = await axios.post('https://api.zephyrscale.smartbear.com/v2/testexecutions', {
            projectKey: 'SFT',
            testCaseKey: test.zephyrId,
            testCycleKey: latestCycle.key,
            statusName: status === 'passed' ? 'Pass' : 'Fail',
            comment,
          }, { headers: { Authorization: `Bearer ${process.env.ZEPHYR_TOKEN}`, 'Content-Type': 'application/json' } });

          send(`[Zephyr] Execution posted to cycle ${latestCycle.key} ✅`, 'success');

          // Upload screenshots if any
          const execIdOrKey = execRes.data.key || execRes.data.id;
          if (execIdOrKey) {
            const screenshots = findNewScreenshots(path.join(rootDir, 'test-results'), startTime);
            for (const screenshot of screenshots) {
              try {
                send(`[Zephyr] Uploading screenshot evidence: ${screenshot.name}...`, 'info');
                const fileData = fs.readFileSync(screenshot.path);
                const url = `https://api.zephyrscale.smartbear.com/v2/testexecutions/${execIdOrKey}/attachments/${encodeURIComponent(screenshot.name)}`;
                await axios.put(url, fileData, {
                  headers: {
                    Authorization: `Bearer ${process.env.ZEPHYR_TOKEN}`,
                    'Content-Type': 'application/octet-stream'
                  }
                });
                send(`[Zephyr] Uploaded screenshot: ${screenshot.name} ✅`, 'success');
              } catch (uploadErr) {
                send(`[Zephyr] Warning: Failed to upload screenshot ${screenshot.name} — ${uploadErr.message}`, 'error');
              }
            }
          }
        }
      } catch (zErr) {
        send(`[Zephyr] Warning: Could not post to Zephyr — ${zErr.message}`, 'error');
      }
    }

    // Save run record
    const runs = readRuns();
    runs.unshift({
      id: runId,
      testId: test.id,
      testName: test.name,
      zephyrId,
      zephyrCycle,
      status,
      mode: 'local',
      duration,
      completedAt: new Date().toISOString(),
      triggeredBy: 'dashboard',
    });
    await writeRuns(runs);

    send(`__DONE__`, 'done');
    res.end();
  });
}
