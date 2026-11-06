import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/db.js';
import requireAuth from '../middleware/auth.js';

const router = Router();

// Trim and lowercase so " A@b.c" and "a@b.c" are the same account.
// Non-strings become '' so the checks below reject them.
function cleanEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

// POST /auth/register -> create a user plus their starting garden
router.post('/register', async (req, res) => {
  // 1. Read input. `|| {}` so a request with no body doesn't crash here.
  const { password } = req.body || {};
  const email = cleanEmail(req.body?.email);

  // 2. Check input. typeof guards against e.g. { "password": 12345678 }.
  if (!email.includes('@')) {
    return res.status(400).json({ error: 'Email must contain @' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken) return res.status(409).json({ error: 'Email already registered' });

  // 3. Talk to the DB. The 10 is bcrypt's cost: higher = slower to guess.
  const passwordHash = await bcrypt.hash(password, 10);
  // All-or-nothing: if creating the garden fails, the user row is rolled back too.
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { email, passwordHash } });
    const plants = await tx.plant.findMany();
    const now = new Date();
    await tx.userPlant.createMany({
      data: plants.map((p) => ({ userId: created.id, plantId: p.id, lastWateredAt: now })),
    });
    return created;
  });

  // 4. Send response. Pick fields by hand so passwordHash can never leak.
  res.status(201).json({ id: user.id, email: user.email });
});

// POST /auth/login -> { token }
router.post('/login', async (req, res) => {
  // 1. Read input, cleaning the email the same way register did.
  const { password } = req.body || {};
  const email = cleanEmail(req.body?.email);

  // 2. Check input: bcrypt.compare throws on non-strings.
  if (!email || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // 3. Talk to the DB, then compare the password against the stored hash.
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));

  // 4. Send response. One message for both failures, so nobody can probe which emails exist.
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// GET /auth/me (protected) -> { id, email }
router.get('/me', requireAuth, async (req, res) => {
  // 1. Read input: the middleware put userId here after verifying the token.
  const id = req.userId;
  // 2. Check input: already done by requireAuth.
  // 3. Talk to the DB. `select` fetches only the safe fields.
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
  // 4. Send response. 404 covers a user deleted after their token was issued.
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

export default router;
