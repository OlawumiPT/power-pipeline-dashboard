import React, { useState, useEffect, useRef, useCallback } from 'react';

const hasEdits = (projectId) => {
  try {
    const allEdits = JSON.parse(localStorage.getItem('projectEdits') || '{}');
    return !!allEdits[projectId];
  } catch {
    return false;
  }
};

// Helper to get capacity info in a clean format
const getCapacityInfo = (project) => {
  const legacyMW = project["Legacy Nameplate Capacity (MW)"] || project.mw || "N/A";
  const redevMW = project["Redevelopment Base Case"] || "";
  const tech = project["Tech"] || project.tech || "";
  
  let capacityText = `${legacyMW} MW`;
  if (tech) capacityText += ` ${tech}`;
  if (redevMW) capacityText += ` → ${redevMW}`;
  
  return capacityText;
};

// Helper to get market info
const getMarketInfo = (project) => {
  const iso = project["ISO"] || project.mkt || "";
  const zone = project["Zone/Submarket"] || project.zone || "";
  
  if (!iso) return "";
  return zone ? `${iso} ${zone}` : iso;
};

// Helper to get rating text (Strong/Moderate/Weak)
const getRatingText = (ratingClass) => {
  switch(ratingClass) {
    case 'strong': return 'Strong';
    case 'moderate': return 'Moderate';
    case 'weak': return 'Weak';
    default: return 'Not Rated';
  }
};

// Helper to get rating color
const getRatingColor = (rating) => {
  switch(rating?.toLowerCase()) {
    case 'strong': return '#10b981';
    case 'moderate': return '#f59e0b';
    case 'weak': return '#ef4444';
    default: return '#6b7280';
  }
};

