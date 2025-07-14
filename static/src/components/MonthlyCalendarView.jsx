import React, { useEffect, useState, useMemo } from 'react';

// Days of the week starting with Monday
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Function to get visit type icon and class
const getVisitTypeIcon = (visitType) => {
  if (!visitType) return null;
  
  // Convert to string and lowercase for comparison
  const type = String(visitType).toLowerCase().trim();
  
  // Handle new visit types
  if (type.includes('work visit') || type === 'work visit') {
    return { icon: 'WV', class: 'work-visit' };
  } else if (type.includes('escorted access') || type === 'escorted access') {
    return { icon: 'EA', class: 'escorted-access' };
  } else if (type.includes('audit') || type === 'audit') {
    return { icon: 'AU', class: 'audit' };
  } else if (type.includes('other') || type === 'other') {
    return { icon: 'OT', class: 'other' };
  }
  
  // Check for exact matches (in case the field values are exact strings)
  switch (type) {
    case 'work visit':
      return { icon: 'WV', class: 'work-visit' };
    case 'escorted access':
      return { icon: 'EA', class: 'escorted-access' };
    case 'audit':
      return { icon: 'AU', class: 'audit' };
    case 'other':
      return { icon: 'OT', class: 'other' };
    default:
      // Return a default icon for any non-empty visit type
      return { icon: 'V', class: 'work-visit' };
  }
};

