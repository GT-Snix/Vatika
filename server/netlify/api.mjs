// Netlify Function: runs the Express app for every request to /api/*
// (the rewrite is in client/netlify.toml). Env vars come from the Netlify site:
// DATABASE_URL (Neon pooled) and JWT_SECRET.
import serverless from 'serverless-http';
import app from '../app.js';

if (!process.env.JWT_SECRET) {
  // Same rule as index.js: logins can't work without it, so fail loudly.
  throw new Error('JWT_SECRET is missing. Set it in the Netlify site environment variables.');
}

export const handler = serverless(app);
