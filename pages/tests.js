import { useState, useEffect } from 'react';
import Head from 'next/head';
import Modal from '../components/Modal';

export default function TestsPage() {
  const [tests, setTests] = useState([]);
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeSuite, setActiveSuite] = useState('All Tests');
  const [selectedIds, setSelectedIds] = useState([]);
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const [draggedIds, setDraggedIds] = useState([]);

  // Test creation modal state
  const [showModal, setShowModal] = useState(false);
  const [editTest, setEditTest] = useState(null);
  const [form, setForm] = useState({ name: '', url: '', zephyrId: '', suite: 'All Tests', specFile: 'tests/Signup Flow/new-kms-signup.spec.js' });
  const [saving, setSaving] = useState(false);

  // Folder creation modal state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [savingFolder, setSavingFolder] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/tests').then(res => res.json()),
      fetch('/api/suites').then(res => res.json())
    ]).then(([testsData, suitesData]) => {
      setTests(testsData || []);
      setSuites(suitesData || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const filtered = tests
    .filter(t => activeSuite === 'All Tests' || t.suite === activeSuite)
    .filter(t => filter === 'all' || t.status === filter)
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()) ||
                 (t.zephyrId || '').toLowerCase().includes(search.toLowerCase()));

  const counts = {
    passed: filtered.filter(t => t.status === 'passed').length,
    failed:  filtered.filter(t => t.status === 'failed').length,
    running: filtered.filter(t => t.status === 'running').length,
  };

  const getSuiteTestCount = (suiteName) => {
    if (suiteName === 'All Tests') return tests.length;
    return tests.filter(t => t.suite === suiteName).length;
  };

  function openCreate() {
    setEditTest(null);
    setForm({ name: '', url: '', zephyrId: '', suite: activeSuite === 'All Tests' ? 'All Tests' : activeSuite, specFile: 'tests/Signup Flow/new-kms-signup.spec.js' });
    setShowModal(true);
  }

  function openEdit(test) {
    setEditTest(test);
    setForm({ name: test.name, url: test.url, zephyrId: test.zephyrId || '', suite: test.suite || 'All Tests', specFile: test.specFile || 'tests/Signup Flow/new-kms-signup.spec.js' });
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
    setSelectedIds(prev => prev.filter(x => x !== id));
  }

  // Checkbox functions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id));
    }
  };

  // Drag and drop functions
  const handleDragStart = (e, id) => {
    let idsToMove = [id];
    if (selectedIds.includes(id)) {
      idsToMove = selectedIds;
    }
    setDraggedIds(idsToMove);
    e.dataTransfer.setData('text/plain', JSON.stringify(idsToMove));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDragOverFolder(null);
  };

  const handleDrop = async (e, targetSuiteName) => {
    e.preventDefault();
    setDragOverFolder(null);
    try {
      let idsToMove = [];
      const rawData = e.dataTransfer.getData('text/plain');
      if (rawData) {
        try {
          idsToMove = JSON.parse(rawData);
        } catch {
          idsToMove = draggedIds;
        }
      } else {
        idsToMove = draggedIds;
      }
      
      if (!Array.isArray(idsToMove) || idsToMove.length === 0) return;

      // Optimistically update
      setTests(prev => prev.map(t => idsToMove.includes(t.id) ? { ...t, suite: targetSuiteName } : t));

      // Batch save sequentially
      for (const id of idsToMove) {
        const existing = tests.find(t => t.id === id);
        if (!existing) continue;
        await fetch(`/api/tests/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: existing.name,
            url: existing.url,
            zephyrId: existing.zephyrId,
            specFile: existing.specFile || 'tests/Signup Flow/new-kms-signup.spec.js',
            suite: targetSuiteName
          }),
        });
      }

      setSelectedIds([]);
      // Sync from backend
      const res = await fetch('/api/tests');
      const data = await res.json();
      setTests(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Folder creation
  async function handleCreateFolder(e) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    setSavingFolder(true);
    try {
      const res = await fetch('/api/suites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to create folder');
        return;
      }
      const newFolder = await res.json();
      setSuites(prev => [...prev, newFolder]);
      setShowFolderModal(false);
      setNewFolderName('');
    } finally {
      setSavingFolder(false);
    }
  }

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 15 }}>
        Loading tests...
      </div>
    );
  }

  const folderNames = ['All Tests', ...suites.map(s => s.name)];

  return (
    <>
      <Head><title>Tests — Salesforce Reflect</title></Head>

      <div className="split-view">
        {/* Sidebar */}
        <div className="split-sidebar">
          <div>
            <div className="section-hdr" style={{ marginBottom: 8 }}>Folders</div>
            <ul className="folder-list">
              {folderNames.map(sName => {
                const isActive = activeSuite === sName;
                const isHovered = dragOverFolder === sName;
                return (
                  <li
                    key={sName}
                    className={`folder-item${isActive ? ' active' : ''}${isHovered ? ' drag-hover' : ''}`}
                    onClick={() => { setActiveSuite(sName); setSelectedIds([]); }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverFolder(sName); }}
                    onDragLeave={() => setDragOverFolder(null)}
                    onDrop={(e) => handleDrop(e, sName)}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sName === 'All Tests' ? '📂 ' : '📁 '}
                      {sName}
                    </span>
                    <span className="badge">{getSuiteTestCount(sName)}</span>
                  </li>
                );
              })}
            </ul>
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: 12, padding: '6px 12px', fontSize: 12.5 }}
              onClick={() => setShowFolderModal(true)}>
              + New Folder
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="split-content">
          <div className="control-bar">
            <h2>{activeSuite}</h2>
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
              <p>Create your first test case or change filters to get started.</p>
            </div>
          ) : (
            <div>
              {selectedIds.length > 0 && (
                <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, marginBottom: 10 }}>
                  Selected {selectedIds.length} test case{selectedIds.length !== 1 ? 's' : ''}. Drag any row to move them.
                </div>
              )}
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: 'center' }}>
                      <input type="checkbox"
                        checked={filtered.length > 0 && filtered.every(t => selectedIds.includes(t.id))}
                        onChange={handleSelectAll} />
                    </th>
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
                  {filtered.map(test => {
                    const isSelected = selectedIds.includes(test.id);
                    return (
                      <tr key={test.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, test.id)}
                        onDragEnd={handleDragEnd}
                        className={isSelected ? 'selected-row' : ''}
                        style={{ cursor: 'grab' }}
                      >
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectOne(e, test.id)} />
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{test.name}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{test.url}</div>
                        </td>
                        <td><span className="pill pill-suite">{test.suite}</span></td>
                        <td>
                          {test.zephyrId && test.zephyrId !== '-'
                            ? <span className="pill pill-zephyr">{test.zephyrId}</span>
                            : <span style={{ color: 'var(--muted)', fontSize: 12 }}>-</span>}
                        </td>
                        <td>
                          <span className={`status-dot ${test.status || 'idle'}`}/>
                          {(test.status || 'idle').toUpperCase()}
                        </td>
                        <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{fmtDate(test.lastRun)}</td>
                        <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{fmtDate(test.created)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => openEdit(test)}>Edit</button>
                            <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                              onClick={() => handleDelete(test.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Test Modal */}
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
            <label>Zephyr Case ID (Optional)</label>
            <input value={form.zephyrId} onChange={e => setForm(f => ({...f, zephyrId: e.target.value}))}
              placeholder="e.g., SFT-T74"/>
          </div>
          <div className="form-group">
            <label>Suite / Folder</label>
            <select value={form.suite} onChange={e => setForm(f => ({...f, suite: e.target.value}))}>
              {['All Tests', ...suites.map(s => s.name)].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </form>
      </Modal>

      {/* New Folder Modal */}
      <Modal open={showFolderModal} onClose={() => setShowFolderModal(false)}
        title="Create New Folder"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowFolderModal(false)}>Cancel</button>
            <button className="btn btn-primary" form="folder-form" type="submit" disabled={savingFolder}>
              {savingFolder ? 'Creating...' : 'Create Folder'}
            </button>
          </>
        }
      >
        <form id="folder-form" onSubmit={handleCreateFolder}>
          <div className="form-group">
            <label>Folder Name *</label>
            <input required value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              placeholder="e.g., Auth Flows"/>
          </div>
        </form>
      </Modal>
    </>
  );
}
