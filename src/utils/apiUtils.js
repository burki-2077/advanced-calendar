/**
 * API utility functions for Advanced Calendar
 * Includes retry logic, batching, and data processing helpers
 * 
 * @module utils/apiUtils
 */

import { logger } from './logger.js';
import { API_CONFIG, HTTP_STATUS } from './constants.js';

/**
 * Delay execution for specified milliseconds
 * 
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * 
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of the function
 */
export async function withRetry(fn, maxRetries = API_CONFIG.MAX_RETRIES, baseDelay = API_CONFIG.RETRY_DELAY_MS) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      const status = error.status || error.statusCode;
      if (status && status !== HTTP_STATUS.TOO_MANY_REQUESTS && status < 500) {
        // Don't retry client errors (except rate limiting)
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delayMs = baseDelay * Math.pow(API_CONFIG.RETRY_BACKOFF_MULTIPLIER, attempt);
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`);
        await delay(delayMs);
      }
    }
  }
  
  logger.error('Max retries exceeded');
  throw lastError;
}

/**
 * Split an array into chunks of specified size
 * 
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array<Array>} Array of chunks
 */
export function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Execute batches with controlled parallelism
 * 
 * @param {Array} batches - Array of batch data
 * @param {Function} processFn - Function to process each batch (receives batch data and index)
 * @param {number} maxParallel - Maximum parallel executions
 * @returns {Promise<Array>} Array of results
 */
export async function executeBatchesParallel(batches, processFn, maxParallel = API_CONFIG.MAX_PARALLEL_BATCHES) {
  const results = [];
  
  for (let i = 0; i < batches.length; i += maxParallel) {
    const batchSlice = batches.slice(i, i + maxParallel);
    const batchPromises = batchSlice.map((batch, index) => 
      processFn(batch, i + index)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Normalize field ID (remove brackets if present)
 * 
 * @param {string} fieldId - Field ID to normalize
 * @returns {string} Normalized field ID
 */
export function normalizeFieldId(fieldId) {
  if (!fieldId) return '';
  return fieldId.replace(/[\[\]]/g, '');
}

/**
 * Safely get a field value from various field types
 * Handles different Jira field structures (string, array, object)
 * 
 * @param {*} fieldValue - Field value from Jira API
 * @returns {string} String representation of the field value
 */
export function getSafeFieldValue(fieldValue) {
  if (!fieldValue) return '';
  
  // Handle string values
  if (typeof fieldValue === 'string') {
    return fieldValue;
  }
  
  // Handle array values (select lists, multi-select, etc.)
  if (Array.isArray(fieldValue)) {
    return fieldValue
      .map(item => {
        if (typeof item === 'string') return item;
        if (item && item.value) return item.value;
        if (item && item.name) return item.name;
        return '';
      })
      .filter(Boolean)
      .join(', ');
  }
  
  // Handle object values (single select, user, etc.)
  if (typeof fieldValue === 'object') {
    if (fieldValue.value) return fieldValue.value;
    if (fieldValue.name) return fieldValue.name;
    if (fieldValue.displayName) return fieldValue.displayName;
  }
  
  return '';
}

/**
 * Validate API response structure
 * 
 * @param {Object} response - API response object
 * @returns {boolean} True if response structure is valid
 */
export function isValidApiResponse(response) {
  return response && typeof response === 'object' && 'success' in response;
}

/**
 * Extract error message from various error formats
 * 
 * @param {*} error - Error object or message
 * @returns {string} Error message
 */
export function getErrorMessage(error) {
  if (!error) return 'Unknown error';
  
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.error) return error.error;
  if (error.errorMessages && Array.isArray(error.errorMessages)) {
    return error.errorMessages.join('; ');
  }
  
  return 'Unknown error';
}
