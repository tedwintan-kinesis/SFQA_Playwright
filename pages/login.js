import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Invalid credentials');
        return;
      }

      router.push('/tests');
    } catch (err) {
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Login — Salesforce Reflect</title>
      </Head>
      
      <div className="login-container">
        <div className="login-card">
          <div className="login-logo">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="2" width="9" height="9" rx="1.5" fill="#1C3FAA"/>
              <rect x="13" y="13" width="9" height="9" rx="1.5" fill="#1C3FAA"/>
              <rect x="2" y="14" width="4" height="8" rx="1" fill="#78909C"/>
              <rect x="14" y="2" width="8" height="4" rx="1" fill="#78909C"/>
            </svg>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#718096', letterSpacing: '.09em' }}>SALESFORCE</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1C3FAA', lineHeight: 1.1 }}>Reflect</div>
            </div>
          </div>
          
          <h3 className="login-title">Sign in to your account</h3>
          
          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Email Address</label>
              <input 
                type="email" 
                required 
                placeholder="sfqas@abx.com" 
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label>Password</label>
              <input 
                type="password" 
                required 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      <style jsx global>{`
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #F8F9FA;
          padding: 20px;
        }
        .login-card {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 36px 32px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }
        .login-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: center;
          margin-bottom: 28px;
        }
        .login-title {
          font-size: 18px;
          font-weight: 700;
          color: #1A202C;
          text-align: center;
          margin-bottom: 24px;
        }
        .login-error {
          background: #FFF5F5;
          border: 1px solid #FED7D7;
          color: #C53030;
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 20px;
          text-align: center;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: #718096;
        }
        .form-group input {
          padding: 8px 11px;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        .form-group input:focus {
          border-color: #1C3FAA;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          font-size: 13.5px;
          font-weight: 600;
          border-radius: 6px;
          border: 1px solid transparent;
          transition: all 0.18s;
          cursor: pointer;
        }
        .btn-primary {
          background: #1C3FAA;
          color: #fff;
        }
        .btn-primary:hover:not(:disabled) {
          background: #153086;
        }
        .btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
