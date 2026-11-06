import { Router } from 'express';
import prisma from '../lib/db.js';
import requireAuth from '../middleware/auth.js';
import { health } from '../lib/health.js';

const router = Router();

// Every garden route needs a logged-in user, so apply the middleware once for the whole router.
router.use(requireAuth);

// Number('') is 0, so `|| 1` also covers a missing or empty TIME_SCALE.
const TIME_SCALE = Number(process.env.TIME_SCALE) || 1;

// Turn one UserPlant row (with its Plant joined) into what the client gets.
// `id` is the Plant id, which is what POST /garden/:plantId/water expects.
function toGardenPlant(row, now) {
  return {
    ...row.plant,
    lastWateredAt: row.lastWateredAt.toISOString(),
    ...health(row.lastWateredAt, row.plant.waterIntervalHours, now, TIME_SCALE),
  };
}

// GET /garden -> the user's plants with health
router.get('/', async (req, res) => {
  // 1. Read input: the user comes from the verified token, never from the request body.
  const userId = req.userId;
  // 2. Check input: already done by requireAuth.
  // 3. Talk to the DB. `include` joins the Plant row (alternative: a second query plus manual matching).
  const rows = await prisma.userPlant.findMany({
    where: { userId },
    include: { plant: true },
    orderBy: { plantId: 'asc' },
  });
  // 4. Send response. One `now` so every plant is measured at the same instant.
  const now = new Date();
  res.json(rows.map((row) => toGardenPlant(row, now)));
});

// POST /garden/:plantId/water -> the watered plant with fresh health
router.post('/:plantId/water', async (req, res) => {
  // 1. Read input. No time and no userId are read from the client.
  const userId = req.userId;
  const plantId = Number(req.params.plantId);

  // 2. Check input: a real number, and this user actually owns that plant.
  if (!Number.isInteger(plantId)) return res.status(400).json({ error: 'Invalid plant id' });
  const where = { userId_plantId: { userId, plantId } }; // the @@unique([userId, plantId]) key
  const owned = await prisma.userPlant.findUnique({ where });
  if (!owned) return res.status(404).json({ error: 'Plant not in your garden' });

  // 3. Talk to the DB. The SERVER picks the time.
  // (Alternative: update() alone, but it throws on a missing row, needing try/catch for the 404.)
  const row = await prisma.userPlant.update({
    where,
    data: { lastWateredAt: new Date() },
    include: { plant: true },
  });

  // 4. Send response.
  res.json(toGardenPlant(row, new Date()));
});

export default router;
