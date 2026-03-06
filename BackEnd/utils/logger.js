import winston from 'winston';

/**
 * Logger utility using Winston
 * Provides consistent logging structure across the application
 * Following best practices: JSON format, log levels, file rotation
 */

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  // Add stack trace for errors
  if (stack) {
    msg += `\n${stack}`;
  }
  
  return msg;
});

const isProduction = process.env.NODE_ENV === 'production';

// Build transports — always include console; add file transports only outside Railway
const transports = [
  new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
  }),
];

const exceptionHandlers = [
  new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
  }),
];

// Only write to files when not on Railway (Railway provides ephemeral filesystem)
if (!process.env.RAILWAY_ENVIRONMENT) {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error', maxsize: 5242880, maxFiles: 5 }),
    new winston.transports.File({ filename: 'logs/combined.log', maxsize: 5242880, maxFiles: 5 })
  );
  exceptionHandlers.push(
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports,
  exceptionHandlers,
  rejectionHandlers: exceptionHandlers,
});

export default logger;
