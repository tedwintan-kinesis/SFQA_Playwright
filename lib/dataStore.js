/**
 * lib/dataStore.js
 * Abstracts data read/write:
 *   - Zephyr Scale (SmartBear): reads/writes directly from Zephyr Scale API if ZEPHYR_TOKEN is set
 *   - Development (local JSON fallback): reads/writes data/*.json directly from filesystem
 *   - Production (GitHub API fallback): writes via GitHub API commit
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA_DIR = path.join(process.cwd(), 'data');
const IS_PROD = process.env.VERCEL === '1';

// ── READ ──────────────────────────────────────────────────────────────────
function readData(filename) {
  console.log(`[DataStore] Loading data from: ${filename}`);
  const filePath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

// ── WRITE (Local) ─────────────────────────────────────────────────────────
function writeDataLocal(filename, data) {
  // Local writes are intentionally disabled.
  // data/*.json is gitignored and only written by Vercel via GitHub API.
  // This prevents git merge conflicts from local machine pushes.
  console.warn(`[DataStore] LOCAL WRITE SKIPPED for ${filename}. Data is read-only on local machine.`);
}

// ── WRITE (GitHub API for Vercel) ─────────────────────────────────────────
async function writeDataGitHub(filename, data) {
  console.log(`[DataStore] Saving GitHub data to: ${filename}`);
  const { Octokit } = await import('@octokit/rest');
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const filePath = `data/${filename}`;
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

  let sha;
  try {
    const { data: fileData } = await octokit.repos.getContent({ owner, repo, path: filePath });
    sha = fileData.sha;
  } catch (e) {
    sha = undefined;
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `chore: update ${filename} via SFQA dashboard`,
    content,
    sha,
  });
}

// ── ZEPHYR SCALE API HELPERS ──────────────────────────────────────────────

async function getOrCreateFolder(folderName, projectKey, headers) {
  try {
    const foldersRes = await axios.get('https://api.zephyrscale.smartbear.com/v2/folders', {
      headers,
      params: { projectKey, folderType: 'TEST_CASE', maxResults: 100 }
    });
    const folders = foldersRes.data.values || [];
    const existing = folders.find(f => f.name.toLowerCase() === folderName.toLowerCase());
    if (existing) return existing.id;

    // Create new folder
    const createRes = await axios.post('https://api.zephyrscale.smartbear.com/v2/folders', {
      projectKey,
      name: folderName,
      folderType: 'TEST_CASE'
    }, { headers });
    return createRes.data.id;
  } catch (e) {
    console.error('Failed to get/create Zephyr folder:', e.response?.data || e.message);
    return null;
  }
}

// ── PUBLIC API ─────────────────────────────────────────────────────────────

async function readTests() {
  try {
    return readData('tests.json');
  } catch (e) {
    return [];
  }
}

async function writeTests(newTestsList) {
  let currentTests = [];
  try {
    currentTests = await readTests();
  } catch (e) {}

  // Save local state immediately
  if (IS_PROD) {
    await writeDataGitHub('tests.json', newTestsList);
  } else {
    writeDataLocal('tests.json', newTestsList);
  }

  const token = process.env.ZEPHYR_TOKEN;
  if (!token) return;

  const config = await readConfig();
  const projectKey = config.zephyrProjectKey || 'SFT';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Find added, updated, deleted compared to old local state
  const added = newTestsList.filter(t => !currentTests.some(ct => ct.id === t.id));
  const updated = newTestsList.filter(t => {
    const ct = currentTests.find(ct => ct.id === t.id);
    return ct && (
      ct.name !== t.name ||
      ct.url !== t.url ||
      ct.suite !== t.suite ||
      JSON.stringify(ct.steps) !== JSON.stringify(t.steps) ||
      ct.status !== t.status ||
      ct.lastRun !== t.lastRun
    );
  });
  const deleted = currentTests.filter(ct => !newTestsList.some(t => t.id === ct.id));

  let madeZephyrChanges = false;

  // Process Added
  for (const t of added) {
    try {
      let suiteName = t.suite;
      if (!suiteName || suiteName === 'All Tests') {
        suiteName = 'Automation_SF';
      }
      const folderId = await getOrCreateFolder(suiteName, projectKey, headers);

      const metadata = {
        url: t.url,
        specFile: t.specFile,
        type: t.type,
        status: t.status,
        lastRun: t.lastRun,
        created: t.created,
        steps: t.steps
      };

      const payload = {
        projectKey,
        name: t.name,
        objective: `<!--SFQA_METADATA:${JSON.stringify(metadata)}-->`,
        statusName: 'Approved'
      };
      if (folderId) payload.folderId = folderId;

      const res = await axios.post('https://api.zephyrscale.smartbear.com/v2/testcases', payload, { headers });
      t.id = res.data.key;
      t.zephyrId = res.data.key;
      madeZephyrChanges = true;
    } catch (e) {
      console.error('Failed to create Zephyr test case:', e.response?.data || e.message);
    }
  }

  // Process Updated
  for (const t of updated) {
    if (!t.zephyrId || t.zephyrId === '') continue; // Cannot update Zephyr if it doesn't exist
    try {
      let folderId = null;
      if (t.suite && t.suite !== 'All Tests') {
        folderId = await getOrCreateFolder(t.suite, projectKey, headers);
      }

      const metadata = {
        url: t.url,
        specFile: t.specFile,
        type: t.type,
        status: t.status,
        lastRun: t.lastRun,
        created: t.created,
        steps: t.steps
      };

      const payload = {
        name: t.name,
        objective: `<!--SFQA_METADATA:${JSON.stringify(metadata)}-->`
      };
      if (folderId) payload.folderId = folderId;

      await axios.put(`https://api.zephyrscale.smartbear.com/v2/testcases/${t.zephyrId}`, payload, { headers });
    } catch (e) {
      console.error(`Failed to update Zephyr test case ${t.zephyrId}:`, e.response?.data || e.message);
    }
  }

  // Process Deleted (Omitted as per user rule: DO NOT DELETE ANYTHING FROM ZEPHYR SIDE)
  for (const t of deleted) {
    // We intentionally do not call axios.delete here
    console.log(`Skipped deleting Zephyr test case ${t.zephyrId} per configuration.`);
  }

  // If Zephyr gave us new IDs, resave to local JSON
  if (madeZephyrChanges) {
    if (IS_PROD) await writeDataGitHub('tests.json', newTestsList);
    else writeDataLocal('tests.json', newTestsList);
  }
}

async function readVariables() {
  try {
    return readData('variables.json');
  } catch (e) {
    return [];
  }
}

async function writeVariables(data) {
  if (IS_PROD) return writeDataGitHub('variables.json', data);
  return writeDataLocal('variables.json', data);
}

async function readTestVariables() {
  try {
    return readData('test_variables.json');
  } catch (e) {
    return [];
  }
}

async function writeTestVariables(data) {
  if (IS_PROD) return writeDataGitHub('test_variables.json', data);
  return writeDataLocal('test_variables.json', data);
}

async function readRuns() {
  try {
    return readData('runs.json');
  } catch (e) {
    return [];
  }
}

async function syncZephyrRunsInBackground() {
  const token = process.env.ZEPHYR_TOKEN;
  if (!token) return;

  try {
    let runs = await readRuns();
    const unsyncedRuns = runs.filter(r => 
      r.zephyrSynced === false && 
      ['passed', 'failed'].includes(r.status) &&
      r.zephyrId && r.zephyrId !== '-'
    );

    if (unsyncedRuns.length === 0) return;

    const config = await readConfig();
    const projectKey = config.zephyrProjectKey || 'SFT';
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    let latestCycleKey = null;

    for (const r of unsyncedRuns) {
      let cycleKey = r.zephyrCycle;
      if (!cycleKey || cycleKey === '-') {
        if (!latestCycleKey) {
          try {
            const cyclesRes = await axios.get('https://api.zephyrscale.smartbear.com/v2/testcycles', {
              headers,
              params: { projectKey, maxResults: 10 }
            });
            const cycles = cyclesRes.data.values || [];
            cycles.sort((a, b) => b.id - a.id);
            if (cycles[0]) latestCycleKey = cycles[0].key;
          } catch(e) {}
        }
        cycleKey = latestCycleKey;
      }

      if (!cycleKey || cycleKey === '-') continue;

      const comment = `SFQA Dashboard run — completedAt: ${r.completedAt} | mode: ${r.mode} | triggeredBy: ${r.triggeredBy} | testName: ${r.testName || 'Unknown Test'}`;
      let testScriptResults = [];
      const match = (await readTests()).find(t => t.id === r.testId || t.zephyrId === r.zephyrId);
      if (match && match.steps) {
        testScriptResults = match.steps.map((step, idx) => ({
          statusName: r.status === 'passed' ? 'Pass' : 'Fail',
          actualResult: `Step ${idx + 1} (${step.action}) ${r.status.toUpperCase()}.`
        }));
      }

      const durationSec = r.duration ? parseInt(String(r.duration).replace(/[^0-9]/g, ''), 10) : 0;
      const payload = {
        projectKey,
        testCaseKey: r.zephyrId,
        testCycleKey: cycleKey,
        statusName: r.status === 'passed' ? 'Pass' : 'Fail',
        comment,
        executionTime: isNaN(durationSec) ? 0 : durationSec * 1000
      };
      if (testScriptResults.length > 0) payload.testScriptResults = testScriptResults;

      try {
        console.log(`[Zephyr Sync] Background pushing execution for ${r.zephyrId} to cycle ${cycleKey}`);
        let zRes;
        try {
          zRes = await axios.post('https://api.zephyrscale.smartbear.com/v2/testexecutions', payload, { headers });
        } catch (innerE) {
          if (innerE.response?.data?.message?.includes('must match the number of steps')) {
            console.log(`[Zephyr Sync] Step count mismatch for ${r.zephyrId}. Retrying without step results...`);
            delete payload.testScriptResults;
            zRes = await axios.post('https://api.zephyrscale.smartbear.com/v2/testexecutions', payload, { headers });
          } else {
            throw innerE;
          }
        }

        let execKey = zRes.data?.key || zRes.data?.id;

        if (execKey) {
          console.log(`[Zephyr Sync] Success! Execution ID created: ${execKey}`);
          runs = await readRuns();
          const runRef = runs.find(n => n.id === r.id);
          if (runRef) {
            runRef.zephyrExecutionId = String(execKey);
            runRef.zephyrSynced = true;
            runRef.zephyrCycle = cycleKey;
            if (IS_PROD) await writeDataGitHub('runs.json', runs);
            else writeDataLocal('runs.json', runs);
          }
        }
      } catch (e) {
        console.error(`[Zephyr Sync] Failed to push run ${r.id}:`, e.response?.data || e.message);
      }
    }
  } catch (err) {}
}

async function writeRuns(newRunsList) {
  const processedRuns = newRunsList.map(r => {
    if (r.zephyrSynced === undefined) r.zephyrSynced = false;
    return r;
  });

  if (IS_PROD) {
    await writeDataGitHub('runs.json', processedRuns);
  } else {
    writeDataLocal('runs.json', processedRuns);
  }
}

async function updateRun(runId, updates, skipZephyr = false) {
  const runs = await readRuns();
  const runIndex = runs.findIndex(r => r.id === runId);
  if (runIndex === -1) return null;
  
  const isFinalStatus = ['passed', 'failed', 'incomplete'].includes(updates.status || runs[runIndex].status);
  
  const updatedRun = { 
    ...runs[runIndex], 
    ...updates, 
    completedAt: new Date().toISOString(),
    zephyrSynced: skipZephyr ? true : false
  };
  runs[runIndex] = updatedRun;
  
  if (IS_PROD) await writeDataGitHub('runs.json', runs);
  else writeDataLocal('runs.json', runs);

  if (isFinalStatus) {
    const tests = await readTests();
    const testIndex = tests.findIndex(t => t.id === updatedRun.testId);
    if (testIndex !== -1) {
      tests[testIndex].status = updatedRun.status;
      tests[testIndex].lastRun = updatedRun.completedAt;
      await writeTests(tests);
    }
    
    if (!skipZephyr && ['passed', 'failed'].includes(updatedRun.status)) {
      Promise.resolve().then(() => syncZephyrRunsInBackground());
    }
  }

  return updatedRun;
}

async function readSuites() {
  try {
    return readData('suites.json');
  } catch {
    return [];
  }
}

async function writeSuites(suitesList) {
  const token = process.env.ZEPHYR_TOKEN;
  if (!token) {
    if (IS_PROD) return writeDataGitHub('suites.json', suitesList);
    return writeDataLocal('suites.json', suitesList);
  }
  const config = await readConfig();
  const projectKey = config.zephyrProjectKey || 'SFT';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const currentSuites = await readSuites();
  const added = suitesList.filter(s => !currentSuites.some(cs => cs.name.toLowerCase() === s.name.toLowerCase()));
  const deleted = currentSuites.filter(cs => !suitesList.some(s => s.name.toLowerCase() === cs.name.toLowerCase()));

  for (const s of added) {
    try {
      await axios.post('https://api.zephyrscale.smartbear.com/v2/folders', {
        projectKey,
        name: s.name,
        folderType: 'TEST_CASE'
      }, { headers });
    } catch (e) {
      console.error('Failed to create Zephyr folder:', e.response?.data || e.message);
    }
  }

  for (const cs of deleted) {
    // Intentionally skipped deleting Zephyr folder as per user rule
    console.log(`Skipped deleting Zephyr folder ${cs.name} per configuration.`);
  }
}

async function readConfig() {
  try {
    return readData('config.json');
  } catch {
    return { incognito: false, timeout: 30 };
  }
}

async function writeConfig(data) {
  if (IS_PROD) return writeDataGitHub('config.json', data);
  return writeDataLocal('config.json', data);
}

// ── FILESYSTEM SYNC HELPERS ────────────────────────────────────────────────
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function generateSpecContent(name, url, zephyrId, steps = [], variables = null) {
  let body = `  // Position window on left half via CDP\n`;
  body += `  const cdp = await page.context().newCDPSession(page);\n`;
  body += `  const { windowId } = await cdp.send('Browser.getWindowForTarget');\n`;
  body += `  const screen = await page.evaluate(() => ({ width: window.screen.availWidth, height: window.screen.availHeight }));\n`;
  body += `  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal', left: 0, top: 0, width: Math.floor(screen.width / 2), height: screen.height } });\n`;
  body += `  await cdp.send('Page.enable');\n`;
  body += `  page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));\n`;
  body += `\n`;
  if (!steps || steps.length === 0 || steps[0].action !== 'Navigate') {
    body += `  await page.goto('${url}');\n`;
    body += `  await showAutomationIndicator(page);\n`;
  } else {
    // First step is Navigate — still need to do initial goto so indicator can be injected
    // showAutomationIndicator will be called inside the Navigate step after goto
  }

  const processValue = (val) => {
    if (!val) return "''";
    let escaped = val.replace(/`/g, '\\`');
    escaped = escaped.replace(/\{\{([^}]+)\}\}/g, "${process.env['$1']}");
    return `\`${escaped}\``;
  };

  if (steps && steps.length > 0) {
    const vars = variables || (() => {
      try {
        return readData('variables.json');
      } catch {
        return [];
      }
    })();
    body += '\n';
    steps.forEach((step, idx) => {
      const displayAction = step.action === 'Type' ? 'Input' : (step.action || 'Action');
      body += `  // Step ${idx + 1}: ${displayAction} (${step.selectorType || 'manual'})\n`;
      if (step.action === 'Navigate') {
        body += `  await page.goto(${processValue(step.value)});\n`;
        body += `  await showAutomationIndicator(page);\n`;
        body += `  await updateIndicator(page, \`Running Step ${idx + 1}: Navigate\`);\n`;
      } else if (step.action === 'Wait') {
        body += `  await updateIndicator(page, \`Running Step ${idx + 1}: Wait\`);\n`;
        body += `  await page.waitForTimeout(${parseInt(step.value, 10) || 1000});\n`;
      } else if (step.action === 'Javascript') {
        body += `  await updateIndicator(page, \`Running Step ${idx + 1}: Javascript\`);\n`;
        if (step.storeVariable) {
          body += `  process.env['${step.storeVariable.replace(/'/g, "\\'")}'] = await page.evaluate(async () => {\n    ${(step.value || '').replace(/\n/g, '\n    ')}\n  });\n`;
        } else {
          body += `  await page.evaluate(async () => {\n    ${(step.value || '').replace(/\n/g, '\n    ')}\n  });\n`;
        }
      } else {
        body += `  await updateIndicator(page, \`Running Step ${idx + 1}: ${displayAction}\`);\n`;
        let selectors = (step.fallbacks || []).filter(s => s.trim() !== '');

        if (selectors.length > 0 && selectors[0].startsWith('{{') && selectors[0].endsWith('}}')) {
          const varKey = selectors[0].slice(2, -2).trim();
          const v = vars.find(x => x.key === varKey);
          if (v && v.fallbacks) {
            selectors = v.fallbacks.filter(s => s.trim() !== '');
          }
        }

        if (selectors.length === 0) {
          selectors = ['body'];
        }

        const selArrayStr = JSON.stringify(selectors);

        if (step.action === 'Type' && selectors[0] === 'body') {
          body += `  await page.keyboard.type(${processValue(step.value)}, { delay: 50 });\n`;
        } else {
          body += `  const el${idx + 1} = await findElementWithFallback(page, ${selArrayStr});\n`;

          if (step.action === 'Click') {
            body += `  await el${idx + 1}.click();\n`;
          } else if (step.action === 'Type') {
            body += `  await el${idx + 1}.click();\n`;
            body += `  await el${idx + 1}.fill('');\n`;
            body += `  await page.keyboard.type(${processValue(step.value)}, { delay: 50 });\n`;
          } else if (step.action === 'Assert Visible') {
            body += `  await expect(el${idx + 1}).toBeVisible();\n`;
          } else if (step.action === 'Assert Text') {
            body += `  await expect(el${idx + 1}).toHaveText(${processValue(step.value)});\n`;
          }
        }
      }
      body += '\n';
    });
  }

  const helperFn = `
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
` + ((steps && steps.length > 0) ? `
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
` : '');

  return `// @zephyrId ${zephyrId || '-'}
// @startUrl ${url}

const { test, expect } = require('@playwright/test');
${helperFn}
test('${name.replace(/'/g, "\\'")}', async ({ page }) => {
${body}});
`;
}

function updateSpecContent(content, name, url, zephyrId, steps = [], variables = null) {
  if (steps && steps.length > 0) {
    return generateSpecContent(name, url, zephyrId, steps, variables);
  }

  let updated = content;
  
  // Update or insert @zephyrId
  if (updated.includes('// @zephyrId')) {
    updated = updated.replace(/\/\/ @zephyrId.*/, `// @zephyrId ${zephyrId || '-'}`);
  } else {
    updated = `// @zephyrId ${zephyrId || '-'}\n` + updated;
  }

  // Update or insert @startUrl
  if (updated.includes('// @startUrl')) {
    updated = updated.replace(/\/\/ @startUrl.*/, `// @startUrl ${url}`);
  } else {
    updated = `// @startUrl ${url}\n` + updated;
  }

  // Update test name inside test('...', or test("...", or test(`...`,
  updated = updated.replace(/test\(['"`].+?['"`]/, `test('${name.replace(/'/g, "\\'")}'`);

  return updated;
}

async function readFileContent(relativePath) {
  if (!IS_PROD) {
    const fullPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf-8');
    }
    return null;
  } else {
    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    try {
      const { data: fileData } = await octokit.repos.getContent({ owner, repo, path: relativePath });
      return Buffer.from(fileData.content, 'base64').toString('utf-8');
    } catch {
      return null;
    }
  }
}

async function commitFile(relativePath, content) {
  if (!IS_PROD) {
    const fullPath = path.join(process.cwd(), relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  } else {
    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const base64Content = Buffer.from(content).toString('base64');

    let sha;
    try {
      const { data: fileData } = await octokit.repos.getContent({ owner, repo, path: relativePath });
      sha = fileData.sha;
    } catch (e) {
      sha = undefined;
    }

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: relativePath,
      message: `chore: write ${relativePath} via SFQA dashboard`,
      content: base64Content,
      sha,
    });
  }
}

async function deleteFile(relativePath) {
  console.log(`[DataStore] Deleting file: ${relativePath}`);
  if (!IS_PROD) {
    const fullPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(fullPath)) {
      if (fs.statSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }
  } else {
    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

    let sha;
    try {
      const { data: fileData } = await octokit.repos.getContent({ owner, repo, path: relativePath });
      sha = fileData.sha;
    } catch (e) {
      return;
    }

    await octokit.repos.deleteFile({
      owner,
      repo,
      path: relativePath,
      message: `chore: delete ${relativePath} via SFQA dashboard`,
      sha,
    });
  }
}

async function moveFile(oldRelativePath, newRelativePath, content) {
  await deleteFile(oldRelativePath);
  await commitFile(newRelativePath, content);
}

// ── PUBLIC API ─────────────────────────────────────────────────────────────
module.exports = {
  readTests,
  readVariables,
  readTestVariables,
  readRuns,
  readConfig,
  readSuites,

  writeTests,
  writeVariables,
  writeTestVariables,
  writeRuns,
  updateRun,
  writeSuites,
  writeConfig,

  // Filesystem utilities
  slugify,
  generateSpecContent,
  updateSpecContent,
  readFileContent,
  commitFile,
  deleteFile,
  moveFile,
  syncZephyrRunsInBackground,
};
