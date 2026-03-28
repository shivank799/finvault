const express = require('express');
const { query }  = require('../config/database');
const { cache }  = require('../config/redis');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  const uid = req.user.id;
  const cacheKey = `dashboard:${uid}:summary:${new Date().toISOString().slice(0,7)}`;

  const cached = await cache.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached, cached: true });

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const [totals, monthly, categories, trend, topExpenses] = await Promise.all([
    // Lifetime totals
    query(`
      SELECT
        SUM(CASE WHEN type IN ('expense') THEN amount ELSE 0 END) AS total_expenses,
        SUM(CASE WHEN type IN ('saving','investment') THEN amount ELSE 0 END) AS total_savings,
        SUM(CASE WHEN type IN ('income','salary') THEN amount ELSE 0 END) AS total_income,
        COUNT(*) AS total_transactions
      FROM transactions WHERE user_id = $1
    `, [uid]),

    // This month
    query(`
      SELECT
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS month_expenses,
        SUM(CASE WHEN type IN ('saving','investment') THEN amount ELSE 0 END) AS month_savings,
        COUNT(*) AS month_transactions
      FROM transactions
      WHERE user_id=$1 AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
    `, [uid, month, year]),

    // Spending by category (this month)
    query(`
      SELECT category, SUM(amount) AS total
      FROM transactions
      WHERE user_id=$1 AND type='expense'
        AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
      GROUP BY category ORDER BY total DESC
    `, [uid, month, year]),

    // 6-month trend
    query(`
      SELECT
        TO_CHAR(date, 'YYYY-MM') AS month,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expenses,
        SUM(CASE WHEN type IN ('saving','investment') THEN amount ELSE 0 END) AS savings
      FROM transactions
      WHERE user_id=$1 AND date >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month ASC
    `, [uid]),

    // Top 5 expenses this month
    query(`
      SELECT description, category, amount, date
      FROM transactions
      WHERE user_id=$1 AND type='expense'
        AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
      ORDER BY amount DESC LIMIT 5
    `, [uid, month, year]),
  ]);

  const t = totals.rows[0];
  const m = monthly.rows[0];
  const netBalance = parseFloat(t.total_savings || 0) - parseFloat(t.total_expenses || 0);

  const data = {
    totals: {
      expenses:     parseFloat(t.total_expenses    || 0),
      savings:      parseFloat(t.total_savings     || 0),
      income:       parseFloat(t.total_income      || 0),
      net_balance:  netBalance,
      transactions: parseInt(t.total_transactions  || 0),
    },
    monthly: {
      expenses:     parseFloat(m.month_expenses    || 0),
      savings:      parseFloat(m.month_savings     || 0),
      transactions: parseInt(m.month_transactions  || 0),
    },
    savings_rate: t.total_savings && t.total_expenses
      ? Math.round((t.total_savings / (parseFloat(t.total_savings) + parseFloat(t.total_expenses))) * 100)
      : 0,
    categories: categories.rows,
    trend:      trend.rows,
    top_expenses: topExpenses.rows,
  };

  await cache.set(cacheKey, data, 300); // 5 min cache
  res.json({ success: true, data });
});

// GET /api/dashboard/budgets-status
router.get('/budgets-status', async (req, res) => {
  const uid   = req.user.id;
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const { rows } = await query(`
    SELECT
      b.category,
      b.amount AS budget_limit,
      COALESCE(t.spent, 0) AS spent,
      ROUND((COALESCE(t.spent, 0) / b.amount) * 100, 1) AS pct_used,
      b.alert_at,
      CASE WHEN COALESCE(t.spent, 0) >= b.amount THEN 'over'
           WHEN COALESCE(t.spent, 0) >= b.amount * (b.alert_at::float / 100) THEN 'warning'
           ELSE 'ok' END AS status
    FROM budgets b
    LEFT JOIN (
      SELECT category, SUM(amount) AS spent
      FROM transactions
      WHERE user_id=$1 AND type='expense'
        AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
      GROUP BY category
    ) t ON t.category = b.category
    WHERE b.user_id=$1 AND b.month=$2 AND b.year=$3
    ORDER BY pct_used DESC
  `, [uid, month, year]);

  res.json({ success: true, data: { budgets: rows } });
});

module.exports = router;
