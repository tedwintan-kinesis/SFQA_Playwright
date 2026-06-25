import { readConfig, writeConfig } from '../../lib/dataStore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const config = await readConfig();
      return res.status(200).json(config);
    } catch (e) {
      return res.status(200).json({ incognito: false, timeout: 30 });
    }
  }

  if (req.method === 'PUT') {
    try {
      const newConfig = req.body;
      const current = await readConfig();
      await writeConfig({ ...current, ...newConfig });
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
