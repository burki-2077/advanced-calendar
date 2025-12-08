# Codegeist 2025: Advanced Calendar for Jira

**One-liner:** Turn Jira issues into a real calendar with analytics, filters, and multi-day scheduling that works across Jira Software and JSM.

## Inspiration
- Teams tracked work in Jira but scheduled it in external calendars, creating silos, missed visits, and duplicate data entry. Advanced Calendar keeps planning and execution in the same place Jira users already live.

## What it does
- Monthly and weekly calendars with true hourly timelines and continuous multi-day bars (no broken tiles).
- Color-coded statuses and visit-type icons with legends so anyone can scan the board in seconds.
- Live analytics (totals, busiest day) that update as you filter.
- Filters for locations/sites today, with groundwork for more dimensions.
- Works across JSM and Jira Software with configurable custom field mapping.
- Click-to-details modal showing full field data and deep links back to the Jira issue.

## How it’s built
- **Backend (Forge + Node):** Two-step optimized fetch (issue keys → batched details), buffered date ranges for long-running events, modular utilities for logging/retries/date handling, flexible JQL builder for multi-project and mixed issue types, and a consistent `{ success, data | error, errorCode }` contract.
- **Frontend (React):** Custom calendar components with overlap detection, multi-day spanning, buffered range fetching to avoid boundary misses, responsive layout, legends, filters, and a details modal that renders all mapped fields.
- **Admin Panel:** Project selection, custom field mapping, and auto-detection of JSM vs Jira Software so it adapts to any schema.

## Challenges solved
- Jira pagination limits → High-performance two-step fetch that reduces API calls while handling thousands of issues.
- Multi-day rendering → Layout algorithm to avoid overlapping bars and keep spans continuous.
- Messy real-world data → Defensive parsing, fallbacks, and clear error codes.
- Forge CSP restrictions → Styling fully externalized; zero inline styles.
- Generic configuration → Mapping layer that makes it plug-and-play for any Jira setup.

## Accomplishments
- ~70% faster fetches vs naive sequential calls; stable with 1k+ items in testing.
- Production-grade error handling, retries, and structured logging.
- Universally compatible through configurable field mapping (JSM + Jira Software).
- Modern, Google Calendar–familiar UX already deployed in client environments.

## What I learned
- **Technical:** Advanced Forge async patterns; complex React state management for calendars; Jira REST optimization and pagination strategies.
- **Product:** Defensive programming pays dividends; small UX touches drive adoption; configuration-first design outlives quick hacks.
- **Architecture:** Modular utilities, clean separation of fetch/process/render, and standardized API contracts simplify everything.

## What’s next
- **Near term:** Drag-and-drop rescheduling; multi-select filters (assignee, status, visit type); iCal/Google Calendar export; caching for instant view switches.
- **Future:** Real-time updates; team capacity overlays; mobile-optimized views; AI-powered schedule suggestions; Marketplace launch.
