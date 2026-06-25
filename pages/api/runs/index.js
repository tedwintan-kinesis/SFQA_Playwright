import { readRuns, writeRuns, updateRun } from '../../../lib/dataStore';
import { v4 as uuid } from 'uuid';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      let runs = await readRuns();
      
      // Auto-timeout stuck runs (> 30 mins)
      const now = new Date();
      const THIRTY_MINS = 30 * 60 * 1000;
      let needsCleanup = false;

      for (const r of runs) {
        if (r.status === 'running') {
          const runTime = new Date(r.completedAt);
          if (now - runTime > THIRTY_MINS) {
            await updateRun(r.id, { status: 'incomplete', duration: 'TIMEOUT' });
            needsCleanup = true;
          }
        }
      }

      if (needsCleanup) {
        runs = await readRuns();
      }

      return res.status(200).json(runs);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const runs = await readRuns();
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
