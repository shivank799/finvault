const Redis = require('ioredis');
const logger = require('../utils/logger');

let client;

function getRedisOptions() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error('REDIS_URL is not configured');
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(redisUrl);
  } catch (error) {
    throw new Error(`Invalid REDIS_URL: ${error.message}`);
  }

  const isTlsConnection =
    parsedUrl.protocol === 'rediss:' || parsedUrl.hostname.endsWith('.upstash.io');

  return {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
    retryStrategy: (times) => {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
    reconnectOnError: (err) => {
      const targetErrors = ['READONLY', 'ECONNRESET'];
      return targetErrors.some((code) => err.message.includes(code));
    },
    ...(isTlsConnection ? { tls: {} } : {}),
  };
}

function connectRedis() {
  return new Promise((resolve, reject) => {
    try {
      client = new Redis(process.env.REDIS_URL, getRedisOptions());
    } catch (error) {
      reject(error);
      return;
    }

    client.on('connect', () => logger.info('Redis socket connected'));
    client.on('ready', () => {
      logger.info('Redis client ready');
      resolve(client);
    });
    client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
    client.on('reconnecting', () => logger.warn('Redis reconnecting...'));
    client.on('end', () => logger.warn('Redis connection ended'));
  });
}

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

module.exports = {
  connectRedis,
  client: new Proxy({}, { get: (_, prop) => client?.[prop]?.bind(client) }),
  cache,
};
