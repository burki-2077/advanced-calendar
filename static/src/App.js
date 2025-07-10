import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@forge/bridge';
import MonthlyCalendarView from './components/MonthlyCalendarView';
import WeeklyCalendarView from './components/WeeklyCalendarView';
import VisitDetailsModal from './components/VisitDetailsModal';

function App() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [viewMode, setViewMode] = useState('month');
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
              visitType: event.visitType || '', // Add visit type mapping
              visitorList: event.visitorList || '', // NEW: Visitor List
              visitReason: event.visitReason || '', // NEW: Visit Reason
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
  
  // Get events that fall within the current view (week or month)
  const getEventsInCurrentView = useCallback((events) => {
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
    
    // Set times to encompass full days
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // Filter events that have ANY overlap with the view period
    return events.filter(event => {
      if (!event.start) return false;
      
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end || event.start);
      
      // Check if there's any overlap between event period and view period
      // Event overlaps if: event starts before view ends AND event ends after view starts
      const hasOverlap = eventStart <= endDate && eventEnd >= startDate;
      
      return hasOverlap;
    });
  }, [viewMode, selectedDate]);
  
  // Calculate statistics for the current view
  const calculateStats = useCallback((filteredEvents) => {
    // Get events for the current view (week or month)
    const currentViewEvents = getEventsInCurrentView(filteredEvents);
    
    // Calculate total visits in the current view
    const totalVisits = currentViewEvents.length;
    
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
  }, [getEventsInCurrentView]);
  
  // Filter events based on selected site and update statistics
  useEffect(() => {
    // Apply site filter
    const filtered = selectedSite 
      ? events.filter(event => event.site === selectedSite)
      : events;
    
    setFilteredEvents(filtered);
    
    // Calculate statistics for the current view
    calculateStats(filtered);
  }, [selectedSite, events, selectedDate, viewMode, calculateStats]);
  
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
      <header className="modern-header">
        <div className="header-content">
          <div className="header-left">
            <div className="brand-section">
              <h1 className="app-title">🏢 atNorth Site Visits Calendar</h1>
              <p className="app-subtitle">Manage and track client visits across all facilities</p>
            </div>
          </div>
          
          <div className="header-controls">
            <div className="view-switcher modern">
              <button 
                className={`view-button ${viewMode === 'week' ? 'active' : ''}`} 
                onClick={() => handleViewChange('week')}
              >
                📅 Weekly
              </button>
              <button 
                className={`view-button ${viewMode === 'month' ? 'active' : ''}`} 
                onClick={() => handleViewChange('month')}
              >
                📊 Monthly
              </button>
            </div>
            
            <button className="refresh-button modern" onClick={handleRefresh}>
              <span>🔄 Refresh</span>
            </button>
          </div>
        </div>
      </header>
      
      <div className="main-content-full">
        <div className="calendar-section-full">
          <div className="calendar-header modern">
            <div className="header-top-row">
              <div className="view-info">
                <h2 className="view-title">{viewMode === 'week' ? 'Weekly' : 'Monthly'} View</h2>
                <p className="date-range">{formatDateRange()}</p>
              </div>
              
              <div className="stats-and-controls">
                <div className="visit-stats">
                  <div className="stat-card total-visits">
                    <span className="stat-number">{stats.totalVisits}</span>
                    <span className="stat-label">Total Visits</span>
                  </div>
                  
                  <div className="stat-card busiest-day">
                    <span className="stat-number">{stats.busiestDay.count > 0 ? stats.busiestDay.count : '—'}</span>
                    <span className="stat-label">{stats.busiestDay.day || 'Busiest Day'}</span>
                  </div>
                </div>
                
                <div className="controls-group">
                  <div className="navigation-controls">
                    <button className="nav-btn prev" onClick={navigatePrev}>
                      ← Prev
                    </button>
                    <button className="nav-btn next" onClick={navigateNext}>
                      Next →
                    </button>
                  </div>
                  
                  <div className="filter-control">
                    <select 
                      value={selectedSite} 
                      onChange={(e) => handleSiteFilterChange(e.target.value)}
                      className="site-select modern"
                    >
                      <option value="">🏭 All Sites</option>
                      {availableSites.map((site) => (
                        <option key={site} value={site}>📍 {site}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="header-bottom-row">
              <div className="status-legend">
                <span className="legend-title">📋 Status Legend:</span>
                <div className="status-items">
                  <div className="status-item">
                    <span className="status-dot waiting-approval"></span>
                    <span>Waiting for approval</span>
                  </div>
                  <div className="status-item">
                    <span className="status-dot rejected"></span>
                    <span>Rejected</span>
                  </div>
                  <div className="status-item">
                    <span className="status-dot in-progress"></span>
                    <span>In progress</span>
                  </div>
                  <div className="status-item">
                    <span className="status-dot done"></span>
                    <span>Done</span>
                  </div>
                </div>
              </div>
              
              <div className="visit-type-legend">
                <span className="legend-title">🏷️ Visit Types:</span>
                <div className="type-items">
                  <div className="type-item">
                    <span className="visit-type-icon internal-atnorth">IA</span>
                    <span>Internal atNorth</span>
                  </div>
                  <div className="type-item">
                    <span className="visit-type-icon external-atnorth">EA</span>
                    <span>External atNorth</span>
                  </div>
                  <div className="type-item">
                    <span className="visit-type-icon internal-customer">IC</span>
                    <span>Internal Customer</span>
                  </div>
                  <div className="type-item">
                    <span className="visit-type-icon external-customer">EC</span>
                    <span>External Customer</span>
                  </div>
                </div>
              </div>
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