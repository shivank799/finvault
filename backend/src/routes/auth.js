const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');

const { query, withTransaction } = require('../config/database');
const { cache } = require('../config/redis');
const logger  = require('../utils/logger');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── Validation rules ──────────────────────────────────────────────
const registerRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 chars'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be 8+ chars with uppercase, lowercase, and number'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  next();
}

function signTokens(userId) {
  const accessToken = jwt.sign(
    { sub: userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh', jti: uuidv4() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post('/register', registerRules, validate, async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, currency, created_at',
      [name, email, passwordHash]
    );
    const user = rows[0];

    // Seed default budgets
    const defaultBudgets = [
      ['Food', 12000], ['Transport', 5000], ['Shopping', 8000],
      ['Bills', 6000], ['Entertainment', 4000], ['Health', 5000],
    ];
    const now = new Date();
    for (const [category, amount] of defaultBudgets) {
      await client.query(
        'INSERT INTO budgets (user_id, category, amount, month, year) VALUES ($1,$2,$3,$4,$5)',
        [user.id, category, amount, now.getMonth() + 1, now.getFullYear()]
      );
    }
    return user;
  });

  const { accessToken, refreshToken } = signTokens(result.id);

  // Store refresh token hash
  const rtHash = await bcrypt.hash(refreshToken, 8);
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
    [result.id, rtHash, expires]
  );

  logger.info(`User registered: ${email}`);
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: { user: result, accessToken, refreshToken },
  });
});

// POST /api/auth/login
router.post('/login', loginRules, validate, async (req, res) => {
  const { email, password } = req.body;

  // Brute-force protection via Redis
  const lockKey = `lock:${email}`;
  const attempts = await cache.get(lockKey) || 0;
  if (attempts >= 5) {
    return res.status(429).json({ success: false, message: 'Account temporarily locked. Try again in 15 minutes.' });
  }

  const { rows } = await query(
    'SELECT id, name, email, password_hash, currency, is_active FROM users WHERE email = $1',
    [email]
  );

  if (!rows.length || !await bcrypt.compare(password, rows[0].password_hash)) {
    await cache.set(lockKey, attempts + 1, 900); // 15 min window
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const user = rows[0];
  if (!user.is_active) {
    return res.status(403).json({ success: false, message: 'Account deactivated' });
  }

  await cache.del(lockKey); // clear on success

  const { accessToken, refreshToken } = signTokens(user.id);
  const rtHash = await bcrypt.hash(refreshToken, 8);
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
    [user.id, rtHash, expires]
  );

  // Cache user session in Redis
  const { password_hash: _, ...safeUser } = user;
  await cache.set(`user:${user.id}`, safeUser, 900);

  logger.info(`User logged in: ${email}`);
  res.json({
    success: true,
    data: { user: safeUser, accessToken, refreshToken },
  });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  // Validate against DB
  const { rows } = await query(
    'SELECT * FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 10',
    [payload.sub]
  );

  let valid = false;
  for (const row of rows) {
    if (await bcrypt.compare(refreshToken, row.token_hash)) { valid = true; break; }
  }

  if (!valid) return res.status(401).json({ success: false, message: 'Refresh token revoked' });

  const { accessToken, refreshToken: newRefresh } = signTokens(payload.sub);
  const rtHash = await bcrypt.hash(newRefresh, 8);
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)', [payload.sub, rtHash, expires]);

  res.json({ success: true, data: { accessToken, refreshToken: newRefresh } });
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);
  await cache.del(`user:${req.user.id}`);
  logger.info(`User logged out: ${req.user.email}`);
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

module.exports = router;
