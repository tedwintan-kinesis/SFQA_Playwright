import { useState, useEffect, useRef } from 'react';
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
  const [sortConfig, setSortConfig] = useState({ key: 'created', direction: 'desc' });
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const [draggedIds, setDraggedIds] = useState([]);
  const abortControllerRef = useRef(null);
  const runningTestRef = useRef(null);
  const extRunStatusRef = useRef(null);
  const extRunStartTimeRef = useRef(null);
  const extRunIdRef = useRef(null);

  // Test creation modal state
  const [showModal, setShowModal] = useState(false);
  const [editTest, setEditTest] = useState(null);
  const [form, setForm] = useState({ name: '', url: '', zephyrId: '', suite: 'All Tests', specFile: 'tests/Signup Flow/new-kms-signup.spec.js' });
  const [saving, setSaving] = useState(false);
  const [testVariables, setTestVariables] = useState([]);

  // Folder creation modal state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderMenuOpenId, setFolderMenuOpenId] = useState(null);

  useEffect(() => {
    const handleClick = () => setFolderMenuOpenId(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);
  const [savingFolder, setSavingFolder] = useState(false);

  // Steps Builder state
  const [selectedTestForSteps, setSelectedTestForSteps] = useState(null);
  const [localSteps, setLocalSteps] = useState([]);
  const [globalVars, setGlobalVars] = useState([]);
  const [savingSteps, setSavingSteps] = useState(false);
  const [recording, setRecording] = useState(false);
  const [running, setRunning] = useState(false);
  const [expandedFallbacks, setExpandedFallbacks] = useState({});

  const normalizeSteps = (steps, url) => {
    const existing = Array.isArray(steps) ? steps : [];
    const first = existing[0] || {};
    return [
      {
        ...first,
        id: first.id || `step-${Date.now()}`,
        action: 'Navigate',
        selectorType: 'manual',
        fallbacks: [],
        value: first.value || url || ''
      },
      ...existing.slice(1).map((step, idx) => ({
        ...step,
        id: step.id || `step-${Date.now()}-${idx}`,
        action: step.action === 'Navigate' ? 'Click' : (step.action || 'Click'),
        selectorType: step.selectorType || 'manual',
        fallbacks: (step.fallbacks && step.fallbacks.length > 0 ? step.fallbacks : ['', '', '']).slice(0, 3)
      }))
    ];
  };

  useEffect(() => {
    if (selectedTestForSteps) {
      setLocalSteps(normalizeSteps(selectedTestForSteps.steps, selectedTestForSteps.url));
    } else {
      setLocalSteps([]);
    }
  }, [selectedTestForSteps]);

  useEffect(() => {
    fetch('/api/variables')
      .then(res => res.json())
      .then(data => setGlobalVars(data || []))
      .catch(err => console.error(err));

    fetch('/api/test-variables')
      .then(res => res.json())
      .then(data => setTestVariables(data || []))
      .catch(err => console.error(err));
  }, []);

  const addStep = () => {
    if (localSteps.length === 0) {
      setLocalSteps(normalizeSteps([], selectedTestForSteps?.url || form.url));
      return;
    }
    const newStep = {
      id: `step-${Date.now()}`,
      action: 'Click',
      selectorType: 'manual',
      variableId: '',
      fallbacks: ['', '', ''],
      value: ''
    };
    setLocalSteps(prev => [...prev, newStep]);
  };

  const deleteStep = (idx) => {
    setLocalSteps(prev => prev.filter((_, i) => i !== idx));
  };

  const moveStepUp = (idx) => {
    if (idx <= 1) return;
    setLocalSteps(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      return copy;
    });
  };

  const moveStepDown = (idx) => {
    if (idx === 0) return;
    setLocalSteps(prev => {
      if (idx === prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      return copy;
    });
  };

  const duplicateStep = (idx) => {
    setLocalSteps(prev => {
      const copy = [...prev];
      const clone = { ...copy[idx], id: `step-${Date.now()}` };
      copy.splice(idx + 1, 0, clone);
      return copy;
    });
  };

  const updateStep = (idx, field, value) => {
    setLocalSteps(prev => prev.map((step, i) => {
      if (i === idx) {
        if (i === 0 && field !== 'value') return step;
        const updated = { ...step, [field]: value };
        if (field === 'selectorType') {
          if (value === 'manual' && (!step.fallbacks || step.fallbacks.length === 0)) {
            updated.fallbacks = ['', '', ''];
          } else if (value === 'global' && !step.variableId) {
            updated.variableId = globalVars[0]?.id || '';
          }
        }
        return updated;
      }
      return step;
    }));
  };

  const updateStepFallback = (stepIdx, fallbackIdx, val) => {
    setLocalSteps(prev => prev.map((step, i) => {
      if (i === stepIdx) {
        const fbs = step.fallbacks ? [...step.fallbacks] : [];
        while (fbs.length <= fallbackIdx) {
          fbs.push('');
        }
        fbs[fallbackIdx] = val;
        return { ...step, fallbacks: fbs };
      }
      return step;
    }));
  };

  const addStepFallbackField = (stepIdx) => {
    setLocalSteps(prev => prev.map((step, i) => {
      if (i === stepIdx) {
        const fbs = step.fallbacks ? [...step.fallbacks] : ['', '', ''];
        return { ...step, fallbacks: [...fbs, ''] };
      }
      return step;
    }));
  };

  const saveSteps = async () => {
    if (!selectedTestForSteps) return;
    setSavingSteps(true);
    try {
      const payload = {
        ...selectedTestForSteps,
        steps: normalizeSteps(localSteps, selectedTestForSteps.url)
      };
      const res = await fetch(`/api/tests/${selectedTestForSteps.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updatedTest = await res.json();
        setTests(prev => prev.map(t => t.id === updatedTest.id ? updatedTest : t));
        setSelectedTestForSteps(updatedTest);
        alert('Steps saved successfully!');
      } else {
        alert('Failed to save steps.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving steps.');
    } finally {
      setSavingSteps(false);
    }
  };

  const executeManualScript = async (code) => {
    try {
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const fn = new AsyncFunction(code);
      const result = await fn();
      if (result !== undefined) {
        alert(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
      } else {
        alert('Script executed successfully (no return value).');
      }
    } catch (e) {
      alert('Script Error:\n\n' + e.message);
    }
  };

  const startRecord = async (test, throughStepIndex = null) => {
    if (!test) return;
    if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-sfqa-extension-active')) {
      setSelectedTestForSteps(test);
      const confRes = await fetch('/api/config');
      const confData = await confRes.json().catch(() => ({ incognito: false, timeout: 30 }));
      window.postMessage({
        source: "sfqa-dashboard",
        action: "START_RECORDING",
        url: test.url,
        test: { ...test, steps: normalizeSteps(test.steps || localSteps, test.url) },
        throughStepIndex,
        config: confData
      }, "*");
      return;
    }
    setRecording(true);
    try {
      const body = { testId: test.id };
      if (Number.isInteger(throughStepIndex)) body.throughStepIndex = throughStepIndex;
      const res = await fetch('/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to start recorder.');
        return;
      }
      alert(data.message || 'Recorder started.');
    } catch (err) {
      console.error(err);
      alert('Error starting recorder.');
    } finally {
      setRecording(false);
    }
  };

  const startRun = async (test) => {
    if (!test) return;
    runningTestRef.current = test;
    
    if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-sfqa-extension-active')) {
      setRunning(true);
      extRunStatusRef.current = null;
      extRunStartTimeRef.current = Date.now();
      
      try {
        const runRes = await fetch('/api/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testId: test.id,
            testName: test.name,
            zephyrId: test.zephyrId || '-',
            zephyrCycle: '-',
            status: 'running',
            mode: 'extension',
            duration: '0s',
            triggeredBy: 'dashboard'
          })
        });
        const newRun = await runRes.json();
        extRunIdRef.current = newRun.id;
      } catch (e) {
        console.error('Failed to create initial run record', e);
      }

      const confRes = await fetch('/api/config');
      const confData = await confRes.json().catch(() => ({ incognito: false, timeout: 30 }));
      window.postMessage({
        source: "sfqa-dashboard",
        action: "START_TEST_RUN",
        test: { ...test, steps: normalizeSteps(test.steps || localSteps, test.url) },
        config: confData
      }, "*");
      return;
    }

    setRunning(true);
    abortControllerRef.current = new AbortController();
    try {
      let currentRunId = null;
      try {
        const runRes = await fetch('/api/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testId: test.id,
            testName: test.name,
            zephyrId: test.zephyrId || '-',
            zephyrCycle: '-',
            status: 'running',
            mode: 'local',
            duration: '0s',
            triggeredBy: 'dashboard'
          })
        });
        const newRun = await runRes.json();
        currentRunId = newRun.id;
        extRunIdRef.current = newRun.id;
      } catch (e) {
        console.error('Failed to create initial run record', e);
      }

      const res = await fetch('/api/trigger-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: test.id, mode: 'local', runId: currentRunId }),
        signal: abortControllerRef.current.signal
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to start run.');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.type === 'done') {
                break;
              }
            } catch {}
          }
        }
      }

      const testsRes = await fetch('/api/tests');
      const updatedTests = await testsRes.json();
      setTests(Array.isArray(updatedTests) ? updatedTests : []);

      const finishedTest = updatedTests.find(t => t.id === test.id);
      if (finishedTest) {
        alert(`Run finished. Status: ${finishedTest.status?.toUpperCase()}`);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err);
        alert('Run failed to start or was disconnected.');
      } else {
        alert('Run stopped by user.');
      }
    } finally {
      setRunning(false);
      abortControllerRef.current = null;
    }
  };

  const stopRun = async () => {
    if (typeof document !== 'undefined' && document.documentElement.hasAttribute('data-sfqa-extension-active')) {
      // Future extension stop support
      setRunning(false);
    } else if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Only mark incomplete if run is still in progress (extRunIdRef cleared after done)
    if (extRunIdRef.current) {
      const runIdToStop = extRunIdRef.current;
      extRunIdRef.current = null; // clear immediately to prevent double-write
      try {
        await fetch(`/api/runs/${runIdToStop}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'incomplete' })
        });
      } catch (e) {}
    }
  };

  useEffect(() => {
    const handleExtensionMessage = async (event) => {
      if (event.source !== window) return;
      if (event.data && event.data.source === "sfqa-extension") {
        if (event.data.action === "STEP_RECORDED") {
          const newStep = event.data.step;
          setLocalSteps(prev => {
            if (newStep.action === "Navigate") {
              if (prev.length > 0 && prev[0].action === "Navigate") {
                const updated = [...prev];
                updated[0] = { ...updated[0], value: newStep.value };
                return updated;
              }
            }
            return [...prev, newStep];
          });
        } else if (event.data.action === "RUN_LOG") {
          const payload = event.data.payload;
          // Check status lines BEFORE handling done (avoids race where done arrives before status line)
          if (payload && payload.line) {
            console.log(payload.line);
            if (payload.line.includes('[Extension] Run finished: PASSED')) extRunStatusRef.current = 'passed';
            if (payload.line.includes('[Extension] Run finished: FAILED')) extRunStatusRef.current = 'failed';
          }
          if (payload && payload.type === 'done') {
             try {
               const status = extRunStatusRef.current || 'failed';
               const durationMs = extRunStartTimeRef.current ? Date.now() - extRunStartTimeRef.current : 0;
               const durationStr = `${Math.round(durationMs / 1000)}s`;
               const test = runningTestRef.current;
               const runIdToFinish = extRunIdRef.current;
               extRunIdRef.current = null; // clear BEFORE PUT so stopRun cannot override
               if (test && runIdToFinish) {
                 await fetch(`/api/runs/${runIdToFinish}`, {
                   method: 'PUT',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                     status,
                     duration: durationStr
                   })
                 });
               }
               const testsRes = await fetch('/api/tests');
               const updatedTests = await testsRes.json();
               setTests(Array.isArray(updatedTests) ? updatedTests : []);
               alert('Extension Run Finished');
             } catch(e){}
             setRunning(false);
          }
        }
      }
    };
    window.addEventListener("message", handleExtensionMessage);
    return () => window.removeEventListener("message", handleExtensionMessage);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/tests').then(res => res.json()),
      fetch('/api/suites').then(res => res.json())
    ]).then(([testsData, suitesData]) => {
      setTests(Array.isArray(testsData) ? testsData : []);
      setSuites(Array.isArray(suitesData) ? suitesData : []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  let filtered = tests
    .filter(t => activeSuite === 'All Tests' || t.suite === activeSuite)
    .filter(t => filter === 'all' || t.status === filter)
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()) ||
                 (t.zephyrId || '').toLowerCase().includes(search.toLowerCase()));

  filtered.sort((a, b) => {
    let aVal = a[sortConfig.key] || '';
    let bVal = b[sortConfig.key] || '';
    if (sortConfig.key === 'lastRun' || sortConfig.key === 'created') {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    } else {
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
    }
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <span style={{ opacity: 0.3, marginLeft: 4, display: 'inline-block', width: 12 }}>↕</span>;
    return <span style={{ marginLeft: 4, display: 'inline-block', width: 12 }}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

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

  async function handleSave(e, recordAfterCreate = false) {
    if (e) e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) {
      alert('Test name and start URL are required.');
      return;
    }
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
        const initialSteps = normalizeSteps([], form.url);
        const res = await fetch('/api/tests', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, steps: initialSteps }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Failed to create test case.');
          return;
        }
        const created = await res.json();
        setTests(prev => [...prev, created]);
        setSelectedTestForSteps(created);
        if (recordAfterCreate) {
          await startRecord(created);
        }
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

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.length} test case${selectedIds.length !== 1 ? 's' : ''}?`)) return;
    for (const id of selectedIds) {
      await fetch(`/api/tests/${id}`, { method: 'DELETE' });
    }
    setTests(prev => prev.filter(t => !selectedIds.includes(t.id)));
    setSelectedIds([]);
  }

  async function handleBulkDuplicate() {
    for (const id of selectedIds) {
      const existing = tests.find(t => t.id === id);
      if (!existing) continue;
      
      const res = await fetch('/api/tests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: existing.name + ' (Copy)',
          url: existing.url,
          zephyrId: existing.zephyrId || '',
          suite: existing.suite,
          specFile: existing.specFile || 'tests/Signup Flow/new-kms-signup.spec.js',
          steps: existing.steps
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setTests(prev => [...prev, created]);
      }
    }
    setSelectedIds([]);
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

  async function handleDeleteFolder(e, suiteId) {
    e.stopPropagation();
    if (!confirm('Delete this folder? Tests inside will be moved to All Tests.')) return;
    try {
      const res = await fetch(`/api/suites?id=${suiteId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to delete folder');
        return;
      }
      setSuites(prev => prev.filter(s => s.id !== suiteId));
      setActiveSuite('All Tests');
      // Re-fetch tests since some might have been moved
      const testsRes = await fetch('/api/tests');
      const testsData = await testsRes.json();
      setTests(Array.isArray(testsData) ? testsData : []);
    } catch (e) {
      alert('Error deleting folder');
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
                const suiteObj = suites.find(s => s.name === sName);
                return (
                  <li
                    key={sName}
                    className={`folder-item${isActive ? ' active' : ''}${isHovered ? ' drag-hover' : ''}`}
                    onClick={() => { setActiveSuite(sName); setSelectedIds([]); }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverFolder(sName); }}
                    onDragLeave={() => setDragOverFolder(null)}
                    onDrop={(e) => handleDrop(e, sName)}
                    style={{ position: 'relative', paddingRight: sName !== 'All Tests' ? 24 : undefined }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sName === 'All Tests' ? '📂 ' : '📁 '}
                      {sName}
                    </span>
                    <span className="badge">{getSuiteTestCount(sName)}</span>
                    {sName !== 'All Tests' && suiteObj && (
                      <div 
                        style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
                        onClick={(e) => { e.stopPropagation(); setFolderMenuOpenId(folderMenuOpenId === suiteObj.id ? null : suiteObj.id); }}
                      >
                        <span style={{ cursor: 'pointer', opacity: 0.8, fontSize: 18, fontWeight: 'bold' }}>⋮</span>
                        {folderMenuOpenId === suiteObj.id && (
                          <div style={{
                            position: 'absolute', right: 0, top: '100%',
                            background: 'var(--bg)', border: '1px solid var(--border)',
                            borderRadius: 4, padding: '4px 0', zIndex: 10,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            minWidth: 120
                          }}>
                            <div 
                              onClick={(e) => { e.stopPropagation(); setFolderMenuOpenId(null); handleDeleteFolder(e, suiteObj.id); }}
                              style={{ padding: '8px 12px', cursor: 'pointer', color: '#e74c3c', fontSize: 13 }}
                              onMouseEnter={e => e.target.style.background = 'var(--hover)'}
                              onMouseLeave={e => e.target.style.background = 'transparent'}
                            >
                              Delete Folder
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
        <div className="split-content" style={{ display: 'flex', flexDirection: 'column' }}>
          <datalist id="global-vars-list">
            {globalVars.map(v => (
              <option key={v.id} value={`{{${v.key}}}`}>{v.fallbacks?.[0] || 'no fallback'}</option>
            ))}
          </datalist>
          <div className="control-bar" style={{ flexShrink: 0 }}>
            <h2>{activeSuite}</h2>
            <div className="control-right">
              <button className="btn btn-primary" onClick={openCreate}>+ Create Test</button>
            </div>
          </div>

          <div className="subtabs" style={{ marginBottom: 16, flexShrink: 0 }}>
            <button className="subtab active">Web</button>
            <button className="subtab">Mobile</button>
            <button className="subtab">API</button>
          </div>

          <div style={{ display: 'flex', gap: 24, flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {/* Left Column (Table & Controls) */}
            <div style={{ flex: selectedTestForSteps ? 6.5 : 10, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', minWidth: 0 }}>
              <div className="control-bar" style={{ flexShrink: 0 }}>
                <input className="search-input" placeholder="Search by name or Zephyr ID…"
                  value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '100%' }} />
                <div className="filter-group">
                  {[['all','All'],['passed','Passed'],['failed','Failed'],['running','Running'],['incomplete','Incomplete']].map(([val, label]) => (
                    <button key={val} className={`filter-btn${filter === val ? ' active' : ''}`}
                      onClick={() => setFilter(val)}>
                      {label}
                      {val !== 'all' && <span className={`tab-badge ${val}`}>{counts[val] ?? 0}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="empty-state" style={{ flex: 1 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/>
                  </svg>
                  <h4>No Tests Found</h4>
                  <p>Create your first test case or change filters to get started.</p>
                </div>
              ) : (
                <div style={{ flex: 1 }}>
                  {selectedIds.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                        &gt; {selectedIds.length} test case{selectedIds.length !== 1 ? 's' : ''} selected
                      </div>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={handleBulkDuplicate}>Duplicate</button>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12, color: 'var(--danger-text, #dc3545)', borderColor: 'var(--danger-border, #dc3545)' }} onClick={handleBulkDelete}>Delete</button>
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
                        <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>Name {renderSortIcon('name')}</th>
                        <th onClick={() => handleSort('suite')} style={{ cursor: 'pointer', userSelect: 'none' }}>Suite {renderSortIcon('suite')}</th>
                        <th onClick={() => handleSort('zephyrId')} style={{ cursor: 'pointer', userSelect: 'none' }}>Zephyr ID {renderSortIcon('zephyrId')}</th>
                        <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>Last Result {renderSortIcon('status')}</th>
                        <th onClick={() => handleSort('lastRun')} style={{ cursor: 'pointer', userSelect: 'none' }}>Last Run {renderSortIcon('lastRun')}</th>
                        <th onClick={() => handleSort('created')} style={{ cursor: 'pointer', userSelect: 'none' }}>Created {renderSortIcon('created')}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(test => {
                        const isSelected = selectedIds.includes(test.id);
                        const isActiveRow = selectedTestForSteps?.id === test.id;
                        return (
                          <tr key={test.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, test.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => setSelectedTestForSteps(test)}
                            className={`${isSelected ? 'selected-row' : ''} ${isActiveRow ? 'active-row' : ''}`}
                            style={{ cursor: 'grab', background: isActiveRow ? 'var(--primary-light)' : 'transparent' }}
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
                                ? <a href={`https://bullioncapital.atlassian.net/projects/SFT?selectedItem=com.atlassian.plugins.atlassian-connect-plugin:com.kanoah.test-manager__main-project-page#!/v2/testCase/${test.zephyrId}`} target="_blank" rel="noreferrer" className="pill pill-zephyr" style={{ textDecoration: 'none' }} onClick={e => e.stopPropagation()}>{test.zephyrId}</a>
                                : <span style={{ color: 'var(--muted)', fontSize: 12 }}>-</span>}
                            </td>
                            <td>
                              {(!test.status || test.status === 'idle') ? (
                                <span style={{ color: 'var(--muted)', fontSize: 13, paddingLeft: 8 }}>-</span>
                              ) : (
                                <>
                                  <span className={`status-dot ${test.status}`}/>
                                  {test.status.toUpperCase()}
                                </>
                              )}
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

            {/* Right Column (Steps Builder) */}
            {selectedTestForSteps && (
              <div style={{
                flex: 3.5, background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
                padding: 20, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 340,
                boxShadow: 'var(--shadow)', maxHeight: '100%', overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 10, flexShrink: 0 }}>
                  <div style={{ overflow: 'hidden' }}>
                    <h3 style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--primary)' }}>Steps Builder</h3>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }} title={selectedTestForSteps.name}>{selectedTestForSteps.name}</div>
                  </div>
                  <button className="modal-close" style={{ cursor: 'pointer', border: 'none', background: 'none' }} onClick={() => setSelectedTestForSteps(null)}>&times;</button>
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12, flex: 1 }} onClick={addStep}>
                    + Add Step
                  </button>
                  <button 
                    className={running ? "btn btn-danger" : "btn btn-secondary"} 
                    style={{ padding: '6px 10px', fontSize: 12, flex: 1, backgroundColor: running ? '#dc3545' : undefined, color: running ? 'white' : undefined }} 
                    onClick={() => running ? stopRun() : startRun(selectedTestForSteps)} 
                    disabled={recording}
                  >
                    {running ? 'Stop' : 'Run'}
                  </button>
                  <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: 12, flex: 1 }} onClick={saveSteps} disabled={savingSteps}>
                    {savingSteps ? 'Saving...' : 'Save Steps'}
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                  {localSteps.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--muted)', fontSize: 13 }}>
                      No steps configured yet. Click "+ Add Step" to start.
                    </div>
                  ) : (
                    localSteps.map((step, idx) => (
                      <div key={step.id || idx} style={{
                        border: '1px solid var(--border)', borderRadius: 8, padding: 12,
                        background: '#FAFBFD', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8,
                        position: 'relative'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--primary)' }}>Step {idx + 1}</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 11 }}
                              onClick={() => moveStepUp(idx)} disabled={idx <= 1}>Up</button>
                            <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 11 }}
                              onClick={() => moveStepDown(idx)} disabled={idx === 0 || idx === localSteps.length - 1}>Down</button>
                            <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 11 }}
                              onClick={() => duplicateStep(idx)} disabled={idx === 0}>Duplicate</button>
                            <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 11 }}
                              onClick={() => startRecord(selectedTestForSteps, idx)} disabled={recording || running}>Record from here</button>
                            <button type="button" className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 11 }}
                              onClick={() => deleteStep(idx)} disabled={idx === 0}>Delete</button>
                          </div>
                        </div>

                        <div className="form-group">
                          <label style={{ fontSize: 10.5 }}>Action</label>
                          <select style={{ fontSize: 12.5, padding: '5px 8px' }} value={step.action} onChange={e => updateStep(idx, 'action', e.target.value)} disabled={idx === 0}>
                            <option>Click</option>
                            <option value="Type">Input</option>
                            <option>Assert Visible</option>
                            <option>Assert Text</option>
                            <option>Wait</option>
                            <option>Javascript</option>
                            {idx === 0 && <option>Navigate</option>}
                          </select>
                        </div>

                        {idx > 0 && step.action !== 'Navigate' && step.action !== 'Wait' && step.action !== 'Javascript' && (
                          <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <label style={{ fontSize: 10.5, margin: 0 }}>Element Selectors</label>
                              <span
                                onClick={() => setExpandedFallbacks(prev => ({ ...prev, [step.id]: !prev[step.id] }))}
                                style={{ fontSize: 10, color: 'var(--primary)', cursor: 'pointer', userSelect: 'none' }}>
                                {expandedFallbacks[step.id] ? '▲ Hide Fallbacks' : '▼ Show Fallbacks'}
                              </span>
                            </div>
                            <div className="fallback-row" style={{ marginBottom: 4 }}>
                              <span className="fallback-num" style={{ fontSize: 10 }}>P1</span>
                              <input className="fallback-input" style={{ fontSize: 12, padding: '4px 8px' }}
                                value={step.fallbacks?.[0] || ''}
                                onChange={e => updateStepFallback(idx, 0, e.target.value)}
                                placeholder='e.g. #submit-btn or getByText("Login")'
                              />
                            </div>
                            {expandedFallbacks[step.id] && (
                              <>
                                {(step.fallbacks || []).slice(1).map((fb, fIdx) => (
                                  <div key={fIdx + 1} className="fallback-row" style={{ marginBottom: 4 }}>
                                    <span className="fallback-num" style={{ fontSize: 10 }}>P{fIdx + 2}</span>
                                    <input className="fallback-input" style={{ fontSize: 12, padding: '4px 8px' }}
                                      value={fb} onChange={e => updateStepFallback(idx, fIdx + 1, e.target.value)}
                                      placeholder={
                                        fIdx === 0 ? 'e.g. #submit-btn'
                                      : fIdx === 1 ? 'e.g. .btn-primary'
                                      : `Additional selector ${fIdx + 2} (optional)`
                                      }
                                    />
                                  </div>
                                ))}
                                <button type="button" className="btn btn-secondary"
                                  style={{ marginTop: 2, padding: '3px 8px', fontSize: 10.5, alignSelf: 'flex-start' }}
                                  onClick={() => addStepFallbackField(idx)}>
                                  + Add Fallback Selector
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {(idx === 0 || step.action === 'Type' || step.action === 'Assert Text' || step.action === 'Wait' || step.action === 'Javascript') && (
                          <div className="form-group">
                            <label style={{ fontSize: 10.5 }}>{idx === 0 ? 'Navigation URL' : step.action === 'Wait' ? 'Delay (ms)' : step.action === 'Javascript' ? 'JavaScript Code' : 'Value / Text'}</label>
                            {step.action === 'Javascript' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <textarea style={{ fontSize: 12.5, padding: '5px 8px', minHeight: '250px', fontFamily: 'monospace' }} value={step.value || ''} onChange={e => updateStep(idx, 'value', e.target.value)} placeholder="return 'Hello';" />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => executeManualScript(step.value)}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                    Execute
                                  </button>
                                </div>
                                <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-sidebar)', borderRadius: 6, border: '1px solid var(--border)' }}>
                                  <h4 style={{ fontSize: 11, marginBottom: 8, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Store Result to Variable</h4>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <select 
                                      style={{ fontSize: 12.5, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 4, width: '200px' }}
                                      value={step.storeVariable || ''}
                                      onChange={e => updateStep(idx, 'storeVariable', e.target.value)}
                                    >
                                      <option value="">-- Select Variable --</option>
                                      {[...testVariables].sort((a,b) => a.key.localeCompare(b.key)).map(v => (
                                        <option key={v.id} value={v.key}>{v.key}</option>
                                      ))}
                                    </select>
                                    <input 
                                      style={{ fontSize: 12.5, padding: '6px 10px', flex: 1, border: '1px solid var(--border)', borderRadius: 4 }} 
                                      value={step.storeVariable || ''} 
                                      onChange={e => updateStep(idx, 'storeVariable', e.target.value)} 
                                      placeholder="Or type custom variable name (e.g., MY_VAR)"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <input style={{ fontSize: 12.5, padding: '5px 8px' }} value={step.value || ''} onChange={e => updateStep(idx, 'value', e.target.value)}
                                placeholder={idx === 0 ? "https://..." : step.action === 'Wait' ? "e.g. 2000" : "Value to input or assert"}/>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Test Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editTest ? 'Edit Test Case' : 'Create New Test Case'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            {!editTest && (
              <button className="btn btn-secondary" type="button" disabled={saving || recording} onClick={() => handleSave(null, true)}>
                {saving || recording ? 'Opening...' : 'Create & Record'}
              </button>
            )}
            <button className="btn btn-primary" form="test-form" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editTest ? 'Save Changes' : 'Create Test'}
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
