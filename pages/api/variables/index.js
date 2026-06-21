import { readVariables, writeVariables } from '../../../lib/dataStore';
import { v4 as uuid } from 'uuid';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      return res.status(200).json(readVariables());
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const vars = readVariables();
      const newVar = {
        id: `var-${uuid().split('-')[0]}`,
        key: req.body.key,
        desc: req.body.desc || '',
        fallbacks: req.body.fallbacks || [],
      };
      vars.push(newVar);
      await writeVariables(vars);
      return res.status(201).json(newVar);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const vars = readVariables();
      const idx = vars.findIndex(v => v.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Variable not found' });
      vars[idx] = { ...vars[idx], ...req.body, id };
      await writeVariables(vars);
      return res.status(200).json(vars[idx]);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      const vars = readVariables();
      const filtered = vars.filter(v => v.id !== id);
      await writeVariables(filtered);
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
