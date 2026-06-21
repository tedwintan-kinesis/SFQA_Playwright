import { readTests, writeTests, readFileContent, commitFile, deleteFile, moveFile, slugify, generateSpecContent, updateSpecContent } from '../../../lib/dataStore';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const tests = readTests();
      const idx = tests.findIndex(t => t.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Test not found' });

      const test = tests[idx];
      const updatedData = { ...test, ...req.body };
      
      const fileSlug = slugify(updatedData.name || 'test');
      const targetSuite = updatedData.suite || 'All Tests';
      
      // Determine new spec path
      let newSpecFile = '';
      if (targetSuite === 'All Tests') {
        newSpecFile = `tests/${fileSlug}.spec.js`;
      } else {
        newSpecFile = `tests/${targetSuite}/${fileSlug}.spec.js`;
      }

      // Check for duplicate path if the path actually changed
      if (newSpecFile !== test.specFile) {
        let finalSpecFile = newSpecFile;
        let counter = 1;
        while (tests.some((t, i) => i !== idx && t.specFile === finalSpecFile)) {
          if (targetSuite === 'All Tests') {
            finalSpecFile = `tests/${fileSlug}-${counter}.spec.js`;
          } else {
            finalSpecFile = `tests/${targetSuite}/${fileSlug}-${counter}.spec.js`;
          }
          counter++;
        }
        newSpecFile = finalSpecFile;
      }

      // Read existing spec content
      let content = await readFileContent(test.specFile);
      if (content) {
        // Update headers/test name in existing content
        content = updateSpecContent(content, updatedData.name, updatedData.url, updatedData.zephyrId);
      } else {
        // Generate new spec content if file missing
        content = generateSpecContent(updatedData.name, updatedData.url, updatedData.zephyrId);
      }

      // Sync filesystem
      if (newSpecFile !== test.specFile) {
        await moveFile(test.specFile, newSpecFile, content);
      } else {
        await commitFile(test.specFile, content);
      }

      // Update registry record
      tests[idx] = {
        ...updatedData,
        specFile: newSpecFile,
        id
      };
      
      await writeTests(tests);
      return res.status(200).json(tests[idx]);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const tests = readTests();
      const test = tests.find(t => t.id === id);
      if (!test) return res.status(404).json({ error: 'Test not found' });

      // Delete physical spec file
      await deleteFile(test.specFile);

      // Remove from registry
      const filtered = tests.filter(t => t.id !== id);
      await writeTests(filtered);
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
