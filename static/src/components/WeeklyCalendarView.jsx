import React from 'react';
import './../../src/index.css';

// Days of the week (Monday to Friday for business week)
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAYS_OF_WEEK_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

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

// Helper function to determine CSS classes based on event status
const getStatusClass = (status) => {
  const lowerStatus = (status || '').toLowerCase();
  
  if (lowerStatus.includes('done')) {
    return 'status-done';
  } else if (lowerStatus.includes('progress') || lowerStatus.includes('in progress')) {
    return 'status-in-progress';
  } else if (lowerStatus.includes('waiting') || lowerStatus.includes('pending')) {
    return 'status-waiting';
  } else if (lowerStatus.includes('cancel')) {
    return 'status-cancelled';
  }
  
  return '';
};

const WeeklyCalendarView = ({ events, selectedDate, onDateChange, getJiraIssueUrl, onEventClick }) => {
  // Set up days and hours for the weekly view
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
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
        
        // Add to multi-day events for this hour
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
  
  // Check if a date is today
  const isToday = (date) => {
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };
  
  // Render a multi-day event that spans across the days
  const renderMultiDayEvent = (event, hour) => {
    if (!event.daySpan || event.daySpan.length === 0) return null;
    
    // Calculate positions for the continuous bar
    const firstDayInView = dates.find(date => date.toDateString() === event.daySpan[0]);
    const lastDayInView = dates.find(date => date.toDateString() === event.daySpan[event.daySpan.length - 1]);
    
    // Skip if event is not visible in current view
    if (!firstDayInView && !lastDayInView) {
      // Check if any day in the span is in the current view
      const anyDayInView = dates.some(date => event.daySpan.includes(date.toDateString()));
      if (!anyDayInView) return null;
    }
    
    // Find first and last visible day indices
    const firstDayIndex = firstDayInView 
      ? dates.findIndex(date => date.toDateString() === firstDayInView.toDateString())
      : 0;
      
    const lastDayIndex = lastDayInView
      ? dates.findIndex(date => date.toDateString() === lastDayInView.toDateString())
      : dates.length - 1;
    
    // Calculate width and left position based on visible days
    const totalDays = dates.length;
    const dayWidth = 100 / totalDays;
    const leftPosition = firstDayIndex * dayWidth;
    const width = (lastDayIndex - firstDayIndex + 1) * dayWidth;
    
    // Format customer name with date range and site
    const dateRangeText = formatDateRange(event.startDate, event.endDate);
    const siteText = event.site || '';
    
    return (
      <div 
        className={`visit-card multi-day-event ${getStatusClass(event.status)}`}
        style={{
          position: 'absolute',
          left: `${leftPosition}%`,
          width: `${width}%`,
          top: `${event.rowIndex * 55}px`,
          zIndex: 1,
          margin: '3px 1px',
          boxSizing: 'border-box'
        }}
        onClick={() => onEventClick(event)}
      >
        {getVisitTypeIcon(event.visitType) && (
          <span className={`visit-type-icon ${getVisitTypeIcon(event.visitType).class}`}>
            {getVisitTypeIcon(event.visitType).icon}
          </span>
        )}
        <div className="visit-title">
          {event.customerName || 'Unknown Customer'}
          {dateRangeText && <span className="visit-info-inline">&nbsp;•&nbsp;{dateRangeText}</span>}
          {siteText && <span className="visit-info-inline">&nbsp;•&nbsp;{siteText}</span>}
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
            
            // Calculate height based on number of rows
            const rowHeight = maxRows > 0 ? Math.max(60, maxRows * 50 + 20) : 60;
            
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
                    
                    // Calculate position
                    const dayWidth = 100 / dates.length;
                    const leftPosition = dateIndex * dayWidth;
                    
                    return (
                      <div 
                        key={`single-event-${event.id}`}
                        className={`visit-card ${getStatusClass(event.status)}`}
                        style={{
                          position: 'absolute',
                          left: `${leftPosition}%`,
                          width: `${dayWidth}%`,
                          top: `${event.rowIndex * 55}px`,
                          zIndex: 1,
                          margin: '3px 1px',
                          boxSizing: 'border-box'
                        }}
                        onClick={() => onEventClick(event)}
                      >
                        {getVisitTypeIcon(event.visitType) && (
                          <span className={`visit-type-icon ${getVisitTypeIcon(event.visitType).class}`}>
                            {getVisitTypeIcon(event.visitType).icon}
                          </span>
                        )}
                        <div className="visit-title">{event.customerName || 'Unknown Customer'}</div>
                        <div className="visit-time">
                          {formatDateShort(event.startDate)}{event.site ? `\u00A0•\u00A0${event.site}` : ''}
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