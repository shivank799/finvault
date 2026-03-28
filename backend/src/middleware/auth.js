const jwt    = require('jsonwebtoken');
const { query } = require('../config/database');
const { cache } = require('../config/redis');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ success: false, message: msg });
  }

  if (payload.type !== 'access') {
    return res.status(401).json({ success: false, message: 'Invalid token type' });
  }

  // Try Redis cache first
  let user = await cache.get(`user:${payload.sub}`);

  if (!user) {
    const { rows } = await query(
      'SELECT id, name, email, currency, is_active, created_at FROM users WHERE id = $1 AND is_active = true',
      [payload.sub]
    );
    if (!rows.length) return res.status(401).json({ success: false, message: 'User not found' });
    user = rows[0];
    await cache.set(`user:${payload.sub}`, user, 900);
  }

  req.user = user;
  next();
}

// Role-based (future use)
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
