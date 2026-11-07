import { useEffect, useRef } from 'react';

const TABBABLE = 'button:not([disabled]), input:not([disabled]), select, textarea, [href], [tabindex]:not([tabindex="-1"])';

// Shared keyboard behaviour for the panel and the clock modal. Put the returned ref on the
// dialog container (which needs tabIndex={-1}).
// - On open, focus the CONTAINER, not a button: Space and Enter then do nothing until the
//   player presses Tab, so a Space meant as a jump can't water a plant by accident.
//   (Alternative: focus Close first. Safer than Water, but Space would still close the panel.)
// - Esc closes.
// - Tab and Shift+Tab wrap around inside the dialog instead of escaping to the page behind.
export default function useDialog(onClose) {
  const box = useRef(null);

  // Focus once, on open: re-focusing on every render would pull focus off a button mid-use.
  useEffect(() => box.current?.focus(), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose();
      if (e.key !== 'Tab' || !box.current) return;
      const items = [...box.current.querySelectorAll(TABBABLE)];
      if (items.length === 0) return e.preventDefault();
      const first = items[0];
      const last = items[items.length - 1];
      // Entering a radio group lands on its CHECKED radio, as the browser's own Tab does.
      const entry = (first.type === 'radio' && box.current.querySelector(`input[name="${first.name}"]:checked`)) || first;
      const here = document.activeElement;
      // A radio group is ONE Tab stop, so any radio in the first group counts as "first".
      const atFirst = here === first || (first.type === 'radio' && here?.name === first.name);
      const outside = !box.current.contains(here) || here === box.current;
      if (e.shiftKey && (atFirst || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (here === last || outside)) {
        e.preventDefault();
        entry.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return box;
}
