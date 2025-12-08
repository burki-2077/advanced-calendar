# Advanced Calendar for Jira - Architecture Documentation

## 🏗️ System Architecture

### Overview
Advanced Calendar is a Forge app that provides calendar views for Jira work items. It uses a **modular architecture** with clear separation between backend API logic, frontend UI components, and utility functions.

```
┌─────────────────────────────────────────────────────────┐
│                      Jira Cloud                         │
│  ┌──────────────┐    ┌──────────────┐                 │
│  │   Calendar   │    │    Admin     │                  │
│  │   Modules    │    │    Panel     │                  │
│  └──────┬───────┘    └──────┬───────┘                 │
│         │                    │                          │
│         └────────┬───────────┘                          │
│                  │ Forge Bridge                         │
│         ┌────────▼───────────────────┐                 │
│         │   Backend Resolvers        │                 │
│         │   (src/index.js)           │                 │
│         └────────┬───────────────────┘                 │
│                  │                                      │
│         ┌────────▼───────────────────┐                 │
│         │    Utility Modules         │                 │
│         │  • Logger                  │                 │
│         │  • API Utils (retry, etc)  │                 │
│         │  • Date Utils              │                 │
│         │  • Constants               │                 │
│         └────────┬───────────────────┘                 │
│                  │                                      │
│         ┌────────▼───────────────────┐                 │
│         │    Jira REST API            │                 │
│         │  • /search/jql              │                 │
│         │  • /project                 │                 │
│         │  • /field                   │                 │
│         │  • /servicedeskapi          │                 │
│         └─────────────────────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### 1. Visit Data Fetching (Optimized 2-Step Process)

```
User selects date range
         │
         ▼
Frontend (App.js) calls getVisitRequests()
         │
         ▼
Backend Resolver (index.js)
         │
         ├──► Step 1: fetchIssueKeys(jql)
         │    • Fetch only keys (lightweight)
         │    • Up to 1000 keys
         │    • Single JQL query
         │
         ├──► Step 2: fetchIssueDetails(keys)
         │    • Split keys into batches (50 per batch)
         │    • Fetch full details in parallel
         │    • 3 concurrent batches max
         │    • 300ms delay between batches
         │
         ├──► Step 3: processIssueData(issues)
         │    • Transform to calendar events
         │    • Handle missing dates
         │    • Extract custom fields
         │
         ▼
Return {success: true, data: events}
         │
         ▼
Frontend receives and displays events
```

### 2. Error Handling Flow

```
API Call
   │
   ├──► Try request
   │      │
   │      ├─ Success ──► Return {success: true, data: ...}
   │      │
   │      └─ Failure ──► Retry Logic
   │                      │
   │                      ├─ Retry 1 (1s delay)
   │                      ├─ Retry 2 (2s delay)
   │                      ├─ Retry 3 (4s delay)
   │                      │
   │                      └─ All failed
   │                         │
   │                         ▼
   │                    Return {
   │                      success: false,
   │                      error: "message",
   │                      errorCode: "CODE"
   │                    }
   │
   ▼
Frontend handles error gracefully
```

---

## 🧩 Component Architecture

### Backend (src/)

#### **index.js** - Main Resolver
- Defines all API resolvers
- Orchestrates data fetching
- Handles Forge storage operations
- Implements business logic

#### **utils/logger.js**
- Centralized logging with levels (DEBUG, LOG, WARN, ERROR)
- Timestamp and context tracking
- Configurable log levels for production

#### **utils/constants.js**
- Configuration constants (batch sizes, delays, limits)
- Default settings
- Error codes
- HTTP status codes

#### **utils/dateUtils.js**
- Date formatting and parsing
- Date validation
- Range calculations (week, month)
- ISO format conversions

#### **utils/apiUtils.js**
- Retry logic with exponential backoff
- Array chunking for batching
- Parallel batch execution
- Field value extraction
- Error message normalization

### Frontend (static/src/)

#### **App.js** - Main Calendar Application
**State Management:**
```javascript
- events: Array<Event>              // All fetched events
- filteredEvents: Array<Event>      // Events after filtering
- selectedDate: Date                // Current view date
- viewMode: 'week' | 'month'        // Calendar view mode
- loadingVisits: boolean            // Loading state
- availableSites: Array<string>     // Unique sites for filter
- selectedSite: string              // Current site filter
- stats: {totalVisits, busiestDay}  // Statistics
```

**Key Functions:**
- `fetchVisitsForRange(startDate, endDate)` - Fetch and transform data
- `calculateStats(events)` - Compute statistics
- `getEventsInCurrentView(events)` - Filter for visible range
- `handleEventClick(event)` - Show event details

#### **components/** - UI Components
- `MonthlyCalendarView.js` - Month grid layout
- `WeeklyCalendarView.js` - Week schedule layout
- `VisitDetailsModal.js` - Event details popup
- Other specialized components

#### **admin/src/App.js** - Admin Configuration
- Project selection
- Work item type configuration
- Custom field mapping
- Settings persistence

---

## 📦 Module Dependencies

### Backend Dependencies
```
@forge/resolver    - Define API resolvers
@forge/api         - Make Jira API calls
@forge/storage     - Store configuration
```

### Frontend Dependencies
```
react              - UI framework
@forge/bridge      - Frontend-backend communication
@forge/react       - Forge React components
```

---

## 🔐 Security Architecture

### Content Security Policy (CSP)
- **No inline scripts**: All JavaScript in separate files
- **No inline styles**: All CSS in external stylesheets
- **Secure data handling**: XSS prevention through React escaping

### Authentication
- Uses Forge app authentication
- API calls made as:
  - `api.asApp()` - App-level permissions
  - `api.asUser()` - User-level permissions (for JQL)

### Data Storage
- Settings stored in Forge storage (encrypted)
- No sensitive data in frontend state
- All custom field IDs validated

---

## ⚡ Performance Optimizations

### 1. **Optimized Fetch Strategy**
- **Before**: 1 query with all fields (slow, limited to 100 results)
- **After**: 
  1. Fetch 1000 keys (fast, lightweight)
  2. Batch fetch details (parallel, controlled rate)

### 2. **Batch Processing**
```javascript
Batch Size: 50 issues
Parallel Batches: 3
Delay Between Batches: 300ms
Max Results: 1000 issues
```

### 3. **Retry Logic**
- Exponential backoff (1s, 2s, 4s)
- Skip non-retryable errors (4xx except 429)
- Automatic recovery from rate limits

### 4. **Frontend Optimizations**
- React.memo for expensive components
- useCallback for event handlers
- Lazy loading for large datasets
- Efficient re-renders with proper key props

---

## 🔌 API Integration

### Jira REST API Endpoints Used

#### Core Endpoints
```
GET  /rest/api/3/serverInfo
     → Get Jira base URL

