import { useEffect, useRef, useState } from 'react';

// Pick a new game-clock speed. The list comes from the server (GET /garden `speeds`),
// so this file never hardcodes which speeds exist. Keyboard: arrows pick, Enter confirms, Esc closes.
export default function ClockModal({ speeds, current, onConfirm, onClose }) {
  const [choice, setChoice] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const firstRadio = useRef(null);

  useEffect(() => {
    firstRadio.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
      <form className="glass modal" role="dialog" aria-modal="true" aria-labelledby="clock-title" onSubmit={handleSubmit}>
        <h2 id="clock-title">Garden clock</h2>
        <fieldset>
          <legend className="muted">How fast time runs in your garden</legend>
          {speeds.map((speed, i) => (
            <label key={speed.timeScale} className="choice">
              <input ref={i === 0 ? firstRadio : undefined} type="radio" name="speed"
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
