import { useState } from 'react';
import Head from 'next/head';
import Modal from '../components/Modal';

const SUITES = ['All Tests', 'Signup Flow', 'Salesforce Integration'];

export default function TestsPage({ initialTests }) {
  const [tests, setTests] = useState(initialTests || []);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editTest, setEditTest] = useState(null);
  const [form, setForm] = useState({ name: '', url: '', zephyrId: '', suite: 'All Tests', specFile: '' });
  const [saving, setSaving] = useState(false);

  const filtered = tests
    .filter(t => filter === 'all' || t.status === filter)
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()) ||
                 (t.zephyrId || '').toLowerCase().includes(search.toLowerCase()));

  const counts = {
    passed: tests.filter(t => t.status === 'passed').length,
    failed:  tests.filter(t => t.status === 'failed').length,
    running: tests.filter(t => t.status === 'running').length,
  };

  function openCreate() {
    setEditTest(null);
    setForm({ name: '', url: '', zephyrId: '', suite: 'All Tests', specFile: '' });
    setShowModal(true);
  }

  function openEdit(test) {
    setEditTest(test);
    setForm({ name: test.name, url: test.url, zephyrId: test.zephyrId || '', suite: test.suite, specFile: test.specFile || '' });
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTest) {
        const res = await fetch(`/api/tests/${editTest.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const updated = await res.json();
        setTests(prev => prev.map(t => t.id === editTest.id ? updated : t));
      } else {
        const res = await fetch('/api/tests', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const created = await res.json();
        setTests(prev => [...prev, created]);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this test case?')) return;
    await fetch(`/api/tests/${id}`, { method: 'DELETE' });
    setTests(prev => prev.filter(t => t.id !== id));
  }

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <>
      <Head><title>Tests — Salesforce Reflect</title></Head>

      <div className="split-view">
        {/* Sidebar */}
        <div className="split-sidebar">
          <div>
            <div className="section-hdr" style={{ marginBottom: 8 }}>Tests</div>
            <ul className="folder-list">
              <li className="folder-item active">All Tests <span className="badge">{tests.length}</span></li>
              {SUITES.slice(1).map(s => (
                <li key={s} className="folder-item">{s}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Content */}
        <div className="split-content">
          <div className="control-bar">
            <h2>All Tests</h2>
            <div className="control-right">
              <button className="btn btn-primary" onClick={openCreate}>+ Create Test</button>
            </div>
          </div>

          <div className="subtabs">
            <button className="subtab active">Web</button>
            <button className="subtab">Mobile</button>
            <button className="subtab">API</button>
          </div>

          <div className="control-bar">
            <input className="search-input" placeholder="Search by name or Zephyr ID…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <div className="filter-group">
              {[['all','All'],['passed','Passed'],['failed','Failed'],['running','Running']].map(([val, label]) => (
                <button key={val} className={`filter-btn${filter === val ? ' active' : ''}`}
                  onClick={() => setFilter(val)}>
                  {label}
                  {val !== 'all' && <span className={`tab-badge ${val}`}>{counts[val] ?? 0}</span>}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/>
              </svg>
              <h4>No Tests Found</h4>
              <p>Create your first test case to get started.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Suite</th>
                  <th>Zephyr ID</th>
                  <th>Status</th>
                  <th>Last Run</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(test => (
                  <tr key={test.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{test.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{test.url}</div>
                    </td>
                    <td><span className="pill pill-suite">{test.suite}</span></td>
                    <td>
                      {test.zephyrId
                        ? <span className="pill pill-zephyr">{test.zephyrId}</span>
                        : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      <span className={`status-dot ${test.status || 'idle'}`}/>
                      {(test.status || 'idle').toUpperCase()}
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{fmtDate(test.lastRun)}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{fmtDate(test.created)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => openEdit(test)}>Edit</button>
                        <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => handleDelete(test.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editTest ? 'Edit Test Case' : 'Create New Test Case'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" form="test-form" type="submit" disabled={saving}>
              {saving ? 'Saving…' : editTest ? 'Save Changes' : 'Create Test'}
            </button>
          </>
        }
      >
        <form id="test-form" onSubmit={handleSave}>
          <div className="form-group">
            <label>Test Name *</label>
            <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              placeholder="e.g., KMS Signup to Salesforce Flow"/>
          </div>
          <div className="form-group">
            <label>Start URL *</label>
            <input required value={form.url} onChange={e => setForm(f => ({...f, url: e.target.value}))}
              placeholder="https://qa3-kms.kinesis.money/signup"/>
          </div>
          <div className="form-group">
            <label>Spec File Path</label>
            <input value={form.specFile} onChange={e => setForm(f => ({...f, specFile: e.target.value}))}
              placeholder="tests/new-kms-signup.spec.js"/>
          </div>
          <div className="form-group">
            <label>Zephyr Case ID</label>
            <input value={form.zephyrId} onChange={e => setForm(f => ({...f, zephyrId: e.target.value}))}
              placeholder="e.g., SFT-T74"/>
          </div>
          <div className="form-group">
            <label>Suite / Folder</label>
            <select value={form.suite} onChange={e => setForm(f => ({...f, suite: e.target.value}))}>
              {SUITES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </form>
      </Modal>
    </>
  );
}

export async function getServerSideProps() {
  const { readTests } = require('../lib/dataStore');
  try {
    const tests = readTests();
    return { props: { initialTests: tests } };
  } catch {
    return { props: { initialTests: [] } };
  }
}
