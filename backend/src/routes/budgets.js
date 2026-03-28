// ─── budgets.js ──────────────────────────────────────────────────────────────
const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { cache } = require('../config/redis');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const now = new Date();
  const { rows } = await query(
    'SELECT * FROM budgets WHERE user_id=$1 AND month=$2 AND year=$3 ORDER BY category',
    [req.user.id, now.getMonth()+1, now.getFullYear()]
  );
  res.json({ success: true, data: { budgets: rows } });
});

router.put('/:category', [
  body('amount').isFloat({ min: 1 }),
  body('alert_at').optional().isInt({ min: 1, max: 100 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

  const now   = new Date();
  const month = now.getMonth()+1;
  const year  = now.getFullYear();
  const { amount, alert_at } = req.body;

  const { rows } = await query(`
    INSERT INTO budgets (user_id, category, amount, month, year, alert_at)
    VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (user_id, category, month, year)
    DO UPDATE SET amount=$3, alert_at=$6, updated_at=NOW()
    RETURNING *
  `, [req.user.id, req.params.category, amount, month, year, alert_at || 80]);

  await cache.delPattern(`dashboard:${req.user.id}:*`);
  res.json({ success: true, data: { budget: rows[0] } });
});

module.exports = router;
