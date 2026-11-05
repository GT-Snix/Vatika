import jwt from 'jsonwebtoken';

// Put this in front of any route that needs a logged-in user.
// On success it sets req.userId; otherwise it answers 401 and the route never runs.
export default function requireAuth(req, res, next) {
  // The header looks like: "Authorization: Bearer eyJhbGciOi..."
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    // verify() checks the signature AND the expiry date, and throws if either fails.
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
