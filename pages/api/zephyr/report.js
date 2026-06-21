import axios from 'axios';
import { readRuns, writeRuns } from '../../../lib/dataStore';

const BASE_URL = 'https://api.zephyrscale.smartbear.com/v2';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { testCaseKey, status } = req.body;
  const token = process.env.ZEPHYR_TOKEN;

  if (!token) return res.status(400).json({ error: 'ZEPHYR_TOKEN not configured' });
  if (!testCaseKey) return res.status(400).json({ error: 'testCaseKey is required' });

  try {
    const cyclesRes = await axios.get(`${BASE_URL}/testcycles`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { projectKey: 'SFT', maxResults: 100 },
    });

    const cycles = cyclesRes.data.values || [];
    cycles.sort((a, b) => b.id - a.id);
    const latestCycle = cycles[0];

    if (!latestCycle) return res.status(400).json({ error: 'No test cycles found in SFT project' });

    const execRes = await axios.post(`${BASE_URL}/testexecutions`, {
      projectKey: 'SFT',
      testCaseKey,
      testCycleKey: latestCycle.key,
      statusName: status === 'failed' ? 'Fail' : 'Pass',
      comment: `SFQA Dashboard — ${new Date().toISOString()}`,
    }, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    return res.status(200).json({
      success: true,
      cycle: latestCycle.key,
      executionId: execRes.data.id,
    });
  } catch (e) {
    return res.status(500).json({ error: e.response?.data || e.message });
  }
}