POST /rest/api/3/search/jql
     → Search issues with JQL
     → Fetch issue details

GET  /rest/api/3/field
     → Get custom field definitions

GET  /rest/api/3/project/search
     → List all projects (paginated)

GET  /rest/api/3/project/{projectKey}
     → Get project details

GET  /rest/api/3/project/{projectKey}/statuses
     → Get workflow statuses
```

#### JSM-Specific Endpoints
```
GET  /rest/servicedeskapi/servicedesk/{serviceDeskId}/requesttype
     → Get request types for JSM projects
```

### Rate Limiting Strategy
- **Per-batch delay**: 300ms between batches
- **Retry on 429**: Automatic with exponential backoff
- **Parallel limit**: Max 3 concurrent requests
- **Total throughput**: ~150-200 issues/second

---

## 🧪 Testing Strategy

### Unit Testing (Recommended)
```javascript
// Test utility functions
test('formatDateTime handles null input', () => {
  expect(formatDateTime(null)).toBeNull();
});

// Test API utilities
test('chunkArray splits correctly', () => {
  const result = chunkArray([1,2,3,4,5], 2);
  expect(result).toEqual([[1,2], [3,4], [5]]);
});
```

### Integration Testing
- Test resolver functions with mock API responses
- Verify error handling paths
- Check retry logic behavior

### End-to-End Testing
- Manual testing in Jira environment
- Verify calendar views display correctly
- Test filtering and statistics
- Validate admin configuration flow

---

## 📊 Monitoring & Logging

### Log Levels
```
DEBUG   - Verbose: all function calls, data transforms
LOG     - Standard: key operations, results counts
WARN    - Issues: missing data, skipped events
ERROR   - Failures: API errors, critical problems
```

### Key Metrics to Monitor
- API call success rate
- Average fetch time per visit
- Number of retries needed
- Events processed vs displayed
- Admin settings save failures

### Log Analysis
```javascript
// Example log patterns
[2025-01-30T10:00:00Z] [LOG] Fetched 247 issue keys
[2025-01-30T10:00:01Z] [LOG] Created 5 batches of up to 50 keys each
[2025-01-30T10:00:05Z] [LOG] Fetch complete: 247 issues from 5 batches
[2025-01-30T10:00:05Z] [LOG] Processed events: 247 total, 245 valid, 2 dropped
```

---

## 🔄 Upgrade Path

### From 1.x to 2.0
1. **New utility modules**: No action needed (backward compatible)
2. **API response format**: Update frontend to handle `{success, data, error}`
3. **CSP compliance**: Remove any inline styles/scripts
4. **Error codes**: Implement error code handling in frontend

### Future Enhancements
- [ ] Caching layer for repeated queries
- [ ] WebSocket for real-time updates
- [ ] Export calendar to iCal/Google Calendar
- [ ] Advanced filtering (by assignee, status, etc.)
- [ ] Drag-and-drop rescheduling

---

## 🎯 Design Decisions

### Why 2-Step Fetch?
- Jira API limits results to 100 per query when fetching all fields
- Fetching keys first allows up to 1000 results
- Batching details keeps memory usage low
- Parallel execution maintains speed

### Why Separate Utility Modules?
- **Testability**: Easy to unit test pure functions
- **Reusability**: Share code between resolvers
- **Maintainability**: Clear separation of concerns
- **Debugging**: Easier to trace issues

### Why New API Response Format?
- **Consistency**: All resolvers return same structure
- **Error Handling**: Frontend can handle errors uniformly
- **Type Safety**: Clear contract between frontend/backend
- **Extensibility**: Easy to add new response fields

---

## 📝 Code Style Guidelines

### JavaScript/React
- Use ES6+ features (arrow functions, destructuring, etc.)
- Prefer `const` over `let`, never use `var`
- Use JSDoc comments for functions
- Component files use PascalCase
- Utility files use camelCase

### File Organization
```
Feature-based structure:
  /components
    /MonthlyCalendarView
      MonthlyCalendarView.js
      MonthlyCalendarView.css
    /WeeklyCalendarView
      WeeklyCalendarView.js
      WeeklyCalendarView.css
```

### Error Handling
```javascript
// Always use try-catch for async operations
try {
  const result = await someAsyncOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed:', error);
  return { 
    success: false, 
    error: error.message,
    errorCode: ERROR_CODES.OPERATION_ERROR
  };
}
```

---

**Version**: 2.0.0  
**Architecture Type**: Modular, Event-Driven  
**Last Updated**: 2025  
**Maintained by**: XALT Team
