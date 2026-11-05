// Settings for the Prisma CLI (migrate, seed, studio, generate).
// The running server never reads this file; it uses lib/db.js.
import 'dotenv/config'; // load .env so env('DATABASE_URL') below has a value
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // `npm run seed` (prisma db seed) runs this command.
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
