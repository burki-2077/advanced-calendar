import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

// Function to fetch client visits
async function fetchVisitRequests() {
  try {
    console.log('Starting to fetch visits from SUPPORT project');
    // Using project=SUPPORT and issue type=Visit
    const jql = 'project = SUPPORT AND issuetype = Visit ORDER BY created DESC';
  
    console.log(`Executing JQL: ${jql}`);
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
          'customfield_10119',  // Time of visit (Start time)
          'customfield_10799',  // End time
          'customfield_10066',  // Site
          'customfield_10255',  // Customer Name
          'customfield_10256',  // Contact Name
          'customfield_10996'   // Type of visit
        ],
        maxResults: 100
      })
    });

    console.log('API Response status:', result.status);
    const data = await result.json();
    
    // If no issues found, return empty array
    if (!data.issues || data.issues.length === 0) {
      console.log('No visit requests found in Jira');
      return [];
    }
    
    console.log(`Found ${data.issues.length} visit requests, processing...`);
    
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
      
      // Handle different datetime formats
      if (typeof dateTimeObj === 'string') {
        return dateTimeObj;
      }
      
      // Atlassian datetime format has 'iso' property
      if (dateTimeObj.iso) {
        return dateTimeObj.iso;
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
        } else if (issue.fields.description.content) {
          // Process Atlassian Document Format
          description = issue.fields.description.content
            .map(block => {
              if (block.type === 'paragraph') {
                return block.content
                  .map(text => text.text || '')
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
      
      // Process times - handle various formats
      let startTime = null;
      let endTime = null;
      
      if (issue.fields.customfield_10119) {
        startTime = issue.fields.customfield_10119;
      }
      
      if (issue.fields.customfield_10799) {
        endTime = issue.fields.customfield_10799;
      }
      
      let eventStartTime = formatDateTime(startTime);
      let eventEndTime = formatDateTime(endTime);
      
      // If no times specified, use created date as fallback
      if (!eventStartTime) {
        eventStartTime = issue.fields.created;
      }
      
      if (!eventEndTime && eventStartTime) {
        // Default to 1 hour duration if only start time is available
        const startDate = new Date(eventStartTime);
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);
        eventEndTime = endDate.toISOString();
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
        contactName: getSafeFieldValue(issue.fields.customfield_10256), // Contact Name
        visitType: getSafeFieldValue(issue.fields.customfield_10996) // Type of visit
      };
      
      console.log(`Processed visit: ${issue.key}, start: ${eventStartTime}, end: ${eventEndTime}`);
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
    console.log('getVisitRequests resolver called');
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