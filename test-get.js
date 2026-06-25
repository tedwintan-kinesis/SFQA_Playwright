async function test() {
  const res = await fetch(`http://localhost:3000/api/tests/test-82744b3e`, {
    method: 'GET',
    headers: { 
      'Authorization': 'Basic ' + Buffer.from('sfqas@abx.com:SalesforceQA1234').toString('base64')
    },
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Body (first 200):", text.slice(0, 200));
}
test();
