import Link from 'next/link';
import { useRouter } from 'next/router';

const NAV = [
  {
    tab: 'tests',
    href: '/tests',
    label: 'Tests',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
  {
    tab: 'suites',
    href: '/suites',
    label: 'Suites',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    tab: 'runs',
    href: '/runs',
    label: 'Runs',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
      </svg>
    ),
  },
  {
    tab: 'globals',
    href: '/globals',
    label: 'Globals',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  },
  {
    tab: 'readme',
    href: '/readme',
    label: 'Readme',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
  },
  {
    tab: 'settings',
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    ),
  },
];

export default function Layout({ children }) {
  const router = useRouter();
  const activeTab = NAV.find(n => router.pathname.startsWith(n.href))?.tab || 'tests';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── Header ── */}
      <header style={{
        height: 56, background: '#fff', borderBottom: '1px solid #E2E8F0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 20px', flexShrink: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="9" height="9" rx="1.5" fill="#1C3FAA"/>
            <rect x="13" y="13" width="9" height="9" rx="1.5" fill="#1C3FAA"/>
            <rect x="2" y="14" width="4" height="8" rx="1" fill="#78909C"/>
            <rect x="14" y="2" width="8" height="4" rx="1" fill="#78909C"/>
          </svg>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#718096', letterSpacing: '.09em' }}>SALESFORCE</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1C3FAA', lineHeight: 1.1 }}>Reflect</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Hardcoded project selector — no function */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 12px', border: '1px solid #E2E8F0', borderRadius: 6,
            fontSize: 13.5, fontWeight: 500,
          }}>
            <span style={{ width: 8, height: 8, background: '#10B981', borderRadius: '50%', display: 'inline-block' }}/>
            Projects
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#718096" strokeWidth="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <button style={{
            background: 'none', border: 'none', color: '#718096',
            padding: 6, borderRadius: 6, display: 'flex',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Body: Sidebar + Content ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside style={{
          width: 72, background: '#F8F9FA', borderRight: '1px solid #E2E8F0',
          padding: '14px 0', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 6, flexShrink: 0,
        }}>
          {NAV.map(({ tab, href, label, icon }) => {
            const isActive = activeTab === tab;
            return (
              <Link href={href} key={tab}>
                <div style={{
                  width: isActive ? 60 : 62, height: 60,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 4,
                  borderRadius: isActive ? '0 8px 8px 0' : 8,
                  marginLeft: isActive ? 2 : 0,
                  borderLeft: isActive ? '3px solid #1C3FAA' : '3px solid transparent',
                  background: isActive ? 'rgba(28,63,170,.08)' : 'transparent',
                  color: isActive ? '#1C3FAA' : '#718096',
                  cursor: 'pointer', transition: 'all .15s',
                }}>
                  <div style={{ width: 22, height: 22 }}>{icon}</div>
                  <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500 }}>{label}</span>
                </div>
              </Link>
            );
          })}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
