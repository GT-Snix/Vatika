// Flat overlay on top of the 3D view: clock speed, clock settings, log out, and while
// walking, a crosshair plus the "Press E" hint for the plant in front of you.
// While the pointer is locked the mouse can't reach these buttons, so they can never
// steal a click from the game; they become usable once the pointer is released.
export default function Hud({ speedLabel, timeScale, time, locked, targetName, onOpenClock, onLogOut }) {
  return (
    <>
      <div className="hud">
        <div className="hud-group">
          <span className="glass pill">Clock: {speedLabel} ({timeScale}x)</span>
          <span className="glass pill" aria-label="Time of day in the garden">{time}</span>
          <button type="button" className="ghost" onClick={onOpenClock}>Clock settings</button>
        </div>
        <button type="button" className="ghost" onClick={onLogOut}>Log out</button>
      </div>

      {locked && (
        <div className="aim" aria-hidden="true">
          <div className={targetName ? 'crosshair on' : 'crosshair'} />
          {targetName && <p className="glass hint">{targetName} · <kbd>E</kbd> inspect · <kbd>F</kbd> water</p>}
        </div>
      )}
    </>
  );
}
