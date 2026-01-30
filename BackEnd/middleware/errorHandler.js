import logger from '../utils/logger.js';
import { HTTP_STATUS } from '../config/constants.js';

/**
 * Global error handling middleware
 * Catches all errors and returns consistent error responses
 * Following best practices: never expose sensitive error details
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';

  // Log error with context
  logger.error('Error occurred:', {
    statusCode,
    message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    stack: err.stack,
  });

  // Don't expose sensitive error details in production
  const response = {
    success: false,
    statusCode,
    message,
  };

  // Include error details only in development
  if (process.env.NODE_ENV === 'development') {
    response.errors = err.errors;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
