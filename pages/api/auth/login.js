export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;
  const expectedUser = process.env.DASHBOARD_USERNAME || 'sfqas@abx.com';
  const expectedPass = process.env.DASHBOARD_PASSWORD || 'SalesforceQA1234';

  if (username === expectedUser && password === expectedPass) {
    const timestamp = Date.now();
    const token = `${username}|${timestamp}`;
    
    // Session cookie: no Max-Age or Expires so it clears on tab/browser close
    res.setHeader('Set-Cookie', `sfqa_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`);
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ error: 'Invalid username or password' });
}
