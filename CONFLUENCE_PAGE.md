# Technical Documentation — Advanced Calendar for Jira

Use this page directly on Confluence for public/Marketplace audiences. It explains, in simple steps, how to open, configure, and use Advanced Calendar for Jira.

---

## Sections in this guide
- What Advanced Calendar does
- Opening Advanced Calendar
- Switching between Week and Month view
- Moving around the calendar (dates and ranges)
- Understanding colors, icons, and legends
- Filtering by site/location
- Opening details and working with issues
- Using the analytics cards
- Admin Panel (projects and field mapping)
- Troubleshooting
- Support

---

## What Advanced Calendar does
Advanced Calendar turns your Jira issues into a visual calendar:
- Weekly and monthly views with true hourly timelines.
- Continuous multi-day bars for long-running work.
- Color-coded statuses and visit-type icons with a legend.
- Site/location filter to focus on specific places or teams.
- Click-to-details modal with a **View in Jira** button.
- Live analytics that show total visits and the busiest day for the current view.

Use it for visits, on-site work, inspections, maintenance, or any time-based schedule that lives in Jira.

---

## Opening Advanced Calendar
To open the calendar from Jira:
1. In Jira, go to the top navigation and click **Apps**.
2. Choose **Advanced Calendar for Jira** (or **Advanced Calendar**) from the list.
3. The calendar opens, usually in **Weekly** view by default.

If you don’t see the app:
- Ask your Jira admin to install **Advanced Calendar for Jira** from the Atlassian Marketplace.
- Make sure you have access to the projects that the calendar uses.

---

## Switching between Week and Month view
Advanced Calendar has two main views:
- **Weekly view** – shows an hourly timeline from Monday to Sunday.
- **Monthly view** – shows a classic month grid with continuous bars for multi-day issues.

To switch views:
1. Look for the **Week / Month** toggle at the top of the calendar.
2. Click **Weekly** for detailed, hour-by-hour schedules.
3. Click **Monthly** to see long spans and overall occupancy.

---

## Moving around the calendar (dates and ranges)
You can move the visible date range without leaving the calendar:
1. Use the **Prev** and **Next** buttons to move backward or forward in time.
2. In **Weekly** view, each step moves you by one week (Monday–Sunday).
3. In **Monthly** view, each step moves you by one calendar month.

The app fetches a buffered range of dates behind the scenes, so multi-day issues are not cut at the edges—they appear as one continuous bar even if they start before or end after the current view.

---

## Understanding colors, icons, and legends
Each bar on the calendar represents a Jira issue:
- **Bar color**: comes from the issue’s status category (e.g., To Do, In Progress, Done).
- **Visit-type icon or initials**: comes from your Visit Type field (e.g., “A” for Audit, “W” for Work Visit).
- **Bar position and length**: comes from the Start Time and End Time fields mapped by your admin.

To understand what you see:
1. Check the **Status Legend** to see what each color means.
2. Check the **Visit Type Legend** to see what each icon or initial stands for.
3. Hover over or click a bar to see the exact start/end times and the main fields (depending on your admin’s configuration).

---

## Filtering by site/location
If your team uses multiple sites or locations, you can narrow the view:
1. Find the **Site/Location** dropdown above the calendar.
2. Choose a specific site/location to only show issues from that location.
3. Choose **All** (or clear the filter) to see everything again.

When you change the filter:
- The calendar updates to show only matching issues.
- The analytics cards (Total Visits, Busiest Day) update to match the filtered data.

---

## Opening details and working with issues
To see more information about a visit or event:
1. Click on a bar on the calendar.
2. A **details modal** opens with the key fields your admin mapped (for example: summary, customer, contact, assignee, site, visit type, and more).
3. To work directly in Jira, click **View in Jira** inside the modal.

You can:
- Transition the issue in Jira (e.g., start, complete, close).
- Add comments or attachments.
- Adjust dates and fields that control how the event appears on the calendar.

After changes in Jira, refresh the calendar page or move to another date and back to reload the data.

---

## Using the analytics cards
At the top of the calendar you’ll see quick statistics, such as:
- **Total Visits** – the number of issues shown in the current view and filter.
- **Busiest Day** – the day with the highest number of visits for the current view and filter.

These cards update automatically when you:
- Switch between **Weekly** and **Monthly**.
- Move to a different date range.
- Change the **Site/Location** filter.

Use these cards to quickly answer questions like:
- “How many visits do we have this week?”
- “Which day is the busiest for this month at a specific site?”

---

## Admin Panel (projects and field mapping)
The Admin Panel is usually used by Jira admins or project owners, but it affects what end users see.

To open the Admin Panel:
1. In Jira, click **Apps → Advanced Calendar Admin**.

In the Admin Panel you can:
1. **Select projects** to include on the calendar.
2. **Map required fields**:
   - Start Time
   - End Time
   - Site/Location
   - Visit Type
3. **Map optional fields** to show on bars or in the details modal (for example: customer, contact, assignee, team, or custom fields).
4. Click **Save** when you’re done.

The app automatically adapts to Jira Software and Jira Service Management projects based on your mappings.

If events are missing or look wrong on the calendar, it’s often because:
- The wrong fields are mapped in Admin.
- Some issues don’t have Start Time or End Time set.
- The current user doesn’t have permission to see certain projects or fields.

---

## Troubleshooting
Use this section when something doesn’t look right.

- **No events are showing**
  - Check that your site/location filter is not too narrow.
  - Ask an admin to verify field mappings in **Advanced Calendar Admin**.
  - Confirm you have permissions to see the projects and issues.

- **Bars start/end at the wrong times**
  - Open the issue in Jira and verify the Start Time and End Time fields.
  - Correct the dates/times and refresh the calendar.

- **Multi-day visits appear broken into pieces**
  - Check that the Start Time and End Time cover the full range.
  - Make sure you’re not filtering out part of the range with the Site/Location dropdown.

- **Layout looks off or doesn’t refresh**
  - Try a hard refresh in your browser.
  - If it persists, ask your admin to rebuild the frontend and redeploy the app.

- **Need more fields or filters**
  - Ask an admin to add more fields in the Admin Panel.
  - Some changes (like new UI elements) may require a redeploy.

---

## Support
- Maintainer: Burak Erol (`burki-2077`)
- Issues/requests: https://github.com/burki-2077/advanced-calendar/issues

You can include this link directly on your Confluence page so users know where to report problems or request enhancements.
