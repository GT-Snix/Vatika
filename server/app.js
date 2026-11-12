// The Express app, without starting it. Two entry points use it:
//   index.js                   -> local server (app.listen on PORT)
//   netlify/api.mjs            -> Netlify Function (bundled to netlify-dist/) behind https://<site>/api/*
// Must be the first import: it fills process.env from .env.local and .env
// before lib/db.js (imported via the routes) reads DATABASE_URL.
// On Netlify those files don't exist; the site's environment variables are used.
import './lib/env.js';
import express from 'express';
import cors from 'cors';
import { redact } from 'keyblob';

import plantsRouter from './routes/plants.js';
import authRouter from './routes/auth.js';
import gardenRouter from './routes/garden.js';

const app = express();

// Locally the Vite dev server (another origin) calls us, so CORS is needed.
// On Netlify the page and the API share one origin, so CORS never comes into play.
app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

// On Netlify, /api/* is rewritten to this function. Strip that prefix (and the
// function's own path, if it is called directly) so routes stay /plants, /auth, /garden.
app.use((req, res, next) => {
  req.url = req.url.replace(/^\/(?:\.netlify\/functions\/api|api)(?=\/|$|\?)/, '') || '/';
  next();
});

app.use('/plants', plantsRouter);
app.use('/auth', authRouter);
app.use('/garden', gardenRouter);

// Express 5 forwards rejected promises from async handlers here,
// so routes don't need their own try/catch.
app.use((err, req, res, next) => {
  // The real error goes to the server log only; the client gets a generic message.
  // redact() masks passwords, tokens and connection-string credentials before logging.
  console.error(redact(err));
  // err.status is set by Express itself for client mistakes (e.g. malformed JSON -> 400).
  res.status(err.status || 500).json({ error: err.status ? 'Bad request' : 'Internal server error' });
});

export default app;
