import api, { route } from '@forge/api';

const PROJECT_KEY = 'HR';
const REQUEST_TYPE_NAME = 'Vacation request';

// Custom field IDs as specified
const CUSTOM_FIELDS = {
  LEAVE_TYPE: 'customfield_10178',
  MANAGER: 'customfield_10062', 
  START_DATE: 'customfield_10015',
  END_DATE: 'customfield_10963'
};

export const getVacationRequests = async () => {
  try {
    // Search for issues in HR project with "Vacation request" request type
    const jql = `project = "${PROJECT_KEY}" AND "Customer Request Type" = "${REQUEST_TYPE_NAME}" ORDER BY created DESC`;
    
    const response = await api.asApp().requestJira(route`/rest/api/3/search`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jql: jql,
        maxResults: 100,
        fields: [
          'summary',
          'status',
          'reporter',
          'created',
          'updated',
          'description',
          CUSTOM_FIELDS.LEAVE_TYPE,
          CUSTOM_FIELDS.MANAGER,
          CUSTOM_FIELDS.START_DATE,
          CUSTOM_FIELDS.END_DATE
        ]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error fetching vacation requests:', data);
      throw new Error(`HTTP ${response.status}: ${data.errorMessages?.join(', ') || 'Unknown error'}`);
    }

    return data.issues || [];
  } catch (error) {
    console.error('Error in getVacationRequests:', error);
    throw error;
  }
};

export const getVacationRequestDetails = async (issueKey) => {
  try {
    const response = await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error fetching vacation request details:', data);
      throw new Error(`HTTP ${response.status}: ${data.errorMessages?.join(', ') || 'Unknown error'}`);
    }

    return data;
  } catch (error) {
    console.error('Error in getVacationRequestDetails:', error);
    throw error;
  }
};

export const getLeaveTypes = async () => {
  try {
    // Return default leave types since we don't have admin permissions to fetch field metadata
    return [
      { value: 'annual-leave', label: 'Annual Leave' },
      { value: 'sick-leave', label: 'Sick Leave' },
      { value: 'personal-leave', label: 'Personal Leave' },
      { value: 'maternity-leave', label: 'Maternity Leave' },
      { value: 'paternity-leave', label: 'Paternity Leave' },
      { value: 'emergency-leave', label: 'Emergency Leave' },
      { value: 'bereavement-leave', label: 'Bereavement Leave' },
      { value: 'study-leave', label: 'Study Leave' }
    ];
  } catch (error) {
    console.error('Error in getLeaveTypes:', error);
    // Return default options as fallback
    return [
      { value: 'annual-leave', label: 'Annual Leave' },
      { value: 'sick-leave', label: 'Sick Leave' },
      { value: 'personal-leave', label: 'Personal Leave' }
    ];
  }
};

export async function fetchJiraIssues(jql, fields = []) {
  try {
    const result = await api.asUser().requestJira(route`/rest/api/3/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jql: jql,
        fields: fields,
        maxResults: 100
      })
    });

    const data = await result.json();
    return data.issues || [];
  } catch (error) {
    console.error('Error fetching Jira issues:', error);
    throw error;
  }
}

export async function getJiraBaseUrl() {
  try {
    const response = await api.asApp().requestJira(route`/rest/api/3/serverInfo`);
    const serverInfo = await response.json();
    return serverInfo.baseUrl;
  } catch (error) {
    console.error('Error getting Jira base URL:', error);
    throw error;
  }
}

 