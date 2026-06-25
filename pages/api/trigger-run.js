/**
 * /api/trigger-run
 * Spawns a LOCAL Playwright test run via child_process.
 * Cloud execution is reserved for a future GitHub Actions integration.
 *
 * NOTE: This only works when Next.js is running locally (npm run dev).
 * On Vercel it will return a 501 — use local execution only.
 */

import { readTests, writeTests, updateRun } from '../../lib/dataStore';
import { spawn } from 'child_process';
import path from 'path';
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

  const { testId, runId } = req.body;
  if (!testId) return res.status(400).json({ error: 'Missing testId' });
  if (!runId) return res.status(400).json({ error: 'Missing runId — run must be created first via POST /api/runs' });

  let tests;
  try {
    tests = await readTests();
  } catch (e) {
    return res.status(500).json({ error: 'Cannot read tests from dataStore' });
  }

  const test = tests.find(t => t.id === testId);
  if (!test) return res.status(404).json({ error: 'Test not found' });

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
  send(`[SFQA] Spec: ${test.specFile || 'tests/Signup Flow/new-kms-signup.spec.js'}`, 'info');
  send(`[SFQA] Mode: headed (local browser)`, 'info');

  const rootDir = process.cwd();
  const playwrightCli = path.join(rootDir, 'node_modules', '@playwright', 'test', 'cli.js');
  const specFile = test.specFile || 'tests/Signup Flow/new-kms-signup.spec.js';

  const child = spawn(
    process.execPath,
    [playwrightCli, 'test', specFile, '--headed', '--reporter=line', '--project=chromium'],
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

  req.on('close', () => {
    if (!child.killed) {
      child.kill();
    }
  });

  child.on('close', async (code, signal) => {
    const duration = `${Math.round((Date.now() - startTime) / 1000)}s`;
    let status = code === 0 ? 'passed' : 'failed';
    if (child.killed || signal === 'SIGTERM') {
      status = 'incomplete';
    }

    send(`[SFQA] Run finished: ${status.toUpperCase()} in ${duration}`, status === 'passed' ? 'success' : 'error');

    // Update test status
    const testsNow = await readTests();
    const testIdx = testsNow.findIndex(t => t.id === testId);
    if (testIdx !== -1) {
      testsNow[testIdx].status = status;
      testsNow[testIdx].lastRun = new Date().toISOString();
      await writeTests(testsNow);
    }

    let zephyrId = test.zephyrId || '-';
    let zephyrCycle = '-';

    let zephyrExecutionId = null;
    // Run execution logic below uses the passed runId to Zephyr if token is set and test is linked
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

          const testScriptResults = (test.steps || []).map((step, idx) => {
            return {
              statusName: status === 'passed' ? 'Pass' : status === 'incomplete' ? 'In Progress' : 'Fail',
              actualResult: `Step ${idx + 1} (${step.action}) ${status.toUpperCase()}.`
            };
          });

          const execRes = await axios.post('https://api.zephyrscale.smartbear.com/v2/testexecutions', {
            projectKey: 'SFT',
            testCaseKey: test.zephyrId,
            testCycleKey: latestCycle.key,
            statusName: status === 'passed' ? 'Pass' : status === 'incomplete' ? 'In Progress' : 'Fail',
            comment,
            testScriptResults
          }, { headers: { Authorization: `Bearer ${process.env.ZEPHYR_TOKEN}`, 'Content-Type': 'application/json' } });

          send(`[Zephyr] Execution posted to cycle ${latestCycle.key} ✅`, 'success');

          // Upload screenshots if any
          let execIdOrKey = execRes.data.key;
          let pureId = execRes.data.id;
          
          if (!execIdOrKey && pureId) {
            try {
              const fetchRes = await axios.get(`https://api.zephyrscale.smartbear.com/v2/testexecutions/${pureId}`, {
                headers: { Authorization: `Bearer ${process.env.ZEPHYR_TOKEN}` }
              });
              if (fetchRes.data?.key) execIdOrKey = fetchRes.data.key;
            } catch (err) {}
          }
          
          execIdOrKey = execIdOrKey || pureId;

          if (execIdOrKey) {
            zephyrExecutionId = String(execIdOrKey);
            let screenshots = [
              ...findNewScreenshots(path.join(rootDir, 'test-results'), startTime),
              ...findNewScreenshots(path.join(rootDir, 'DOCS', 'SCREENSHOTS'), startTime),
            ];
            
            if (screenshots.length > 0) {
              const FormData = require('form-data');
              for (const screenshot of screenshots) {
                try {
                  send(`[Zephyr] Uploading screenshot evidence: ${screenshot.name}...`, 'info');
                  const form = new FormData();
                  form.append('file', fs.createReadStream(screenshot.path));
                  
                  const url = `https://api.zephyrscale.smartbear.com/v2/testexecutions/${execIdOrKey}/attachments`;
                  await axios.post(url, form, {
                    headers: {
                      Authorization: `Bearer ${process.env.ZEPHYR_TOKEN}`,
                      ...form.getHeaders()
                    }
                  });
                  send(`[Zephyr] Uploaded screenshot: ${screenshot.name} ✅`, 'success');
                } catch (uploadErr) {
                  send(`[Zephyr] Warning: Failed to upload screenshot ${screenshot.name} — ${uploadErr.message}`, 'error');
                }
              }
            }
          }
        }
      } catch (zErr) {
        send(`[Zephyr] Warning: Could not post to Zephyr — ${zErr.message}`, 'error');
      }
    }

    // Save run record via updateRun (skip Zephyr double push)
    const runUpdates = { status, duration, zephyrCycle };
    if (zephyrExecutionId) runUpdates.zephyrExecutionId = zephyrExecutionId;

    await updateRun(runId, runUpdates, true);

    send(`__DONE__`, 'done');
    res.end();
  });
}
