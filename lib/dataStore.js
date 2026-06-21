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

  // Get current file SHA (needed to update)
  let sha;
  try {
    const { data: fileData } = await octokit.repos.getContent({ owner, repo, path: filePath });
    sha = fileData.sha;
  } catch (e) {
    sha = undefined; // File doesn't exist yet
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
};
