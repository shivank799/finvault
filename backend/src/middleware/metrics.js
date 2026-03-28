const client = require('prom-client');

// Enable default metrics (CPU, memory, GC, event loop)
client.collectDefaultMetrics({ prefix: 'finvault_' });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name:    'finvault_http_request_duration_seconds',
  help:    'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.5, 1, 2],
});

const httpRequestTotal = new client.Counter({
  name:    'finvault_http_requests_total',
  help:    'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const activeConnections = new client.Gauge({
  name: 'finvault_active_connections',
  help: 'Number of active connections',
});

const transactionsCreated = new client.Counter({
  name: 'finvault_transactions_created_total',
  help: 'Total transactions created',
  labelNames: ['type'],
});

const dbQueryDuration = new client.Histogram({
  name:    'finvault_db_query_duration_seconds',
  help:    'Duration of DB queries',
  labelNames: ['query_name'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
});

function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') return next();

  activeConnections.inc();
  const end = httpRequestDuration.startTimer();
  const startTime = Date.now();

  res.on('finish', () => {
    const route = req.route?.path || req.path.replace(/[0-9a-f-]{36}/gi, ':id');
    const labels = { method: req.method, route, status_code: res.statusCode };
    end(labels);
    httpRequestTotal.inc(labels);
    activeConnections.dec();
  });

  next();
}

module.exports = metricsMiddleware;
module.exports.metrics = { httpRequestDuration, httpRequestTotal, transactionsCreated, dbQueryDuration };
