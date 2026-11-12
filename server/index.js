// Local server: starts the Express app from app.js on PORT.
// (On Netlify, functions/api.js runs the same app instead.)
import app from './app.js';

// Fail fast: without a secret every login would crash, so refuse to start at all.
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Add it to server/.env (see .env.example).');
  process.exit(1);
}

const port = process.env.PORT || 4000;
// Express 5 passes startup errors (e.g. EADDRINUSE: port already taken) to this
// callback instead of throwing, so without this check the server would quit silently.
app.listen(port, (err) => {
  if (err) {
    console.error(`Could not start on port ${port}:`, err.message);
    process.exit(1);
  }
  console.log(`Vatika API on http://localhost:${port}`);
});
