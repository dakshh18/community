import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { adminLogin } from '@/api/endpoints';
import { useAuthStore } from '@/auth/store';
import { Field, Input } from '@/components/ui';
import { errMsg } from '@/lib/errors';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await adminLogin(email.trim(), password);
      setAuth(res.token, res.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errMsg(err, 'Login failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="card pad login-card">
        <div className="logo">
          <div className="mark">🟣</div>
          <h2>Samaj Connect</h2>
          <p>Admin panel — sign in to continue</p>
        </div>
        <form onSubmit={submit}>
          {error && <div className="page-error">{error}</div>}
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="username"
              required
              autoFocus
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </Field>
          <button className="btn primary block" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p style={{ color: 'var(--text-faint)', fontSize: 12.5, marginTop: 16, textAlign: 'center' }}>
          Only Admin / Committee accounts with a password can sign in.
        </p>
      </div>
    </div>
  );
}
