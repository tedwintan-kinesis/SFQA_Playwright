import { readTestVariables, writeTestVariables } from '../../../lib/dataStore';
import { v4 as uuid } from 'uuid';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const vars = await readTestVariables();
      return res.status(200).json(vars);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const vars = await readTestVariables();
      const newVar = {
        id: `tvar-${uuid().split('-')[0]}`,
        key: req.body.key,
        value: req.body.value || '',
        desc: req.body.desc || '',
      };
      vars.push(newVar);
      await writeTestVariables(vars);
      return res.status(201).json(newVar);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const vars = await readTestVariables();
      const idx = vars.findIndex(v => v.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Test Variable not found' });
      vars[idx] = { ...vars[idx], ...req.body, id };
      await writeTestVariables(vars);
      return res.status(200).json(vars[idx]);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      const vars = await readTestVariables();
      const filtered = vars.filter(v => v.id !== id);
      await writeTestVariables(filtered);
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
