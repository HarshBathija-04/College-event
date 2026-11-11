import winston from 'winston';

const isProd = process.env.NODE_ENV === 'production';
const { combine, timestamp, colorize, printf, errors, json } = winston.format;

const consoleFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  colorize({ all: true }),
  printf(({ timestamp, level, message, ...metadata }) => {
    const meta = Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : '';
    return `${timestamp} [${level}]: ${message}${meta}`;
  }),
);

// Console only: Render (and most PaaS) collect stdout; JSON lines in production.
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  transports: [
    new winston.transports.Console({
      format: isProd ? combine(timestamp(), errors({ stack: true }), json()) : consoleFormat,
      silent: process.env.NODE_ENV === 'test',
    }),
  ],
  exitOnError: false,
});
