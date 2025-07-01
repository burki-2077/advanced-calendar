import React, { useEffect, useState, useMemo } from 'react';

// Days of the week starting with Monday
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Function to get visit type icon and class
const getVisitTypeIcon = (visitType) => {
  if (!visitType) return null;
  
  const type = visitType.toLowerCase();
  
  if (type.includes('internal') && type.includes('atnorth')) {
    return { icon: 'IA', class: 'internal-atnorth' };
  } else if (type.includes('external') && type.includes('atnorth')) {
    return { icon: 'EA', class: 'external-atnorth' };
  } else if (type.includes('internal') && type.includes('customer')) {
    return { icon: 'IC', class: 'internal-customer' };
  } else if (type.includes('external') && type.includes('customer')) {
    return { icon: 'EC', class: 'external-customer' };
  }
  
  // Default fallback
  return { icon: 'V', class: 'internal-atnorth' };
};

function MonthlyCalendarView({ events, selectedDate, onDateChange, getJiraIssueUrl, onEventClick }) {
  // State to store processed events
  const [calendarData, setCalendarData] = useState({
    weeks: []
  });
  
  // Add console log to check incoming events
  console.log("MonthlyCalendarView events:", events);
  
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
    
    if (lowerStatus.includes('done')) {
      return 'status-done'; // Green
    } else if (lowerStatus.includes('progress')) {
      return 'status-in-progress'; // Yellow
    } else if (lowerStatus.includes('waiting') || lowerStatus.includes('pending')) {
      return 'status-waiting'; // Red
    } else if (lowerStatus.includes('cancel')) {
      return 'status-cancelled'; // Gray
    } else {
      return 'status-default';
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
  
    // Process events when they change
  useEffect(() => {
    if (!events || !Array.isArray(events) || events.length === 0) {
      console.log("No events to process in MonthlyCalendarView");
      setCalendarData({
        weeks: calendarGrid.weeks,
        eventMetadata: {},
        dayMap: {}
      });
      return;
    }

    console.log("Processing", events.length, "events for monthly calendar");
    
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
      
      // Calculate day span and add to day map
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
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
  
  // Helper to get date key
  const getDateKey = (date) => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };
  
  // Get events for a specific day
  const getEventsForDay = (date) => {
    const dateKey = getDateKey(date);
    
    // Get events from calendar data
    if (!calendarData.eventMetadata) {
      return [];
    }
    
    // Find all events that include this day
    const events = Object.values(calendarData.eventMetadata).filter(event => {
      if (!event.daySpan) return false;
      return event.daySpan.includes(dateKey);
    });
    
    return events;
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
                              {event.customerName || 'Unknown Customer'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Render continuous multi-day events as overlays */}
                {week.map((dayObj, dayIndex) => {
                  const { date } = dayObj;
                  const dateKey = getDateKey(date);
                  const dayEventIds = calendarData.dayMap[dateKey] || [];
                  
                  // Find multi-day events starting on this day
                  const multiDayEventsStartingHere = dayEventIds
                    .map(id => calendarData.eventMetadata[id])
                    .filter(event => 
                      event && 
                      event.isMultiDay && 
                      getDateKey(event.startDate) === dateKey
                    );

                  return multiDayEventsStartingHere.map(event => {
                    // Calculate how many days this event spans in current week
                    let endDayIndex = dayIndex;
                    for (let i = dayIndex + 1; i < 7; i++) {
                      const nextDate = week[i].date;
                      const nextDateKey = getDateKey(nextDate);
                      if (event.daySpan.includes(nextDateKey)) {
                        endDayIndex = i;
                      } else {
                        break;
                      }
                    }

                    const spanDays = endDayIndex - dayIndex + 1;
                    const leftPercent = (dayIndex / 7) * 100;
                    const widthPercent = (spanDays / 7) * 100;

                    return (
                      <div 
                        key={`multi-${event.id}-${weekIndex}`}
                        className={`visit-card multi-day-event ${getStatusClass(event.status)}`}
                        style={{
                          position: 'absolute',
                          top: `${40 + (event.rowIndex * 35)}px`,
                          left: `calc(${leftPercent}% + 2px)`,
                          width: `calc(${widthPercent}% - 4px)`,
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
                          {event.customerName || 'Unknown Customer'}
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MonthlyCalendarView; 