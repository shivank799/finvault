const express = require('express');
const { body, query: qv, param, validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/database');
const { cache } = require('../config/redis');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticate);

const VALID_TYPES = ['expense', 'income', 'saving', 'investment'];
const VALID_CATEGORIES = ['Food','Transport','Shopping','Bills','Health','Entertainment','Savings','Investment','Salary','Freelance','Other'];

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  next();
}

const txnRules = [
  body('type').isIn(VALID_TYPES),
  body('amount').isFloat({ min: 0.01 }),
  body('description').trim().isLength({ min: 1, max: 500 }),
  body('category').isIn(VALID_CATEGORIES),
  body('date').isISO8601().toDate(),
  body('payment_method').optional().trim(),
  body('notes').optional().trim(),
  body('tags').optional().isArray(),
];

// GET /api/transactions
router.get('/', [
  qv('page').optional().isInt({ min: 1 }).toInt(),
  qv('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  qv('type').optional().isIn([...VALID_TYPES, 'all']),
  qv('category').optional().trim(),
  qv('from').optional().isISO8601(),
  qv('to').optional().isISO8601(),
  qv('search').optional().trim(),
], validate, async (req, res) => {
  const page     = req.query.page  || 1;
  const limit    = req.query.limit || 20;
  const offset   = (page - 1) * limit;
  const { type, category, from, to, search } = req.query;

  let whereClause = 'WHERE user_id = $1';
  const params = [req.user.id];
  let pIdx = 2;

  if (type && type !== 'all') { whereClause += ` AND type = $${pIdx++}`; params.push(type); }
  if (category)               { whereClause += ` AND category = $${pIdx++}`; params.push(category); }
  if (from)                   { whereClause += ` AND date >= $${pIdx++}`; params.push(from); }
  if (to)                     { whereClause += ` AND date <= $${pIdx++}`; params.push(to); }
  if (search)                 { whereClause += ` AND description ILIKE $${pIdx++}`; params.push(`%${search}%`); }

  const [dataResult, countResult] = await Promise.all([
    query(`SELECT * FROM transactions ${whereClause} ORDER BY date DESC, created_at DESC LIMIT $${pIdx} OFFSET $${pIdx+1}`,
      [...params, limit, offset]),
    query(`SELECT COUNT(*) FROM transactions ${whereClause}`, params),
  ]);

  const total = parseInt(countResult.rows[0].count);
  res.json({
    success: true,
    data: {
      transactions: dataResult.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    },
  });
});

// POST /api/transactions
router.post('/', txnRules, validate, async (req, res) => {
  const { type, amount, description, category, date, payment_method, notes, tags, is_recurring, recurrence_period } = req.body;

  const { rows } = await query(
    `INSERT INTO transactions
      (user_id, type, amount, description, category, date, payment_method, notes, tags, is_recurring, recurrence_period)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [req.user.id, type, amount, description, category, date, payment_method, notes, tags || [], is_recurring || false, recurrence_period]
  );

  // Invalidate cache
  await cache.delPattern(`dashboard:${req.user.id}:*`);

  logger.info(`Transaction created: ${type} ₹${amount} by ${req.user.email}`);
  res.status(201).json({ success: true, data: { transaction: rows[0] } });
});

// GET /api/transactions/:id
router.get('/:id', param('id').isUUID(), validate, async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ success: false, message: 'Transaction not found' });
  res.json({ success: true, data: { transaction: rows[0] } });
});

// PUT /api/transactions/:id
router.put('/:id', [param('id').isUUID(), ...txnRules], validate, async (req, res) => {
  const { type, amount, description, category, date, payment_method, notes, tags } = req.body;

  const { rows } = await query(
    `UPDATE transactions SET
       type=$1, amount=$2, description=$3, category=$4, date=$5,
       payment_method=$6, notes=$7, tags=$8, updated_at=NOW()
     WHERE id=$9 AND user_id=$10 RETURNING *`,
    [type, amount, description, category, date, payment_method, notes, tags || [], req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ success: false, message: 'Transaction not found' });

  await cache.delPattern(`dashboard:${req.user.id}:*`);
  res.json({ success: true, data: { transaction: rows[0] } });
});

// DELETE /api/transactions/:id
router.delete('/:id', param('id').isUUID(), validate, async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ success: false, message: 'Transaction not found' });

  await cache.delPattern(`dashboard:${req.user.id}:*`);
  res.json({ success: true, message: 'Transaction deleted' });
});

// POST /api/transactions/bulk (import)
router.post('/bulk', async (req, res) => {
  const { transactions: bulk } = req.body;
  if (!Array.isArray(bulk) || bulk.length > 500) {
    return res.status(400).json({ success: false, message: 'Provide an array of up to 500 transactions' });
  }

  const inserted = await withTransaction(async (client) => {
    const results = [];
    for (const t of bulk) {
      const { rows } = await client.query(
        `INSERT INTO transactions (user_id, type, amount, description, category, date, payment_method)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [req.user.id, t.type, t.amount, t.description, t.category, t.date, t.payment_method]
      );
      results.push(rows[0].id);
    }
    return results;
  });

  await cache.delPattern(`dashboard:${req.user.id}:*`);
  res.status(201).json({ success: true, data: { inserted: inserted.length } });
});

module.exports = router;
