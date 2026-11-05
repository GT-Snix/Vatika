// Public encyclopedia routes: anyone can read plant info, no login needed.
const { Router } = require('express');
const prisma = require('../lib/db');

const router = Router();

// GET /plants -> every plant in the encyclopedia
router.get('/', async (req, res) => {
  // 1. Read input: none.
  // 2. Check input: nothing to check.
  // 3. Talk to the DB.
  const plants = await prisma.plant.findMany({ orderBy: { id: 'asc' } });
  // 4. Send response.
  res.json(plants);
});

// GET /plants/:id -> one plant
router.get('/:id', async (req, res) => {
  // 1. Read input: URL params are always strings, so convert to a number.
  const id = Number(req.params.id);

  // 2. Check input: "abc" becomes NaN, which would make Prisma throw a 500.
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid plant id' });

  // 3. Talk to the DB.
  const plant = await prisma.plant.findUnique({ where: { id } });

  // 4. Send response.
  if (!plant) return res.status(404).json({ error: 'Plant not found' });
  res.json(plant);
});

module.exports = router;
