import { readTests, writeTests } from '../../../lib/dataStore';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const tests = readTests();
      const idx = tests.findIndex(t => t.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Test not found' });
      tests[idx] = { ...tests[idx], ...req.body, id };
      await writeTests(tests);
      return res.status(200).json(tests[idx]);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const tests = readTests();
      const filtered = tests.filter(t => t.id !== id);
      if (filtered.length === tests.length) return res.status(404).json({ error: 'Test not found' });
      await writeTests(filtered);
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