const ExpertScoresPanel = ({ 
  showExpertScores, 
  setShowExpertScores, 
  getAllExpertAnalyses: getAnalyses,
  expertAnalysisFilter,
  setExpertAnalysisFilter,
  setSelectedExpertProject,
  // ADD THIS: Function to refresh data after edits
  refreshExpertData = null
}) => {
  
  if (!showExpertScores) return null;

  // Add state to track when to refresh
  const [refreshKey, setRefreshKey] = useState(0);
  const [localExpertProjects, setLocalExpertProjects] = useState([]);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  
  // Refs for debouncing
  const lastClickTime = useRef(0);
  const lastRefreshTime = useRef(0);
  const isInitialLoad = useRef(true);
  
  // Listen for refresh events from child modals - FIXED: Only setup once
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔄 ExpertScoresPanel: Received refresh event');
      
      // Increment refresh key to trigger data refresh
      setRefreshKey(prev => prev + 1);
      
      // Also call external refresh if provided
      if (refreshExpertData) {
        console.log('🔄 ExpertScoresPanel: Calling external refresh');
        refreshExpertData();
      }
    };
    
    // Listen for refresh events
    window.addEventListener('expertAnalysisUpdated', handleRefresh);
    
    return () => {
      window.removeEventListener('expertAnalysisUpdated', handleRefresh);
    };
  }, [refreshExpertData]); // Only depend on refreshExpertData
  
  // Load data when panel opens - FIXED: Separate effect for opening
  useEffect(() => {
    if (showExpertScores) {
      console.log('🔄 ExpertScoresPanel: Panel opened, loading data');
      setIsPanelLoading(true);
      
      const loadData = async () => {
        try {
          const projects = getAnalyses();
          console.log('📊 ExpertScoresPanel: Loaded', projects.length, 'projects');
          setLocalExpertProjects(projects);
        } catch (error) {
          console.error('❌ ExpertScoresPanel: Error loading projects:', error);
        } finally {
          // Small delay to prevent flicker
          setTimeout(() => {
            setIsPanelLoading(false);
            isInitialLoad.current = false;
          }, 100);
        }
      };
      
      loadData();
    } else {
      // Reset when panel closes
      setIsPanelLoading(false);
      isInitialLoad.current = true;
    }
  }, [showExpertScores, getAnalyses]);
  
  // Refresh data when refreshKey changes - FIXED: Separate effect for refreshes
  useEffect(() => {
    if (refreshKey > 0 && showExpertScores && !isInitialLoad.current) {
      console.log('🔄 ExpertScoresPanel: Refreshing project data, key:', refreshKey);
      setIsPanelLoading(true);
      
      const refreshData = async () => {
        try {
          const projects = getAnalyses();
          console.log('📊 ExpertScoresPanel: Refreshed', projects.length, 'projects');
          setLocalExpertProjects(projects);
        } catch (error) {
          console.error('❌ ExpertScoresPanel: Error refreshing projects:', error);
        } finally {
          setTimeout(() => setIsPanelLoading(false), 100);
        }
      };
      
      refreshData();
    }
  }, [refreshKey, showExpertScores, getAnalyses]);

  // When a project is selected, pass additional data
  const handleProjectSelect = useCallback((project) => {
    // Debounce the selection to prevent rapid clicks
    if (Date.now() - lastClickTime.current < 300) {
      console.log('⏱️ Click throttled');
      return;
    }
    lastClickTime.current = Date.now();
    
    console.log('👉 ExpertScoresPanel: Project selected:', project.id, project.expertAnalysis?.projectName);
    
    // Pass the refresh function to the modal
    const enhancedProject = {
      ...project,
      onSaveSuccess: () => {
        console.log('✅ ExpertScoresPanel: Received save success from modal');
        
        // Use a timeout to batch updates
        setTimeout(() => {
          // Trigger refresh in parent
          setRefreshKey(prev => prev + 1);
          
          // Also call external refresh if provided
          if (refreshExpertData) {
            console.log('🔄 ExpertScoresPanel: Calling external refresh');
            refreshExpertData();
          }
          
          // Dispatch event for other components
          window.dispatchEvent(new Event('expertAnalysisUpdated'));
        }, 100);
      }
    };
    setSelectedExpertProject(enhancedProject);
  }, [refreshExpertData, setSelectedExpertProject]);

  const filteredProjects = localExpertProjects.filter(project => {
    const analysis = project.expertAnalysis;
    if (!analysis) return false;
    
    if (expertAnalysisFilter === "all") return true;
    if (expertAnalysisFilter === "strong") return analysis.ratingClass === "strong";
    if (expertAnalysisFilter === "moderate") return analysis.ratingClass === "moderate";
    if (expertAnalysisFilter === "weak") return analysis.ratingClass === "weak";
    return true;
  });
  
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const scoreA = a.expertAnalysis?.overallScore || 0;
    const scoreB = b.expertAnalysis?.overallScore || 0;
    return scoreB - scoreA;
  });

  console.log('📊 ExpertScoresPanel: Rendering', sortedProjects.length, 'filtered projects');

  return (
    <div className="modal-overlay dark-overlay" onClick={() => setShowExpertScores(false)}>
      <div className="modal-content expert-scores-panel dark-theme" onClick={(e) => e.stopPropagation()}>
        {/* Loading Overlay */}
        {isPanelLoading && (
          <div className="panel-loading-overlay" style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            borderRadius: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '20px'
            }} />
          </div>
        )}
        
        {/* Header */}
        <div className="modal-header dark-header">
          <div className="header-left">
            <h2 className="modal-title dark-title">Expert Analysis</h2>
            <p className="expert-scores-subtitle dark-subtitle">
              AI-powered assessment of all pipeline projects
            </p>
          </div>
          <div className="header-right">
            <button 
              className="refresh-btn dark-refresh-btn"
              onClick={() => {
                // Debounce refresh clicks
                if (Date.now() - lastRefreshTime.current < 1000) {
                  console.log('⏱️ Refresh throttled');
                  return;
                }
                lastRefreshTime.current = Date.now();
                
                console.log('🔄 Manual refresh triggered');
                setRefreshKey(prev => prev + 1);
                if (refreshExpertData) refreshExpertData();
              }}
              title="Refresh data"
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#93c5fd',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                marginRight: '10px'
              }}
            >
              🔄 Refresh
            </button>
            <button className="modal-close dark-close" onClick={() => setShowExpertScores(false)}>×</button>
          </div>
        </div>
        
        {/* Body */}
        <div className="modal-body expert-analysis-container dark-body">
          {/* Filter Header */}
          <div className="expert-scores-header dark-scores-header">
            <div className="header-info">
              <h3 className="expert-scores-title dark-section-title">Project Assessments</h3>
              <p className="expert-scores-subtitle dark-count">
                {sortedProjects.length} of {localExpertProjects.length} projects
                {refreshKey > 0 && !isInitialLoad.current && (
                  <span style={{ marginLeft: '10px', fontSize: '12px', color: '#93c5fd' }}>
                    (Refreshed {refreshKey} times)
                  </span>
                )}
              </p>
            </div>
            <div className="expert-scores-actions">
              <select 
                className="expert-scores-filter dark-filter"
                value={expertAnalysisFilter}
                onChange={(e) => setExpertAnalysisFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#2d3748',
                  color: 'white',
                  border: '1px solid #4a5568',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Ratings</option>
                <option value="strong">Strong (≥4.5)</option>
                <option value="moderate">Moderate (3.0-4.5)</option>
                <option value="weak">Weak (&lt;3.0)</option>
              </select>
            </div>
          </div>
          
          {/* Projects Grid */}
          {sortedProjects.length === 0 ? (
            <div className="expert-no-projects dark-no-projects" style={{ textAlign: 'center', padding: '40px' }}>
              <h3 className="dark-title" style={{ color: '#e2e8f0', marginBottom: '10px' }}>No Projects Found</h3>
              <p className="dark-subtitle" style={{ color: '#a0aec0' }}>Adjust your filters to see expert analyses.</p>
              <button 
                onClick={() => {
                  setRefreshKey(prev => prev + 1);
                  if (refreshExpertData) refreshExpertData();
                }}
                style={{
                  background: 'rgba(59, 130, 246, 0.9)',
                  border: '1px solid rgba(59, 130, 246, 0.9)',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginTop: '20px'
                }}
              >
                🔄 Refresh Data
              </button>
            </div>
          ) : (
            <div className="expert-projects-grid dark-projects-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
              gap: '20px',
              padding: '20px'
            }}>
              {sortedProjects.map(project => {
                const analysis = project.expertAnalysis;
                if (!analysis) return null;
                
                const capacityText = getCapacityInfo(project);
                const marketText = getMarketInfo(project);
                const location = project["Location"] || project.location || "";
                const owner = project["Plant Owner"] || "";
                const ratingText = getRatingText(analysis.ratingClass);
                const ratingColor = getRatingColor(analysis.ratingClass);
                
                return (
                  <div 
                    key={project.id} 
                    className="expert-project-card dark-project-card"
                    onClick={() => handleProjectSelect(project)}
                    style={{
                      background: '#2d3748',
                      border: '1px solid #4a5568',
                      borderRadius: '8px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      opacity: isPanelLoading ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isPanelLoading) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isPanelLoading) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    {/* Card Header */}
                    <div className="project-card-header dark-card-header" style={{ marginBottom: '16px' }}>
                      <div className="project-title-section">
                        <div className="project-title-row" style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          marginBottom: '8px'
                        }}>
                          <h4 className="project-title dark-project-title" style={{ 
                            margin: '0', 
                            color: '#ffffff', 
                            fontSize: '18px',
                            fontWeight: '600',
                            flex: 1
                          }}>
                            {analysis.projectName}
                          </h4>
                          <span 
                            className="rating-badge dark-rating-badge"
                            style={{ 
                              backgroundColor: ratingColor,
                              color: 'white',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              marginLeft: '10px'
                            }}
                          >
                            {ratingText}
                          </span>
                        </div>
                        <div className="project-subtitle-row" style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px'
                        }}>
                          <span className="project-id dark-project-id" style={{ 
                            color: '#a0aec0', 
                            fontSize: '12px'
                          }}>
                            #{analysis.projectId}
                          </span>
                          {hasEdits(project.id) && (
                            <span className="edit-badge dark-edit-badge" title="Has unsaved edits" style={{
                              background: 'rgba(245, 158, 11, 0.15)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              color: '#fbbf24',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}>
                              ✏️ Edited
                            </span>
                          )}
                          <span className="score-badge dark-score-badge" style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            color: '#93c5fd',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '500',
                            marginLeft: 'auto'
                          }}>
                            Score: {analysis.overallScore}/6.0
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Project Info */}
                    <div className="project-info-grid dark-info-grid" style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '12px',
                      marginBottom: '20px'
                    }}>
                      {/* Location */}
                      {location && (
                        <div className="info-item dark-info-item">
                          <div className="info-label dark-info-label" style={{ 
                            color: '#a0aec0', 
                            fontSize: '11px',
                            fontWeight: '500',
                            marginBottom: '4px'
                          }}>📍 Location</div>
                          <div className="info-value dark-info-value" style={{ 
                            color: '#e2e8f0', 
                            fontSize: '14px',
                            fontWeight: '500'
                          }}>{location}</div>
                        </div>
                      )}
                      
                      {/* Owner */}
                      {owner && (
                        <div className="info-item dark-info-item">
                          <div className="info-label dark-info-label" style={{ 
                            color: '#a0aec0', 
                            fontSize: '11px',
                            fontWeight: '500',
                            marginBottom: '4px'
                          }}>👤 Plant Owner</div>
                          <div className="info-value dark-info-value" style={{ 
                            color: '#e2e8f0', 
                            fontSize: '14px',
                            fontWeight: '500'
                          }}>{owner}</div>
                        </div>
                      )}
                      
                      {/* Capacity */}
                      {capacityText && capacityText !== "N/A MW" && (
                        <div className="info-item dark-info-item">
                          <div className="info-label dark-info-label" style={{ 
                            color: '#a0aec0', 
                            fontSize: '11px',
                            fontWeight: '500',
                            marginBottom: '4px'
                          }}>⚡ Capacity</div>
                          <div className="info-value dark-info-value" style={{ 
                            color: '#e2e8f0', 
                            fontSize: '14px',
                            fontWeight: '500'
                          }}>{capacityText}</div>
                        </div>
                      )}
                      
                      {/* Market */}
                      {marketText && (
                        <div className="info-item dark-info-item">
                          <div className="info-label dark-info-label" style={{ 
                            color: '#a0aec0', 
                            fontSize: '11px',
                            fontWeight: '500',
                            marginBottom: '4px'
                          }}>🌐 Market</div>
                          <div className="info-value dark-info-value" style={{ 
                            color: '#e2e8f0', 
                            fontSize: '14px',
                            fontWeight: '500'
                          }}>{marketText}</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Score Breakdown */}
                    <div className="score-breakdown dark-score-breakdown" style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: '6px'
                      }}>
                        <span style={{ color: '#a0aec0', fontSize: '12px' }}>Thermal Score:</span>
                        <span style={{ 
                          color: parseFloat(analysis.thermalScore) >= 2.0 ? '#10b981' : 
                                 parseFloat(analysis.thermalScore) >= 1.0 ? '#f59e0b' : '#ef4444',
                          fontWeight: '600',
                          fontSize: '13px'
                        }}>
                          {analysis.thermalScore}/3.0
                        </span>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ color: '#a0aec0', fontSize: '12px' }}>Redevelopment Score:</span>
                        <span style={{ 
                          color: parseFloat(analysis.redevelopmentScore) >= 2.0 ? '#10b981' : 
                                 parseFloat(analysis.redevelopmentScore) >= 1.0 ? '#f59e0b' : '#ef4444',
                          fontWeight: '600',
                          fontSize: '13px'
                        }}>
                          {analysis.redevelopmentScore}/3.0
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <div className="project-action dark-project-action">
                      <button 
                        className="view-scores-btn dark-view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProjectSelect(project);
                        }}
                        style={{
                          width: '100%',
                          background: 'rgba(59, 130, 246, 0.9)',
                          border: '1px solid rgba(59, 130, 246, 0.9)',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          fontSize: '14px',
                          transition: 'all 0.2s ease',
                          opacity: isPanelLoading ? 0.5 : 1,
                          pointerEvents: isPanelLoading ? 'none' : 'auto'
                        }}
                        onMouseEnter={(e) => {
                          if (!isPanelLoading) {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isPanelLoading) {
                            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.9)';
                          }
                        }}
                      >
                        View Scores & Analysis
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="modal-footer dark-footer" style={{ 
          padding: '20px', 
          borderTop: '1px solid #4a5568', 
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <button 
            className="back-btn dark-back-btn"
            onClick={() => setShowExpertScores(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#e2e8f0',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpertScoresPanel;
