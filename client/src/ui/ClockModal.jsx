import { useState } from 'react';
import useDialog from './useDialog.js';

// Pick a new game-clock speed. The list comes from the server (GET /garden `speeds`),
// so this file never hardcodes which speeds exist. Keyboard (see useDialog): focus starts on the
// modal itself; Tab reaches the speeds, then arrows pick, Enter confirms, Esc closes.
export default function ClockModal({ speeds, current, onConfirm, onClose }) {
  const [choice, setChoice] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const box = useDialog(onClose);

  async function handleSubmit(event) {
    event.preventDefault(); // a form, so Enter submits, but without reloading the page
    setBusy(true);
    setError('');
    try {
      await onConfirm(choice);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="backdrop">
      <form ref={box} tabIndex={-1} className="glass modal" role="dialog" aria-modal="true" aria-labelledby="clock-title" onSubmit={handleSubmit}>
        <h2 id="clock-title">Garden clock</h2>
        <fieldset>
          <legend className="muted">How fast time runs in your garden</legend>
          {speeds.map((speed) => (
            <label key={speed.timeScale} className="choice">
              <input type="radio" name="speed"
                checked={choice === speed.timeScale} onChange={() => setChoice(speed.timeScale)} />
              {speed.label} ({speed.timeScale}x)
            </label>
          ))}
        </fieldset>
        <p className="warning">Changing speed resets your plants' timers.</p>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          <button type="submit" disabled={busy || choice === current}>{busy ? 'Saving…' : 'Confirm'}</button>
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
