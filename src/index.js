/**
 * Advanced Calendar for Jira - Backend Resolver
 * Handles all API calls to Jira and data processing for the calendar
 * 
 * @version 2.0.0
 * @author XALT Team
 */

import Resolver from '@forge/resolver';
import api, { route, storage } from '@forge/api';
import { logger } from './utils/logger.js';
import { API_CONFIG, DEFAULT_SETTINGS, ERROR_CODES } from './utils/constants.js';
import { formatDateTime, formatDateYMD, getDefaultDateRange } from './utils/dateUtils.js';
import { 
  withRetry, 
  normalizeFieldId, 
  getSafeFieldValue,
  chunkArray
} from './utils/apiUtils.js';

const resolver = new Resolver();

/**
 * Get settings from storage or use defaults
 * @returns {Promise<Object>} Application settings
 */
async function getSettings() {
  try {
    const settings = await storage.get('adminSettings');
    return settings || DEFAULT_SETTINGS;
  } catch (error) {
    logger.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Fetch workflow statuses for a project, optionally filtered by request type
 * @param {string} projectKey - Jira project key
 * @param {string|null} requestTypeName - Optional request type name filter
 * @returns {Promise<Array>} Array of status objects
 */
async function fetchWorkflowStatuses(projectKey, requestTypeName = null) {
  try {
    const result = await api.asApp().requestJira(route`/rest/api/3/project/${projectKey}/statuses`);
    const data = await result.json();

    const statusMap = {};

    if (Array.isArray(data)) {
      data.forEach(issueType => {
        const shouldInclude = !requestTypeName || 
                             issueType.name === requestTypeName ||
                             issueType.name?.includes(requestTypeName) ||
                             requestTypeName?.includes(issueType.name);
        
        if (shouldInclude && issueType.statuses && Array.isArray(issueType.statuses)) {
          issueType.statuses.forEach(status => {
            if (!statusMap[status.id]) {
              statusMap[status.id] = {
                id: status.id,
                name: status.name,
                category: status.statusCategory?.key || 'undefined',
                categoryName: status.statusCategory?.name || 'Unknown'
              };
            }
          });
        }
      });
    }

    return Object.values(statusMap);
  } catch (error) {
    logger.error('Error fetching workflow statuses:', error);
    return [];
  }
}

/**
 * Build JQL query from settings and date range
 * @param {Object} settings - Application settings
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {string} JQL query string
 */
function buildJqlQuery(settings, startDate, endDate) {
  const { customFields } = settings;
  const projects = settings.projects || (settings.projectKey ? [settings.projectKey] : ['PROJECT']);
  let workItemTypes = settings.requestTypesWithProjects || [];
  
  // Legacy fallback
  if (workItemTypes.length === 0) {
    const legacyTypes = settings.requestTypes || (settings.requestType ? [settings.requestType] : ['Visit']);
    const projectKey = settings.projectKey || projects[0] || 'PROJECT';
    workItemTypes = legacyTypes.map(name => ({
      name,
      projectKey,
      label: `${name} (${projectKey})`,
      itemType: 'requestType'
    }));
  }

  // Build conditions for work item types
  const jqlConditions = [];
  
  if (workItemTypes.length > 0) {
    for (const wit of workItemTypes) {
      if (wit.itemType === 'requestType') {
        jqlConditions.push(`(project = ${wit.projectKey} AND "request type" = "${wit.name}")`);
      } else {
        jqlConditions.push(`(project = ${wit.projectKey} AND issuetype = "${wit.name}")`);
      }
    }
  } else if (projects.length > 0) {
    if (projects.length === 1) {
      jqlConditions.push(`project = ${projects[0]}`);
    } else {
      jqlConditions.push(`project IN (${projects.join(', ')})`);
    }
  }
  
  // Combine conditions
  let jql = jqlConditions.length === 0 ? 'project = PROJECT' : 
            jqlConditions.length === 1 ? jqlConditions[0] : 
            `(${jqlConditions.join(' OR ')})`;
  
  // Add date range filter
  if (startDate && endDate) {
    jql += ` AND "${customFields.timeOfVisit}" >= "${startDate}" AND "${customFields.timeOfVisit}" <= "${endDate}"`;
  } else {
    const defaultRange = getDefaultDateRange();
    jql += ` AND "${customFields.timeOfVisit}" >= "${defaultRange.startDate}" AND "${customFields.timeOfVisit}" <= "${defaultRange.endDate}"`;
    logger.warn('No date range provided, using default: last 365 days');
  }
  
  jql += ` ORDER BY created DESC`;
  
  return jql;
}

/**
 * Fetch issues in batches using 2-step async approach
 * Step 1: Fetch all keys (up to 5000)
 * Step 2: Batch fetch full details in parallel
 * @param {string} jql - JQL query string
 * @param {Array<string>} fieldsList - List of fields to fetch
 * @returns {Promise<Array>} Array of issue objects
 */
async function fetchIssuesInBatches(jql, fieldsList) {
  try {
    logger.log('Step 1: Fetching all issue keys with JQL:', jql);
    
    // Step 1: Fetch all keys first (can get up to 5000 in single call when only requesting 'key')
    const keysResult = await withRetry(async () => {
      return await api.asUser().requestJira(
        route`/rest/api/3/search/jql`,
        {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jql: jql,
            fields: ['key'],
            maxResults: 5000  // Max 5000 when requesting only key
          })
        }
      );
    });
    
    if (!keysResult.ok) {
      const errorText = await keysResult.text();
      logger.error('Failed to fetch keys:', keysResult.status, errorText);
      throw new Error(`Failed to fetch keys: ${keysResult.status}`);
    }
    
    const keysData = await keysResult.json();
    const allKeys = (keysData.issues || []).map(issue => issue.key);
    
    logger.log(`Step 1 complete: Found ${allKeys.length} issue keys`);
    
    if (allKeys.length === 0) {
      return [];
    }
    
    // Step 2: Batch fetch full details in parallel
    logger.log('Step 2: Fetching full details in batches...');
    
    // Batch keys into groups of 50 (safe batch size)
    const batches = chunkArray(allKeys, 50);
    logger.log(`Created ${batches.length} batches of up to 50 keys each`);
    
    // Fetch all batches in parallel
    const batchPromises = batches.map(async (batch, index) => {
      const batchJql = `key in (${batch.join(',')})`;
      
      try {
        const batchResult = await withRetry(async () => {
          return await api.asUser().requestJira(
            route`/rest/api/3/search/jql`,
            {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                jql: batchJql,
                fields: fieldsList,
                maxResults: 100  // Each batch is max 50 keys, so 100 is safe
              })
            }
          );
        });
        
        if (!batchResult.ok) {
          logger.error(`Batch ${index + 1} failed:`, batchResult.status);
          return [];
        }
        
        const batchData = await batchResult.json();
        logger.log(`Batch ${index + 1}/${batches.length}: Fetched ${batchData.issues?.length || 0} issues`);
        return batchData.issues || [];
      } catch (error) {
        logger.error(`Batch ${index + 1} error:`, error);
        return [];
      }
    });
    
    // Wait for all batches to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Flatten all batch results into single array
    const allIssues = batchResults.flat();
    
    logger.log(`Total issues fetched: ${allIssues.length}`);
    return allIssues;
    
  } catch (error) {
    logger.error('Error in fetchIssuesInBatches:', error);
    throw error;
  }
}

