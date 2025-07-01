import React, { useState, useEffect } from 'react';
import { view, invoke } from '@forge/bridge';
import MonthlyCalendarView from './components/MonthlyCalendarView';
import WeeklyCalendarView from './components/WeeklyCalendarView';
import VisitDetailsModal from './components/VisitDetailsModal';

// Status to color mapping
const STATUS_COLORS = {
  'done': '#36B37E', // Green
  'pending': '#FFAB00', // Yellow/Orange
  'work in progress': '#FFAB00', // Yellow/Orange  
  'waiting for start': '#FFAB00', // Yellow/Orange
  'cancelled': '#FF5630', // Red
};

function App() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [viewMode, setViewMode] = useState('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [jiraBaseUrl, setJiraBaseUrl] = useState('');
  const [stats, setStats] = useState({
    totalVisits: 0,
    busiestDay: { day: '', count: 0 }
  });
  const [availableSites, setAvailableSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Initialize data from Jira
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Get Jira base URL for creating links to issues
        const baseUrlResponse = await invoke('getJiraBaseUrl');
        if (baseUrlResponse && baseUrlResponse.baseUrl) {
          setJiraBaseUrl(baseUrlResponse.baseUrl);
        }
        
        // Get visit data
        const visitEvents = await invoke('getVisitRequests');
        console.log('Fetched visits:', visitEvents);
        
        if (Array.isArray(visitEvents)) {
          // Transform for calendar view
          const calendarEvents = visitEvents.map(event => {
            // Format dates for display
            let startDate = event.startTime ? new Date(event.startTime) : null;
            let endDate = event.endTime ? new Date(event.endTime) : startDate;
            
            return {
              id: event.id,
              title: event.summary,
              description: event.description || '',
              start: startDate,
              end: endDate,
              status: event.status || 'Open',
              jiraKey: event.key,
              site: event.site || 'Unspecified',
              assignee: event.assignee || '',
              customerName: event.customerName || 'Unknown Customer',
              contactName: event.contactName || '',
              rawData: event // Store the raw data for the modal
            };
          }).filter(event => event.start); // Only include events with valid start dates
          
          setEvents(calendarEvents);
          
          // Extract unique sites for the filter
          const sites = [...new Set(calendarEvents.map(event => event.site).filter(Boolean))];
          setAvailableSites(sites);
          
          // Apply initial filtering (no filter)
          setFilteredEvents(calendarEvents);
        } else {
          console.error('Received invalid visit data:', visitEvents);
          setEvents([]);
          setFilteredEvents([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  // Filter events based on selected site and update statistics
  useEffect(() => {
    // Apply site filter
    const filtered = selectedSite 
      ? events.filter(event => event.site === selectedSite)
      : events;
    
    setFilteredEvents(filtered);
    
    // Calculate statistics for the current view
    calculateStats(filtered);
  }, [selectedSite, events, selectedDate, viewMode]);
  
  // Calculate statistics for the current view
  const calculateStats = (filteredEvents) => {
    // Get events for the current view (week or month)
    const currentViewEvents = getEventsInCurrentView(filteredEvents);
    
    // Calculate total visits in the current view
    const totalVisits = currentViewEvents.length;
    console.log(`Calculating stats: ${totalVisits} visits in current view`);
    
    // Calculate busiest day in the current view
    const dayCount = {};
    currentViewEvents.forEach(event => {
      if (event.start) {
        const dayOfWeek = new Date(event.start).toLocaleDateString('en-US', { weekday: 'long' });
        dayCount[dayOfWeek] = (dayCount[dayOfWeek] || 0) + 1;
      }
    });
    
    let busiestDay = { day: '', count: 0 };
    Object.entries(dayCount).forEach(([day, count]) => {
      if (count > busiestDay.count) {
        busiestDay = { day, count };
      }
    });
    
    setStats({
      totalVisits,
      busiestDay
    });
  };
  
  // Get events that fall within the current view (week or month)
  const getEventsInCurrentView = (events) => {
    if (!events.length) return [];
    
    const startDate = new Date(selectedDate);
    const endDate = new Date(selectedDate);
    
    if (viewMode === 'week') {
      // For weekly view: Monday to Friday of the selected week
      const dayOfWeek = selectedDate.getDay();
      const diff = selectedDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
      startDate.setDate(diff);
      endDate.setDate(startDate.getDate() + 4); // Monday to Friday (5 days)
    } else {
      // For monthly view: Full month
      startDate.setDate(1);
      endDate.setMonth(startDate.getMonth() + 1);
      endDate.setDate(0); // Last day of the month
    }
    
    // Set times to start and end of day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // Filter events that fall within the date range
    return events.filter(event => {
      if (!event.start) return false;
      
      const eventDate = new Date(event.start);
      return eventDate >= startDate && eventDate <= endDate;
    });
  };
  
  // Handle view mode change
  const handleViewChange = (mode) => {
    setViewMode(mode);
  };
  
  // Handle date change
  const handleDateChange = (date) => {
    setSelectedDate(date);
  };
  
  // Handle site filter change
  const handleSiteFilterChange = (site) => {
    setSelectedSite(site);
  };
  
  // Generate Jira issue URL from key
  const getJiraIssueUrl = (issueKey) => {
    if (!jiraBaseUrl || !issueKey) return '#';
    return `${jiraBaseUrl}/browse/${issueKey}`;
  };
  
  // Handle event click to show details modal
  const handleEventClick = (event) => {
    console.log('Event clicked:', event);
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };
  
  // Close the details modal
  const handleCloseModal = () => {
    setShowDetailsModal(false);
  };
  
  const formatDateRange = () => {
    if (viewMode === 'week') {
      // For weekly view, calculate the week range
      const startOfWeek = new Date(selectedDate);
      const dayOfWeek = selectedDate.getDay();
      const diff = selectedDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
      startOfWeek.setDate(diff);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 4); // Monday to Friday (5 days)
      
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      // For monthly view, show the month and year
      return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };
  
  // Navigate to previous week/month
  const navigatePrev = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setSelectedDate(newDate);
  };
  
  // Navigate to next week/month
  const navigateNext = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };
  
  // Handle refresh click
  const handleRefresh = () => {
    window.location.reload();
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading visit data...</div>
      </div>
    );
  }
  
  return (
    <div className="app-container">
      <header className="header">
        <h1>atNorth Site Visits Calendar</h1>
      </header>
      
      <div className="main-content-full">
        <div className="calendar-section-full">
          <div className="calendar-header">
            <div className="view-info">
              <div className="view-title-row">
                <h2>{viewMode === 'week' ? 'Weekly' : 'Monthly'} View ({formatDateRange()})</h2>
                
                <div className="view-stats-inline">
                  <div className="visits-stats">
                    <div className="total-visits">
                      <span className="stat-number">{stats.totalVisits}</span>
                      <span className="stat-label">Total Visits</span>
                    </div>
                    
                    <div className="busiest-day">
                      <span className="stat-number">{stats.busiestDay.count > 0 ? stats.busiestDay.count : 0}</span>
                      <span className="stat-label">{stats.busiestDay.day || ''}</span>
                      <span className="stat-sublabel">Busiest Day</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="view-subtitle-row">
                <p>Viewing upcoming visit schedule</p>
                
                <div className="status-indicators">
                  <span className="status-label">Status</span>
                  <div className="status-dots">
                    <div className="status-item">
                      <span className="status-dot done"></span>
                      <span>Done</span>
                    </div>
                    <div className="status-item">
                      <span className="status-dot in-progress"></span>
                      <span>Work in progress</span>
                    </div>
                    <div className="status-item">
                      <span className="status-dot waiting"></span>
                      <span>Waiting for start</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="calendar-actions">
              <div className="navigation-actions">
                <button className="nav-button prev" onClick={navigatePrev}>
                  ← Prev {viewMode === 'week' ? 'Week' : 'Month'}
                </button>
                <button className="nav-button next" onClick={navigateNext}>
                  Next {viewMode === 'week' ? 'Week' : 'Month'} →
                </button>
              </div>
              
              <div className="view-switcher">
                <button 
                  className={`view-button ${viewMode === 'week' ? 'active' : ''}`} 
                  onClick={() => handleViewChange('week')}
                >
                  Weekly
                </button>
                <button 
                  className={`view-button ${viewMode === 'month' ? 'active' : ''}`} 
                  onClick={() => handleViewChange('month')}
                >
                  Monthly
                </button>
              </div>
              
              <div className="site-filter">
                <select 
                  value={selectedSite} 
                  onChange={(e) => handleSiteFilterChange(e.target.value)}
                  className="site-select"
                >
                  <option value="">All Sites</option>
                  {availableSites.map((site) => (
                    <option key={site} value={site}>{site}</option>
                  ))}
                </select>
              </div>
              
              <button className="refresh-button" onClick={handleRefresh}>
                <span>↻ Refresh</span>
              </button>
            </div>
          </div>
          
          <div className="calendar-container">
            {viewMode === 'week' && (
              <WeeklyCalendarView 
                events={filteredEvents}
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
                getJiraIssueUrl={getJiraIssueUrl}
                onEventClick={handleEventClick}
              />
            )}
            {viewMode === 'month' && (
              <MonthlyCalendarView 
                events={filteredEvents}
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
                getJiraIssueUrl={getJiraIssueUrl}
                onEventClick={handleEventClick}
              />
            )}
          </div>
        </div>
      </div>
      
      {showDetailsModal && selectedEvent && (
        <VisitDetailsModal 
          event={selectedEvent} 
          onClose={handleCloseModal} 
          getJiraIssueUrl={getJiraIssueUrl}
        />
      )}
    </div>
  );
}

export default App; 