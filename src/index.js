import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

// Function to fetch client visits
async function fetchVisitRequests() {
  try {
    // Use the correct JQL with request type filter and no result limit
    const jql = 'project = SUPPORT AND "request type" = "Visit (SUPPORT)" ORDER BY created DESC';
    
    const result = await api.asUser().requestJira(route`/rest/api/3/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jql: jql,
        fields: [
          'summary', 
          'description', 
          'status',
          'created',
          'assignee',
          'issuetype',
          'customfield_10119',  // Time of visit (Start time)
          'customfield_11004',  // End time
          'customfield_10066',  // Site
          'customfield_10255',  // Customer Company Name
          'customfield_10110',  // Contact Name
          'customfield_11007',  // Type of visit
          'customfield_10335',  // Visitor List
          'customfield_10613'   // Reason
        ]
        // Removed maxResults to allow counting all visits
      })
    });

    const data = await result.json();
    
    // If no issues found, return empty array
    if (!data || !data.issues || data.issues.length === 0) {
      return [];
    }
    
    // Helper function to safely get field values that might be null/undefined
    const getSafeFieldValue = (field) => {
      if (!field) return '';
      
      // Handle different field formats
      if (field.value) return field.value;
      if (field.name) return field.name;
      if (typeof field === 'string') return field;
      
      return '';
    };
    
    // Format datetime string to ISO
    const formatDateTime = (dateTimeObj) => {
      if (!dateTimeObj) return null;
      
      // Handle different datetime formats from Jira
      if (typeof dateTimeObj === 'string') {
        // Already a string, likely ISO format
        return dateTimeObj;
      }
      
      if (typeof dateTimeObj === 'object') {
        // Check for different Jira datetime object formats
        if (dateTimeObj.iso) {
          return dateTimeObj.iso;
        }
        
        if (dateTimeObj.value) {
          return dateTimeObj.value;
        }
        
        if (dateTimeObj.displayValue) {
          return dateTimeObj.displayValue;
        }
        
        // Handle date object format with year, month, day, hour, minute
        if (dateTimeObj.year && dateTimeObj.month && dateTimeObj.day) {
          const year = dateTimeObj.year;
          const month = String(dateTimeObj.month).padStart(2, '0');
          const day = String(dateTimeObj.day).padStart(2, '0');
          const hour = String(dateTimeObj.hour || 0).padStart(2, '0');
          const minute = String(dateTimeObj.minute || 0).padStart(2, '0');
          
          return `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
        }
        
        // Try to convert object to string
        return dateTimeObj.toString();
      }
      
      return null;
    };
    
    const processedEvents = data.issues.map(issue => {
      // Get summary and description
      let summary = issue.fields.summary || 'Untitled Visit';
      let description = '';
      
      // Process description - can be in different formats
      if (issue.fields.description) {
        if (typeof issue.fields.description === 'string') {
          description = issue.fields.description;
        } else if (issue.fields.description.content && Array.isArray(issue.fields.description.content)) {
          // Process Atlassian Document Format
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
      
      // Get status
      let statusName = 'Open';
      if (issue.fields.status && issue.fields.status.name) {
        statusName = issue.fields.status.name;
      }
      
      // Process times - handle various formats and improve multi-day detection
      let startTime = null;
      let endTime = null;
      
      if (issue.fields.customfield_10119) {
        startTime = issue.fields.customfield_10119;
      }
      
      if (issue.fields.customfield_11004) {
        endTime = issue.fields.customfield_11004;
      }
      
      let eventStartTime = formatDateTime(startTime);
      let eventEndTime = formatDateTime(endTime);
      
      // If no start time specified, use created date as fallback
      if (!eventStartTime) {
        eventStartTime = issue.fields.created;
      }
      
      // Better end time handling for multi-day visits
      if (!eventEndTime && eventStartTime) {
        const startDate = new Date(eventStartTime);
        
        // Check if this looks like a multi-day visit based on naming patterns
        const summaryLower = summary.toLowerCase();
        const isLikelyMultiDay = 
          summaryLower.includes('week') ||
          summaryLower.includes('weeks') ||
          summaryLower.includes('day') ||
          summaryLower.includes('days') ||
          summaryLower.includes('month') ||
          summaryLower.includes('installation') ||
          summaryLower.includes('project') ||
          summaryLower.includes('migration') ||
          summaryLower.includes('training') ||
          summaryLower.includes('deployment') ||
          summaryLower.includes('implementation');
        
        if (isLikelyMultiDay) {
          // For likely multi-day visits, default to 3 days if no end time
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 2); // 3 days total
          eventEndTime = endDate.toISOString();
        } else {
          // For regular visits, default to 1 hour duration
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 1);
          eventEndTime = endDate.toISOString();
        }
      }
      
      const event = {
        id: issue.id,
        key: issue.key,
        summary: summary,
        description: description,
        status: statusName,
        startTime: eventStartTime,
        endTime: eventEndTime,
        assignee: issue.fields.assignee?.displayName || '',
        site: getSafeFieldValue(issue.fields.customfield_10066), // Site
        customerName: getSafeFieldValue(issue.fields.customfield_10255), // Customer Name
        contactName: getSafeFieldValue(issue.fields.customfield_10110), // Customer Contact
        visitType: getSafeFieldValue(issue.fields.customfield_11007), // Type of visit
        visitorList: getSafeFieldValue(issue.fields.customfield_10335), // Visit - Visitor List
        visitReason: getSafeFieldValue(issue.fields.customfield_10613) // Visit - Reason
      };
      
      return event;
    }).filter(event => event.startTime); // Filter out events with no valid start time
    
    return processedEvents;
  } catch (error) {
    console.error('Error fetching visits:', error);
    return { error: error.message };
  }
}

// Helper function to get color based on status
function getStatusColor(status) {
  if (!status) return '#6554C0'; // Default color
  
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'done':
      return '#36B37E'; // Green
    case 'pending':
    case 'work in progress':
    case 'waiting for start':
      return '#FFAB00'; // Yellow/Orange
    case 'cancelled':
      return '#FF5630'; // Red
    default:
      return '#6554C0'; // Purple (default)
  }
}

// Get JIRA base URL
async function getJiraBaseUrl() {
  try {
    const result = await api.asApp().requestJira(route`/rest/api/3/serverInfo`);
    const data = await result.json();
    return { baseUrl: data.baseUrl };
  } catch (error) {
    console.error('Error fetching Jira base URL:', error);
    return { error: error.message };
  }
}

// Resolver function to get all visit requests
resolver.define('getVisitRequests', async () => {
  try {
    const visitRequests = await fetchVisitRequests();
    return visitRequests;
  } catch (error) {
    console.error('Error in getVisitRequests resolver:', error);
    return { error: error.message };
  }
});

// Resolver function to get Jira base URL
resolver.define('getJiraBaseUrl', async () => {
  try {
    return await getJiraBaseUrl();
  } catch (error) {
    console.error('Error in getJiraBaseUrl resolver:', error);
    return { error: error.message };
  }
});

export const handler = resolver.getDefinitions(); 