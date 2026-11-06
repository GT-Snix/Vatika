import { useEffect, useState } from 'react';
import { api, getToken, setToken, setOnLoggedOut } from './api.js';
import AuthScreen from './auth/AuthScreen.jsx';
import Garden from './scene/Garden.jsx';
import Hud from './ui/Hud.jsx';

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

  if (!garden) {
    return (
      <main className="card">
        {error ? <p className="error" role="alert">{error}</p> : <p className="muted">Loading your garden…</p>}
        <button type="button" className="link" onClick={logOut}>Log out</button>
      </main>
    );
  }

  const speed = garden.speeds.find((s) => s.timeScale === garden.timeScale);
  return (
    <>
      <Garden plants={garden.plants} />
      <Hud speedLabel={speed ? speed.label : ''} timeScale={garden.timeScale} onLogOut={logOut} />
    </>
  );
}
