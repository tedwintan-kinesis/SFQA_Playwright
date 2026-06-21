import { useState } from 'react';
import Head from 'next/head';
import Modal from '../components/Modal';

const DEFAULT_SUITES = [
  { id: 'suite-001', name: 'Signup Flow', description: 'Verifies KMS Signup pipelines and email checks', testCount: 1 },
  { id: 'suite-002', name: 'Salesforce Integration', description: 'End-to-end user sync tests between KMS and Salesforce', testCount: 0 },
];

export default function SuitesPage() {
  const [suites, setSuites] = useState(DEFAULT_SUITES);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  function handleCreate(e) {
    e.preventDefault();
    const newSuite = {
      id: `suite-${Date.now()}`,
      name: form.name,
      description: form.description,
      testCount: 0,
    };
    setSuites(prev => [...prev, newSuite]);
    setShowModal(false);
    setForm({ name: '', description: '' });
  }

  function handleDelete(id) {
    if (!confirm('Delete this suite?')) return;
    setSuites(prev => prev.filter(s => s.id !== id));
  }

  return (
    <>
      <Head><title>Suites — Salesforce Reflect</title></Head>

      <div className="split-view">
        <div className="split-sidebar">
          <div className="section-hdr" style={{ marginBottom: 8 }}>Suites</div>
          <ul className="folder-list">
            <li className="folder-item active">All Suites <span className="badge">{suites.length}</span></li>
          </ul>
        </div>

        <div className="split-content">
          <div className="control-bar">
            <h2>Suites & Folders</h2>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Create Suite</button>
          </div>

          {suites.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <h4>No Suites Yet</h4>
              <p>Group your test cases into suites for organized runs.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Suite Name</th>
                  <th>Description</th>
                  <th>Linked Tests</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {suites.map(suite => (
                  <tr key={suite.id}>
                    <td style={{ fontWeight: 600 }}>{suite.name}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{suite.description}</td>
                    <td><span className="pill">{suite.testCount} Test{suite.testCount !== 1 ? 's' : ''}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>View</button>
                        <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleDelete(suite.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Suite"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" form="suite-form" type="submit">Create</button>
          </>
        }
      >
        <form id="suite-form" onSubmit={handleCreate}>
          <div className="form-group">
            <label>Suite Name *</label>
            <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              placeholder="e.g., Regression Suite"/>
          </div>
          <div className="form-group">
            <label>Description</label>
            <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
              placeholder="What does this suite cover?"/>
          </div>
        </form>
      </Modal>
    </>
  );
}
