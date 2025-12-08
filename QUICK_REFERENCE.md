# Advanced Calendar for Jira - Quick Reference

## 🚀 Quick Start

### Installation
```bash
# Install dependencies
npm install
cd static && npm install

# Deploy to development
./deploy-to-dev.sh

# Deploy to production
./deploy-to-prod.sh
```

### Basic Usage
1. Configure admin settings in Jira
2. Select projects and work item types
3. Map custom fields (Time of Visit, End Time, Site, etc.)
4. View calendar in Monthly or Weekly mode

---

## 📁 Project Structure

```
Advanced-Calendar/
├── src/
│   ├── index.js           # Backend resolver (API calls)
│   └── utils/             # Utility modules
│       ├── logger.js      # Logging utility
│       ├── constants.js   # Configuration constants
│       ├── dateUtils.js   # Date formatting/parsing
│       └── apiUtils.js    # API helpers (retry, batching)
├── static/
│   ├── src/
│   │   ├── App.js         # Main calendar application
│   │   └── components/    # React components
│   └── admin/
│       └── src/
│           └── App.js     # Admin configuration panel
└── manifest.yml           # Forge app manifest
```

---

## 🔧 Key Features

### Calendar Views
- **Monthly View**: Overview of all visits in a month
- **Weekly View**: Detailed week-by-week schedule
- **Event Details**: Click any event for full information

### Filtering & Stats
- Filter by site/location
- View total visits count
- See busiest day statistics
- Color-coded visit types

### Multi-Project Support
- Configure multiple Jira projects
- Support for JSM request types
- Support for regular Jira issue types
- Flexible work item type selection

---

## 🎯 Common Tasks

### Add a New Custom Field
1. Open Admin panel
2. Click "Add Custom Field"
3. Select field from dropdown
4. Configure label and display settings
5. Save settings

### Change Date Range
- Use Previous/Next buttons for navigation
- Calendar automatically fetches data for visible range
- Optimized with batching for large datasets

### Troubleshooting
| Issue | Solution |
|-------|----------|
| No visits showing | Check admin settings, verify custom field mappings |
| Slow loading | Reduce date range, check API rate limits |
| Missing sites | Verify "Site" custom field is configured |

---

## ⚙️ Configuration

### Admin Settings Structure
```json
{
  "projects": ["PROJECT1", "PROJECT2"],
  "requestTypesWithProjects": [
    {
      "name": "Visit",
      "projectKey": "PROJECT1",
      "itemType": "requestType"
    }
  ],
  "customFields": {
    "timeOfVisit": "customfield_10061",
    "endTime": "customfield_10179",
    "site": "customfield_10065",
    "typeOfVisit": "customfield_10066",
    "visitorName": "customfield_10067",
    "additionalFields": []
  },
  "calendarBarFields": {
    "monthly": ["site", "typeOfVisit"],
    "weekly": ["site", "typeOfVisit"]
  }
}
```

### Environment Variables
None required - all configuration through admin UI.

---

## 🔌 API Endpoints

### Frontend → Backend (via Forge Bridge)
- `getVisitRequests(startDate, endDate)` - Fetch visits
- `getJiraBaseUrl()` - Get Jira instance URL
- `getAdminSettings()` - Load configuration
- `saveAdminSettings(settings)` - Save configuration
- `fetchWorkflowStatuses(projectKey, requestType)` - Get statuses
- `fetchCustomFields()` - Get available custom fields
- `searchProjects()` - Get all projects
- `fetchRequestTypes(projectKey)` - Get JSM request types
- `fetchIssueTypes(projectKey)` - Get Jira issue types
- `detectProjectType(projectKey)` - Check if JSM or Jira

### Response Format (NEW)
All resolvers now return:
```json
{
  "success": true,
  "data": {...},        // On success
  "error": "...",       // On failure
  "errorCode": "..."    // Error code for handling
}
```

---

## 🎨 Customization

### Calendar Bar Fields
Configure which fields appear in calendar event bars:
```json
{
  "calendarBarFields": {
    "monthly": ["site", "typeOfVisit"],
    "weekly": ["site", "typeOfVisit", "visitorName"]
  }
}
```

Available fields:
- `site` - Location/site information
- `typeOfVisit` - Visit type/category
- `visitorName` - Name of visitor
- Custom fields (by ID from additionalFields)

### Status Colors
Status colors automatically map to categories:
- **Blue**: New/Open
- **Orange**: In Progress/Indeterminate
- **Green**: Done/Completed
- **Gray**: Undefined/Other

---

## 📊 Performance Tips

1. **Use date filtering**: Narrow date ranges load faster
2. **Batch processing**: App automatically batches large queries
3. **Parallel requests**: Up to 3 parallel batches for speed
4. **Retry logic**: Automatic retry on failures with backoff
5. **Caching**: Browser caches results within session

---

## 🐛 Debugging

### Enable Debug Logging
In `src/utils/logger.js`:
```javascript
const MIN_LOG_LEVEL = LOG_LEVELS.DEBUG; // Change to DEBUG
```

### Check Browser Console
- All API calls logged
- Error messages with codes
- Performance metrics
- Data transformation steps

### Common Error Codes
- `FETCH_VISITS_ERROR`: Issue fetching visit data
- `NETWORK_ERROR`: Connection problem
- `LOAD_SETTINGS_ERROR`: Settings read failed
- `SAVE_SETTINGS_ERROR`: Settings write failed
- `RATE_LIMIT_ERROR`: Too many API requests

---

## 📚 Additional Resources

- [Architecture Documentation](ARCHITECTURE.md)
- [Implementation Guide](IMPLEMENTATION.md)
- [Forge Documentation](https://developer.atlassian.com/platform/forge/)

---

**Version**: 2.0.0  
**Last Updated**: 2025  
**Maintained by**: XALT Team
