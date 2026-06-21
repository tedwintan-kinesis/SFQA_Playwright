import { readRuns, writeRuns } from '../../../lib/dataStore';
import { v4 as uuid } from 'uuid';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      return res.status(200).json(readRuns());
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const runs = readRuns();
      const newRun = {
        id: `run-${uuid().split('-')[0]}`,
        ...req.body,
        completedAt: new Date().toISOString(),
      };
      runs.unshift(newRun);
      await writeRuns(runs);
      return res.status(201).json(newRun);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
