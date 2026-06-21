/**
 * zephyr-reporter.js
 * Posts Playwright test results to Zephyr Scale (Cloud) for a specific test case.
 *
 * Usage: node zephyr-reporter.js [pass|fail]
 * Default status: PASS
 */

require('dotenv').config();
const axios = require('axios');

// ── Config ──────────────────────────────────────────────────────────────────
const ZEPHYR_TOKEN = process.env.ZEPHYR_TOKEN;
if (!ZEPHYR_TOKEN) {
  console.error('❌ ZEPHYR_TOKEN not set. Create a .env file — see .env.example');
  process.exit(1);
}
const BASE_URL = 'https://api.zephyrscale.smartbear.com/v2';
const PROJECT_KEY = 'SFT';
const TEST_CASE_KEY = 'SFT-T74';

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

  try {
    console.log(`Fetching latest test cycle for project: ${PROJECT_KEY}...`);
    const cycle = await getLatestTestCycle();
    console.log(`Using test cycle: ${cycle.key || cycle.id} — ${cycle.name}`);

    const execution = await createTestExecution(cycle.key || cycle.id, statusName);
    console.log('✅ Execution created:', JSON.stringify(execution, null, 2));
  } catch (err) {
    const errData = err.response?.data || err.message;
    console.error('❌ Zephyr API error:', JSON.stringify(errData, null, 2));
    process.exit(1);
  }
}

main();
