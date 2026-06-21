import { readSuites, writeSuites, readTests, writeTests, commitFile, deleteFile, moveFile, readFileContent, slugify, generateSpecContent } from '../../../lib/dataStore';
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
      
      if (suites.some(s => s.name.toLowerCase() === name.toLowerCase()) || name.toLowerCase() === 'all tests') {
        return res.status(400).json({ error: 'A folder with this name already exists' });
      }

      // Commit .gitkeep file to create directory locally and on GitHub
      await commitFile(`tests/${name}/.gitkeep`, '');

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

      // Reassign and physically move tests in that suite to root tests/ folder
      const tests = readTests();
      let updated = false;
      for (const t of tests) {
        if (t.suite === targetSuite.name) {
          const oldPath = t.specFile;
          const fileSlug = slugify(t.name);
          const newPath = `tests/${fileSlug}.spec.js`;
          
          let content = await readFileContent(oldPath);
          if (!content) {
            content = generateSpecContent(t.name, t.url, t.zephyrId);
          }
          
          await moveFile(oldPath, newPath, content);
          t.suite = 'All Tests';
          t.specFile = newPath;
          updated = true;
        }
      }
      
      if (updated) {
        await writeTests(tests);
      }

      // Delete .gitkeep and the empty suite directory
      await deleteFile(`tests/${targetSuite.name}/.gitkeep`);
      await deleteFile(`tests/${targetSuite.name}`);

      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
