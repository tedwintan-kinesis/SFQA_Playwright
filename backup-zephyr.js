require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.ZEPHYR_TOKEN;
const PROJECT_KEY = 'SFT';
const BASE_URL = 'https://api.zephyrscale.smartbear.com/v2';
const HEADERS = { Authorization: `Bearer ${TOKEN}` };
const BACKUP_DIR = 'C:\\Users\\TanTedWin\\Documents\\antigravity\\Zephyr_Backup';

async function fetchAll(endpoint) {
  let allData = [];
  let url = `${BASE_URL}/${endpoint}`;
  let hasMore = true;
  
  while (hasMore && url) {
    try {
      const res = await axios.get(url, { headers: HEADERS, params: { projectKey: PROJECT_KEY, maxResults: 100 } });
      const values = res.data.values || [];
      allData = allData.concat(values);
      hasMore = !res.data.isLast;
      url = res.data.next;
    } catch (e) {
      console.error(`Failed to fetch ${endpoint}:`, e.response?.data || e.message);
      break;
    }
  }
  return allData;
}

async function backup() {
  if (!TOKEN) {
    console.error('No ZEPHYR_TOKEN found in .env');
    return;
  }
  
  if (!fs.existsSync(BACKUP_DIR)){
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  console.log('Starting comprehensive Zephyr backup...');
  
  console.log('Fetching test cases...');
  const testCases = await fetchAll('testcases');
  
  console.log('Fetching test steps for each test case...');
  for (let i = 0; i < testCases.length; i++) {
    try {
      const stepsRes = await axios.get(`${BASE_URL}/testcases/${testCases[i].key}/teststeps`, { headers: HEADERS, params: { maxResults: 100 } });
      testCases[i].testSteps = stepsRes.data.values || [];
    } catch (e) {
      testCases[i].testSteps = [];
    }
  }

  console.log('Fetching test cycles...');
  const testCycles = await fetchAll('testcycles');

  console.log('Fetching test executions...');
  const testExecutions = await fetchAll('testexecutions');

  console.log('Fetching folders...');
  const folders = await fetchAll('folders');

  const backupData = {
    timestamp: new Date().toISOString(),
    projectKey: PROJECT_KEY,
    folders,
    testCases,
    testCycles,
    testExecutions
  };

  const filename = `zephyr_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filePath = path.join(BACKUP_DIR, filename);
  
  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
  console.log(`Backup complete! Saved everything to ${filePath}`);
}

backup();
