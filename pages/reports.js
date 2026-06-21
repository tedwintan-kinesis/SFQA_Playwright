import Head from 'next/head';

export default function ReportsPage({ runs }) {
  const total   = runs.length;
  const passed  = runs.filter(r => r.status === 'passed').length;
  const failed  = runs.filter(r => r.status === 'failed').length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

  return (
    <>
      <Head><title>Reports — Salesforce Reflect</title></Head>

      <div className="split-view">
        <div className="split-sidebar">
          <div className="section-hdr" style={{ marginBottom: 8 }}>Reports</div>
          <ul className="folder-list">
            <li className="folder-item active">All Runs <span className="badge">{total}</span></li>
          </ul>
        </div>

        <div className="split-content">
          <h2>Test Reports</h2>

          {/* Summary cards */}
          <div className="cards-row">
            <div className="stat-card">
              <div className="card-label">Total Runs</div>
              <div className="card-value">{total}</div>
            </div>
            <div className="stat-card green">
              <div className="card-label">Passed</div>
              <div className="card-value">{passed}</div>
            </div>
            <div className="stat-card red">
              <div className="card-label">Failed</div>
              <div className="card-value">{failed}</div>
            </div>
            <div className="stat-card">
              <div className="card-label">Pass Rate</div>
              <div className="card-value" style={{ color: passRate >= 80 ? 'var(--success)' : 'var(--error)' }}>
                {passRate}%
              </div>
            </div>
          </div>

          {/* Run history table */}
          {runs.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
              </svg>
              <h4>No Report Data Yet</h4>
              <p>Run your first test case from the Runs tab to see results here.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Test Case</th>
                  <th>Zephyr Key</th>
                  <th>Zephyr Cycle</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Triggered By</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{run.id}</td>
                    <td style={{ fontWeight: 500 }}>{run.testName}</td>
                    <td>
                      {run.zephyrId
                        ? <span className="pill pill-zephyr">{run.zephyrId}</span>
                        : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td>
                      {run.zephyrCycle
                        ? <span className="pill">{run.zephyrCycle}</span>
                        : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      <span className={`status-dot ${run.status}`}/>
                      <span style={{
                        fontWeight: 600,
                        color: run.status === 'passed' ? 'var(--success)'
                             : run.status === 'failed'  ? 'var(--error)' : 'var(--muted)',
                      }}>
                        {run.status?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 12.5 }}>{run.duration || '—'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{run.triggeredBy || 'dashboard'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{fmtDate(run.completedAt)}</td>
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

export async function getServerSideProps() {
  const { readRuns } = require('../lib/dataStore');
  try {
    return { props: { runs: readRuns() } };
  } catch {
    return { props: { runs: [] } };
  }
}
