import { useEffect, useRef, useState } from 'react';
import { secondsLeft } from '../useGarden.js';

// 100 -> "1m 40s"; 3725 -> "1h 2m"; 42 -> "42s".
function formatDuration(totalSeconds) {
  const s = Math.ceil(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// Which countdown matters right now, worked out from the server's numbers and the time since.
function countdownText(plant, now) {
  const thirsty = secondsLeft(plant, 'secondsUntilThirsty', now);
  if (thirsty > 0) return `thirsty in ${formatDuration(thirsty)}`;
  const wilting = secondsLeft(plant, 'secondsUntilWilting', now);
  if (wilting > 0) return `wilting in ${formatDuration(wilting)}`;
  return 'needs water now';
}

// Inspect panel for one plant. Keyboard: focus starts on Water, Esc closes.
export default function Panel({ plant, onWater, onClose }) {
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const waterButton = useRef(null);

  // Tick once a second so the countdown moves between server re-syncs.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    waterButton.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleWater() {
    setBusy(true);
    setError('');
    try {
      await onWater(plant.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="glass panel" role="dialog" aria-modal="true" aria-labelledby="panel-title">
      <header>
        <h2 id="panel-title">{plant.name}</h2>
        <p className="botanical">{plant.botanicalName}</p>
      </header>
      <div className="row">
        <span className={`chip ${plant.status}`}>{plant.status}</span>
        <span className="countdown" aria-live="polite">{countdownText(plant, now)}</span>
      </div>
      <div className="bar" role="progressbar" aria-label="Health" aria-valuemin={0} aria-valuemax={100} aria-valuenow={plant.health}>
        <div className={`fill ${plant.status}`} style={{ width: `${plant.health}%` }} />
      </div>
      <dl>
        <dt>Habitat</dt><dd>{plant.habitat}</dd>
        <dt>Parts used</dt><dd>{plant.partsUsed}</dd>
        <dt>Uses</dt><dd>{plant.uses}</dd>
      </dl>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button ref={waterButton} type="button" onClick={handleWater} disabled={busy}>{busy ? 'Watering…' : 'Water'}</button>
        <button type="button" className="ghost" onClick={onClose}>Close</button>
      </div>
      <p className="footnote">Educational use only, not medical advice.</p>
    </aside>
  );
}
