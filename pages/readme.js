import Head from 'next/head';

export default function Readme() {
  return (
    <>
      <Head>
        <title>Readme — Salesforce Reflect</title>
      </Head>

      <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: '28px', color: '#1C3FAA', marginBottom: '8px' }}>Initial Setup Guide</h1>
              <p style={{ color: '#718096', fontSize: '15px', margin: 0 }}>Follow these steps to configure your testing environment.</p>
            </div>
          </div>

          {/* Chrome Extension */}
          <section style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow)', marginBottom: '24px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', color: '#2D3748', margin: 0 }}>
                1. Install Chrome Extension
              </h2>
              <a href="/chrome_extension.zip" download className="btn btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download ZIP
              </a>
            </div>
            
            <p style={{ fontSize: '14px', color: '#4A5568', marginBottom: '16px', lineHeight: '1.6' }}>
              The <strong>SFQA Reflect</strong> extension is required to automatically capture clicks and inputs directly into the dashboard.
            </p>

            <ol style={{ paddingLeft: '20px', margin: 0, color: '#4A5568', fontSize: '14px', lineHeight: '1.8' }}>
              <li style={{ marginBottom: '8px' }}>
                Download the ZIP file using the button above and extract it to a folder (or use the existing <code>chrome_extension</code> folder in the project).
              </li>
              <li style={{ marginBottom: '8px' }}>
                Open Chrome and navigate to <strong>chrome://extensions</strong>.
              </li>
              <li style={{ marginBottom: '8px' }}>
                Toggle <strong>Developer mode</strong> on (top right corner).
              </li>
              <li style={{ marginBottom: '8px' }}>
                Click <strong>Load unpacked</strong> and select the extracted extension folder.
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>CRITICAL:</strong> Click "Details" on the installed extension and toggle ON <strong>Allow in Incognito</strong>. The recorder will not work without this.
              </li>
              <li>
                Refresh your dashboard page. You can now start recording or run any test case to start capturing.
              </li>
            </ol>
          </section>

          {/* Selectors Guide */}
          <section style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow)', marginBottom: '24px', border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '18px', color: '#2D3748', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px' }}>
              2. Supported Element Selectors
            </h2>
            <p style={{ fontSize: '14px', color: '#4A5568', marginBottom: '16px', lineHeight: '1.6' }}>
              Use these string locators directly in the dashboard fallback fields. <strong>Do not type <code>page.getBy...</code> methods.</strong>
            </p>
            <ul style={{ paddingLeft: '20px', margin: 0, color: '#4A5568', fontSize: '14px', lineHeight: '1.8' }}>
              <li><strong>Role:</strong> <code>role=button[name="Submit"i]</code></li>
              <li><strong>Text:</strong> <code>text="Submit"</code></li>
              <li><strong>Label:</strong> <code>internal:label="Password"i</code></li>
              <li><strong>Placeholder:</strong> <code>internal:attr=[placeholder="Email"i]</code></li>
              <li><strong>Alt Text:</strong> <code>internal:attr=[alt="Logo"i]</code></li>
              <li><strong>Title:</strong> <code>internal:attr=[title="Close"i]</code></li>
              <li><strong>Test ID:</strong> <code>data-testid=submit-btn</code></li>
              <li><strong>CSS:</strong> <code>.btn-primary</code></li>
              <li><strong>XPath:</strong> <code>//button[@id='submit']</code></li>
            </ul>
          </section>

        </div>
      </div>
    </>
  );
}
