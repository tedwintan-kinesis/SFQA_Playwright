import { readTests, writeTests, commitFile, slugify, generateSpecContent } from '../../../lib/dataStore';
import { v4 as uuid } from 'uuid';
import path from 'path';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const tests = await readTests();
      return res.status(200).json(tests);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const tests = await readTests();
      const { name, url, zephyrId, suite } = req.body;

      const fileSlug = slugify(name || 'test');
      const targetSuite = suite || 'All Tests';

      // Determine spec file relative path
      let specFile = '';
      if (targetSuite === 'All Tests') {
        specFile = `tests/${fileSlug}.spec.js`;
      } else {
        specFile = `tests/${targetSuite}/${fileSlug}.spec.js`;
      }

      // Check if duplicate file path exists in database, adjust if needed
      let finalSpecFile = specFile;
      let counter = 1;
      while (tests.some(t => t.specFile === finalSpecFile)) {
        if (targetSuite === 'All Tests') {
          finalSpecFile = `tests/${fileSlug}-${counter}.spec.js`;
        } else {
          finalSpecFile = `tests/${targetSuite}/${fileSlug}-${counter}.spec.js`;
        }
        counter++;
      }

      const steps = req.body.steps && req.body.steps.length > 0 ? req.body.steps : [{
        id: `step-${Date.now()}`,
        action: 'Navigate',
        value: url,
        selectorType: 'manual',
        fallbacks: []
      }];

      // Generate Playwright spec content
      const content = await generateSpecContent(name, url, zephyrId, steps);

      // Commit spec file to disk/GitHub
      await commitFile(finalSpecFile, content);

      const newTest = {
        id: `test-${uuid().split('-')[0]}`,
        name,
        url,
        zephyrId: zephyrId || '',
        suite: targetSuite,
        specFile: finalSpecFile,
        type: 'Web (Desktop)',
        status: 'idle',
        lastRun: null,
        created: new Date().toISOString(),
        steps: steps

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
