/**
 * Winston Logger Configuration
 * 
 * Provides centralized logging for the application.
 * Supports console and file transports with different log levels.
 * 
 * @module utils/logger
 */

import winston from 'winston';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(logColors);

// Determine log level based on environment
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info');

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...metadata } = info;
    let msg = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    return msg;
  })
);

// Custom format for file output (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console only: Render (and most PaaS) collect stdout; JSON lines in production.
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? fileFormat : consoleFormat,
    silent: process.env.NODE_ENV === 'test',
  }),
];

// Create the logger instance
export const logger = winston.createLogger({
  level,
  levels: logLevels,
  transports,
  exitOnError: false,
});

// Stream for Morgan HTTP logging integration
export const morganStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

export default logger;