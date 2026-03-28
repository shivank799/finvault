// ─── goals.js ────────────────────────────────────────────────────────────────
const express  = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const goalsRouter = express.Router();
goalsRouter.use(authenticate);

goalsRouter.get('/', async (req, res) => {
  const { rows } = await query('SELECT * FROM goals WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
  res.json({ success: true, data: { goals: rows } });
});

goalsRouter.post('/', [
  body('name').trim().isLength({ min:1, max:100 }),
  body('target_amount').isFloat({ min: 1 }),
  body('icon').optional().trim(),
  body('color').optional().trim(),
  body('target_date').optional().isISO8601(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  const { name, target_amount, icon, color, target_date, saved_amount } = req.body;
  const { rows } = await query(
    'INSERT INTO goals (user_id,name,target_amount,icon,color,target_date,saved_amount) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [req.user.id, name, target_amount, icon||'🎯', color||'#4fffb0', target_date||null, saved_amount||0]
  );
  res.status(201).json({ success: true, data: { goal: rows[0] } });
});

goalsRouter.patch('/:id/contribute', [body('amount').isFloat({ min: 0.01 })], async (req, res) => {
  const { rows } = await query(
    'UPDATE goals SET saved_amount=saved_amount+$1, updated_at=NOW() WHERE id=$2 AND user_id=$3 RETURNING *',
    [req.body.amount, req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ success: false, message: 'Goal not found' });
  res.json({ success: true, data: { goal: rows[0] } });
});

goalsRouter.delete('/:id', async (req, res) => {
  const { rowCount } = await query('DELETE FROM goals WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!rowCount) return res.status(404).json({ success: false, message: 'Goal not found' });
  res.json({ success: true, message: 'Goal deleted' });
});

// ─── reports.js ──────────────────────────────────────────────────────────────
const reportsRouter = express.Router();
reportsRouter.use(authenticate);

reportsRouter.get('/monthly/:year/:month', async (req, res) => {
  const { year, month } = req.params;
  const { rows } = await query(`
    SELECT
      category,
      type,
      SUM(amount) AS total,
      COUNT(*) AS count,
      AVG(amount) AS avg_amount,
      MAX(amount) AS max_amount
    FROM transactions
    WHERE user_id=$1 AND EXTRACT(YEAR FROM date)=$2 AND EXTRACT(MONTH FROM date)=$3
    GROUP BY category, type ORDER BY total DESC
  `, [req.user.id, year, month]);
  res.json({ success: true, data: { report: rows } });
});

reportsRouter.get('/export/csv', async (req, res) => {
  const { from, to } = req.query;
  let sql = 'SELECT date,type,category,description,amount,payment_method FROM transactions WHERE user_id=$1';
  const params = [req.user.id];
  if (from) { sql += ' AND date>=$2'; params.push(from); }
  if (to)   { sql += ` AND date<=$${params.length+1}`; params.push(to); }
  sql += ' ORDER BY date DESC';

  const { rows } = await query(sql, params);
  const csv = ['Date,Type,Category,Description,Amount,Payment Method',
    ...rows.map(r => `${r.date},${r.type},${r.category},"${r.description}",${r.amount},${r.payment_method||''}`)
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="finvault-export.csv"');
  res.send(csv);
});

reportsRouter.get('/yearly/:year', async (req, res) => {
  const { rows } = await query(`
    SELECT
      EXTRACT(MONTH FROM date) AS month,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expenses,
      SUM(CASE WHEN type IN ('saving','investment') THEN amount ELSE 0 END) AS savings,
      SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income
    FROM transactions
    WHERE user_id=$1 AND EXTRACT(YEAR FROM date)=$2
    GROUP BY EXTRACT(MONTH FROM date) ORDER BY month
  `, [req.user.id, req.params.year]);
  res.json({ success: true, data: { yearly: rows } });
});

module.exports = { goalsRouter, reportsRouter };
