import React from 'react';
import './../../src/index.css';

// Stable color mapping for visit types
const visitTypeColorMap = new Map();
let colorCounter = 0;

// Function to get visit type icon and class - dynamically generates initials
const getVisitTypeIcon = (visitType) => {
    if (!visitType) return null;

    const type = String(visitType).trim();

    // Generate initials from the visit type
    // Take first letter of each word (up to 3 letters)
    const words = type.split(/[\s-_]+/);
    let initials = words
        .map(word => word.charAt(0).toUpperCase())
        .filter(char => char.match(/[A-Z0-9]/)) // Only letters and numbers
        .slice(0, 3) // Max 3 characters
        .join('');

    // Fallback to first 2 characters if no valid initials
    if (!initials) {
        initials = type.substring(0, 2).toUpperCase();
    }

    // Assign color sequentially for each unique type
    if (!visitTypeColorMap.has(type)) {
        visitTypeColorMap.set(type, colorCounter % 12);
        colorCounter++;
    }

    const colorIndex = visitTypeColorMap.get(type);
    const colorClasses = [
    'visit-type-1', 'visit-type-2', 'visit-type-3', 'visit-type-4',
    'visit-type-5', 'visit-type-6', 'visit-type-7', 'visit-type-8',
    'visit-type-9', 'visit-type-10', 'visit-type-11', 'visit-type-12'
  ];

    return {
        icon: initials,
        class: colorClasses[colorIndex]
    };
};

// Helper function to determine CSS classes based on event status
const getStatusClass = (event) => {
    const statusCategory = (event?.statusCategory || 'undefined').toLowerCase();

    // Map status categories to CSS classes
    switch (statusCategory) {
        case 'new':
            return 'status-new';
        case 'indeterminate':
            return 'status-indeterminate';
        case 'done':
            return 'status-done';
        case 'undefined':
        default:
            return 'status-undefined';
    }
};

