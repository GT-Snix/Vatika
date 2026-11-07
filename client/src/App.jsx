import { useCallback, useEffect, useState } from 'react';
import { getToken, setToken, setOnLoggedOut } from './api.js';
import useGarden from './useGarden.js';
import useSkyTime, { formatHour } from './scene/useSkyTime.js';
import AuthScreen from './auth/AuthScreen.jsx';
import Garden from './scene/Garden.jsx';
import Hud from './ui/Hud.jsx';
import Panel from './ui/Panel.jsx';
import ClockModal from './ui/ClockModal.jsx';

export default function App() {
  // Start logged in if a token survived from last time; the first /garden call checks it.
  const [loggedIn, setLoggedIn] = useState(() => Boolean(getToken()));
  const { garden, error, water, changeClock } = useGarden(loggedIn);
  // Time of day runs at the user's clock speed (1x until the garden has loaded).
  const sky = useSkyTime(garden ? garden.timeScale : 1);
  const [locked, setLocked] = useState(false); // mouse captured = walking around
  const [targetId, setTargetId] = useState(null); // plant in front of the player, if any
  const [inspectId, setInspectId] = useState(null); // plant whose panel is open
  const [clockOpen, setClockOpen] = useState(false);
  const paused = inspectId !== null || clockOpen; // a panel or modal is open

  // Let api.js send us back to the login screen when the server rejects the token.
  useEffect(() => setOnLoggedOut(() => setLoggedIn(false)), []);

  // E opens the panel for the targeted plant and frees the mouse so it can click the panel.
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'KeyE' || !locked || paused || targetId === null) return;
      setInspectId(targetId);
      document.exitPointerLock();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, paused, targetId]);

  // Stable functions, so the panel's and modal's key listeners aren't re-added every render.
  const closePanel = useCallback(() => setInspectId(null), []);
  const closeClock = useCallback(() => setClockOpen(false), []);

  function logOut() {
    setToken(null);
    setLoggedIn(false);
  }

  if (!loggedIn) return <AuthScreen onLoggedIn={() => setLoggedIn(true)} />;
  if (!garden) {
    return (
      <main className="glass card">
        {error ? <p className="error" role="alert">{error}</p> : <p className="muted">Loading your garden…</p>}
        <button type="button" className="ghost" onClick={logOut}>Log out</button>
      </main>
    );
  }

  const byId = (id) => garden.plants.find((p) => p.id === id);
  const speed = garden.speeds.find((s) => s.timeScale === garden.timeScale);
  return (
    <>
      <Garden plants={garden.plants} sky={sky} locked={locked} paused={paused} targetId={targetId}
        onLock={() => setLocked(true)} onUnlock={() => setLocked(false)} onTarget={setTargetId} />
      <Hud speedLabel={speed ? speed.label : ''} timeScale={garden.timeScale} time={formatHour(sky.hour)} locked={locked && !paused}
        targetName={byId(targetId)?.name} onOpenClock={() => setClockOpen(true)} onLogOut={logOut} />
      {inspectId !== null && byId(inspectId) && <Panel plant={byId(inspectId)} onWater={water} onClose={closePanel} />}
      {clockOpen && (
        <ClockModal speeds={garden.speeds} current={garden.timeScale} onConfirm={changeClock} onClose={closeClock} />
      )}
    </>
  );
}
