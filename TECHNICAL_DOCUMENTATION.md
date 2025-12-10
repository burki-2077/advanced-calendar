# Technical Documentation — Advanced Calendar for Jira

This guide explains how to deploy, configure, and operate the Advanced Calendar for Jira Forge app. Use it to publish on Confluence for public/marketplace audiences.

## 1. Overview
- Purpose: Turn Jira Software and Jira Service Management issues into a real calendar with hourly timelines, continuous multi-day bars, color-coded statuses, visit-type icons, and live analytics.
- Audience: Jira admins (deployment/config), project admins (field mapping), and end users (calendar usage).

## 2. Requirements
- Jira Cloud instance with admin permissions to install Forge apps.
- Node.js 18+ and Atlassian Forge CLI (for deployers).
- Custom fields in Jira for start time, end time, site/location, visit type, and any additional data you want in the modal.

## 3. Deploy the app (Forge)
1) Clone the repo: `git clone https://github.com/burki-2077/advanced-calendar.git`
2) Install dependencies:
   - Backend: `npm install`
   - Frontend: `cd static && npm install && cd ..`
3) Build frontend: `cd static && npm run build && cd ..`
4) Deploy: `./deploy-to-dev.sh` (or `./deploy-to-prod.sh` when ready).
5) Install in Jira from the Forge deployment prompt.

## 4. Admin Panel setup
1) Open **Advanced Calendar Admin** from Jira Apps.
2) Select projects you want to serve.
3) Map custom fields:
   - Start/End time
   - Site/Location
   - Visit Type
   - Additional fields you want displayed on calendar bars and in the details modal
4) Save settings. The app auto-detects Jira Software vs JSM and applies the mapping.

## 5. Calendar usage
- Views: Weekly (hourly timeline) and Monthly (grid) with continuous multi-day bars.
- Navigation: Prev/Next buttons; weekly view shows Monday–Sunday; monthly shows the full month.
- Legends: Status colors (by status category) and visit-type icons.
- Filters: Site/location filter built-in; more filters coming (status, assignee, visit type).
- Details: Click any bar to open the modal with full field data and a deep link to the Jira issue.
- Analytics: Header cards show total visits and busiest day for the current view; they update with filters.

## 6. Data fetching and performance
- Two-step fetch: Issue keys first, then batched detail fetches to handle large volumes (1k+ issues).
- Buffered date ranges: Weekly fetch includes a 4-week buffer before/after to avoid cutting multi-day events.
- Retries and backoff: API calls use standardized retries and error normalization.
- Continuous bars: Multi-day events render as single spans without broken tiles; overlap-safe layout.

## 7. Error handling
- Standard response contract: `{ success, data }` or `{ success: false, error, errorCode }`.
- UI behavior: If a fetch fails, the calendar clears and logs the error; use browser console for details.
- Common causes:
  - Missing field mappings (fix in Admin Panel).
  - Jira permissions (ensure the app user can read the project/fields).
  - CSP/style issues (rebuild frontend and redeploy).

## 8. Troubleshooting
- No events displayed:
  - Verify project access and custom field IDs in Admin.
  - Confirm start/end fields contain valid dates.
  - Rebuild frontend: `cd static && npm run build`.
- Layout looks off:
  - Hard refresh browser; rebuild and redeploy.
- Slow loads with large datasets:
  - Narrow the date range; confirm Forge app has stable connectivity; check retries in logs.
- Need more filters/fields:
  - Add fields in Admin Panel; redeploy if new UI elements were added.

## 9. Security and compliance
- Runs entirely within Atlassian Forge with Forge auth; no external services required.
- No secrets committed; relies on Jira/Forge permissions for data access.
- All styling is externalized to comply with Forge CSP (no inline styles/scripts).

## 10. Support
- Maintainer: Burak Erol (`burki-2077`)
- Issues/requests: open a GitHub issue at `https://github.com/burki-2077/advanced-calendar/issues` or contact the maintainer.
