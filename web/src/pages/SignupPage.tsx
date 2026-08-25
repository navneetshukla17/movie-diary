import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { type Mode } from '../api/client';
import { Eye, EyeOff } from 'lucide-react';

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<Mode>('ALONE');
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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <img src="/moviediary.png" alt="Movie Diary" style={{ maxWidth: '240px', width: '100%', objectFit: 'contain' }} />
        </div>
        <h1>Create your tracker</h1>
        {error && <div className="notice error">{error}</div>}
        <label htmlFor="signup-email">Email</label>
        <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <label htmlFor="signup-password">Password (min 8 characters)</label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', marginBottom: '10px' }}>
          <input id="signup-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box', margin: 0 }} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <label htmlFor="signup-mode">Starting profile</label>
        <select id="signup-mode" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
          <option value="ALONE">Person 1 (Solo)</option>
          <option value="PARTNER">Person 2 (Partner Solo)</option>
          <option value="US">US (Shared)</option>
        </select>
        <button className="primary" disabled={busy}>Sign up</button>
        <p className="alt">Already have an account? <Link to="/login" style={{ whiteSpace: 'nowrap' }}>Sign in</Link></p>
      </form>
    </div>
  );
}
