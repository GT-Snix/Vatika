// Flat overlay on top of the 3D view: which clock speed is running, and a way out.
export default function Hud({ speedLabel, timeScale, onLogOut }) {
  return (
    <div className="hud">
      <span>Clock: {speedLabel} ({timeScale}x)</span>
      <button type="button" onClick={onLogOut}>Log out</button>
    </div>
  );
}
