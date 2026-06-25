const fs = require('fs');

async function testPut() {
  try {
    const tests = JSON.parse(fs.readFileSync('./data/tests.json', 'utf8'));
    const test = tests.find(t => t.steps && t.steps.length > 0);

    const res = await fetch(`http://localhost:3000/api/tests/${test.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from('sfqas@abx.com:SalesforceQA1234').toString('base64')
      },
      body: JSON.stringify(test)
    });

    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text);
  } catch (e) {
    console.error(e);
  }
}

testPut();
