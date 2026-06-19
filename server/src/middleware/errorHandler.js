import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, { stack: err.stack });

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({ success: false, message: 'Validation error', errors });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
      errors: [],
    });
  }

  // Mongoose invalid ObjectId cast
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ success: false, message: 'Invalid ID format', errors: [] });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token', errors: [] });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired', errors: [] });
  }

  // Multer: file too large
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large', errors: [] });
  }
  // Multer: unexpected field
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: `Unexpected file field: ${err.field}`,
      errors: [],
    });
  }

  // SyntaxError from body-parser (malformed JSON)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body', errors: [] });
  }

  // Unexpected errors — hide details in production
  const message =
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  return res.status(500).json({ success: false, message, errors: [] });
};

export default errorHandler;
