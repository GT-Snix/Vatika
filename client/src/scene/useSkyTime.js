import { useCallback, useEffect, useRef, useState } from 'react';

const MS_PER_HOUR = 3600000;

// Game hour (0-24) at real moment `ms`, from an anchor: a known (real moment, game hour,
// speed) triple. Storing an anchor instead of a ticking counter means no drift, and the
// 3D scene can ask for the exact hour on every frame.
function hourAt(anchor, ms) {
  return (anchor.hour + ((ms - anchor.ms) / MS_PER_HOUR) * anchor.timeScale) % 24;
}

function localHourNow() {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

// Time of day in the garden. Starts at the user's local time and runs `timeScale`
// game hours per real hour (600x: a whole day in 2.4 real minutes; 1x: real time).
// Returns getHour() for per-frame use, `hour` (refreshed twice a second) for the HUD,
// and setHour() for the ?debug slider.
export default function useSkyTime(timeScale) {
  const anchor = useRef(null);
  if (anchor.current === null) anchor.current = { ms: Date.now(), hour: localHourNow(), timeScale };

  const getHour = useCallback(() => hourAt(anchor.current, Date.now()), []);

  // Speed changed: re-anchor at the current hour, with the new speed from now on.
  // The hour is the same just before and just after, so the sun doesn't jump.
  useEffect(() => {
    if (anchor.current.timeScale === timeScale) return;
    const now = Date.now();
    anchor.current = { ms: now, hour: hourAt(anchor.current, now), timeScale };
  }, [timeScale]);

  const [hour, setHourState] = useState(getHour);
  useEffect(() => {
    const id = setInterval(() => setHourState(getHour()), 500);
    return () => clearInterval(id);
  }, [getHour]);

  const setHour = useCallback((h) => {
    anchor.current = { ms: Date.now(), hour: h, timeScale: anchor.current.timeScale };
    setHourState(h);
  }, []);

  return { getHour, hour, setHour };
}

// 14.5 -> "14:30"
export function formatHour(hour) {
  const totalMinutes = Math.floor(hour * 60) % (24 * 60);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
}
