/**
 * Constants for Advanced Calendar
 * 
 * @module utils/constants
 */

/**
 * API configuration constants
 */
export const API_CONFIG = {
  // Maximum number of issues to fetch in a single request
  MAX_RESULTS: 100,
  
  // Batch size for processing issues
  BATCH_SIZE: 50,
  
  // Delay between batch requests (milliseconds)
  BATCH_DELAY_MS: 300,
  
  // Maximum number of parallel batch requests
  MAX_PARALLEL_BATCHES: 3,
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  RETRY_BACKOFF_MULTIPLIER: 2,
  
  // JQL key fetch limit
  JIRA_KEY_FETCH_LIMIT: 1000
};

/**
 * Default application settings
 */
export const DEFAULT_SETTINGS = {
  projectKey: '',
  projects: [],
  requestType: 'Visit',
  requestTypes: ['Visit'],
  requestTypesWithProjects: [],
  customFields: {
    timeOfVisit: 'customfield_10061',
    endTime: 'customfield_10179',
    site: 'customfield_10065',
    typeOfVisit: 'customfield_10066',
    visitorName: 'customfield_10067',
    additionalFields: []
  },
  calendarBarFields: {
    monthly: ['site', 'typeOfVisit'],
    weekly: ['site', 'typeOfVisit']
  }
};

/**
 * Error codes for consistent error handling
 */
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  FETCH_VISITS_ERROR: 'FETCH_VISITS_ERROR',
  FETCH_PROJECTS_ERROR: 'FETCH_PROJECTS_ERROR',
  FETCH_FIELDS_ERROR: 'FETCH_FIELDS_ERROR',
  LOAD_SETTINGS_ERROR: 'LOAD_SETTINGS_ERROR',
  SAVE_SETTINGS_ERROR: 'SAVE_SETTINGS_ERROR',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR'
};

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};
