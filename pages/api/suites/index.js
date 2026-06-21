import { readSuites, writeSuites, readTests, writeTests } from '../../../lib/dataStore';
import { v4 as uuid } from 'uuid';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      return res.status(200).json(readSuites());
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const suites = readSuites();
      const name = (req.body.name || '').trim();
      if (!name) return res.status(400).json({ error: 'Folder name is required' });
      
      // Prevent duplicate folder names
      if (suites.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        return res.status(400).json({ error: 'A folder with this name already exists' });
      }

      const newSuite = {
        id: `suite-${uuid().split('-')[0]}`,
        name,
        description: req.body.description || '',
      };
      suites.push(newSuite);
      await writeSuites(suites);
      return res.status(201).json(newSuite);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      const suites = readSuites();
      const targetSuite = suites.find(s => s.id === id);
      if (!targetSuite) return res.status(404).json({ error: 'Suite not found' });
      
      const filtered = suites.filter(s => s.id !== id);
      await writeSuites(filtered);

      // Reassign tests in that suite to 'All Tests'
      const tests = readTests();
      let updated = false;
      tests.forEach(t => {
        if (t.suite === targetSuite.name) {
          t.suite = 'All Tests';
          updated = true;
        }
      });
      if (updated) {
        await writeTests(tests);
      }

      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
