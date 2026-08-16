import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'ALONE' | 'US'>('ALONE');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signup(email, password, mode);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>my movies</h1>
        <p>Create your tracker</p>
        {error && <div className="notice error">{error}</div>}
        <label htmlFor="signup-email">Email</label>
        <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <label htmlFor="signup-password">Password (min 8 characters)</label>
        <input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <label htmlFor="signup-mode">What will this list be for?</label>
        <select id="signup-mode" value={mode} onChange={(e) => setMode(e.target.value as 'ALONE' | 'US')}>
          <option value="ALONE">Alone — I watched it solo</option>
          <option value="US">US — we watched it together</option>
        </select>
        <button className="primary" disabled={busy}>Sign up</button>
        <p className="alt">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
