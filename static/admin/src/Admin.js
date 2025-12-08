import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@forge/bridge';

function CustomFieldInput({ value, onChange, placeholder, label, required, hint }) {
  const [customFields, setCustomFields] = useState([]);
  const [filteredFields, setFilteredFields] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    async function loadCustomFields() {
      setLoadingFields(true);
      try {
        const response = await invoke('fetchCustomFields');
        if (response.success && response.customFields) {
          setCustomFields(response.customFields);
          
          if (value) {
            const fieldId = value.replace('customfield_', '');
            const fullFieldId = `customfield_${fieldId}`;
            const matchedField = response.customFields.find(f => f.id === fullFieldId);
            if (matchedField) {
              setDisplayValue(`${matchedField.name} (${fieldId})`);
            } else {
              setDisplayValue(fieldId);
            }
          }
        }
      } catch (error) {
        console.error('Error loading custom fields:', error);
      } finally {
        setLoadingFields(false);
      }
    }
    
    loadCustomFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (value && customFields.length > 0) {
      const fieldId = value.replace('customfield_', '');
      const fullFieldId = `customfield_${fieldId}`;
      const matchedField = customFields.find(f => f.id === fullFieldId);
      if (matchedField) {
        setDisplayValue(`${matchedField.name} (${fieldId})`);
      } else {
        setDisplayValue(fieldId);
      }
    } else if (!value) {
      setDisplayValue('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customFields]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    if (inputValue.trim()) {
      const searchTerm = inputValue.toLowerCase();
      const filtered = customFields.filter(field => {
        const fieldId = field.id.replace('customfield_', '');
        return fieldId.includes(searchTerm) || 
               field.name.toLowerCase().includes(searchTerm);
      });
      setFilteredFields(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredFields([]);
      setShowSuggestions(false);
      onChange('');
    }
  };

  const handleSelectField = (field) => {
    const fieldId = field.id.replace('customfield_', '');
    setDisplayValue(`${field.name} (${fieldId})`);
    onChange(fieldId);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    if (customFields.length > 0) {
      setFilteredFields(customFields);
      setShowSuggestions(true);
    }
  };

  return (
    <div className="form-group" ref={wrapperRef} style={{ position: 'relative' }}>
      <label>
        {label}
        {required && <span className="required">*</span>}
      </label>
      <input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        required={required}
      />
      <small className="field-hint">{hint}</small>
      
      {showSuggestions && filteredFields.length > 0 && (
        <div className="autocomplete-dropdown">
          {loadingFields && (
            <div className="autocomplete-loading">Loading fields...</div>
          )}
          {filteredFields.slice(0, 10).map(field => (
            <div
              key={field.id}
              className="autocomplete-item"
              onClick={() => handleSelectField(field)}
            >
              <div className="autocomplete-item-name">
                {field.name}
              </div>
              <div className="autocomplete-item-id">
                ({field.id.replace('customfield_', '')})
              </div>
              <div className="autocomplete-item-type">{field.type}</div>
            </div>
          ))}
          {filteredFields.length > 10 && (
            <div className="autocomplete-more">
              +{filteredFields.length - 10} more fields...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Admin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Project and Work Item Type state
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedWorkItemTypes, setSelectedWorkItemTypes] = useState([]);
  
  // UI state for project selector
  const [projectSearch, setProjectSearch] = useState('');
  const [projectSearchResults, setProjectSearchResults] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const projectWrapperRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  
  // UI state for work item type selector
  const [availableWorkItemTypes, setAvailableWorkItemTypes] = useState([]);
  const [loadingWorkItemTypes, setLoadingWorkItemTypes] = useState(false);
  const [showWorkItemTypeDropdown, setShowWorkItemTypeDropdown] = useState(false);
  const [workItemTypeSearch, setWorkItemTypeSearch] = useState('');
  const workItemTypeWrapperRef = useRef(null);
  
  // Custom field state
  const [timeOfVisit, setTimeOfVisit] = useState('10000');
  const [endTime, setEndTime] = useState('10001');
  const [site, setSite] = useState('10002');
  const [typeOfVisit, setTypeOfVisit] = useState('10005');
  const [visitorName, setVisitorName] = useState('10008');
  const [additionalFields, setAdditionalFields] = useState([
    { id: 'customerCompanyName', label: 'Customer Company Name', jiraFieldId: '10003' },
    { id: 'contactName', label: 'Contact Name', jiraFieldId: '10004' },
    { id: 'visitorList', label: 'Visitor List', jiraFieldId: '10006' },
    { id: 'reason', label: 'Visit Reason', jiraFieldId: '10007' }
  ]);
  
  // Calendar bar fields state
  const [monthlyBarFields, setMonthlyBarFields] = useState(['site', 'typeOfVisit']);
  const [weeklyBarFields, setWeeklyBarFields] = useState(['site', 'typeOfVisit']);
  const [barFieldsView, setBarFieldsView] = useState('monthly');

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await invoke('getAdminSettings');
        if (response.success && response.settings) {
          const s = response.settings;
          
          // Load projects and work item types
          const allProjects = s.projects || [];
          const allWorkItemTypes = s.requestTypesWithProjects || [];
          
          setSelectedProjects(allProjects);
          setSelectedWorkItemTypes(allWorkItemTypes);
          
          // Load custom fields
          if (s.customFields) {
            const normalizeFieldId = (id) => id ? id.replace('customfield_', '') : '';
            setTimeOfVisit(normalizeFieldId(s.customFields.timeOfVisit));
            setEndTime(normalizeFieldId(s.customFields.endTime));
            setSite(normalizeFieldId(s.customFields.site));
            setTypeOfVisit(normalizeFieldId(s.customFields.typeOfVisit));
            setVisitorName(normalizeFieldId(s.customFields.visitorName));
            
            if (s.customFields.additionalFields) {
              setAdditionalFields(s.customFields.additionalFields.map(field => ({
                ...field,
                jiraFieldId: normalizeFieldId(field.jiraFieldId)
              })));
            }
          }
          
          // Load calendar bar fields
          if (s.calendarBarFields) {
            setMonthlyBarFields(s.calendarBarFields.monthly || ['site', 'typeOfVisit']);
            setWeeklyBarFields(s.calendarBarFields.weekly || ['site', 'typeOfVisit']);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setMessage({ type: 'error', text: 'Failed to load settings' });
      } finally {
        setLoading(false);
      }
    }
    
    loadSettings();
  }, []);

  // Project search with debounce
  useEffect(() => {
    async function searchProjects() {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      if (!showProjectDropdown) {
        return;
      }
      
      if (!projectSearch || projectSearch.trim().length < 2) {
        setProjectSearchResults([]);
        setLoadingProjects(false);
        return;
      }
      
      searchTimeoutRef.current = setTimeout(async () => {
        setLoadingProjects(true);
        try {
          console.log('Searching for projects with query:', projectSearch);
          const response = await invoke('searchProjects', { query: projectSearch });
          
          if (response.success && response.projects) {
            console.log('Received projects from backend:', response.projects.length);
            // Apply aggressive client-side filtering since Jira API query param doesn't work well
            const searchLower = projectSearch.toLowerCase().trim();
            const filtered = response.projects.filter(p => 
              p.name.toLowerCase().includes(searchLower) || 
              p.key.toLowerCase().includes(searchLower)
            );
            console.log('After client-side filtering:', filtered.length, 'projects matching:', projectSearch);
            
            // Limit to top 20 results for performance
            const limited = filtered.slice(0, 20);
            console.log('Showing:', limited.length, 'projects');
            setProjectSearchResults(limited);
          } else {
            console.error('Search failed:', response.error);
            setProjectSearchResults([]);
          }
        } catch (error) {
          console.error('Error searching projects:', error);
          setProjectSearchResults([]);
        } finally {
          setLoadingProjects(false);
        }
      }, 300);
    }
    
    searchProjects();
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [projectSearch, showProjectDropdown]);

  // Load work item types when projects change
  useEffect(() => {
    async function loadWorkItemTypes() {
      if (selectedProjects.length === 0) {
        setAvailableWorkItemTypes([]);
        return;
      }

      setLoadingWorkItemTypes(true);
      try {
        const allTypes = [];
        
        for (const projectKey of selectedProjects) {
          // Try JSM request types first
          const jsmResponse = await invoke('fetchRequestTypes', { projectKey });
          if (jsmResponse.success && jsmResponse.requestTypes) {
            const typesWithProject = jsmResponse.requestTypes.map(rt => ({
              ...rt,
              projectKey,
              itemType: 'requestType',
              label: `${rt.name} (${projectKey})`
            }));
            allTypes.push(...typesWithProject);
            continue;
          }
          
          // If not JSM, try regular issue types
          const jiraResponse = await invoke('fetchIssueTypes', { projectKey });
          if (jiraResponse.success && jiraResponse.issueTypes) {
            const typesWithProject = jiraResponse.issueTypes.map(it => ({
              ...it,
              projectKey,
              itemType: 'issueType',
              label: `${it.name} (${projectKey})`
            }));
            allTypes.push(...typesWithProject);
          }
        }
        
        setAvailableWorkItemTypes(allTypes);
      } catch (error) {
        console.error('Error loading work item types:', error);
      } finally {
        setLoadingWorkItemTypes(false);
      }
    }
    
    loadWorkItemTypes();
  }, [selectedProjects]);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event) {
      if (projectWrapperRef.current && !projectWrapperRef.current.contains(event.target)) {
        setShowProjectDropdown(false);
      }
      if (workItemTypeWrapperRef.current && !workItemTypeWrapperRef.current.contains(event.target)) {
        setShowWorkItemTypeDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleProject = (projectKey) => {
    const newProjects = selectedProjects.includes(projectKey)
      ? selectedProjects.filter(k => k !== projectKey)
      : [...selectedProjects, projectKey];
    
    setSelectedProjects(newProjects);
    
    // Clear work item types that no longer belong to selected projects
    setSelectedWorkItemTypes(selectedWorkItemTypes.filter(wit => 
      newProjects.includes(wit.projectKey)
    ));
  };

  const removeProject = (projectKey) => {
    setSelectedProjects(selectedProjects.filter(k => k !== projectKey));
    setSelectedWorkItemTypes(selectedWorkItemTypes.filter(wit => 
      wit.projectKey !== projectKey
    ));
  };

  const toggleWorkItemType = (item) => {
    const isSelected = selectedWorkItemTypes.some(wit => wit.label === item.label);
    const newItems = isSelected
      ? selectedWorkItemTypes.filter(wit => wit.label !== item.label)
      : [...selectedWorkItemTypes, item];
    
    setSelectedWorkItemTypes(newItems);
  };

  const removeWorkItemType = (item) => {
    setSelectedWorkItemTypes(selectedWorkItemTypes.filter(wit => wit.label !== item.label));
  };

  const getSelectedProjectDetails = (projectKey) => {
    const found = projectSearchResults.find(p => p.key === projectKey);
    return found || { key: projectKey, name: projectKey };
  };

  const filteredWorkItemTypes = availableWorkItemTypes.filter(item =>
    item.label.toLowerCase().includes(workItemTypeSearch.toLowerCase()) ||
    item.name.toLowerCase().includes(workItemTypeSearch.toLowerCase())
  );

  const denormalizeFieldId = (id) => id ? `customfield_${id}` : '';

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const settings = {
        projects: selectedProjects,
        requestTypesWithProjects: selectedWorkItemTypes,
        
        // Legacy fields for backward compatibility
        projectKey: selectedProjects[0] || 'PROJECT',
        requestTypes: selectedWorkItemTypes.map(item => item.name),
        customFields: {
          timeOfVisit: denormalizeFieldId(timeOfVisit),
          endTime: denormalizeFieldId(endTime),
          site: denormalizeFieldId(site),
          typeOfVisit: denormalizeFieldId(typeOfVisit),
          visitorName: denormalizeFieldId(visitorName),
          additionalFields: additionalFields.map(field => ({
            ...field,
            jiraFieldId: denormalizeFieldId(field.jiraFieldId)
          }))
        },
        calendarBarFields: {
          monthly: monthlyBarFields,
          weekly: weeklyBarFields
        }
      };

      const response = await invoke('saveAdminSettings', { settings });

      if (response.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully! Please refresh the calendar to see changes.' });
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedProjects(['PROJECT']);
    setSelectedWorkItemTypes([{ name: 'Visit', projectKey: 'PROJECT', label: 'Visit (PROJECT)' }]);
    setTimeOfVisit('10000');
    setEndTime('10001');
    setSite('10002');
    setTypeOfVisit('10005');
    setVisitorName('10008');
    setAdditionalFields([
      { id: 'customerCompanyName', label: 'Customer Company Name', jiraFieldId: '10003' },
      { id: 'contactName', label: 'Contact Name', jiraFieldId: '10004' },
      { id: 'visitorList', label: 'Visitor List', jiraFieldId: '10006' },
      { id: 'reason', label: 'Visit Reason', jiraFieldId: '10007' }
    ]);
    setMonthlyBarFields(['site', 'typeOfVisit']);
    setWeeklyBarFields(['site', 'typeOfVisit']);
    setMessage({ type: 'info', text: 'Form reset to default values. Click Save to apply changes.' });
  };
  
  const handleAddField = () => {
    const newField = {
      id: `customField${Date.now()}`,
      label: '',
      jiraFieldId: ''
    };
    setAdditionalFields([...additionalFields, newField]);
  };
  
  const handleRemoveField = (index) => {
    const updatedFields = additionalFields.filter((_, i) => i !== index);
    setAdditionalFields(updatedFields);
  };
  
  const handleUpdateField = (index, key, value) => {
    const updatedFields = [...additionalFields];
    updatedFields[index][key] = value;
    setAdditionalFields(updatedFields);
  };
  
  const getAvailableFields = () => {
    return [
      { id: 'site', label: 'Location' },
      { id: 'typeOfVisit', label: 'Type' },
      ...additionalFields.map(f => ({ id: f.id, label: f.label }))
    ];
  };
  
  const toggleBarField = (fieldId, view) => {
    const fields = view === 'monthly' ? monthlyBarFields : weeklyBarFields;
    const setFields = view === 'monthly' ? setMonthlyBarFields : setWeeklyBarFields;
    
    if (fields.includes(fieldId)) {
      setFields(fields.filter(f => f !== fieldId));
    } else {
      if (fields.length < 10) {
        setFields([...fields, fieldId]);
      }
    }
  };
  
  const moveFieldUp = (index, view) => {
    const fields = view === 'monthly' ? [...monthlyBarFields] : [...weeklyBarFields];
    const setFields = view === 'monthly' ? setMonthlyBarFields : setWeeklyBarFields;
    
    if (index > 0) {
      [fields[index], fields[index - 1]] = [fields[index - 1], fields[index]];
      setFields(fields);
    }
  };
  
  const moveFieldDown = (index, view) => {
    const fields = view === 'monthly' ? [...monthlyBarFields] : [...weeklyBarFields];
    const setFields = view === 'monthly' ? setMonthlyBarFields : setWeeklyBarFields;
    
    if (index < fields.length - 1) {
      [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
      setFields(fields);
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Advanced Calendar for Jira Administration</h1>
        <p>Configure Jira project settings and custom field mappings.</p>
      </header>

      {message.text && (
        <div className={`message-banner ${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="admin-form">
        <section className="form-section">
          <h2>Project Configuration</h2>
          <p className="section-description">
            Select projects and their work item types. Type at least 2 characters to search for projects.
          </p>

          {/* Project Selector */}
          <div className="form-group" ref={projectWrapperRef} style={{ position: 'relative' }}>
            <label>
              Projects
              <span className="required">*</span>
            </label>
            
            <div className="multi-select-container" onClick={() => setShowProjectDropdown(!showProjectDropdown)}>
              {selectedProjects.length === 0 ? (
                <span className="placeholder-text">Select projects...</span>
              ) : (
                <div className="selected-chips">
                  {selectedProjects.map(projectKey => {
                    const project = getSelectedProjectDetails(projectKey);
                    return (
                      <span key={projectKey} className="chip">
                        {project.name} ({project.key})
                        <button
                          type="button"
                          className="chip-remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeProject(projectKey);
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <span className="dropdown-arrow">▼</span>
            </div>
            
            <small className="field-hint">Type to search for projects (min 2 characters)</small>
            
            {showProjectDropdown && (
              <div className="multi-select-dropdown">
                <div className="dropdown-search">
                  <input
                    type="text"
                    placeholder="Type to search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
                
                <div className="dropdown-options">
                  {loadingProjects ? (
                    <div className="dropdown-loading">Searching projects...</div>
                  ) : projectSearchResults.length === 0 ? (
                    <div className="dropdown-empty">
                      {projectSearch.length < 2 ? 'Type at least 2 characters to search...' : 'No projects found'}
                    </div>
                  ) : (
                    projectSearchResults.map(project => (
                      <div
                        key={project.key}
                        className={`dropdown-option ${selectedProjects.includes(project.key) ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProject(project.key);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(project.key)}
                          onChange={() => {}}
                        />
                        <span className="option-label">{project.name}</span>
                        <span className="option-key">({project.key})</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Work Item Type Selector */}
          <div className="form-group" ref={workItemTypeWrapperRef} style={{ position: 'relative' }}>
            <label>
              Work Item Types
            </label>
            
            <div 
              className="multi-select-container"
              onClick={() => selectedProjects.length > 0 && setShowWorkItemTypeDropdown(!showWorkItemTypeDropdown)}
              style={{ opacity: selectedProjects.length === 0 ? 0.5 : 1 }}
            >
              {selectedWorkItemTypes.length === 0 ? (
                <span className="placeholder-text">
                  {selectedProjects.length === 0 ? 'Select projects first...' : 'Select work item types...'}
                </span>
              ) : (
                <div className="selected-chips">
                  {selectedWorkItemTypes.map(item => (
                    <span key={item.label} className="chip">
                      {item.name} <span className="chip-meta">({item.projectKey})</span>
                      <button
                        type="button"
                        className="chip-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeWorkItemType(item);
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <span className="dropdown-arrow">▼</span>
            </div>
            
            <small className="field-hint">Select issue types or request types from the projects above</small>
            
            {showWorkItemTypeDropdown && selectedProjects.length > 0 && (
              <div className="multi-select-dropdown">
                <div className="dropdown-search">
                  <input
                    type="text"
                    placeholder="Search work item types..."
                    value={workItemTypeSearch}
                    onChange={(e) => setWorkItemTypeSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                <div className="dropdown-options">
                  {loadingWorkItemTypes ? (
                    <div className="dropdown-loading">Loading work item types...</div>
                  ) : filteredWorkItemTypes.length === 0 ? (
                    <div className="dropdown-empty">No work item types found</div>
                  ) : (
                    filteredWorkItemTypes.map(item => (
                      <div
                        key={item.label}
                        className={`dropdown-option ${selectedWorkItemTypes.some(selected => selected.label === item.label) ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWorkItemType(item);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedWorkItemTypes.some(selected => selected.label === item.label)}
                          onChange={() => {}}
                        />
                        <span className="option-label">{item.name}</span>
                        <span className="option-key">({item.projectKey})</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="form-section">
          <h2>Required Custom Field Mappings</h2>
          <p className="section-description">
            These fields are required for the calendar to function. Start typing the field name or numeric ID to see autocomplete suggestions.
          </p>

          <div className="form-row">
            <CustomFieldInput
              value={timeOfVisit}
              onChange={setTimeOfVisit}
              placeholder="e.g., Visit Start Time or 10000"
              label="Start Time"
              required={true}
              hint="Type field name or ID for visit start date/time"
            />

            <CustomFieldInput
              value={endTime}
              onChange={setEndTime}
              placeholder="e.g., Visit End Time or 10001"
              label="End Time"
              required={true}
              hint="Type field name or ID for visit end date/time"
            />
          </div>

          <div className="form-row">
            <CustomFieldInput
              value={site}
              onChange={setSite}
              placeholder="e.g., Location or 10002"
              label="Location"
              required={true}
              hint="Type field name or ID for location"
            />

            <CustomFieldInput
              value={typeOfVisit}
              onChange={setTypeOfVisit}
              placeholder="e.g., Type or 10005"
              label="Type"
              required={true}
              hint="Type field name or ID for visit type"
            />
          </div>

          <div className="form-row">
            <CustomFieldInput
              value={visitorName}
              onChange={setVisitorName}
              placeholder="e.g., Visitor Name or 10008"
              label="Visitor Name"
              required={true}
              hint="Type field name or ID for visitor name (used as calendar title)"
            />
          </div>
        </section>

        <section className="form-section">
          <h2>Additional Custom Fields</h2>
          <p className="section-description">
            Add or remove optional custom fields to display in the calendar.
          </p>

          {additionalFields.map((field, index) => (
            <div key={field.id} className="form-row custom-field-row">
              <div className="form-group">
                <label htmlFor={`field-label-${index}`}>
                  Field Label
                </label>
                <input
                  type="text"
                  id={`field-label-${index}`}
                  value={field.label}
                  onChange={(e) => handleUpdateField(index, 'label', e.target.value)}
                  placeholder="e.g., Customer Company Name"
                  required
                />
              </div>

              <CustomFieldInput
                value={field.jiraFieldId}
                onChange={(value) => handleUpdateField(index, 'jiraFieldId', value)}
                placeholder="e.g., Company Name or 10003"
                label="Jira Field"
                required={true}
                hint="Type field name or ID"
              />

              <button
                type="button"
                onClick={() => handleRemoveField(index)}
                className="btn-remove-field"
                title="Remove field"
              >
                ✕
              </button>
            </div>
          ))}

          <button type="button" onClick={handleAddField} className="btn-add-field">
            + Add Custom Field
          </button>
        </section>

        <section className="form-section">
          <h2>Calendar Bar Fields Configuration</h2>
          
          <div className="view-toggle" style={{ margin: '1rem 0' }}>
            <button
              type="button"
              className={`toggle-btn ${barFieldsView === 'monthly' ? 'active' : ''}`}
              onClick={() => setBarFieldsView('monthly')}
            >
              Monthly View
            </button>
            <button
              type="button"
              className={`toggle-btn ${barFieldsView === 'weekly' ? 'active' : ''}`}
              onClick={() => setBarFieldsView('weekly')}
            >
              Weekly View
            </button>
          </div>
          
          <p className="section-description">
            Configure which fields appear on calendar bars. First field is always Visitor Name, second is always Start/End Time. You can add up to 10 additional fields and reorder them.
          </p>
          
          {barFieldsView === 'monthly' && (
            <>
          
          <div className="bar-fields-info">
            <div className="locked-fields">
              <strong>Always Shown:</strong>
              <span className="field-chip locked">1. Visitor Name</span>
              <span className="field-chip locked">2. Start Time / End Time</span>
            </div>
          </div>

          <div className="bar-fields-container">
            <h3>Additional Fields ({monthlyBarFields.length}/10)</h3>
            {monthlyBarFields.map((fieldId, index) => {
              const field = getAvailableFields().find(f => f.id === fieldId);
              return field ? (
                <div key={fieldId} className="bar-field-item">
                  <span className="bar-field-order">{index + 3}.</span>
                  <span className="bar-field-label">{field.label}</span>
                  <div className="bar-field-actions">
                    <button
                      type="button"
                      onClick={() => moveFieldUp(index, 'monthly')}
                      disabled={index === 0}
                      className="btn-reorder"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveFieldDown(index, 'monthly')}
                      disabled={index === monthlyBarFields.length - 1}
                      className="btn-reorder"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBarField(fieldId, 'monthly')}
                      className="btn-remove-bar-field"
                      title="Remove from bar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : null;
            })}

            {monthlyBarFields.length < 10 && (
              <div className="available-fields">
                <h4>Available Fields:</h4>
                <div className="field-chips">
                  {getAvailableFields()
                    .filter(f => !monthlyBarFields.includes(f.id))
                    .map(field => (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => toggleBarField(field.id, 'monthly')}
                        className="field-chip-add"
                      >
                        + {field.label}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
            </>
          )}
          
          {barFieldsView === 'weekly' && (
            <>
          
          <div className="bar-fields-info">
            <div className="locked-fields">
              <strong>Always Shown:</strong>
              <span className="field-chip locked">1. Visitor Name</span>
              <span className="field-chip locked">2. Start Time / End Time</span>
            </div>
          </div>

          <div className="bar-fields-container">
            <h3>Additional Fields ({weeklyBarFields.length}/10)</h3>
            {weeklyBarFields.map((fieldId, index) => {
              const field = getAvailableFields().find(f => f.id === fieldId);
              return field ? (
                <div key={fieldId} className="bar-field-item">
                  <span className="bar-field-order">{index + 3}.</span>
                  <span className="bar-field-label">{field.label}</span>
                  <div className="bar-field-actions">
                    <button
                      type="button"
                      onClick={() => moveFieldUp(index, 'weekly')}
                      disabled={index === 0}
                      className="btn-reorder"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveFieldDown(index, 'weekly')}
                      disabled={index === weeklyBarFields.length - 1}
                      className="btn-reorder"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBarField(fieldId, 'weekly')}
                      className="btn-remove-bar-field"
                      title="Remove from bar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : null;
            })}

            {weeklyBarFields.length < 10 && (
              <div className="available-fields">
                <h4>Available Fields:</h4>
                <div className="field-chips">
                  {getAvailableFields()
                    .filter(f => !weeklyBarFields.includes(f.id))
                    .map(field => (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => toggleBarField(field.id, 'weekly')}
                        className="field-chip-add"
                      >
                        + {field.label}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
            </>
          )}
        </section>

        <div className="form-actions">
          <button type="button" onClick={handleReset} className="btn-secondary">
            Reset to Defaults
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      <footer className="admin-footer">
        <div className="info-box">
          <h3>How to use</h3>
          <ol>
            <li>Search for projects by typing at least 2 characters</li>
            <li>Select projects to include in the calendar</li>
            <li>Choose work item types (issue types or request types) from selected projects</li>
            <li>Map custom fields using autocomplete search</li>
            <li>Save settings and refresh the calendar</li>
          </ol>
        </div>
      </footer>
    </div>
  );
}

export default Admin;
