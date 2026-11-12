// Settings for the Prisma CLI (migrate, seed, studio, generate).
// The running server never reads this file; it uses lib/db.js.
// ES module syntax because package.json has "type": "module".
import './lib/env.js'; // load .env.local and .env so env() below has a value
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // `npm run seed` (prisma db seed) runs this command.
    seed: 'node prisma/seed.js',
  },
  datasource: {
    // Migrations need Neon's direct (unpooled) connection, not the -pooler one.
    // The running server uses the pooled DATABASE_URL (see lib/db.js).
    url: env('DATABASE_URL_UNPOOLED'),
  },
});
