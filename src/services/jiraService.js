import api, { route } from '@forge/api';

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



 