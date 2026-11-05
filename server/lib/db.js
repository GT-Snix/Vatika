const { PrismaClient } = require('@prisma/client');

// One shared client for the whole app. Every PrismaClient opens its own
// connection pool, so creating one per route file would waste DB connections.
module.exports = new PrismaClient();
