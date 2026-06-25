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
  const [sortConfig, setSortConfig] = useState({ key: 'completedAt', direction: 'desc' });

  useEffect(() => {
    fetch('/api/runs')
      .then(res => res.json())
      .then(runsData => {
        setRuns(Array.isArray(runsData) ? runsData : []);
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

  let sortedRuns = [...runs];
  sortedRuns.sort((a, b) => {
    let aVal = a[sortConfig.key] || '';
    let bVal = b[sortConfig.key] || '';
    if (sortConfig.key === 'completedAt') {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    } else if (sortConfig.key === 'duration') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
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
                  <th onClick={() => handleSort('id')} style={{ cursor: 'pointer', userSelect: 'none' }}>Run ID {renderSortIcon('id')}</th>
                  <th onClick={() => handleSort('testName')} style={{ cursor: 'pointer', userSelect: 'none' }}>Test Case {renderSortIcon('testName')}</th>
                  <th onClick={() => handleSort('zephyrId')} style={{ cursor: 'pointer', userSelect: 'none' }}>Zephyr Key {renderSortIcon('zephyrId')}</th>
                  <th onClick={() => handleSort('zephyrExecutionId')} style={{ cursor: 'pointer', userSelect: 'none' }}>Zephyr Execution ID {renderSortIcon('zephyrExecutionId')}</th>
                  <th onClick={() => handleSort('mode')} style={{ cursor: 'pointer', userSelect: 'none' }}>Mode {renderSortIcon('mode')}</th>
                  <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>Status {renderSortIcon('status')}</th>
                  <th onClick={() => handleSort('duration')} style={{ cursor: 'pointer', userSelect: 'none' }}>Duration {renderSortIcon('duration')}</th>
                  <th onClick={() => handleSort('completedAt')} style={{ cursor: 'pointer', userSelect: 'none' }}>Completed {renderSortIcon('completedAt')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedRuns.map(run => (
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
                    <td>
                      {run.zephyrExecutionId
                        ? <a href={`https://bullioncapital.atlassian.net/projects/SFT?selectedItem=com.atlassian.plugins.atlassian-connect-plugin:com.kanoah.test-manager__main-project-page#!/v2/testPlayer/testExecution/${run.zephyrExecutionId}`} target="_blank" rel="noreferrer" className="pill pill-zephyr" style={{ textDecoration: 'none' }}>{run.zephyrExecutionId}</a>
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
