/**
 * Date utility functions for Advanced Calendar
 * 
 * @module utils/dateUtils
 */

/**
 * Format a date/datetime string to ISO format
 * Handles various input formats and validates the date
 * 
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {string|null} ISO formatted date string or null if invalid
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return null;
  
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  } catch (error) {
    return null;
  }
}

/**
 * Format a date to YYYY-MM-DD format
 * 
 * @param {Date} date - Date object
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export function formatDateYMD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get default date range (last 365 days to today)
 * 
 * @returns {Object} Object with startDate and endDate in YYYY-MM-DD format
 */
export function getDefaultDateRange() {
  const today = new Date();
  const lastYear = new Date();
  lastYear.setDate(lastYear.getDate() - 365);
  
  return {
    startDate: formatDateYMD(lastYear),
    endDate: formatDateYMD(today)
  };
}

/**
 * Parse date string to Date object with validation
 * 
 * @param {string} dateString - Date string to parse
 * @returns {Date|null} Parsed Date object or null if invalid
 */
export function parseDate(dateString) {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date;
}

/**
 * Check if a date is valid
 * 
 * @param {string|Date} date - Date to validate
 * @returns {boolean} True if valid date
 */
export function isValidDate(date) {
  if (!date) return false;
  
  const d = new Date(date);
  return !isNaN(d.getTime());
}

/**
 * Get the start and end of a week for a given date
 * 
 * @param {Date} date - Reference date
 * @returns {Object} Object with startDate and endDate
 */
export function getWeekRange(date) {
  const startOfWeek = new Date(date);
  const dayOfWeek = date.getDay();
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return { startDate: startOfWeek, endDate: endOfWeek };
}

/**
 * Get the start and end of a month for a given date
 * 
 * @param {Date} date - Reference date
 * @returns {Object} Object with startDate and endDate
 */
export function getMonthRange(date) {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  
  return { startDate: startOfMonth, endDate: endOfMonth };
}
