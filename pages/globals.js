import { useState, useEffect } from 'react';
import Head from 'next/head';
import Modal from '../components/Modal';

export default function GlobalsPage() {
  const [vars, setVars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editVar, setEditVar] = useState(null);
  const [form, setForm] = useState({ key: '', desc: '', fallbacks: ['', '', ''] });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/variables')
      .then(res => res.json())
      .then(data => {
        setVars(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);


  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 15 }}>
        Loading variables...
      </div>
    );
  }

  const filtered = vars.filter(v =>
    v.key.toLowerCase().includes(search.toLowerCase()) ||
    (v.desc || '').toLowerCase().includes(search.toLowerCase())
  );


  function openCreate() {
    setEditVar(null);
    setForm({ key: '', desc: '', fallbacks: ['', '', ''] });
    setShowModal(true);
  }

  function openEdit(v) {
    setEditVar(v);
    const padded = v.fallbacks ? [...v.fallbacks] : [];
    while (padded.length < 3) {
      padded.push('');
    }
    setForm({ key: v.key, desc: v.desc || '', fallbacks: padded });
    setShowModal(true);
  }

  function addFallbackField() {
    setForm(f => ({
      ...f,
      fallbacks: [...f.fallbacks, '']
    }));
  }

  function setFallback(idx, val) {
    setForm(f => {
      const fb = [...f.fallbacks];
      fb[idx] = val;
      return { ...f, fallbacks: fb };
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      key: form.key,
      desc: form.desc,
      fallbacks: form.fallbacks.filter(f => f.trim() !== ''),
    };
    try {
      if (editVar) {
        const res = await fetch(`/api/variables?id=${editVar.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const updated = await res.json();
        setVars(prev => prev.map(v => v.id === editVar.id ? updated : v));
      } else {
        const res = await fetch('/api/variables', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const created = await res.json();
        setVars(prev => [...prev, created]);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this variable?')) return;
    await fetch(`/api/variables?id=${id}`, { method: 'DELETE' });
    setVars(prev => prev.filter(v => v.id !== id));
  }

  return (
    <>
      <Head><title>Globals — Salesforce Reflect</title></Head>

      <div className="split-view">
        <div className="split-sidebar">
          <div className="section-hdr" style={{ marginBottom: 8 }}>Globals</div>
          <ul className="folder-list">
            <li className="folder-item active">Element Masterlist <span className="badge">{vars.length}</span></li>
            <li className="folder-item">Secrets <span className="badge">1</span></li>
          </ul>

          <div style={{ marginTop: 'auto', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, paddingTop: 20 }}>
            <strong style={{ display: 'block', marginBottom: 4 }}>Fallback Priority</strong>
            Variables are tried in order P1 → P2 → P3 during test execution. P1 is always tried first.
          </div>
        </div>

        <div className="split-content">
          <div>
            <div className="control-bar">
              <div>
                <h2>Variables</h2>
                <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
                  Element locators with fallback strategies — P1 tried first, falls back to P2, then P3.
                </p>
              </div>
              <button className="btn btn-primary" onClick={openCreate}>+ Add Variable</button>
            </div>
          </div>

          <input className="search-input" placeholder="Search variables…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '100%' }}/>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <h4>No Variables Yet</h4>
              <p>Add element locators with multiple fallbacks to keep tests stable.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Description</th>
                  <th>P1 (Primary)</th>
                  <th>P2 (Fallback)</th>
                  <th>P3 (Fallback)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id}>
                    <td><strong style={{ fontFamily: 'monospace', fontSize: 13 }}>{v.key}</strong></td>
                    <td style={{ color: 'var(--muted)', fontSize: 12.5, maxWidth: 180 }}>{v.desc || '—'}</td>
                    <td><code>{v.fallbacks?.[0] || '—'}</code></td>
                    <td><code>{v.fallbacks?.[1] || '—'}</code></td>
                    <td><code>{v.fallbacks?.[2] || '—'}</code></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => openEdit(v)}>Edit</button>
                        <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleDelete(v.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editVar ? 'Edit Variable' : 'Add Element Variable'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" form="var-form" type="submit" disabled={saving}>
              {saving ? 'Saving…' : editVar ? 'Save Changes' : 'Add Variable'}
            </button>
          </>
        }
      >
        <form id="var-form" onSubmit={handleSave}>
          <div className="form-group">
            <label>Variable Key *</label>
            <input required value={form.key} onChange={e => setForm(f => ({...f, key: e.target.value}))}
              placeholder="e.g., login_button"/>
          </div>
          <div className="form-group">
            <label>Description</label>
            <input value={form.desc} onChange={e => setForm(f => ({...f, desc: e.target.value}))}
              placeholder="What element does this target?"/>
          </div>
          <div className="form-group">
            <label>Selector Fallbacks (P1 is tried first)</label>
            {form.fallbacks.map((fb, i) => (
              <div key={i} className="fallback-row">
                <span className="fallback-num" style={{
                  color: i === 0 ? 'var(--primary)' : 'var(--muted)',
                  fontWeight: i === 0 ? 700 : 500,
                }}>P{i + 1}</span>
                <input className="fallback-input"
                  value={form.fallbacks[i] || ''}
                  onChange={e => setFallback(i, e.target.value)}
                  required={i === 0}
                  placeholder={
                    i === 0 ? "Primary selector (required)"
                  : i === 1 ? "Fallback selector (optional)"
                  : i === 2 ? "Last-resort selector (optional)"
                  : `Additional selector ${i + 1} (optional)`
                  }
                />
              </div>
            ))}
            <button type="button" className="btn btn-secondary" 
              style={{ marginTop: 4, padding: '4px 10px', fontSize: 11.5, alignSelf: 'flex-start' }}
              onClick={addFallbackField}>
              + Add Selector
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}


