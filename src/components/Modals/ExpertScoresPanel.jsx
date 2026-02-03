import React, { useState, useEffect, useRef } from 'react';

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
  refreshExpertData = null
}) => {
  
  if (!showExpertScores) return null;

  const [localExpertProjects, setLocalExpertProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const panelOpenedTime = useRef(Date.now());
  const hasRefreshedOnOpen = useRef(false);

  // SIMPLE FIX: ALWAYS refresh when panel opens
  useEffect(() => {
    if (showExpertScores && !hasRefreshedOnOpen.current) {
      console.log('🔄 ExpertScoresPanel: Panel opened, FORCING refresh');
      setIsLoading(true);
      
      // Clear old data
      setLocalExpertProjects([]);
      
      // Get fresh data
      setTimeout(() => {
        try {
          const projects = getAnalyses();
          console.log('✅ Loaded', projects.length, 'fresh projects');
          setLocalExpertProjects(projects);
          setLastUpdateTime(new Date());
          hasRefreshedOnOpen.current = true;
        } catch (error) {
          console.error('Error loading projects:', error);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    }
  }, [showExpertScores, getAnalyses]);

  // Reset when panel closes
  useEffect(() => {
    if (!showExpertScores) {
      hasRefreshedOnOpen.current = false;
    }
  }, [showExpertScores]);

  // Listen for save events
  useEffect(() => {
    const handleSaveEvent = () => {
      console.log('💾 Save event received, refreshing...');
      setIsLoading(true);
      setTimeout(() => {
        const projects = getAnalyses();
        setLocalExpertProjects(projects);
        setLastUpdateTime(new Date());
        setIsLoading(false);
      }, 500);
    };
    
    window.addEventListener('expertAnalysisSaved', handleSaveEvent);
    return () => window.removeEventListener('expertAnalysisSaved', handleSaveEvent);
  }, [getAnalyses]);

  const handleProjectSelect = (project) => {
    console.log('👉 Selecting project:', project.id);
    
    // Add a simple callback for when modal saves
    const enhancedProject = {
      ...project,
      onSaveSuccess: () => {
        console.log('✅ Modal saved, triggering refresh');
        window.dispatchEvent(new Event('expertAnalysisSaved'));
      }
    };
    
    setSelectedExpertProject(enhancedProject);
  };

  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh');
    setIsLoading(true);
    setTimeout(() => {
      const projects = getAnalyses();
      setLocalExpertProjects(projects);
      setLastUpdateTime(new Date());
      setIsLoading(false);
    }, 300);
  };

  // Filter projects
  const filteredProjects = localExpertProjects.filter(project => {
    const analysis = project.expertAnalysis;
    if (!analysis) return false;
    
    if (expertAnalysisFilter === "all") return true;
    if (expertAnalysisFilter === "strong") return analysis.ratingClass === "strong";
    if (expertAnalysisFilter === "moderate") return analysis.ratingClass === "moderate";
    if (expertAnalysisFilter === "weak") return analysis.ratingClass === "weak";
    
    return true;
  });
  
  // Sort by score
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const scoreA = parseFloat(a.expertAnalysis?.overallScore) || 0;
    const scoreB = parseFloat(b.expertAnalysis?.overallScore) || 0;
    return scoreB - scoreA;
  });

  return (
    <div className="modal-overlay dark-overlay" onClick={() => setShowExpertScores(false)}>
      <div className="modal-content expert-scores-panel dark-theme" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header dark-header">
          <div className="header-left">
            <h2 className="modal-title dark-title">Expert Analysis</h2>
            <p className="expert-scores-subtitle dark-subtitle">
              AI-powered assessment of all pipeline projects
            </p>
            {lastUpdateTime && (
              <p className="last-updated dark-subtitle" style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px' }}>
                Data loaded: {lastUpdateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            )}
          </div>
          <div className="header-right">
            <button 
              onClick={handleManualRefresh}
              disabled={isLoading}
              style={{
                background: isLoading ? '#4a5568' : '#2d3748',
                color: isLoading ? '#a0aec0' : '#e2e8f0',
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #4a5568',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                marginRight: '10px'
              }}
            >
              {isLoading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
            <button className="modal-close dark-close" onClick={() => setShowExpertScores(false)}>×</button>
          </div>
        </div>
        
        {/* Body */}
        <div className="modal-body expert-analysis-container dark-body">
          <div className="expert-scores-header dark-scores-header">
            <div className="header-info">
              <h3 className="expert-scores-title dark-section-title">Project Assessments</h3>
              <p className="expert-scores-subtitle dark-count">
                {sortedProjects.length} of {localExpertProjects.length} projects
              </p>
            </div>
            <div className="expert-scores-actions">
              <select 
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
                <option value="strong">Strong</option>
                <option value="moderate">Moderate</option>
                <option value="weak">Weak</option>
              </select>
            </div>
          </div>
          
          {isLoading ? (
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
            <div style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>
              <h3 style={{ color: '#e2e8f0', marginBottom: '10px' }}>No Projects Found</h3>
              <p style={{ color: '#a0aec0', marginBottom: '20px' }}>
                {expertAnalysisFilter !== "all" 
                  ? `No projects with "${expertAnalysisFilter}" rating.`
                  : "No expert analysis data available."}
              </p>
            </div>
          ) : (
            <div style={{ 
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
                    onClick={() => handleProjectSelect(project)}
                    style={{
                      background: '#2d3748',
                      border: '1px solid #4a5568',
                      borderRadius: '8px',
                      padding: '20px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h4 style={{ margin: '0', color: '#ffffff', fontSize: '18px', fontWeight: '600', flex: 1 }}>
                          {analysis.projectName}
                        </h4>
                        <span style={{ 
                          backgroundColor: ratingColor,
                          color: 'white',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          marginLeft: '10px'
                        }}>
                          {ratingText}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#a0aec0', fontSize: '12px' }}>
                          #{analysis.projectId}
                        </span>
                        <span style={{
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
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                      {location && (
                        <div>
                          <div style={{ color: '#a0aec0', fontSize: '11px', fontWeight: '500', marginBottom: '4px' }}>📍 Location</div>
                          <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>{location}</div>
                        </div>
                      )}
                      {owner && (
                        <div>
                          <div style={{ color: '#a0aec0', fontSize: '11px', fontWeight: '500', marginBottom: '4px' }}>👤 Plant Owner</div>
                          <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>{owner}</div>
                        </div>
                      )}
                      {capacityText && capacityText !== "N/A MW" && (
                        <div>
                          <div style={{ color: '#a0aec0', fontSize: '11px', fontWeight: '500', marginBottom: '4px' }}>⚡ Capacity</div>
                          <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>{capacityText}</div>
                        </div>
                      )}
                      {marketText && (
                        <div>
                          <div style={{ color: '#a0aec0', fontSize: '11px', fontWeight: '500', marginBottom: '4px' }}>🌐 Market</div>
                          <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>{marketText}</div>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '6px', padding: '12px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: '#a0aec0', fontSize: '12px' }}>Thermal Score:</span>
                        <span style={{ color: '#e2e8f0', fontWeight: '600', fontSize: '13px' }}>
                          {analysis.thermalScore}/3.0
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#a0aec0', fontSize: '12px' }}>Redevelopment Score:</span>
                        <span style={{ color: '#e2e8f0', fontWeight: '600', fontSize: '13px' }}>
                          {analysis.redevelopmentScore}/3.0
                        </span>
                      </div>
                    </div>
                    
                    <button 
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
                        fontSize: '14px'
                      }}
                    >
                      View Scores & Analysis
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div style={{ padding: '20px', borderTop: '1px solid #4a5568', background: 'rgba(0, 0, 0, 0.2)' }}>
          <button 
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
        
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default ExpertScoresPanel;
