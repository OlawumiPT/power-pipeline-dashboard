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
  refreshExpertData = null,
  dataVersion = 0
}) => {
  
  if (!showExpertScores) return null;

  const [localExpertProjects, setLocalExpertProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const lastRefreshTime = useRef(0);
  const lastClickTime = useRef(0);
  const recentlyUpdatedProjects = useRef(new Set());
  const isInitialLoad = useRef(true);
  const panelOpenedTime = useRef(null);

  // Load data when panel opens
  useEffect(() => {
    if (showExpertScores) {
      console.log('🔄 ExpertScoresPanel: Panel opened, loading data...');
      panelOpenedTime.current = Date.now();
      isInitialLoad.current = true;
      setIsLoading(true);
      recentlyUpdatedProjects.current.clear();
      
      // Always fetch fresh data when panel opens
      const loadData = async () => {
        try {
          console.log('📥 Fetching fresh data from parent...');
          const projects = getAnalyses();
          console.log('📊 ExpertScoresPanel: Loaded', projects.length, 'fresh projects');
          setLocalExpertProjects(projects);
          setLastUpdateTime(new Date());
          isInitialLoad.current = false;
        } catch (error) {
          console.error('❌ ExpertScoresPanel: Error loading projects:', error);
        } finally {
          setTimeout(() => setIsLoading(false), 100);
        }
      };
      
      // Small delay to ensure any pending updates are complete
      setTimeout(loadData, 200);
    }
  }, [showExpertScores, getAnalyses]);

  // Listen for data version changes (from parent)
  useEffect(() => {
    if (showExpertScores && dataVersion > 0) {
      console.log('🔄 ExpertScoresPanel: Data version changed to', dataVersion, 'refreshing...');
      setIsLoading(true);
      
      setTimeout(() => {
        const freshProjects = getAnalyses();
        console.log('📊 Refreshed with version', dataVersion, 'projects:', freshProjects.length);
        setLocalExpertProjects(freshProjects);
        setLastUpdateTime(new Date());
        setIsLoading(false);
      }, 300);
    }
  }, [dataVersion, showExpertScores, getAnalyses]);

  // Listen for save events from ExpertAnalysisModal
  useEffect(() => {
    const handleExpertSaved = (event) => {
      if (showExpertScores) {
        console.log('🎯 ExpertScoresPanel: Received expertSaved event', event.detail);
        
        const projectId = event.detail?.projectId;
        if (projectId) {
          console.log('⭐ Marking project as recently updated:', projectId);
          recentlyUpdatedProjects.current.add(projectId);
          
          // Remove after 10 seconds
          setTimeout(() => {
            recentlyUpdatedProjects.current.delete(projectId);
            setRefreshCounter(prev => prev + 1); // Force re-render
          }, 10000);
        }
        
        // Force refresh after a short delay to get fresh data
        setTimeout(() => {
          console.log('🔄 Refreshing after save event...');
          setIsLoading(true);
          const freshProjects = getAnalyses();
          setLocalExpertProjects(freshProjects);
          setLastUpdateTime(new Date());
          setIsLoading(false);
        }, 800);
      }
    };
    
    const handleForceRefresh = () => {
      if (showExpertScores) {
        console.log('🔄 ExpertScoresPanel: Force refresh requested');
        setIsLoading(true);
        setTimeout(() => {
          const projects = getAnalyses();
          setLocalExpertProjects(projects);
          setLastUpdateTime(new Date());
          setIsLoading(false);
        }, 300);
      }
    };
    
    // Listen for multiple event types
    window.addEventListener('expertSaved', handleExpertSaved);
    window.addEventListener('expertAnalysisUpdated', handleExpertSaved);
    window.addEventListener('forceRefreshExpertScores', handleForceRefresh);
    
    return () => {
      window.removeEventListener('expertSaved', handleExpertSaved);
      window.removeEventListener('expertAnalysisUpdated', handleExpertSaved);
      window.removeEventListener('forceRefreshExpertScores', handleForceRefresh);
    };
  }, [showExpertScores, getAnalyses]);

  // Also listen for storage changes (fallback)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'expertDataUpdated' && showExpertScores) {
        console.log('💾 Storage change detected, refreshing expert data...');
        handleManualRefresh();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [showExpertScores]);

  const handleProjectSelect = (project) => {
    // Debounce clicks
    if (Date.now() - lastClickTime.current < 300) return;
    lastClickTime.current = Date.now();
    
    console.log('👉 ExpertScoresPanel: Project selected:', project.id, project.expertAnalysis?.projectName);
    
    // CRITICAL: Store the current state before opening modal
    const currentProjectData = {
      ...project,
      // Store a snapshot of current data
      snapshot: {
        overallScore: project.expertAnalysis?.overallScore,
        thermalScore: project.expertAnalysis?.thermalScore,
        redevelopmentScore: project.expertAnalysis?.redevelopmentScore,
        timestamp: Date.now()
      },
      // Add callback for when modal saves
      onModalSaveSuccess: (updatedData) => {
        console.log('✅ ExpertScoresPanel: Modal reported save success', updatedData);
        
        // Update this specific project in our list
        setLocalExpertProjects(prev => {
          const updatedProjects = prev.map(p => {
            if (p.id === project.id) {
              console.log('🔄 Updating project in local state:', p.id);
              return {
                ...p,
                expertAnalysis: {
                  ...p.expertAnalysis,
                  ...updatedData,
                  lastUpdated: new Date().toISOString()
                },
                overall: updatedData.overallScore || p.overall,
                thermal: updatedData.thermalScore || p.thermal,
                redev: updatedData.redevelopmentScore || p.redev
              };
            }
            return p;
          });
          return updatedProjects;
        });
        
        // Mark as recently updated
        recentlyUpdatedProjects.current.add(project.id);
        
        // Dispatch event to force global refresh
        window.dispatchEvent(new CustomEvent('expertSaved', {
          detail: {
            projectId: project.id,
            action: 'saved',
            source: 'ExpertScoresPanel'
          }
        }));
        
        // Also update localStorage as backup
        localStorage.setItem('expertDataUpdated', Date.now().toString());
      }
    };
    
    setSelectedExpertProject(currentProjectData);
  };

  const handleManualRefresh = () => {
    if (Date.now() - lastRefreshTime.current < 1000) return;
    lastRefreshTime.current = Date.now();
    
    console.log('🔄 ExpertScoresPanel: Manual refresh triggered');
    setIsLoading(true);
    
    // Force complete refresh
    setTimeout(() => {
      const projects = getAnalyses();
      console.log('📊 Manual refresh complete, got', projects.length, 'projects');
      setLocalExpertProjects(projects);
      setLastUpdateTime(new Date());
      setIsLoading(false);
      
      // Also call parent refresh if available
      if (refreshExpertData) {
        refreshExpertData();
      }
    }, 500);
  };

  // Filter projects based on rating
  const filteredProjects = localExpertProjects.filter(project => {
    const analysis = project.expertAnalysis;
    if (!analysis) return false;
    
    if (expertAnalysisFilter === "all") return true;
    
    const ratingClass = analysis.ratingClass;
    if (!ratingClass) return false;
    
    if (expertAnalysisFilter === "strong") return ratingClass === "strong";
    if (expertAnalysisFilter === "moderate") return ratingClass === "moderate";
    if (expertAnalysisFilter === "weak") return ratingClass === "weak";
    
    return true;
  });
  
  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const scoreA = parseFloat(a.expertAnalysis?.overallScore) || 0;
    const scoreB = parseFloat(b.expertAnalysis?.overallScore) || 0;
    return scoreB - scoreA;
  });

  console.log('📊 ExpertScoresPanel: Showing', sortedProjects.length, 'filtered projects');
  console.log('📊 Refresh counter:', refreshCounter);

  return (
    <div className="modal-overlay dark-overlay" onClick={() => {
      console.log('👋 Closing ExpertScoresPanel');
      setShowExpertScores(false);
    }}>
      <div className="modal-content expert-scores-panel dark-theme" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header dark-header">
          <div className="header-left">
            <h2 className="modal-title dark-title">Expert Analysis</h2>
            <p className="expert-scores-subtitle dark-subtitle">
              AI-powered assessment of all pipeline projects
            </p>
            {lastUpdateTime && (
              <p className="last-updated dark-subtitle" style={{ 
                fontSize: '11px', 
                color: '#a0aec0',
                marginTop: '4px'
              }}>
                Last updated: {lastUpdateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                {isInitialLoad.current && ' (Initial load)'}
              </p>
            )}
          </div>
          <div className="header-right">
            <button 
              onClick={handleManualRefresh}
              disabled={isLoading}
              title="Refresh data"
              style={{
                background: isLoading ? 'rgba(107, 114, 128, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                border: isLoading ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                color: isLoading ? '#9ca3af' : '#93c5fd',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                marginRight: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: '#93c5fd',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Refreshing...
                </>
              ) : (
                '🔄 Refresh'
              )}
            </button>
            <button className="modal-close dark-close" onClick={() => {
              console.log('❌ Closing panel via X button');
              setShowExpertScores(false);
            }}>×</button>
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
                {recentlyUpdatedProjects.current.size > 0 && (
                  <span style={{ 
                    color: '#10b981', 
                    marginLeft: '8px', 
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    ✓ {recentlyUpdatedProjects.current.size} updated
                  </span>
                )}
              </p>
            </div>
            <div className="expert-scores-actions">
              <select 
                className="expert-scores-filter dark-filter"
                value={expertAnalysisFilter}
                onChange={(e) => {
                  console.log('🔽 Changing filter to:', e.target.value);
                  setExpertAnalysisFilter(e.target.value);
                }}
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
          {isLoading && isInitialLoad.current ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#a0aec0' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(255,255,255,0.1)',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                margin: '0 auto 20px',
                animation: 'spin 1s linear infinite'
              }} />
              <p>Loading expert analysis data...</p>
            </div>
          ) : sortedProjects.length === 0 ? (
            <div className="expert-no-projects dark-no-projects" style={{ textAlign: 'center', padding: '40px' }}>
              <h3 className="dark-title" style={{ color: '#e2e8f0', marginBottom: '10px' }}>No Projects Found</h3>
              <p className="dark-subtitle" style={{ color: '#a0aec0', marginBottom: '20px' }}>
                {expertAnalysisFilter !== "all" 
                  ? `No projects with "${expertAnalysisFilter}" rating. Try changing the filter.`
                  : "No expert analysis data available."}
              </p>
              {expertAnalysisFilter !== "all" && (
                <button
                  onClick={() => setExpertAnalysisFilter("all")}
                  style={{
                    background: 'rgba(59, 130, 246, 0.9)',
                    border: '1px solid rgba(59, 130, 246, 0.9)',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '14px'
                  }}
                >
                  Show All Projects
                </button>
              )}
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
                const isRecentlyUpdated = recentlyUpdatedProjects.current.has(project.id);
                
                return (
                  <div 
                    key={`project-${project.id}-${refreshCounter}`}
                    className="expert-project-card dark-project-card"
                    onClick={() => handleProjectSelect(project)}
                    style={{
                      background: '#2d3748',
                      border: isRecentlyUpdated ? '2px solid #10b981' : '1px solid #4a5568',
                      borderRadius: '8px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      opacity: isLoading ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Recently updated indicator */}
                    {isRecentlyUpdated && (
                      <div style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: '#10b981',
                        color: 'white',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        zIndex: 1,
                        animation: 'pulse 2s infinite'
                      }}>
                        ✓
                      </div>
                    )}
                    
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
                            {isRecentlyUpdated && (
                              <span style={{
                                marginLeft: '8px',
                                fontSize: '10px',
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#10b981',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                UPDATED
                              </span>
                            )}
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
                          gap: '10px',
                          flexWrap: 'wrap'
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
                          {analysis.lastUpdated && (
                            <span className="time-badge dark-time-badge" title={`Last updated: ${new Date(analysis.lastUpdated).toLocaleString()}`} style={{
                              background: 'rgba(107, 114, 128, 0.15)',
                              border: '1px solid rgba(107, 114, 128, 0.3)',
                              color: '#9ca3af',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '500'
                            }}>
                              {new Date(analysis.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
                          background: isRecentlyUpdated ? 'rgba(34, 197, 94, 0.9)' : 'rgba(59, 130, 246, 0.9)',
                          border: isRecentlyUpdated ? '1px solid rgba(34, 197, 94, 0.9)' : '1px solid rgba(59, 130, 246, 0.9)',
                          color: 'white',
                          padding: '12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          fontSize: '14px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isRecentlyUpdated 
                            ? 'rgba(34, 197, 94, 1)' 
                            : 'rgba(59, 130, 246, 1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isRecentlyUpdated 
                            ? 'rgba(34, 197, 94, 0.9)' 
                            : 'rgba(59, 130, 246, 0.9)';
                        }}
                      >
                        {isRecentlyUpdated ? '✓ View Updated Analysis' : 'View Scores & Analysis'}
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
          background: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ color: '#a0aec0', fontSize: '12px' }}>
            Panel opened: {panelOpenedTime.current ? new Date(panelOpenedTime.current).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : 'N/A'}
          </div>
          <button 
            className="back-btn dark-back-btn"
            onClick={() => {
              console.log('🔙 Back to Dashboard clicked');
              setShowExpertScores(false);
            }}
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
        
        {/* Add CSS for animations */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default ExpertScoresPanel;
