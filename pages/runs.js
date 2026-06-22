import { useState, useEffect } from 'react';
import Head from 'next/head';

function ScreenshotsCell({ runId }) {
  const [attachments, setAttachments] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAttachments = () => {
    setLoading(true);
    fetch(`/api/runs/${runId}/attachments`)
      .then(res => res.json())
      .then(data => {
        setAttachments(data || []);
        setLoading(false);
      })
      .catch(() => {
        setAttachments([]);
        setLoading(false);
      });
  };

  if (attachments === null) {
    return (
      <button 
        onClick={fetchAttachments}
        disabled={loading}
        style={{
          background: '#E2E8F0',
          border: 'none',
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 11.5,
          fontWeight: 600,
          color: '#4A5568',
          cursor: 'pointer'
        }}
      >
        {loading ? 'Loading...' : 'View'}
      </button>
    );
  }

  if (attachments.length === 0) {
    return <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>—</span>;
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {attachments.map((a, idx) => (
        <a key={idx} href={a.url} target="_blank" rel="noreferrer" title={a.name}>
          <img 
            src={a.url} 
            alt={a.name} 
            style={{ 
              width: 32, 
              height: 20, 
              objectFit: 'cover', 
              borderRadius: 3, 
              border: '1px solid #E2E8F0', 
              cursor: 'pointer',
              transition: 'transform 0.1s'
            }} 
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
          />
        </a>
      ))}
    </div>
  );
}

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
                  <th>Screenshots</th>
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
                    <td>
                      <ScreenshotsCell runId={run.id} />
                    </td>
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
