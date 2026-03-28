const { Pool } = require('pg');
const logger   = require('../utils/logger');

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max:              20,       // max pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false,
};

const pool = new Pool(poolConfig);

pool.on('connect', (client) => {
  logger.debug(`New DB client connected. Pool size: ${pool.totalCount}`);
  client.query("SET timezone='UTC'");
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle DB client:', err);
});

async function connectDB() {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    logger.info('✅ PostgreSQL connected successfully');
    await runMigrations(client);
  } finally {
    client.release();
  }
}

async function runMigrations(client) {
  // Create tables if they don't exist (idempotent migrations)
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          VARCHAR(100) NOT NULL,
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      avatar_url    TEXT,
      currency      VARCHAR(3) DEFAULT 'INR',
      is_active     BOOLEAN DEFAULT true,
      is_verified   BOOLEAN DEFAULT false,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type        VARCHAR(10) NOT NULL CHECK (type IN ('expense','income','saving','investment')),
      amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
      description TEXT NOT NULL,
      category    VARCHAR(50) NOT NULL,
      sub_category VARCHAR(50),
      payment_method VARCHAR(30),
      tags        TEXT[],
      notes       TEXT,
      is_recurring BOOLEAN DEFAULT false,
      recurrence_period VARCHAR(20),
      date        DATE NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category   VARCHAR(50) NOT NULL,
      amount     NUMERIC(12,2) NOT NULL,
      period     VARCHAR(10) DEFAULT 'monthly',
      month      INTEGER,
      year       INTEGER,
      alert_at   INTEGER DEFAULT 80,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, category, month, year)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         VARCHAR(100) NOT NULL,
      icon         VARCHAR(10) DEFAULT '🎯',
      target_amount NUMERIC(12,2) NOT NULL,
      saved_amount  NUMERIC(12,2) DEFAULT 0,
      target_date   DATE,
      color        VARCHAR(20) DEFAULT '#4fffb0',
      is_completed  BOOLEAN DEFAULT false,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
      action     VARCHAR(100) NOT NULL,
      entity     VARCHAR(50),
      entity_id  UUID,
      ip_address INET,
      user_agent TEXT,
      metadata   JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_cat  ON transactions(user_id, category);
    CREATE INDEX IF NOT EXISTS idx_budgets_user_period    ON budgets(user_id, year, month);
    CREATE INDEX IF NOT EXISTS idx_goals_user             ON goals(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user    ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user        ON audit_logs(user_id, created_at DESC);
  `);
  logger.info('✅ DB migrations applied');
}

// Helper: query with automatic client checkout/release
async function query(text, params) {
  const start = Date.now();
  const res   = await pool.query(text, params);
  const dur   = Date.now() - start;
  if (dur > 1000) logger.warn(`Slow query (${dur}ms): ${text}`);
  return res;
}

// Helper: transaction wrapper
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, connectDB, query, withTransaction };
