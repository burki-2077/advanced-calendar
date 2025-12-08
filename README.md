# Advanced Calendar for Jira

Advanced calendar views for Jira Software and JSM issues: true hourly timelines, continuous multi-day spans, legends, filters, analytics, and configurable field mapping.

## Highlights
- Monthly and weekly views with overlap-safe layout and continuous multi-day bars.
- Color-coded status categories plus visit-type icons/legend; filter by site/location.
- Click-to-details modal with full field data and deep links back to Jira.
- Works across Jira Software and JSM via configurable custom field mapping.
- Buffered date fetching and batched Jira calls for large datasets (1k+ issues).
- Admin UI for project selection and field mapping; auto-detects JSM vs Jira Software.

## Architecture
- **Forge backend (Node.js):** Two-step fetch (keys → batched details), retry/backoff helpers, date utilities, JQL builder, standardized `{ success, data | error, errorCode }` responses.
- **Frontend (React):** Custom monthly/weekly calendars, overlap detection, buffered range fetch, responsive layout, legends, filters, analytics.
- **Admin panel (React):** Configure projects and custom field mapping; drives backend query/mapping.

## Requirements
- Node.js 18+
- Atlassian Forge CLI
- Jira Cloud instance

## Quickstart
```bash
git clone https://github.com/burki-2077/advanced-calendar.git
cd advanced-calendar
npm install
cd static && npm install && cd ..
```

### Build frontend
```bash
cd static && npm run build && cd ..
```

### Deploy to Forge
```bash
./deploy-to-dev.sh    # development
./deploy-to-prod.sh   # production
# or
forge deploy --environment development
```

## Admin configuration
- Open the Admin panel in Jira (app settings).
- Choose projects and map custom fields (site, visit type, start/end time, etc.).
- App auto-detects JSM vs Jira Software to adjust mapping.

## Development
```bash
# Install (root + frontend)
npm install && cd static && npm install && cd ..

# Frontend dev server
cd static && npm start

# Lint
cd static && npm run lint
```

## Troubleshooting
- No events: check project permissions and custom field IDs in Admin.
- Layout oddities: rebuild frontend `cd static && npm run build`, then redeploy.
- CSP issues: ensure no inline styles/scripts (all styling is externalized).

## Repository
- Primary GitHub: https://github.com/burki-2077/advanced-calendar
- Existing Bitbucket remote remains untouched.
