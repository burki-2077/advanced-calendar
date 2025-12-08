import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@forge/bridge';
import MonthlyCalendarView from './components/MonthlyCalendarView';
import WeeklyCalendarView from './components/WeeklyCalendarView';
import VisitDetailsModal from './components/VisitDetailsModal';
import xaltLogo from './assets/xalt_logo_black_main.svg';

// Helper function to get status display color based on category
const getStatusCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
        case 'new':
            return '#3f51b5'; // Blue for New
        case 'indeterminate':
            return '#f57c00'; // Orange for In Progress
        case 'done':
            return '#2e7d32'; // Green for Done
        case 'undefined':
        default:
            return '#616161'; // Gray for undefined/default
    }
};

// Stable color mapping for visit types
const visitTypeColorMap = new Map();
let colorCounter = 0;

// Helper function to get visit type icon and color (same as MonthlyCalendarView)
const getVisitTypeDisplay = (visitType) => {
    if (!visitType) return null;

    const type = String(visitType).trim();

    // Generate initials from the visit type
    const words = type.split(/[\s-_]+/);
    let initials = words
        .map(word => word.charAt(0).toUpperCase())
        .filter(char => char.match(/[A-Z0-9]/))
        .slice(0, 3)
        .join('');

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
        class: colorClasses[colorIndex],
        name: type
    };
};

