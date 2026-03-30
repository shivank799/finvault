'use strict';

require('./loadEnv');
require('express-async-errors');

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const compression  = require('compression');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const hpp          = require('hpp');
const xssClean     = require('xss-clean');
const { register } = require('prom-client');

const logger          = require('./utils/logger');
const { connectDB }   = require('./config/database');
const { connectRedis} = require('./config/redis');
const metricsMiddleware = require('./middleware/metrics');
const { attachSupabaseSession } = require('./middleware/supabaseSession');
const errorHandler    = require('./middleware/errorHandler');
const authRoutes      = require('./routes/auth');
const userRoutes      = require('./routes/users');
const transactionRoutes = require('./routes/transactions');
const dashboardRoutes = require('./routes/dashboard');
const budgetRoutes    = require('./routes/budgets');
const goalRoutes      = require('./routes/goals');
const reportRoutes    = require('./routes/reports');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Security Headers ───────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'https:'],
      scriptSrc:  ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ─── CORS ────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// ─── Body Parsing & Sanitization ─────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(xssClean());
app.use(hpp());
app.use(compression());

// ─── Rate Limiting ───────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts, please try again in 15 minutes.' },
});

app.use('/api/', globalLimiter);
app.use('/api/auth', authLimiter);

// ─── Request Logging ─────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: (req) => req.url === '/api/health',
}));

// ─── Prometheus Metrics ──────────────────────────────────────────
app.use(metricsMiddleware);

// ─── Request ID ──────────────────────────────────────────────────
app.use((req, _res, next) => {
  req.id = req.headers['x-request-id'] || require('uuid').v4();
  next();
});

// Add a request-scoped Supabase client without changing the existing JWT auth flow.
app.use(attachSupabaseSession);

// ─── Routes ──────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const { pool }  = require('./config/database');
  const { client: redis } = require('./config/redis');
  let dbOk = false, redisOk = false;
  try { await pool.query('SELECT 1'); dbOk = true; } catch {}
  try { await redis.ping(); redisOk = true; } catch {}
  const status = dbOk && redisOk ? 200 : 503;
  res.status(status).json({
    status:    status === 200 ? 'healthy' : 'degraded',
    version:   process.env.npm_package_version || '2.0.0',
    timestamp: new Date().toISOString(),
    uptime:    process.uptime(),
    services: { database: dbOk ? 'up' : 'down', redis: redisOk ? 'up' : 'down' },
  });
});

app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

app.use('/api/auth',         authRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/budgets',      budgetRoutes);
app.use('/api/goals',        goalRoutes);
app.use('/api/reports',      reportRoutes);

// 404 handler
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Global error handler
app.use(errorHandler);

// ─── Startup ─────────────────────────────────────────────────────
async function startServer() {
  try {
    await connectDB();
    await connectRedis();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 FinVault API running on port ${PORT} [${process.env.NODE_ENV}]`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Graceful shutdown initiated...`);
      server.close(async () => {
        const { pool } = require('./config/database');
        const { client } = require('./config/redis');
        await pool.end();
        await client.quit();
        logger.info('✅ All connections closed. Process exiting.');
        process.exit(0);
      });
      setTimeout(() => { logger.error('Forced shutdown after timeout'); process.exit(1); }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('unhandledRejection', (err) => { logger.error('Unhandled rejection:', err); shutdown('unhandledRejection'); });
    process.on('uncaughtException',  (err) => { logger.error('Uncaught exception:', err);  shutdown('uncaughtException'); });

  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app; // for testing
