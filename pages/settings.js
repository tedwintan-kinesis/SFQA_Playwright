import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function SettingsPage() {
  const [config, setConfig] = useState({ incognito: false, timeout: 30 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setConfig({
          incognito: !!data.incognito,
          timeout: data.timeout !== undefined ? data.timeout : 30
        });
        setLoading(false);
      });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      alert('Settings saved successfully!');
    } catch (err) {
      alert('Failed to save settings');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
        Loading settings...
      </div>
    );
  }

  return (
    <>
      <Head><title>Settings — Salesforce Reflect</title></Head>

      <div className="split-view">
        <div className="split-content" style={{ padding: 40, maxWidth: 600 }}>
          <h2 style={{ marginBottom: 24 }}>Settings</h2>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <div className="form-group" style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 4 }}>
                <input 
                  type="checkbox" 
                  checked={config.incognito} 
                  onChange={(e) => setConfig({ ...config, incognito: e.target.checked })}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ fontWeight: 600 }}>Run/Record in Incognito Mode</span>
              </label>
              <div style={{ fontSize: 13, color: 'var(--muted)', paddingLeft: 28 }}>
                Enable this to launch the browser in incognito mode when recording or running tests.
              </div>
            </div>

            <div className="form-group" style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Global Timeout (seconds)
              </label>
              <input 
                type="number" 
                className="input" 
                value={config.timeout} 
                onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value, 10) || 0 })}
                min="1"
                style={{ width: 120 }}
              />
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
                Ensures the extension closes or fails if it cannot detect an element within this time.
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  );
}
