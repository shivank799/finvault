const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n  ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'finvault-api' },
  transports: [
    // Console (dev)
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? combine(timestamp(), errors({ stack: true }), json())
        : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), devFormat),
    }),

    // Rotating file - errors only
    new DailyRotateFile({
      filename:    path.join('logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level:       'error',
      maxSize:     '20m',
      maxFiles:    '14d',
      format:      combine(timestamp(), errors({ stack: true }), json()),
    }),

    // Rotating file - combined
    new DailyRotateFile({
      filename:    path.join('logs', 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize:     '20m',
      maxFiles:    '7d',
      format:      combine(timestamp(), json()),
    }),
  ],
});

module.exports = logger;
