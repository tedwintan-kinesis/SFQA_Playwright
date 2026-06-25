const ds = require('./lib/dataStore.js');
const fs = require('fs');

try {
  const tests = JSON.parse(fs.readFileSync('./data/tests.json', 'utf8'));
  const test = tests.find(t => t.steps && t.steps.length > 0);
  console.log("Generating for:", test.name);
  const out = ds.generateSpecContent(test.name, test.url, test.zephyrId, test.steps, []);
  console.log("SUCCESS");
} catch (e) {
  console.error("ERROR:");
  console.error(e);
}
