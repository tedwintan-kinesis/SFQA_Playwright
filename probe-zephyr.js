require('dotenv').config();
const axios = require('axios');

const TOKEN = process.env.ZEPHYR_TOKEN;
if (!TOKEN) { console.error('ZEPHYR_TOKEN not set'); process.exit(1); }

// Decode + display JWT sub
const parts = TOKEN.split('.');
const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
console.log('JWT sub:', payload.sub);
console.log('JWT iss:', payload.iss);
console.log('Jira base:', payload.context && payload.context.baseUrl);

// Zephyr Squad Cloud — correct endpoint
const BASE = 'https://prod-api.zephyr4jiracloud.com/connect';
const SCALE = 'https://api.zephyrscale.smartbear.com/v2';

const tests = [
  { url: SCALE + '/testcases?projectKey=SFT&maxResults=3' },
  { url: SCALE + '/testcycles?projectKey=SFT&maxResults=3' },
  { url: SCALE + '/testcases/SFT-T74' },
  { url: BASE + '/public/rest/api/1.0/folder/testCase?projectKey=SFT' },
];

(async () => {
  for (const t of tests) {
    console.log('\n--- GET', t.url);
    try {
      const r = await axios.get(t.url, { headers: { Authorization: 'Bearer ' + TOKEN } });
      console.log('OK', r.status, JSON.stringify(r.data).substring(0, 500));
    } catch (e) {
      const resp = e.response;
      console.log('ERR', resp && resp.status, JSON.stringify(resp && resp.data).substring(0, 300));
    }
  }
})();
