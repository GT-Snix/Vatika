import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

const RESYNC_MS = 15000; // the server is the source of truth: re-fetch this often regardless

// Stamp each plant with when its countdowns were true, so the UI can tick them down locally.
function stamp(garden) {
  const now = Date.now();
  return { ...garden, plants: garden.plants.map((p) => ({ ...p, syncedAt: now })) };
}

// Seconds left on one of a plant's countdowns right now (null = already reached).
export function secondsLeft(plant, field, now = Date.now()) {
  const s = plant[field];
  return s === null ? null : Math.max(0, s - (now - plant.syncedAt) / 1000);
}

// All garden data and actions in one place. A plain custom hook (useState inside),
// not a state library: App calls it once and passes what's needed down as props.
export default function useGarden(enabled) {
  const [garden, setGarden] = useState(null); // { timeScale, speeds, plants }
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setGarden(stamp(await api('/garden')));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Load on login, then re-sync every 15 s while logged in.
  useEffect(() => {
    if (!enabled) {
      setGarden(null);
      return;
    }
    refresh();
    const id = setInterval(refresh, RESYNC_MS);
    return () => clearInterval(id);
  }, [enabled, refresh]);

  // The moment the soonest countdown reaches zero, ask the server for the new status
  // (+300 ms so the server's clock is safely past the change too).
  useEffect(() => {
    if (!garden) return;
    const left = garden.plants
      .flatMap((p) => [secondsLeft(p, 'secondsUntilThirsty'), secondsLeft(p, 'secondsUntilWilting')])
      .filter((s) => s !== null);
    if (left.length === 0) return;
    const id = setTimeout(refresh, Math.min(...left) * 1000 + 300);
    return () => clearTimeout(id);
  }, [garden, refresh]);

  async function water(plantId) {
    const updated = await api(`/garden/${plantId}/water`, { method: 'POST' });
    // Show the new state straight away, then re-sync everything from the server.
    setGarden((g) => ({ ...g, plants: g.plants.map((p) => (p.id === plantId ? { ...updated, syncedAt: Date.now() } : p)) }));
    refresh();
  }

  async function changeClock(timeScale) {
    // The response IS the fresh garden (all timers reset), so no extra fetch is needed.
    setGarden(stamp(await api('/garden/clock', { method: 'POST', body: { timeScale } })));
  }

  return { garden, error, water, changeClock };
}
