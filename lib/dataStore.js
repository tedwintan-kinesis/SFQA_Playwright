/**
 * lib/dataStore.js
 * Abstracts data read/write:
 *   - Development (local): reads/writes data/*.json directly from filesystem
 *   - Production (Vercel): reads from bundled JSON; writes via GitHub API commit
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const IS_PROD = process.env.VERCEL === '1';

// ── READ ──────────────────────────────────────────────────────────────────
function readData(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

// ── WRITE (Local) ─────────────────────────────────────────────────────────
function writeDataLocal(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ── WRITE (GitHub API for Vercel) ─────────────────────────────────────────
async function writeDataGitHub(filename, data) {
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

function generateSpecContent(name, url, zephyrId, steps = []) {
  let body = `  await page.goto('${url}');\n`;

  if (steps && steps.length > 0) {
    const variables = readData('variables.json');
    body += `\n`;
    steps.forEach((step, idx) => {
      body += `  // Step ${idx + 1}: ${step.action || 'Action'} (${step.selectorType || 'manual'})\n`;
      if (step.action === 'Navigate') {
        body += `  await page.goto('${(step.value || '').replace(/'/g, "\\'")}');\n`;
      } else {
        let selectors = [];
        if (step.selectorType === 'global') {
          const v = variables.find(x => x.id === step.variableId);
          if (v && v.fallbacks) {
            selectors = v.fallbacks.filter(s => s.trim() !== '');
          }
        } else {
          selectors = (step.fallbacks || []).filter(s => s.trim() !== '');
        }

        if (selectors.length === 0) {
          selectors = ['body'];
        }

        const selArrayStr = JSON.stringify(selectors);
        body += `  const el${idx + 1} = await findElementWithFallback(page, ${selArrayStr});\n`;
        
        if (step.action === 'Click') {
          body += `  await el${idx + 1}.click();\n`;
        } else if (step.action === 'Type') {
          body += `  await el${idx + 1}.fill('${(step.value || '').replace(/'/g, "\\'")}');\n`;
        } else if (step.action === 'Assert Visible') {
          body += `  await expect(el${idx + 1}).toBeVisible();\n`;
        } else if (step.action === 'Assert Text') {
          body += `  await expect(el${idx + 1}).toHaveText('${(step.value || '').replace(/'/g, "\\'")}');\n`;
        }
      }
      body += `\n`;
    });
  }

  const helperFn = (steps && steps.length > 0) ? `
async function findElementWithFallback(page, selectors) {
  for (const sel of selectors) {
    if (!sel) continue;
    try {
      const locator = page.locator(sel);
      if (await locator.count() > 0 && await locator.first().isVisible()) {
        return locator.first();
      }
    } catch (e) {}
  }
  return page.locator(selectors[0] || 'body');
}
` : '';

  return `// @zephyrId ${zephyrId || '-'}
// @startUrl ${url}

const { test, expect } = require('@playwright/test');
${helperFn}
test('${name.replace(/'/g, "\\'")}', async ({ page }) => {
${body}});
`;
}

function updateSpecContent(content, name, url, zephyrId, steps = []) {
  if (steps && steps.length > 0) {
    return generateSpecContent(name, url, zephyrId, steps);
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
  readTests: () => readData('tests.json'),
  readVariables: () => readData('variables.json'),
  readRuns: () => readData('runs.json'),
  readConfig: () => readData('config.json'),

  readSuites: () => {
    try {
      return readData('suites.json');
    } catch {
      return [];
    }
  },

  writeTests: async (data) => {
    if (IS_PROD) return writeDataGitHub('tests.json', data);
    return writeDataLocal('tests.json', data);
  },

  writeVariables: async (data) => {
    if (IS_PROD) return writeDataGitHub('variables.json', data);
    return writeDataLocal('variables.json', data);
  },

  writeRuns: async (data) => {
    if (IS_PROD) return writeDataGitHub('runs.json', data);
    return writeDataLocal('runs.json', data);
  },

  writeSuites: async (data) => {
    if (IS_PROD) return writeDataGitHub('suites.json', data);
    return writeDataLocal('suites.json', data);
  },

  // Filesystem utilities
  slugify,
  generateSpecContent,
  updateSpecContent,
  readFileContent,
  commitFile,
  deleteFile,
  moveFile,
};