/**
 * Process raw issue data into calendar events
 * @param {Array} issues - Raw issue data from Jira
 * @param {Object} customFields - Custom field configuration
 * @returns {Array} Processed calendar events
 */
function processIssueData(issues, customFields) {
  const processedEvents = issues.map(issue => {
    // Get summary and description
    let summary = issue.fields.summary || 'Untitled Visit';
    let description = '';

    // Process description (handle Atlassian Document Format)
    if (issue.fields.description) {
      if (typeof issue.fields.description === 'string') {
        description = issue.fields.description;
      } else if (issue.fields.description.content && Array.isArray(issue.fields.description.content)) {
        description = issue.fields.description.content
          .map(block => {
            if (block && block.type === 'paragraph' && block.content && Array.isArray(block.content)) {
              return block.content
                .map(text => (text && text.text) ? text.text : '')
                .join('');
            }
            return '';
          })
          .filter(text => text.trim().length > 0)
          .join('\n\n');
      }
    }

    // Get status and status category
    let statusName = 'Open';
    let statusCategory = 'new';
    if (issue.fields.status) {
      statusName = issue.fields.status.name || 'Open';
      statusCategory = issue.fields.status.statusCategory?.key || 'new';
    }

    // Process start and end times
    let startTime = issue.fields[customFields.timeOfVisit];
    let endTime = issue.fields[customFields.endTime];
    
    let eventStartTime = formatDateTime(startTime);
    let eventEndTime = formatDateTime(endTime);
    
    // Skip events without start time
    if (!eventStartTime) {
      logger.warn(`Skipping event ${issue.key}: no valid start time`);
      return null;
    }
    
    // Handle missing end time
    if (!eventEndTime && eventStartTime) {
      const startDate = new Date(eventStartTime);
      const summaryLower = summary.toLowerCase();
      
      // Detect multi-day events from keywords
      const isLikelyMultiDay = 
        summaryLower.includes('week') ||
        summaryLower.includes('day') ||
        summaryLower.includes('month') ||
        summaryLower.includes('installation') ||
        summaryLower.includes('project') ||
        summaryLower.includes('migration') ||
        summaryLower.includes('training') ||
        summaryLower.includes('deployment') ||
        summaryLower.includes('implementation');
      
      if (isLikelyMultiDay) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 2); // Default 3 days
        eventEndTime = endDate.toISOString();
      } else {
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1); // Default 1 hour
        eventEndTime = endDate.toISOString();
      }
    }
    
    const event = {
      id: issue.id,
      key: issue.key,
      summary: summary,
      description: description,
      status: statusName,
      statusCategory: statusCategory,
      startTime: eventStartTime,
      endTime: eventEndTime,
      assignee: issue.fields.assignee?.displayName || '',
      site: getSafeFieldValue(issue.fields[customFields.site]),
      visitType: getSafeFieldValue(issue.fields[customFields.typeOfVisit]),
      visitorName: getSafeFieldValue(issue.fields[customFields.visitorName]),
      customFields: {}
    };
    
    // Add additional custom fields
    if (customFields.additionalFields && Array.isArray(customFields.additionalFields)) {
      customFields.additionalFields.forEach(field => {
        event.customFields[field.id] = {
          label: field.label,
          value: getSafeFieldValue(issue.fields[field.jiraFieldId])
        };
      });
    }

    return event;
  });
  
  const validEvents = processedEvents.filter(event => event && event.startTime);
  const droppedCount = processedEvents.length - validEvents.length;
  
  logger.log(`Processed events: ${processedEvents.length} total, ${validEvents.length} valid, ${droppedCount} dropped`);
  
  if (droppedCount > 0 && droppedCount <= 5) {
    const droppedSamples = processedEvents
      .filter(e => !e || !e.startTime)
      .slice(0, 2)
      .map(e => e ? { key: e.key, startTime: 'null' } : 'null');
    logger.warn('Dropped event samples:', droppedSamples);
  }
  
  return validEvents;
}

