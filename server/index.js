// Must be the first import: it fills process.env from .env before
// lib/db.js (imported via the routes) reads DATABASE_URL.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import plantsRouter from './routes/plants.js';
import authRouter from './routes/auth.js';
import gardenRouter from './routes/garden.js';

// Fail fast: without a secret every login would crash, so refuse to start at all.
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Add it to server/.env (see .env.example).');
  process.exit(1);
}

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

app.use('/plants', plantsRouter);
app.use('/auth', authRouter);
app.use('/garden', gardenRouter);

// Express 5 forwards rejected promises from async handlers here,
// so routes don't need their own try/catch.
app.use((err, req, res, next) => {
  // The real error goes to the server log only; the client gets a generic message.
  console.error(err);
  // err.status is set by Express itself for client mistakes (e.g. malformed JSON -> 400).
  res.status(err.status || 500).json({ error: err.status ? 'Bad request' : 'Internal server error' });
});

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
