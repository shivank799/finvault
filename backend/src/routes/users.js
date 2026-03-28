const express = require('express');
const bcrypt  = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { cache } = require('../config/redis');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/profile', async (req, res) => {
  const { rows } = await query(
    'SELECT id,name,email,currency,avatar_url,created_at FROM users WHERE id=$1',
    [req.user.id]
  );
  res.json({ success: true, data: { user: rows[0] } });
});

router.patch('/profile', [
  body('name').optional().trim().isLength({ min:2, max:100 }),
  body('currency').optional().isLength({ min:3, max:3 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success:false, errors: errors.array() });
  const { name, currency } = req.body;
  const { rows } = await query(
    'UPDATE users SET name=COALESCE($1,name), currency=COALESCE($2,currency), updated_at=NOW() WHERE id=$3 RETURNING id,name,email,currency',
    [name, currency, req.user.id]
  );
  await cache.del(`user:${req.user.id}`);
  res.json({ success:true, data: { user: rows[0] } });
});

router.patch('/password', [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min:8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success:false, errors: errors.array() });
  const { rows } = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  const valid = await bcrypt.compare(req.body.current_password, rows[0].password_hash);
  if (!valid) return res.status(401).json({ success:false, message:'Current password incorrect' });
  const hash = await bcrypt.hash(req.body.new_password, 12);
  await query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.id]);
  res.json({ success:true, message:'Password updated successfully' });
});

module.exports = router;