/**
 * Main function to fetch visit requests with optional date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of visit events
 */
async function fetchVisitRequests(startDate = null, endDate = null) {
  try {
    const settings = await getSettings();
    const { customFields } = settings;
    
    logger.debug('fetchVisitRequests', 'Settings:', { 
      projects: settings.projects, 
      workItemTypes: settings.requestTypesWithProjects?.length || 0,
      dateRange: { startDate, endDate }
    });
    
    // Build JQL query
    const jql = buildJqlQuery(settings, startDate, endDate);
    logger.log('JQL Query:', jql);
    
    // Prepare fields list
    const fieldsList = [
      'summary',
      'description',
      'status',
      'created',
      'assignee',
      'issuetype',
      customFields.timeOfVisit,
      customFields.endTime,
      customFields.site,
      customFields.typeOfVisit,
      customFields.visitorName,
      ...(customFields.additionalFields || []).map(field => field.jiraFieldId)
    ];
    
    // Fetch data using batch approach
    const issues = await fetchIssuesInBatches(jql, fieldsList);
    
    if (issues.length === 0) {
      logger.log('No issues found matching query');
      return [];
    }
    
    const events = processIssueData(issues, customFields);
    
    logger.log(`Returning ${events.length} events to frontend`);
    return events;
    
  } catch (error) {
    logger.error('Error in fetchVisitRequests:', error);
    throw error;
  }
}

/**
 * Get Jira base URL
 * @returns {Promise<Object>} Object containing base URL
 */
async function getJiraBaseUrl() {
  try {
    const result = await api.asApp().requestJira(route`/rest/api/3/serverInfo`);
    const data = await result.json();
    return { baseUrl: data.baseUrl };
  } catch (error) {
    logger.error('Error fetching Jira base URL:', error);
    throw error;
  }
}

