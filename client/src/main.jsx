import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
// Fonts are bundled from node_modules, not loaded from Google, so the demo works offline.
// Only the Latin letters and the weights we use, to keep the download small.
import '@fontsource/fraunces/latin-600.css'; // display serif, headings
import '@fontsource/inter/latin-400.css'; // body
import '@fontsource/inter/latin-600.css'; // body, bold
import './styles.css';

// StrictMode runs extra checks in development only (it double-runs effects to expose bugs).
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
