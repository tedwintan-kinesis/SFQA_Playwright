import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.query;
  const token = process.env.ZEPHYR_TOKEN;
  if (!token) return res.status(200).json([]);

  try {
    const resAttach = await axios.get(`https://api.zephyrscale.smartbear.com/v2/testexecutions/${id}/attachments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const attachments = resAttach.data.values || [];
    return res.status(200).json(attachments.map(a => ({
      name: a.filename,
      url: a.url
    })));
  } catch (e) {
    return res.status(200).json([]); // Fallback gracefully to empty array
  }
}
