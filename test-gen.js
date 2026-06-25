const ds = require('./lib/dataStore.js');

try {
  const steps = [
    { action: 'Navigate', value: 'https://example.com' },
    { action: 'Type', value: 'hello' }
  ];
  const oldContent = "test content";
  const out = ds.updateSpecContent(oldContent, 'Test Name', 'https://example.com', 'Z-123', steps, []);
  console.log("SUCCESS");
} catch (e) {
  console.error("ERROR:");
  console.error(e);
}
