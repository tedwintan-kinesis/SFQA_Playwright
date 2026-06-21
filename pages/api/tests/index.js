import { readTests, writeTests } from '../../../lib/dataStore';
import { v4 as uuid } from 'uuid';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const tests = readTests();
      return res.status(200).json(tests);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const tests = readTests();
      const newTest = {
        id: `test-${uuid().split('-')[0]}`,
        name: req.body.name,
        url: req.body.url,
        zephyrId: req.body.zephyrId || '',
        suite: req.body.suite || 'All Tests',
        specFile: req.body.specFile || '',
        type: 'Web (Desktop)',
        status: 'idle',
        lastRun: null,
        created: new Date().toISOString(),
      };
      tests.push(newTest);
      await writeTests(tests);
      return res.status(201).json(newTest);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
