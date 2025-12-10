# Advanced Calendar for Jira — User Guide

Use this guide to install, configure, and get value from Advanced Calendar for Jira. It’s written for Jira admins (setup) and team members (everyday use).

## What you get
- Weekly and monthly views with true hourly timelines and continuous multi-day bars.
- Color-coded statuses and visit-type icons with legends.
- Site/location filter (more filters coming).
- Click-to-details modal with full field data and “View in Jira” link.
- Live analytics: total visits and busiest day for the current view.

## Admin setup (first time)
1) **Install the app** from Atlassian Marketplace.
2) **Open Admin Panel:** Jira → Apps → Advanced Calendar Admin.
3) **Select projects** you want on the calendar.
4) **Map custom fields** (required):
   - Start Time
   - End Time
   - Site/Location
   - Visit Type
5) **Optional field mapping:** any extra fields you want shown on bars or in the modal (e.g., customer, contact, assignee).
6) **Save**. The app auto-detects Jira Software vs JSM and applies the mapping.

## Everyday use
- **Switch views:** “Weekly” for hourly schedules; “Monthly” for long spans.
- **Navigate dates:** Prev/Next buttons; weekly view shows Monday–Sunday.
- **Legends:** Status colors come from status category; visit-type icons use type initials.
- **Filter by site:** Use the location dropdown to focus the calendar and analytics.
- **Open details:** Click any bar → modal with full fields + “View in Jira”.
- **Analytics:** “Total Visits” and “Busiest Day” update with filters and current view.

## Tips for better data
- Ensure start/end fields are always set; multi-day events will render as one continuous bar.
- Keep visit types consistent (e.g., “Audit”, “Work Visit”) so legends stay clear.
- Use sites/locations consistently to make the filter and analytics useful.

## Troubleshooting (common)
- **No events showing:** Check Admin mappings; confirm the Forge app user has project/field permissions.
- **Weird dates or missing spans:** Verify start/end fields contain valid date-times; refresh after fixing.
- **Layout looks off:** Hard refresh; if needed, rebuild frontend (`cd static && npm run build`) and redeploy.
- **Need more fields/filters:** Update mappings in Admin; redeploy if you added new UI elements.

## Support
- Maintainer: Burak Erol (`burki-2077`)
- Issues/requests: https://github.com/burki-2077/advanced-calendar/issues
