import { Router } from 'express';
import prisma from '../lib/db.js';
import requireAuth from '../middleware/auth.js';
import { health, minutesUntil } from '../lib/health.js';
import { SPEEDS, isValidSpeed } from '../lib/clock.js';

const router = Router();

// Every garden route needs a logged-in user, so apply the middleware once for the whole router.
router.use(requireAuth);

// Turn one UserPlant row (with its Plant joined) into what the client gets.
// `id` is the Plant id, which is what POST /garden/:plantId/water expects.
function toGardenPlant(row, now, timeScale) {
  const args = [row.lastWateredAt, row.plant.waterIntervalHours, now, timeScale];
  return {
    ...row.plant,
    lastWateredAt: row.lastWateredAt.toISOString(),
    ...health(...args),
    minutesUntilThirsty: minutesUntil('thirsty', ...args),
    minutesUntilWilting: minutesUntil('wilting', ...args),
  };
}

// The full garden response, shared by GET /garden and POST /garden/clock.
// One query: the user's speed plus their plants, each with its Plant joined.
async function loadGarden(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timeScale: true, plants: { include: { plant: true }, orderBy: { plantId: 'asc' } } },
  });
  if (!user) return null;
  const now = new Date(); // one `now` so every plant is measured at the same instant
  return {
    timeScale: user.timeScale,
    speeds: SPEEDS,
    plants: user.plants.map((row) => toGardenPlant(row, now, user.timeScale)),
  };
}

// GET /garden -> { timeScale, speeds, plants }
router.get('/', async (req, res) => {
  // 1. Read input: the user comes from the verified token, never from the request body.
  const userId = req.userId;
  // 2. Check input: already done by requireAuth.
  // 3. Talk to the DB.
  const garden = await loadGarden(userId);
  // 4. Send response. 404 covers a user deleted after their token was issued.
  if (!garden) return res.status(404).json({ error: 'User not found' });
  res.json(garden);
});

// POST /garden/clock { timeScale } -> the garden at its new speed, all timers reset
router.post('/clock', async (req, res) => {
  // 1. Read input.
  const userId = req.userId;
  const { timeScale } = req.body || {};

  // 2. Check input against the one allowed list.
  if (!isValidSpeed(timeScale)) {
    return res.status(400).json({ error: `timeScale must be one of ${SPEEDS.map((s) => s.timeScale).join(', ')}` });
  }

  // 3. Talk to the DB: new speed AND every plant freshly watered, all or nothing.
  // (Array form of $transaction: neither write needs the other's result.
  //  Alternative: the callback form used in register, needed only when one step uses another's output.)
  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { timeScale } }),
    prisma.userPlant.updateMany({ where: { userId }, data: { lastWateredAt: now } }),
  ]);

  // 4. Send response.
  res.json(await loadGarden(userId));
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

  // 3. Talk to the DB. The SERVER picks the time. Joining the user brings their clock speed.
  // (Alternative: update() alone, but it throws on a missing row, needing try/catch for the 404.)
  const row = await prisma.userPlant.update({
    where,
    data: { lastWateredAt: new Date() },
    include: { plant: true, user: { select: { timeScale: true } } },
  });

  // 4. Send response. Drop the joined user so only plant fields go out.
  const { user, ...plantRow } = row;
  res.json(toGardenPlant(plantRow, new Date(), user.timeScale));
});

export default router;
