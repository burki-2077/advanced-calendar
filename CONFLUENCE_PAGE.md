# Advanced Calendar for Jira — Confluence Page

Use this content directly on Confluence for customers/end users. It explains how to install, configure, and use the app.

## What the app does
- Turns Jira issues into weekly and monthly calendars with hourly timelines.
- Shows continuous multi-day bars, color-coded statuses, and visit-type icons.
- Includes site/location filter, quick stats (total visits, busiest day), and a click-to-details modal with “View in Jira”.

## Who should read this
- **Jira admins**: install and map fields.
- **Project leads/agents**: keep field values clean (start/end, site, visit type).
- **End users**: navigate, filter, and open details.

## Prerequisites
- Jira Cloud with permission to install apps.
- Custom fields for Start Time, End Time, Site/Location, and Visit Type (or equivalents you’ll map).

## Install the app
1. Go to **Jira Settings → Apps → Find new apps**.
2. Search for **Advanced Calendar for Jira** and install.
3. Open **Advanced Calendar Admin** from **Apps**.

## Configure (Admin Panel)
1. **Select projects** to show on the calendar.
2. **Map fields** (required):
   - Start Time
   - End Time
   - Site/Location
   - Visit Type
3. **Optional fields**: customer, contact, assignee, or any fields you want on bars or in the details modal.
4. Click **Save**. The app auto-detects Jira Software vs JSM.

## Use the calendar
- **Views**: Weekly (hourly timeline) or Monthly (grid).
- **Navigate**: Prev/Next buttons; weekly covers Monday–Sunday.
- **Legends**: Status colors (by status category) + visit-type icons.
- **Filter**: Use the site/location dropdown to focus the view and stats.
- **Open details**: Click any bar for full info and a **View in Jira** link.
- **Stats**: “Total Visits” and “Busiest Day” update with filters and view.

## Tips for clean data
- Always set Start and End times; multi-day events render as one continuous bar.
- Keep Visit Types consistent (e.g., “Audit”, “Work Visit”) so the legend stays readable.
- Use consistent Site/Location values to make filtering and analytics useful.

## Troubleshooting
- **No events showing**: Check Admin mappings; ensure the app user has project/field permissions.
- **Dates look wrong or bars missing**: Verify Start/End fields have valid date-times; refresh after fixing.
- **Layout looks off**: Hard refresh; if it persists, ask your admin to rebuild/redeploy.
- **Need more fields or filters**: Update mappings in Admin; redeploy if new UI elements were added.

## Support
- Maintainer: Burak Erol (`burki-2077`)
- Issues/requests: https://github.com/burki-2077/advanced-calendar/issues
