import { useState, useRef } from 'react';
import Head from 'next/head';

export default function RunsPage({ initialTests, initialRuns }) {
  const [tests] = useState(initialTests || []);
  const [runs, setRuns] = useState(initialRuns || []);
  const [selectedTestId, setSelectedTestId] = useState(initialTests?.[0]?.id || '');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const consoleRef = useRef(null);

  function scrollConsole() {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }

  async function handleLocalRun() {
    if (!selectedTestId) return;
    setIsRunning(true);
    setLogs([{ type: 'info', line: '[SFQA] Connecting to local Playwright runner…' }]);

    try {
      const res = await fetch('/api/trigger-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: selectedTestId, mode: 'local' }),
      });

      // Handle SSE stream
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
              const { type, line: text } = JSON.parse(line.slice(6));
              if (type === 'done') continue;
              setLogs(prev => [...prev, { type, line: text }]);
              setTimeout(scrollConsole, 50);
            } catch {}
          }
        }
      }

      // Refresh runs list
      const runsRes = await fetch('/api/runs');
      const updatedRuns = await runsRes.json();
      setRuns(updatedRuns);
    } catch (err) {
      setLogs(prev => [...prev, { type: 'error', line: `[SFQA] Error: ${err.message}` }]);
    } finally {
      setIsRunning(false);
    }
  }

  const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

  return (
    <>
      <Head><title>Runs — Salesforce Reflect</title></Head>

      <div className="split-view">
        {/* Config sidebar */}
        <div className="split-sidebar">
          <div>
            <div className="section-hdr" style={{ marginBottom: 10 }}>Run Configuration</div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Target Test</label>
              <select value={selectedTestId} onChange={e => setSelectedTestId(e.target.value)}>
                {tests.length === 0
                  ? <option value="">No tests found</option>
                  : tests.map(t => <option key={t.id} value={t.id}>{t.name} ({t.zephyrId || 'no Zephyr ID'})</option>)
                }
              </select>
            </div>

            {/* Local Run Button */}
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: 10 }}
              onClick={handleLocalRun}
              disabled={isRunning || !selectedTestId}
            >
              {isRunning ? (
                <>
                  <span style={{
                    display: 'inline-block', width: 12, height: 12,
                    border: '2px solid #ffffff55', borderTopColor: '#fff',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                  }}/>
                  Running…
                </>
              ) : '▶ Run Locally (Headed)'}
            </button>

            {/* Cloud Run — greyed out, coming soon */}
            <div className="with-tooltip" style={{ width: '100%' }}>
              <button className="btn btn-cloud-disabled" style={{ width: '100%' }} disabled>
                ☁ Run on Cloud
                <span className="tooltip-text">Cloud execution via GitHub Actions — Coming Soon</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="split-content">
          <h2>Test Runs</h2>

          {/* Console output */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>EXECUTION LOG</div>
            <div className="console-box" ref={consoleRef}>
              {logs.length === 0
                ? <div className="console-line info">Console ready. Select a test and click "Run Locally" to start.</div>
                : logs.map((l, i) => (
                    <div key={i} className={`console-line ${l.type}`}>{l.line}</div>
                  ))
              }
            </div>
          </div>

          {/* Run history */}
          <h3>Execution History</h3>

          {runs.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <h4>No Runs Yet</h4>
              <p>Trigger your first run from the panel on the left.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Test Case</th>
                  <th>Zephyr Key</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12.5 }}>{run.id}</td>
                    <td style={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {run.testName}
                    </td>
                    <td>
                      {run.zephyrId
                        ? <span className="pill pill-zephyr">{run.zephyrId}</span>
                        : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td><span className="pill">{run.mode || 'local'}</span></td>
                    <td>
                      <span className={`status-dot ${run.status}`}/>
                      {run.status?.toUpperCase()}
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>{run.duration || '—'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>{fmtDate(run.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

export async function getServerSideProps() {
  const { readTests, readRuns } = require('../lib/dataStore');
  try {
    return { props: { initialTests: readTests(), initialRuns: readRuns() } };
  } catch {
    return { props: { initialTests: [], initialRuns: [] } };
  }
}
