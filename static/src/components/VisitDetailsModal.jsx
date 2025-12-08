import React from 'react';

const VisitDetailsModal = ({ event, onClose, getJiraIssueUrl }) => {
  if (!event) return null;
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Access raw data for custom fields
  const rawData = event.rawData || {};
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{event.title}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {/* Required Fields - Always Shown */}
          <div className="detail-row">
            <span className="detail-label">Visitor Name:</span>
            <span className="detail-value">{rawData.visitorName || 'Not specified'}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Start Time:</span>
            <span className="detail-value">{formatDate(event.start)}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">End Time:</span>
            <span className="detail-value">{formatDate(event.end)}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Location:</span>
            <span className="detail-value">{event.site || 'Not specified'}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Type of Visit:</span>
            <span className="detail-value">{rawData.visitType || 'Not specified'}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">Status:</span>
            <span className={`detail-value status-badge status-${event.statusCategory || 'undefined'}`}>
              {event.status || 'Not specified'}
            </span>
          </div>
          
          {/* Dynamic Custom Fields */}
          {rawData.customFields && Object.keys(rawData.customFields).length > 0 && (
            <>
              {Object.entries(rawData.customFields).map(([key, field]) => (
                <div key={key} className="detail-row">
                  <span className="detail-label">{field.label}:</span>
                  <span className="detail-value">{field.value || 'Not specified'}</span>
                </div>
              ))}
            </>
          )}

          {event.description && (
            <div className="detail-description">
              <span className="detail-label">Description:</span>
              <p>{event.description}</p>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <a 
            href={getJiraIssueUrl(event.jiraKey)}
            target="_blank" 
            rel="noopener noreferrer"
            className="view-in-jira-button"
            onClick={(e) => {
              e.stopPropagation();
              // Ensure the link opens properly
              const url = getJiraIssueUrl(event.jiraKey);
              if (url && url !== '#') {
                window.open(url, '_blank', 'noopener,noreferrer');
              }
            }}
            style={{
              textDecoration: 'none',
              display: getJiraIssueUrl(event.jiraKey) === '#' ? 'none' : 'inline-flex',
              cursor: 'pointer'
            }}
          >
            🔗 View in Jira
          </a>
        </div>
      </div>
    </div>
  );
};

export default VisitDetailsModal; 