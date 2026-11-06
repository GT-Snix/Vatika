import { useState } from 'react';
import { api, setToken } from '../api.js';

// Shown at sign-up only. The server (server/lib/clock.js) is the authority on which
// speeds are allowed; this copy just lets the form render before anyone is logged in.
const SPEEDS = [
  { timeScale: 1, label: 'Real time (1x)' },
  { timeScale: 4, label: 'Relaxed (4x)' },
  { timeScale: 60, label: 'Quick (60x)' },
  { timeScale: 600, label: 'Demo (600x)' },
];

// Login and register in one form; `mode` decides which fields show and which endpoint is called.
export default function AuthScreen({ onLoggedIn }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [timeScale, setTimeScale] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault(); // stop the browser's default full-page form submit
    setError('');
    setBusy(true);
    try {
      // Register only creates the account; log in afterwards to get the token either way.
      if (mode === 'register') {
        await api('/auth/register', { method: 'POST', body: { email, password, timeScale } });
      }
      const { token } = await api('/auth/login', { method: 'POST', body: { email, password } });
      setToken(token);
      onLoggedIn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const isRegister = mode === 'register';
  return (
    <form className="card auth" onSubmit={handleSubmit}>
      <h1>Vatika</h1>
      <p className="muted">{isRegister ? 'Plant your herbal garden' : 'Welcome back to your garden'}</p>

      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          minLength={isRegister ? 8 : undefined} required />
      </label>

      {isRegister && (
        <fieldset>
          <legend>Set your garden's clock</legend>
          {SPEEDS.map((speed) => (
            <label key={speed.timeScale} className="choice">
              <input type="radio" name="speed" checked={timeScale === speed.timeScale}
                onChange={() => setTimeScale(speed.timeScale)} />
              {speed.label}
            </label>
          ))}
        </fieldset>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create garden' : 'Log in'}</button>
      <button type="button" className="link" onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}>
        {isRegister ? 'Already have a garden? Log in' : 'New here? Create a garden'}
      </button>
    </form>
  );
}
