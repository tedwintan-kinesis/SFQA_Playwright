/**
 * zephyr-reporter.js
 * Posts Playwright test results to Zephyr Scale (Cloud) for a specific test case.
 *
 * Usage: node zephyr-reporter.js [pass|fail]
 * Default status: PASS
 */

require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
// ── Config ──────────────────────────────────────────────────────────────────
const ZEPHYR_TOKEN = process.env.ZEPHYR_TOKEN;
const BASE_URL = 'https://api.zephyrscale.smartbear.com/v2';
const PROJECT_KEY = 'SFT';
const TEST_CASE_KEY = process.env.ZEPHYR_TEST_CASE_KEY || '';

const fs = require('fs');
const path = require('path');

function findNewScreenshots(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(findNewScreenshots(filePath));
    } else if (path.extname(file).toLowerCase() === '.png') {
      results.push({
        path: filePath,
        name: file,
        mtime: stat.mtimeMs
      });
    }
  }
  return results;
}


// ── Helpers ─────────────────────────────────────────────────────────────────
const headers = {
  Authorization: `Bearer ${ZEPHYR_TOKEN}`,
  'Content-Type': 'application/json',
};

async function getLatestTestCycle() {
  // Fetch more and pick highest id (most recent)
  const res = await axios.get(`${BASE_URL}/testcycles`, {
    headers,
    params: { projectKey: PROJECT_KEY, maxResults: 100 },
  });
  const items = res.data.values || res.data;
  if (!items || items.length === 0) throw new Error('No test cycles found');
  // Sort by numeric id descending — highest = newest
  items.sort((a, b) => b.id - a.id);
  return items[0];
}

async function createTestExecution(testCycleIdOrKey, status) {
  const body = {
    projectKey: PROJECT_KEY,
    testCaseKey: TEST_CASE_KEY,
    testCycleKey: testCycleIdOrKey,
    statusName: status,
    comment: `Automated Playwright run — ${new Date().toISOString()}`,
  };

  console.log('Posting execution:', JSON.stringify(body, null, 2));

  const res = await axios.post(`${BASE_URL}/testexecutions`, body, { headers });
  return res.data;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const statusArg = (process.argv[2] || 'pass').toLowerCase();
  const statusName = statusArg === 'fail' ? 'Fail' : 'Pass';

  if (!ZEPHYR_TOKEN) {
    console.log('ℹ️ ZEPHYR_TOKEN not set. Skipping Zephyr report.');
    process.exit(0);
  }

  if (!TEST_CASE_KEY || TEST_CASE_KEY === '-') {
    console.log('ℹ️ Test case not linked to Zephyr. Skipping Zephyr report.');
    process.exit(0);
  }


  try {
    console.log(`Fetching latest test cycle for project: ${PROJECT_KEY}...`);
    const cycle = await getLatestTestCycle();
    console.log(`Using test cycle: ${cycle.key || cycle.id} — ${cycle.name}`);

    const execution = await createTestExecution(cycle.key || cycle.id, statusName);
    console.log('✅ Execution created:', JSON.stringify(execution, null, 2));

    const execIdOrKey = execution.key || execution.id;
    if (execIdOrKey) {
      const now = Date.now();
      const screenshotsDir = path.join(__dirname, 'test-results');
      const screenshots = findNewScreenshots(screenshotsDir)
        .filter(s => now - s.mtime < 120000); // modified in last 2 minutes

      for (const screenshot of screenshots) {
        try {
          console.log(`Uploading screenshot ${screenshot.name} to Zephyr execution ${execIdOrKey}...`);
          const form = new FormData();
          form.append('file', fs.createReadStream(screenshot.path));

          await axios.post(`${BASE_URL}/testexecutions/${execIdOrKey}/attachments`, form, {
            headers: {
              Authorization: `Bearer ${ZEPHYR_TOKEN}`,
              ...form.getHeaders()
            }
          });
          console.log(`✅ Uploaded screenshot: ${screenshot.name}`);
        } catch (uploadErr) {
          console.error(`❌ Failed to upload screenshot ${screenshot.name}:`, uploadErr.message);
        }
      }
    }
  } catch (err) {
    const errData = err.response?.data || err.message;
    console.error('❌ Zephyr API error:', JSON.stringify(errData, null, 2));
    process.exit(1);
  }
}

main();
