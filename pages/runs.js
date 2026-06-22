import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function RunsPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/runs')
      .then(res => res.json())
      .then(runsData => {
        setRuns(runsData || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 15 }}>
        Loading runs...
      </div>
    );
  }

  return (
    <>
      <Head><title>Runs — Salesforce Reflect</title></Head>

      <div className="split-view">
        <div className="split-content">
          <h2>Test Runs</h2>

          {runs.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <h4>No Runs Yet</h4>
              <p>Trigger your first run from the Tests page.</p>
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
                      {run.zephyrId && run.zephyrId !== '-'
                        ? <span className="pill pill-zephyr">{run.zephyrId}</span>
                        : <span style={{ color: 'var(--muted)' }}>-</span>}
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
    </>
  );
}