const WeeklyCalendarView = ({ events, selectedDate, onDateChange, getJiraIssueUrl, onEventClick, barFields = ['site', 'typeOfVisit'] }) => {
    // Set up days and hours for the weekly view - now including all 7 days
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const hours = ['8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM'];

    // Calculate the start of the week based on the selected date
    const startOfWeek = new Date(selectedDate);
    const dayOfWeek = selectedDate.getDay();
    const diff = selectedDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Generate dates for each day of the week
    const dates = daysOfWeek.map((day, index) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + index);
        return date;
    });

    // Determine which date is today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process events to identify multi-day visits and assign row indices
    const processEvents = () => {
        if (!events || !Array.isArray(events)) return {};

        const hourSlots = {};

        // Initialize time slots
        hours.forEach(hour => {
            hourSlots[hour] = { events: [], multiDayEvents: {} };
        });

        // First, identify multi-day events and group them by hour
        events.forEach(event => {
            if (!event.start) return;

            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end || event.start);

            // Get hour key for the event
            const startHour = eventStart.getHours();
            const hourKey = startHour < 12
                ? `${startHour}AM`
                : (startHour === 12 ? '12PM' : `${startHour - 12}PM`);

            // Skip if the event starts outside our hour range
            if (!hourSlots[hourKey]) return;

            // Check if this is a multi-day event
            const isMultiDay = eventEnd.getTime() > eventStart.getTime() + (24 * 60 * 60 * 1000) ||
                eventEnd.getDate() !== eventStart.getDate() ||
                eventEnd.getMonth() !== eventStart.getMonth() ||
                eventEnd.getFullYear() !== eventStart.getFullYear();

            if (isMultiDay) {
                // Create extended event object with date span information
                const enhancedEvent = {
                    ...event,
                    startDate: new Date(eventStart),
                    endDate: new Date(eventEnd),
                    daySpan: [],
                    isMultiDay: true
                };

                // Calculate days this event spans
                let currentDate = new Date(eventStart);
                currentDate.setHours(0, 0, 0, 0);

                const lastDate = new Date(eventEnd);
                lastDate.setHours(23, 59, 59, 999);

                while (currentDate <= lastDate) {
                    enhancedEvent.daySpan.push(new Date(currentDate).toDateString());
                    currentDate.setDate(currentDate.getDate() + 1);
                }

                // Add to the start hour slot only (event stays at start time across all weeks)
                hourSlots[hourKey].multiDayEvents[event.id] = enhancedEvent;
            } else {
                // Add to regular events for this hour
                hourSlots[hourKey].events.push({
                    ...event,
                    startDate: new Date(eventStart),
                    endDate: new Date(eventEnd || eventStart),
                    isMultiDay: false
                });
            }
        });

        // Now assign row indices to events in each hour slot to prevent overlaps
        hours.forEach(hour => {
            const slot = hourSlots[hour];
            const allEvents = [...Object.values(slot.multiDayEvents), ...slot.events];

            // Sort events by start date
            allEvents.sort((a, b) => a.startDate - b.startDate);

            // Track occupied rows for each day
            const occupiedRows = {};

            // Assign row indices
            allEvents.forEach(event => {
                let rowIndex = 0;
                let foundRow = false;

                while (!foundRow) {
                    foundRow = true;

                    if (event.isMultiDay) {
                        // For multi-day events, check all days in span
                        for (const dayString of event.daySpan) {
                            if (occupiedRows[`${dayString}-${rowIndex}`]) {
                                foundRow = false;
                                rowIndex++;
                                break;
                            }
                        }
                    } else {
                        // For single-day events, check just the day
                        const dayString = event.startDate.toDateString();
                        if (occupiedRows[`${dayString}-${rowIndex}`]) {
                            foundRow = false;
                            rowIndex++;
                        }
                    }
                }

                // Assign row index to event
                event.rowIndex = rowIndex;

                // Mark rows as occupied
                if (event.isMultiDay) {
                    for (const dayString of event.daySpan) {
                        occupiedRows[`${dayString}-${rowIndex}`] = true;
                    }
                } else {
                    occupiedRows[`${event.startDate.toDateString()}-${rowIndex}`] = true;
                }
            });

            // Calculate max rows for this hour
            slot.maxRows = Math.max(0, ...allEvents.map(e => e.rowIndex)) + 1;
        });

        return hourSlots;
    };

    // Process all events
    const hourSlots = processEvents();

    // Format date as day.month
    const formatDateShort = (date) => {
        if (!date) return '';
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${day}.${month}`;
    };

    // Format date range for display (e.g., "31.05-05.06")
    const formatDateRange = (startDate, endDate) => {
        if (!startDate || !endDate) return '';
        return `${formatDateShort(startDate)}-${formatDateShort(endDate)}`;
    };

    // Build field text for event cards
    const buildFieldText = (event) => {
        const parts = [];

        // Add configured fields
        barFields.forEach(fieldId => {
            let fieldValue = '';

            if (fieldId === 'site') {
                fieldValue = event.site;
            } else if (fieldId === 'typeOfVisit') {
                fieldValue = event.rawData?.visitType || event.visitType;
            } else if (event.rawData?.customFields && event.rawData.customFields[fieldId]) {
                fieldValue = event.rawData.customFields[fieldId].value;
            }

            if (fieldValue) {
                parts.push(fieldValue);
            }
        });

        return parts.join(' • ');
    };

    // Check if a date is today
    const isToday = (date) => {
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    // Render a multi-day event that spans across the days
    const renderMultiDayEvent = (event, hour) => {
        if (!event.daySpan || event.daySpan.length === 0) return null;

        // Find which days from the event span are visible in the current week
        const visibleDays = dates
            .map((date, index) => ({ date, index }))
            .filter(({ date }) => event.daySpan.includes(date.toDateString()));

        // Skip if event is not visible in current view
        if (visibleDays.length === 0) return null;

        // Find first and last visible day indices
        const firstDayIndex = visibleDays[0].index;
        const lastDayIndex = visibleDays[visibleDays.length - 1].index;

        // Calculate width and left position based on visible days
        const totalDays = dates.length;
        const dayWidth = 100 / totalDays;
        const leftPosition = firstDayIndex * dayWidth;
        const width = (lastDayIndex - firstDayIndex + 1) * dayWidth;

        // Build display text for multi-day event
        const dateRangeText = formatDateRange(event.startDate, event.endDate);
        const fieldText = buildFieldText(event);

        let displayText = event.title || 'Untitled Visit';
        if (dateRangeText) displayText += ' • ' + dateRangeText;
        if (fieldText) displayText += ' • ' + fieldText;

        const eventHeight = 50;

        return (
            <div
                className={`visit-card multi-day-event ${getStatusClass(event)}`}
                style={{
                    position: 'absolute',
                    left: `${leftPosition}%`,
                    width: `${width}%`,
                    top: `${event.rowIndex * eventHeight}px`,
                    zIndex: 1,
                    margin: '3px 1px',
                    boxSizing: 'border-box',
                    height: `${eventHeight - 6}px`
                }}
                onClick={() => onEventClick(event)}
            >
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    {getVisitTypeIcon(event.visitType) && (
                        <span className={`visit-type-icon ${getVisitTypeIcon(event.visitType).class}`}>
                            {getVisitTypeIcon(event.visitType).icon}
                        </span>
                    )}
                    <div className="visit-title">
                        {displayText}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="weekly-view-container">
            <table className="weekly-calendar">
                <thead>
                    <tr>
                        <th className="weekly-header-cell time-header">Time</th>
                        {dates.map((date, index) => (
                            <th
                                key={`header-${index}`}
                                className={`weekly-header-cell day-header ${isToday(date) ? 'today' : ''}`}
                            >
                                {daysOfWeek[index]}<br />
                                {formatDateShort(date)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {hours.map((hour, hourIndex) => {
                        // Get maximum rows for this hour
                        const maxRows = hourSlots[hour] ? hourSlots[hour].maxRows : 0;

                        // Calculate height based on number of rows - each event needs 50px + padding
                        const eventHeight = 50;
                        const rowHeight = maxRows > 0 ? maxRows * eventHeight + 10 : 60;

                        return (
                            <tr key={`hour-${hourIndex}`} style={{ height: `${rowHeight}px` }}>
                                <td className="time-slot">{hour}</td>
                                <td
                                    colSpan={dates.length}
                                    className="time-cell multi-day-container"
                                    style={{ position: 'relative', padding: 0 }}
                                >
                                    {/* Render multi-day events for this hour */}
                                    {hourSlots[hour] && Object.values(hourSlots[hour].multiDayEvents).map((event, index) => (
                                        renderMultiDayEvent(event, hour)
                                    ))}

                                    {/* Render single-day events */}
                                    {hourSlots[hour] && hourSlots[hour].events.map((event, index) => {
                                        // Find which date column this event belongs to
                                        const dateIndex = dates.findIndex(date =>
                                            date.toDateString() === event.startDate.toDateString());

                                        if (dateIndex === -1) return null;

                                        // Calculate position within day column
                                        const dayWidth = 100 / dates.length;
                                        const leftPosition = dateIndex * dayWidth;
                                        const eventHeight = 50;

                                        return (
                                            <div
                                                key={`single-event-${event.id}`}
                                                className={`visit-card ${getStatusClass(event)}`}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${leftPosition}%`,
                                                    width: `${dayWidth}%`,
                                                    top: `${event.rowIndex * eventHeight}px`,
                                                    zIndex: 1,
                                                    margin: '3px 1px',
                                                    boxSizing: 'border-box',
                                                    height: `${eventHeight - 6}px`
                                                }}
                                                onClick={() => onEventClick(event)}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                    {getVisitTypeIcon(event.visitType) && (
                                                        <span className={`visit-type-icon ${getVisitTypeIcon(event.visitType).class}`}>
                                                            {getVisitTypeIcon(event.visitType).icon}
                                                        </span>
                                                    )}
                                                    <div className="visit-title">
                                                        {event.title || 'Untitled Visit'}
                                                    </div>
                                                </div>
                                                <div className="visit-time">
                                                    {formatDateRange(event.startDate, event.endDate)}{buildFieldText(event) ? `\u00A0•\u00A0${buildFieldText(event)}` : ''}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Visual grid lines for day columns */}
                                    {dates.map((date, dateIndex) => {
                                        const dayWidth = 100 / dates.length;
                                        const leftPosition = (dateIndex + 1) * dayWidth;

                                        return dateIndex < dates.length - 1 ? (
                                            <div
                                                key={`grid-line-${dateIndex}`}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${leftPosition}%`,
                                                    top: 0,
                                                    bottom: 0,
                                                    width: '1px',
                                                    backgroundColor: '#e9e9e9'
                                                }}
                                            />
                                        ) : null;
                                    })}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default WeeklyCalendarView; 