function MonthlyCalendarView({ events, selectedDate, onDateChange, getJiraIssueUrl, onEventClick }) {
  // State to store processed events
  const [calendarData, setCalendarData] = useState({
    weeks: []
  });
  
  // Get days in a month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  // Get first day of the month (0-6, Sunday to Saturday)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };
  
  // Get status class for styling
  const getStatusClass = (status) => {
    const lowerStatus = (status || '').toLowerCase();
    
    if (lowerStatus.includes('waiting for approval')) {
      return 'status-waiting-approval'; // Orange
    } else if (lowerStatus.includes('approved')) {
      return 'status-approved'; // Green
    } else if (lowerStatus.includes('rejected')) {
      return 'status-rejected'; // Red
    } else if (lowerStatus.includes('in progress') || lowerStatus.includes('progress')) {
      return 'status-in-progress'; // Blue
    } else if (lowerStatus.includes('done')) {
      return 'status-done'; // Dark Green
    } else if (lowerStatus.includes('reopened')) {
      return 'status-reopened'; // Purple
    } else {
      return 'status-default'; // Gray
    }
  };
  
  // Generate calendar date grid - memoized to avoid recalculation
  const calendarGrid = useMemo(() => {
    // Get the current month and year from the selected date
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    
    // Get days in the current month
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    
    // Get the day of the week for the first day of the month (0-6)
    // Adjust for Monday as the first day of the week (0 = Monday, 6 = Sunday)
    let firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    firstDay = firstDay === 0 ? 6 : firstDay - 1; // Convert Sunday (0) to 6, and shift others back by 1
    
    // Generate array of dates for the calendar
    const calendarDates = [];
    
    // Add days from the previous month
    if (firstDay > 0) {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
      
      for (let i = 0; i < firstDay; i++) {
        const day = daysInPrevMonth - firstDay + i + 1;
        const date = new Date(prevYear, prevMonth, day);
        calendarDates.push({ date, faded: true });
      }
    }
    
    // Add days from the current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      calendarDates.push({ date, faded: false });
    }
    
    // Add days from the next month to complete the grid (ensuring total is a multiple of 7)
    const remainingDays = 7 - (calendarDates.length % 7);
    if (remainingDays < 7) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      
      for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(nextYear, nextMonth, i);
        calendarDates.push({ date, faded: true });
      }
    }
    
    // Group dates into weeks
    const weeks = [];
    for (let i = 0; i < calendarDates.length; i += 7) {
      weeks.push(calendarDates.slice(i, i + 7));
    }
    
    return { calendarDates, weeks };
  }, [selectedDate]);
  
  // Helper to get date key - CRITICAL: Must match daySpan format
  const getDateKey = (date) => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };

  // Process events when they change
  useEffect(() => {
    if (!events || !Array.isArray(events) || events.length === 0) {
      setCalendarData({
        weeks: calendarGrid.weeks,
        eventMetadata: {},
        dayMap: {}
      });
      return;
    }
    
    // Create event metadata and day mapping
    const eventMetadata = {};
    const dayMap = {};
    
    events.forEach(event => {
      if (!event.start) return;
      
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end || event.start);
      
      // Set time to midnight to just compare dates
      const startDate = new Date(eventStart);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(eventEnd);
      endDate.setHours(0, 0, 0, 0);
      
      // Store metadata for the event
      eventMetadata[event.id] = {
        ...event,
        startDate,
        endDate,
        daySpan: [], // Will store all days this event spans
        isMultiDay: endDate > startDate,
        rowIndex: null
      };
      
      // CRITICAL FIX: Calculate day span with CORRECT date format matching getDateKey
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        // Use EXACT same format as getDateKey function
        const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
        eventMetadata[event.id].daySpan.push(dateKey);
        
        // Add to day map
        if (!dayMap[dateKey]) {
          dayMap[dateKey] = [];
        }
        dayMap[dateKey].push(event.id);
        
        // Move to next day
        currentDate = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // Assign row indices to prevent overlaps
    const assignedRows = {};
    
    // Sort events by start date and duration (longer events first)
    const sortedEvents = Object.values(eventMetadata).sort((a, b) => {
      const durationDiff = b.daySpan.length - a.daySpan.length;
      if (durationDiff !== 0) return durationDiff;
      return a.startDate - b.startDate;
    });

    sortedEvents.forEach(event => {
      let rowIndex = 0;
      let foundRow = false;

      while (!foundRow) {
        foundRow = true;
        
        // Check if this row is available across all days this event spans
        for (const dateKey of event.daySpan) {
          const rowKey = `${dateKey}-${rowIndex}`;
          if (assignedRows[rowKey]) {
            foundRow = false;
            rowIndex++;
            break;
          }
        }
      }

      // Assign this row to the event
      event.rowIndex = rowIndex;
      
      // Mark all days this event spans as occupied for this row
      event.daySpan.forEach(dateKey => {
        const rowKey = `${dateKey}-${rowIndex}`;
        assignedRows[rowKey] = event.id;
      });
    });
    
    // Update state with processed data
    setCalendarData({
      weeks: calendarGrid.weeks,
      eventMetadata,
      dayMap
    });
  }, [events, calendarGrid]);
  
  // Check if a date is today
  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };
  
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

  // Build display text for events
  const buildEventDisplayText = (event, isMultiDay = false) => {
    const contactName = event.contactName || '';
    const customerName = event.customerName || '';
    const siteText = event.site || '';
    
    let displayText = '';
    if (contactName) displayText += contactName;
    if (customerName) displayText += (displayText ? ' • ' : '') + customerName;
    
    // For multi-day events, include date range
    if (isMultiDay) {
      const dateRangeText = formatDateRange(event.startDate, event.endDate);
      if (dateRangeText) displayText += (displayText ? ' • ' : '') + dateRangeText;
    }
    
    if (siteText) displayText += (displayText ? ' • ' : '') + siteText;
    
    if (!displayText) displayText = 'Unknown Visit';
    
    return displayText;
  };
  
  // Render calendar
  return (
    <div className="monthly-view-container">
      <div className="monthly-calendar">
        {/* Header row with day names */}
        <div className="monthly-header-row">
          {dayNames.map(day => (
            <div key={day} className="monthly-header-cell">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="monthly-grid">
          {calendarData.weeks.map((week, weekIndex) => {
            // Calculate max rows needed for this week
            let maxRows = 0;
            week.forEach(dayObj => {
              const dateKey = getDateKey(dayObj.date);
              const dayEvents = calendarData.dayMap[dateKey] || [];
              dayEvents.forEach(eventId => {
                const event = calendarData.eventMetadata[eventId];
                if (event && event.rowIndex !== null) {
                  maxRows = Math.max(maxRows, event.rowIndex + 1);
                }
              });
            });

            const weekHeight = Math.max(120, 40 + (maxRows * 35));

            return (
              <div 
                key={`week-${weekIndex}`} 
                className="monthly-week"
                style={{ height: `${weekHeight}px`, position: 'relative' }}
              >
                {/* Render individual day cells */}
                {week.map((dayObj, dayIndex) => {
                  const { date, faded } = dayObj;
                  const dateKey = getDateKey(date);
                  const todayClass = isToday(date) ? 'today' : '';
                  
                  // Get single-day events for this day
                  const dayEventIds = calendarData.dayMap[dateKey] || [];
                  const singleDayEvents = dayEventIds
                    .map(id => calendarData.eventMetadata[id])
                    .filter(event => event && !event.isMultiDay);
                  
                  return (
                    <div 
                      key={`cell-${weekIndex}-${dayIndex}`} 
                      className={`date-cell ${faded ? 'faded' : ''} ${todayClass}`}
                      onClick={() => onDateChange(date)}
                    >
                      <div className="date-number">{date.getDate()}</div>
                      
                      {/* Single-day events */}
                      <div className="date-events-container">
                        {singleDayEvents.map((event) => (
                          <div 
                            key={`single-${event.id}`}
                            className={`visit-card ${getStatusClass(event.status)}`}
                            style={{
                              position: 'absolute',
                              top: `${40 + (event.rowIndex * 35)}px`,
                              left: '2px',
                              right: '2px',
                              height: '30px',
                              zIndex: 5
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(event);
                            }}
                          >
                            {getVisitTypeIcon(event.visitType) && (
                              <span className={`visit-type-icon ${getVisitTypeIcon(event.visitType).class}`}>
                                {getVisitTypeIcon(event.visitType).icon}
                              </span>
                            )}
                            <div className="visit-title">
                              {buildEventDisplayText(event, false)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Render continuous multi-day events as overlays - FIXED APPROACH */}
                {(() => {
                  // Collect all multi-day events that should be rendered in this week
                  const weekMultiDayEvents = [];
                  
                  // Process each multi-day event only once per week
                  const processedEventIds = new Set();
                  
                  week.forEach((dayObj, dayIndex) => {
                    const { date } = dayObj;
                    const dateKey = getDateKey(date);
                    const dayEventIds = calendarData.dayMap[dateKey] || [];
                    
                    dayEventIds.forEach(eventId => {
                      if (processedEventIds.has(eventId)) return;
                      
                      const event = calendarData.eventMetadata[eventId];
                      if (!event || !event.isMultiDay) return;
                      
                      // Check if this event has any days in the current week
                      const eventDaysInThisWeek = event.daySpan.filter(spanKey => {
                        return week.some(weekDay => getDateKey(weekDay.date) === spanKey);
                      });
                      
                      if (eventDaysInThisWeek.length > 0) {
                        // Find the first and last day indices in this week
                        let firstDayIndex = -1;
                        let lastDayIndex = -1;
                        
                        week.forEach((weekDay, index) => {
                          const weekDateKey = getDateKey(weekDay.date);
                          if (event.daySpan.includes(weekDateKey)) {
                            if (firstDayIndex === -1) firstDayIndex = index;
                            lastDayIndex = index;
                          }
                        });
                        
                        if (firstDayIndex !== -1) {
                          const spanWidth = lastDayIndex - firstDayIndex + 1;
                          const widthPercent = (spanWidth / 7) * 100;
                          
                          weekMultiDayEvents.push({
                            ...event,
                            weekStartIndex: firstDayIndex,
                            weekSpanWidth: spanWidth,
                            widthPercent
                          });
                          
                          processedEventIds.add(eventId);
                        }
                      }
                    });
                  });
                  
                  // Render all multi-day events for this week
                  return weekMultiDayEvents.map(event => (
                    <div 
                      key={`multi-${event.id}-${weekIndex}`}
                      className={`visit-card multi-day-event ${getStatusClass(event.status)}`}
                      style={{
                        position: 'absolute',
                        top: `${40 + (event.rowIndex * 35)}px`,
                        left: `calc(${event.weekStartIndex / 7 * 100}% + 2px)`,
                        width: `calc(${event.widthPercent}% - 4px)`,
                        height: '30px',
                        zIndex: 10
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    >
                      {getVisitTypeIcon(event.visitType) && (
                        <span className={`visit-type-icon ${getVisitTypeIcon(event.visitType).class}`}>
                          {getVisitTypeIcon(event.visitType).icon}
                        </span>
                      )}
                      <div className="visit-title">
                        {buildEventDisplayText(event, true)}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MonthlyCalendarView; 