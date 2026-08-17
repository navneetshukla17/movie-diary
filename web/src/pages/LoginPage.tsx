import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <img src="/moviediary.png" alt="Movie Diary" style={{ maxWidth: '240px', width: '100%', objectFit: 'contain' }} />
        </div>
        <h1>Sign in to your tracker</h1>
        {error && <div className="notice error">{error}</div>}
        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <label htmlFor="login-password">Password</label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', marginBottom: '10px' }}>
          <input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box', margin: 0 }} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <button className="primary" disabled={busy}>Sign in</button>
        <p className="alt">No account? <Link to="/signup" style={{ whiteSpace: 'nowrap' }}>Sign up</Link></p>
      </form>
    </div>
  );
}
