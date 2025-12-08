/**
 * Logger utility for Advanced Calendar
 * Provides consistent logging with context and levels
 * 
 * @module utils/logger
 */

const LOG_LEVELS = {
  DEBUG: 0,
  LOG: 1,
  WARN: 2,
  ERROR: 3
};

// Set minimum log level (change to LOG_LEVELS.WARN for production)
const MIN_LOG_LEVEL = LOG_LEVELS.DEBUG;

/**
 * Format log message with timestamp and context
 * @private
 */
function formatMessage(level, context, ...args) {
  const timestamp = new Date().toISOString();
  const prefix = context ? `[${context}]` : '';
  return `[${timestamp}] [${level}]${prefix}`;
}

/**
 * Logger object with different log levels
 */
export const logger = {
  /**
   * Debug level logging (verbose)
   */
  debug: (context, ...args) => {
    if (MIN_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(formatMessage('DEBUG', context), ...args);
    }
  },

  /**
   * Standard logging
   */
  log: (...args) => {
    if (MIN_LOG_LEVEL <= LOG_LEVELS.LOG) {
      console.log(formatMessage('LOG', null), ...args);
    }
  },

  /**
   * Warning level logging
   */
  warn: (...args) => {
    if (MIN_LOG_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', null), ...args);
    }
  },

  /**
   * Error level logging
   */
  error: (...args) => {
    if (MIN_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(formatMessage('ERROR', null), ...args);
    }
  }
};
