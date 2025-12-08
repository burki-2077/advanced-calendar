import React, { useEffect, useState, useMemo } from 'react';

// Days of the week starting with Monday
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

function MonthlyCalendarView({ events, selectedDate, onDateChange, getJiraIssueUrl, onEventClick, barFields = ['site', 'typeOfVisit'] }) {
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
  
  // Build display text for events
  const buildEventDisplayText = (event, isMultiDay = false) => {
    // Always start with visitor name (title)
    let displayText = event.title || 'Untitled Visit';
    
    // Add date range in dd.mm-dd.mm format
    const formatDateShort = (date) => {
      if (!date) return '';
      const d = new Date(date);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      return `${day}.${month}`;
    };
    
    const dateRangeText = `${formatDateShort(event.start)}-${formatDateShort(event.end)}`;
    displayText += ' • ' + dateRangeText;
    
    // Add configured additional fields
    barFields.forEach(fieldId => {
      let fieldValue = '';
      
      if (fieldId === 'site') {
        fieldValue = event.site;
      } else if (fieldId === 'typeOfVisit') {
        fieldValue = event.rawData?.visitType;
      } else if (event.rawData?.customFields && event.rawData.customFields[fieldId]) {
        fieldValue = event.rawData.customFields[fieldId].value;
      }
      
      if (fieldValue) {
        displayText += ' • ' + fieldValue;
      }
    });
    
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
                            className={`visit-card ${getStatusClass(event)}`}
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
                            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                              {getVisitTypeIcon(event.visitType) && (
                                <span className={`visit-type-icon ${getVisitTypeIcon(event.visitType).class}`}>
                                  {getVisitTypeIcon(event.visitType).icon}
                                </span>
                              )}
                              <div className="visit-title">
                                {buildEventDisplayText(event, false)}
                              </div>
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
                      className={`visit-card multi-day-event ${getStatusClass(event)}`}
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
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        {getVisitTypeIcon(event.visitType) && (
                          <span className={`visit-type-icon ${getVisitTypeIcon(event.visitType).class}`}>
                            {getVisitTypeIcon(event.visitType).icon}
                          </span>
                        )}
                        <div className="visit-title">
                          {buildEventDisplayText(event, true)}
                        </div>
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