function App() {
    const [loading, setLoading] = useState(false);
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [viewMode, setViewMode] = useState('month');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loadingVisits, setLoadingVisits] = useState(false);
    const [jiraBaseUrl, setJiraBaseUrl] = useState('');
    const [stats, setStats] = useState({
        totalVisits: 0,
        busiestDay: { day: '', count: 0 }
    });
    const [availableSites, setAvailableSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState('');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [availableVisitTypes, setAvailableVisitTypes] = useState([]);
    const [availableStatuses, setAvailableStatuses] = useState([]);
    const [calendarBarFields, setCalendarBarFields] = useState({ monthly: ['site', 'typeOfVisit'], weekly: ['site', 'typeOfVisit'] });

    // Fetch visits for a specific date range
    const fetchVisitsForRange = useCallback(async (startDate, endDate) => {
        try {
            setLoadingVisits(true);
            // Clear old events while loading
            setEvents([]);
            setFilteredEvents([]);

            console.log('Fetching visits for range:', startDate, endDate);

            const response = await invoke('getVisitRequests', {
                startDate: startDate,
                endDate: endDate
            });

            console.log('RECEIVED FROM BACKEND:', response);

            // Handle new API response format {success, data, error, errorCode}
            if (!response || !response.success) {
                const errorMsg = response?.error || 'Failed to fetch visits';
                const errorCode = response?.errorCode || 'UNKNOWN_ERROR';
                console.error('Error fetching visits:', errorMsg, errorCode);
                setEvents([]);
                setFilteredEvents([]);
                return;
            }

            const visitEvents = response.data || [];

            if (Array.isArray(visitEvents)) {
                // Transform for calendar view
                const calendarEvents = visitEvents.map(event => {
                    // Format dates for display with validation
                    let startDate = event.startTime ? new Date(event.startTime) : null;
                    const validStart = startDate && !isNaN(startDate.getTime());
                    if (!validStart) startDate = null;

                    let endDate = event.endTime ? new Date(event.endTime) : startDate;
                    if (endDate && isNaN(endDate.getTime())) endDate = startDate;

                    // Extract common fields from customFields for backward compatibility
                    const customerName = event.customFields?.customerCompanyName?.value || 'Unknown Customer';
                    const contactName = event.customFields?.contactName?.value || '';

                    // Use Visitor Name as title if available, otherwise fall back to summary
                    const visitorName = event.visitorName || '';
                    const title = visitorName || event.summary || 'Untitled Visit';

                    return {
                        id: event.id,
                        title: title,
                        description: event.description || '',
                        start: startDate,
                        end: endDate,
                        status: event.status || 'Open',
                        statusCategory: event.statusCategory || 'undefined',
                        jiraKey: event.key,
                        site: event.site || 'Unspecified',
                        assignee: event.assignee || '',
                        customerName: customerName,
                        contactName: contactName,
                        visitType: event.visitType || '',
                        rawData: event // Store the raw data for the modal
                    };
                }).filter(event => event.start); // Only include events with valid start dates

                setEvents(calendarEvents);

                console.log('Loaded events:', calendarEvents.length);

                // Extract unique sites for the filter
                const sites = [...new Set(calendarEvents.map(event => event.site).filter(Boolean))];
                setAvailableSites(sites);

                // Extract unique visit types for the legend
                const visitTypes = [...new Set(calendarEvents.map(event => event.visitType).filter(Boolean))];
                setAvailableVisitTypes(visitTypes);

                // Extract unique statuses from calendar events for the Status Legend
                const statusMap = new Map();
                calendarEvents.forEach(event => {
                    if (event.status && !statusMap.has(event.status)) {
                        statusMap.set(event.status, {
                            name: event.status,
                            category: event.statusCategory || 'undefined'
                        });
                    }
                });
                const statuses = Array.from(statusMap.values());
                setAvailableStatuses(statuses);
                console.log('Extracted statuses from calendar events:', statuses);

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
            setLoadingVisits(false);
        }
    }, []);

    // Initialize Jira base URL and calendar bar fields on mount
    useEffect(() => {
        async function init() {
            try {
                setLoading(true);

                // Fetch Jira base URL
                const baseUrlResponse = await invoke('getJiraBaseUrl');
                if (baseUrlResponse?.success && baseUrlResponse.baseUrl) {
                    setJiraBaseUrl(baseUrlResponse.baseUrl);
                } else {
                    console.error('Failed to fetch Jira base URL:', baseUrlResponse?.error);
                }

                // Fetch admin settings to get calendar bar fields configuration
                const settingsResponse = await invoke('getAdminSettings');
                if (settingsResponse && settingsResponse.success && settingsResponse.settings) {
                    const { calendarBarFields: barFields } = settingsResponse.settings;

                    // Set calendar bar fields configuration
                    if (barFields) {
                        setCalendarBarFields(barFields);
                    }
                }
            } catch (error) {
                console.error('Error initializing:', error);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    // Fetch visits when selectedDate or viewMode changes
    useEffect(() => {
        const fetchVisits = async () => {
            const date = new Date(selectedDate);
            let startDate, endDate;

            if (viewMode === 'week') {
                // Get Monday to Sunday of the week
                const dayOfWeek = date.getDay();
                const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                const startOfWeek = new Date(date.getFullYear(), date.getMonth(), diff);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(endOfWeek.getDate() + 6);

                // Expand fetch window to include multi-week events that started earlier or end later
                startDate = new Date(startOfWeek);
                endDate = new Date(endOfWeek);
                startDate.setDate(startDate.getDate() - 28); // buffer before (4 weeks)
                endDate.setDate(endDate.getDate() + 28);     // buffer after (4 weeks)
            } else {
                // Get first and last day of the month
                startDate = new Date(date.getFullYear(), date.getMonth(), 1);
                endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            }

            // Format dates as YYYY-MM-DD (avoid timezone issues from toISOString)
            const formatDate = (d) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            };

            console.log(`Triggering fetch for ${viewMode} view:`, {
                selectedDate: date.toISOString(),
                range: `${formatDate(startDate)} to ${formatDate(endDate)}`
            });

            await fetchVisitsForRange(formatDate(startDate), formatDate(endDate));
        };

        fetchVisits();
    }, [selectedDate, viewMode, fetchVisitsForRange]);

    // Get events that fall within the current view (week or month)
    const getEventsInCurrentView = useCallback((events) => {
        if (!events.length) return [];

        const startDate = new Date(selectedDate);
        const endDate = new Date(selectedDate);

        if (viewMode === 'week') {
            // For weekly view: Monday to Sunday of the selected week (7 days)
            const dayOfWeek = selectedDate.getDay();
            const diff = selectedDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
            startDate.setDate(diff);
            endDate.setDate(startDate.getDate() + 6); // Monday to Sunday (7 days)
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
        console.log('Navigating to previous:', newDate);
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
        console.log('Navigating to next:', newDate);
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
                            <div className="brand-logo-wrapper">
                                <img src={xaltLogo} alt="XALT logo" className="brand-logo" />
                            </div>
                            <div className="brand-text">
                                <h1 className="app-title">📅 Advanced Calendar for Jira</h1>
                                <p className="app-subtitle">Advanced calendar views for Jira work items</p>
                            </div>
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
                                            <option value="">📍 All Locations</option>
                                            {availableSites.map((site) => (
                                                <option key={site} value={site}>📍 {site}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="header-bottom-row">
                            {availableStatuses.length > 0 ? (
                                <div className="status-legend">
                                    <span className="legend-title">📋 Status Legend:</span>
                                    <div className="status-items">
                                        {availableStatuses.map((status, index) => (
                                            <div key={`${status.name}-${index}`} className="status-item">
                                                <span
                                                    className="status-dot"
                                                    style={{ backgroundColor: getStatusCategoryColor(status.category) }}
                                                ></span>
                                                <span>{status.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="status-legend">
                                    <span className="legend-title">📋 Status Legend:</span>
                                    <div className="status-items">
                                        <div className="status-item">
                                            <span className="status-dot waiting-for-start"></span>
                                            <span>No statuses to display</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {availableVisitTypes.length > 0 && (
                                <div className="visit-type-legend">
                                    <span className="legend-title">🏷️ Type:</span>
                                    <div className="status-items">
                                        {availableVisitTypes.map((visitType) => {
                                            const display = getVisitTypeDisplay(visitType);
                                            return display ? (
                                                <div key={visitType} className="status-item">
                                                    <span className={`visit-type-icon ${display.class}`}>
                                                        {display.icon}
                                                    </span>
                                                    <span>{display.name}</span>
                                                </div>
                                            ) : null;
                                        })}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    <div className="calendar-container">
                        {loadingVisits ? (
                            <div className="loading-container">
                                <div className="loading-spinner"></div>
                                <div className="loading-text">Loading visits...</div>
                            </div>
                        ) : (
                            <>
                                {viewMode === 'week' && (
                                    <WeeklyCalendarView
                                        events={filteredEvents}
                                        selectedDate={selectedDate}
                                        onDateChange={handleDateChange}
                                        getJiraIssueUrl={getJiraIssueUrl}
                                        onEventClick={handleEventClick}
                                        barFields={calendarBarFields.weekly}
                                    />
                                )}
                                {viewMode === 'month' && (
                                    <MonthlyCalendarView
                                        events={filteredEvents}
                                        selectedDate={selectedDate}
                                        onDateChange={handleDateChange}
                                        getJiraIssueUrl={getJiraIssueUrl}
                                        onEventClick={handleEventClick}
                                        barFields={calendarBarFields.monthly}
                                    />
                                )}
                            </>
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