// ============================================================================
// RESOLVER DEFINITIONS
// ============================================================================

/**
 * Resolver: Get visit requests with optional date filtering
 */
resolver.define('getVisitRequests', async (req) => {
  try {
    const { startDate, endDate } = req.payload || {};
    const visitRequests = await fetchVisitRequests(startDate, endDate);
    return { success: true, data: visitRequests };
  } catch (error) {
    logger.error('Error in getVisitRequests resolver:', error);
    return { 
      success: false, 
      error: error.message,
      errorCode: ERROR_CODES.FETCH_VISITS_ERROR
    };
  }
});

/**
 * Resolver: Get Jira base URL
 */
resolver.define('getJiraBaseUrl', async () => {
  try {
    const result = await getJiraBaseUrl();
    return { success: true, ...result };
  } catch (error) {
    logger.error('Error in getJiraBaseUrl resolver:', error);
    return { 
      success: false, 
      error: error.message,
      errorCode: ERROR_CODES.NETWORK_ERROR
    };
  }
});

/**
 * Resolver: Get admin settings
 */
resolver.define('getAdminSettings', async () => {
  try {
    const settings = await getSettings();
    return { success: true, settings };
  } catch (error) {
    logger.error('Error in getAdminSettings resolver:', error);
    return { 
      success: false, 
      error: error.message,
      errorCode: ERROR_CODES.LOAD_SETTINGS_ERROR
    };
  }
});

/**
 * Resolver: Save admin settings
 */
resolver.define('saveAdminSettings', async (req) => {
  try {
    const { settings } = req.payload;
    if (!settings) {
      throw new Error('Settings object is required');
    }
    
    await storage.set('adminSettings', settings);
    logger.log('Settings saved successfully');
    return { success: true, message: 'Settings saved successfully' };
  } catch (error) {
    logger.error('Error in saveAdminSettings resolver:', error);
    return { 
      success: false, 
      error: error.message,
      errorCode: ERROR_CODES.SAVE_SETTINGS_ERROR
    };
  }
});

/**
 * Resolver: Fetch workflow statuses for a project
 */
resolver.define('fetchWorkflowStatuses', async (req) => {
  try {
    const { projectKey, requestType } = req.payload;
    if (!projectKey) {
      return { success: false, error: 'Project key is required' };
    }

    const statuses = await fetchWorkflowStatuses(projectKey, requestType);
    return { success: true, statuses };
  } catch (error) {
    logger.error('Error in fetchWorkflowStatuses resolver:', error);
    return { 
      success: false, 
      error: error.message,
      errorCode: ERROR_CODES.FETCH_FIELDS_ERROR
    };
  }
});

/**
 * Resolver: Fetch custom fields from Jira
 */
