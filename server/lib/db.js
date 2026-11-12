import { PrismaPg } from '@prisma/adapter-pg';
// Prisma 7 generates the client into our project (see schema.prisma `output`).
// It's TypeScript; Node 22.18+ runs it directly by stripping the types.
import { PrismaClient } from '../generated/prisma/client.ts';

// The adapter is the piece that actually talks to Postgres, using the `pg` driver.
// DATABASE_URL is Neon's pooled (-pooler) connection, from .env.local.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// One shared client for the whole app. Every PrismaClient opens its own
// connection pool, so creating one per route file would waste DB connections.
const prisma = new PrismaClient({ adapter });

export default prisma;
