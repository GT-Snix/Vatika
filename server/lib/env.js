// Loads environment variables for the server and the Prisma CLI.
// .env.local holds the Neon values written by `neon env pull` (DATABASE_URL,
// DATABASE_URL_UNPOOLED, NEON_*). .env holds the rest (JWT_SECRET, PORT, ...).
// dotenv never overwrites a key that's already set, so .env.local wins over
// .env, and real environment variables (e.g. in production) win over both.
import path from 'node:path';
import dotenv from 'dotenv';

const serverDir = path.join(import.meta.dirname, '..');

dotenv.config({
  path: [path.join(serverDir, '.env.local'), path.join(serverDir, '.env')],
  quiet: true,
});