resolver.define('fetchCustomFields', async () => {
  try {
    const result = await api.asApp().requestJira(route`/rest/api/3/field`);
    
    if (!result.ok) {
      const errorText = await result.text();
      logger.error('Failed to fetch custom fields:', result.status, errorText);
      throw new Error(`Failed to fetch custom fields: ${result.status}`);
    }
    
    const fields = await result.json();
    
    const customFields = fields
      .filter(field => field.id && field.id.startsWith('customfield_'))
      .map(field => ({
        id: field.id,
        name: field.name,
        type: field.schema?.type || 'unknown'
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    return { success: true, customFields };
  } catch (error) {
    logger.error('Error in fetchCustomFields resolver:', error);
    return { 
      success: false, 
      error: error.message,
      errorCode: ERROR_CODES.FETCH_FIELDS_ERROR
    };
  }
});

/**
 * Resolver: Search for projects (with pagination)
 */
resolver.define('searchProjects', async (req) => {
  try {
    logger.log('Fetching projects with pagination...');
    
    const projectMap = new Map();
    let startAt = 0;
    const maxResults = 50;
    let hasMore = true;
    let safetyCount = 0;
    
    while (hasMore && safetyCount < 20) {
      safetyCount++;
      
      const result = await withRetry(async () => {
        return await api.asApp().requestJira(
          route`/rest/api/3/project/search?startAt=${startAt}&maxResults=${maxResults}&orderBy=name`,
          { headers: { 'Accept': 'application/json' } }
        );
      });
      
      if (!result.ok) {
        const errorText = await result.text();
        logger.error('Failed to fetch projects:', result.status, errorText);
        throw new Error(`Failed to fetch projects: ${result.status}`);
      }
      
      const data = await result.json();
      const values = data.values || [];
      
      values.forEach(p => projectMap.set(p.id, p));
      
      // Determine if there are more pages
      if (typeof data.total === 'number') {
        startAt += maxResults;
        hasMore = startAt < data.total;
      } else if (typeof data.isLast === 'boolean') {
        hasMore = !data.isLast;
        if (hasMore) startAt += maxResults;
      } else {
        hasMore = values.length === maxResults;
        if (hasMore) startAt += maxResults;
      }
      
      // Safety limit
      if (projectMap.size >= 1000) {
        logger.warn('Reached safety limit of 1000 projects');
        hasMore = false;
      }
    }
    
    logger.log(`Fetched ${projectMap.size} total unique projects`);
    
    const projects = Array.from(projectMap.values())
      .map(project => ({
        key: project.key,
        name: project.name,
        id: project.id
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    return { success: true, projects };
  } catch (error) {
    logger.error('Error in searchProjects resolver:', error);
    return { 
      success: false, 
      error: error.message,
      errorCode: ERROR_CODES.FETCH_PROJECTS_ERROR
    };
  }
});

/**
 * Resolver: Fetch request types for a JSM project
 */
resolver.define('fetchRequestTypes', async (req) => {
  try {
    const { projectKey } = req.payload;
    
    if (!projectKey) {
      return { success: false, error: 'Project key is required' };
    }
    
    const projectResult = await api.asApp().requestJira(route`/rest/api/3/project/${projectKey}`);
    
    if (!projectResult.ok) {
      logger.error('Failed to fetch project:', projectResult.status);
      throw new Error('Failed to fetch project details');
    }
    
    const projectData = await projectResult.json();
    
    try {
      const serviceDeskResult = await api.asApp().requestJira(
        route`/rest/servicedeskapi/servicedesk/${projectData.id}/requesttype`
      );
      
      if (serviceDeskResult.ok) {
        const data = await serviceDeskResult.json();
        const requestTypes = (data.values || [])
          .map(rt => ({
            id: rt.id,
            name: rt.name,
            description: rt.description,
            type: 'requestType'
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        
        return { success: true, requestTypes, isServiceDesk: true };
      }
    } catch (sdError) {
      logger.log('Service desk API not available for project:', projectKey);
    }
    
    return { success: false, isServiceDesk: false, error: 'This is not a JSM project' };
  } catch (error) {
    logger.error('Error in fetchRequestTypes resolver:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Resolver: Fetch issue types for a regular Jira project
 */
resolver.define('fetchIssueTypes', async (req) => {
  try {
    const { projectKey } = req.payload;
    
    if (!projectKey) {
      return { success: false, error: 'Project key is required' };
    }
    
    const projectResult = await api.asApp().requestJira(route`/rest/api/3/project/${projectKey}`);
    
    if (!projectResult.ok) {
      throw new Error('Failed to fetch project details');
    }
    
    const projectData = await projectResult.json();
    const issueTypes = (projectData.issueTypes || [])
      .map(it => ({
        id: it.id,
        name: it.name,
        description: it.description || '',
        type: 'issueType'
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    return { success: true, issueTypes };
  } catch (error) {
    logger.error('Error in fetchIssueTypes resolver:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Resolver: Detect project type (JSM vs regular Jira)
 */
resolver.define('detectProjectType', async (req) => {
  try {
    const { projectKey } = req.payload;
    
    if (!projectKey) {
      return { success: false, error: 'Project key is required' };
    }
    
    const projectResult = await api.asApp().requestJira(route`/rest/api/3/project/${projectKey}`);
    
    if (!projectResult.ok) {
      throw new Error('Failed to fetch project');
    }
    
    const projectData = await projectResult.json();
    
    try {
      const serviceDeskResult = await api.asApp().requestJira(
        route`/rest/servicedeskapi/servicedesk/${projectData.id}/requesttype`
      );
      
      if (serviceDeskResult.ok) {
        return { success: true, isServiceDesk: true, projectType: 'JSM' };
      }
    } catch (sdError) {
      // Not a service desk project
    }
    
    return { success: true, isServiceDesk: false, projectType: 'Jira' };
  } catch (error) {
    logger.error('Error in detectProjectType resolver:', error);
    return { success: false, error: error.message };
  }
});

export const handler = resolver.getDefinitions();