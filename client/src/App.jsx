import { useEffect, useState } from 'react';
import { api, getToken, setToken, setOnLoggedOut } from './api.js';
import AuthScreen from './auth/AuthScreen.jsx';

export default function App() {
  // Start logged in if a token survived from last time; the first /garden call checks it.
  const [loggedIn, setLoggedIn] = useState(() => Boolean(getToken()));
  const [garden, setGarden] = useState(null); // { timeScale, speeds, plants }
  const [error, setError] = useState('');

  // Let api.js send us back to the login screen when the server rejects the token.
  useEffect(() => {
    setOnLoggedOut(() => {
      setLoggedIn(false);
      setGarden(null);
    });
  }, []);

  // Load the garden whenever we become logged in.
  useEffect(() => {
    if (!loggedIn) return;
    setError('');
    api('/garden').then(setGarden).catch((err) => setError(err.message));
  }, [loggedIn]);

  function logOut() {
    setToken(null);
    setLoggedIn(false);
    setGarden(null);
  }

  if (!loggedIn) return <AuthScreen onLoggedIn={() => setLoggedIn(true)} />;

  const speed = garden?.speeds.find((s) => s.timeScale === garden.timeScale);
  return (
    <main className="card garden">
      <header>
        <h1>Your garden</h1>
        <button type="button" className="link" onClick={logOut}>Log out</button>
      </header>
      {error && <p className="error" role="alert">{error}</p>}
      {!garden && !error && <p className="muted">Loading…</p>}
      {garden && (
        <>
          <p className="muted">Clock: {speed ? speed.label : ''} ({garden.timeScale}x)</p>
          <ul className="plants">
            {garden.plants.map((plant) => (
              <li key={plant.id}>
                <span>
                  <strong>{plant.name}</strong> <em className="muted">{plant.botanicalName}</em>
                </span>
                <span className={`status ${plant.status}`}>{plant.health}% · {plant.status}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
