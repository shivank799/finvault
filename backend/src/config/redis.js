const Redis  = require('ioredis');
const logger = require('../utils/logger');

let client;

function connectRedis() {
  return new Promise((resolve, reject) => {
    client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      retryStrategy: (times) => {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
      reconnectOnError: (err) => {
        const targetErrors = ['READONLY', 'ECONNRESET'];
        return targetErrors.some(e => err.message.includes(e));
      },
    });

    client.on('connect',      () => logger.info('✅ Redis connected'));
    client.on('ready',        () => resolve(client));
    client.on('error',        (err) => logger.error('Redis error:', err.message));
    client.on('reconnecting', () => logger.warn('Redis reconnecting...'));
    client.on('end',          () => logger.warn('Redis connection ended'));
  });
}

// Typed helpers
const cache = {
  async get(key) {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  },
  async set(key, value, ttlSeconds = 300) {
    return client.setex(key, ttlSeconds, JSON.stringify(value));
  },
  async del(...keys) {
    return client.del(...keys);
  },
  async delPattern(pattern) {
    const keys = await client.keys(pattern);
    if (keys.length) return client.del(...keys);
  },
  async exists(key) {
    return client.exists(key);
  },
  async incr(key) {
    return client.incr(key);
  },
  async expire(key, seconds) {
    return client.expire(key, seconds);
  },
};

module.exports = { connectRedis, client: new Proxy({}, { get: (_, prop) => client?.[prop]?.bind(client) }), cache };
