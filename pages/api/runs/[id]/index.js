import { updateRun } from '../../../../lib/dataStore';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const updatedRun = await updateRun(id, req.body);
      if (!updatedRun) {
        return res.status(404).json({ error: 'Run not found' });
      }
      return res.status(200).json(updatedRun);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
