import React, { useState, useEffect, useRef } from 'react';

const ExpertScoresPanel = ({ 
  showExpertScores, 
  setShowExpertScores, 
  getAllExpertAnalyses: getAnalyses,
  expertAnalysisFilter,
  setExpertAnalysisFilter,
  setSelectedExpertProject
}) => {
  
  if (!showExpertScores) return null;

  const [localExpertProjects, setLocalExpertProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // CRITICAL FIX: Listen for save events from ANYWHERE in the app
  useEffect(() => {
    const handleSaveEvent = (event) => {
      console.log('💾 ExpertScoresPanel: Save event received', event?.detail || '');
      
      if (isMounted.current) {
        // Show loading state
        setIsLoading(true);
        
        // Force refresh with a small delay to allow backend to process
        setTimeout(() => {
          loadFreshData();
        }, 800);
      }
    };
    
    const handleForceRefresh = () => {
      console.log('🔄 ExpertScoresPanel: Force refresh event received');
      if (isMounted.current) {
        setForceRefresh(prev => prev + 1);
      }
    };
    
    // Listen to multiple event types
    window.addEventListener('expertAnalysisSaved', handleSaveEvent);
    window.addEventListener('expertAnalysisUpdated', handleSaveEvent);
    window.addEventListener('forceRefreshDashboard', handleForceRefresh);
    window.addEventListener('forceRefreshExpertScores', handleForceRefresh);
    
    return () => {
      window.removeEventListener('expertAnalysisSaved', handleSaveEvent);
      window.removeEventListener('expertAnalysisUpdated', handleSaveEvent);
      window.removeEventListener('forceRefreshDashboard', handleForceRefresh);
      window.removeEventListener('forceRefreshExpertScores', handleForceRefresh);
    };
  }, []);

  // Load fresh data function
  const loadFreshData = async () => {
    try {
      console.log('🔄 ExpertScoresPanel: Loading fresh data');
      
      // Clear old data first
      if (isMounted.current) {
        setLocalExpertProjects([]);
      }
      
      // Get fresh data
      const projects = await getAnalyses();
      
      if (isMounted.current && projects && Array.isArray(projects)) {
        console.log('✅ ExpertScoresPanel: Loaded fresh projects:', projects.length);
        setLocalExpertProjects(projects);
        setLastUpdateTime(new Date().toLocaleTimeString());
      } else {
        console.warn('⚠️ ExpertScoresPanel: No projects returned or invalid format');
      }
    } catch (error) {
      console.error('❌ ExpertScoresPanel: Error loading projects:', error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  // Load data when panel opens or forceRefresh changes
  useEffect(() => {
    if (showExpertScores && isMounted.current) {
      console.log('🔄 ExpertScoresPanel: Panel opened, loading data');
      setIsLoading(true);
      
      // Load with a small delay to ensure any previous saves are complete
      const timer = setTimeout(() => {
        loadFreshData();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [showExpertScores, forceRefresh]);

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (isLoading) return;
    
    console.log('🔄 ExpertScoresPanel: Manual refresh triggered');
    setIsLoading(true);
    setForceRefresh(prev => prev + 1);
    
    // Also dispatch event to refresh other components
    window.dispatchEvent(new Event('expertAnalysisUpdated'));
  };

  const handleProjectSelect = (project) => {
    console.log('👉 ExpertScoresPanel: Selecting project:', project.id, project.expertAnalysis?.projectName);
    
    // Add callback for when modal saves
    const enhancedProject = {
      ...project,
      onSaveSuccess: () => {
        console.log('✅ ExpertScoresPanel: Modal saved, triggering refresh');
        
        // Update this panel
        setForceRefresh(prev => prev + 1);
        
        // Dispatch events to refresh other components
        window.dispatchEvent(new CustomEvent('expertAnalysisSaved', {
          detail: { 
            projectId: project.id,
            projectName: project.expertAnalysis?.projectName,
            timestamp: new Date().toISOString()
          }
        }));
        
        // Also update localStorage timestamp
        localStorage.setItem('expert_analysis_last_updated', new Date().toISOString());
      }
    };
    
    setSelectedExpertProject(enhancedProject);
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

  // Get stats
  const totalProjects = localExpertProjects.length;
  const strongCount = localExpertProjects.filter(p => p.expertAnalysis?.ratingClass === 'strong').length;
  const moderateCount = localExpertProjects.filter(p => p.expertAnalysis?.ratingClass === 'moderate').length;
  const weakCount = localExpertProjects.filter(p => p.expertAnalysis?.ratingClass === 'weak').length;

  return (
    <div className="modal-overlay dark-overlay" onClick={() => setShowExpertScores(false)}>
      <div className="modal-content expert-scores-panel dark-theme" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header dark-header" style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
          borderBottom: '1px solid #4a5568',
          borderRadius: '12px 12px 0 0'
        }}>
          <div className="header-left">
            <h2 className="modal-title dark-title" style={{ margin: '0', color: '#ffffff', fontSize: '24px', fontWeight: '600' }}>
              Expert Analysis Dashboard
            </h2>
            <p className="expert-scores-subtitle dark-subtitle" style={{ color: '#a0aec0', margin: '4px 0 0 0', fontSize: '14px' }}>
              AI-powered assessment of all pipeline projects
            </p>
          </div>
          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {lastUpdateTime && (
              <span style={{ 
                color: '#a0aec0', 
                fontSize: '12px',
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                Updated: {lastUpdateTime}
              </span>
            )}
            <button 
              onClick={handleManualRefresh}
              disabled={isLoading}
              style={{
                background: isLoading ? 'rgba(107, 114, 128, 0.5)' : 'rgba(59, 130, 246, 0.1)',
                border: `1px solid ${isLoading ? 'rgba(107, 114, 128, 0.5)' : 'rgba(59, 130, 246, 0.3)'}`,
                color: isLoading ? '#a0aec0' : '#93c5fd',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(147, 197, 253, 0.3)',
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
            <button 
              className="modal-close dark-close" 
              onClick={() => setShowExpertScores(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#a0aec0',
                fontSize: '28px',
                cursor: 'pointer',
                padding: '0',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="modal-body expert-analysis-container dark-body" style={{
          padding: '20px',
          maxHeight: '70vh',
          overflowY: 'auto'
        }}>
          {/* Stats Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            padding: '16px',
            background: '#2d3748',
            border: '1px solid #4a5568',
            borderRadius: '8px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff' }}>{totalProjects}</div>
              <div style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Projects</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>{strongCount}</div>
              <div style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Strong</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>{moderateCount}</div>
              <div style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Moderate</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>{weakCount}</div>
              <div style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Weak</div>
            </div>
          </div>
          
          <div className="expert-scores-header dark-scores-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div className="header-info">
              <h3 className="expert-scores-title dark-section-title" style={{ 
                margin: '0', 
                color: '#ffffff', 
                fontSize: '18px',
                fontWeight: '600'
              }}>
                Project Assessments
              </h3>
              <p className="expert-scores-subtitle dark-count" style={{ 
                color: '#a0aec0', 
                margin: '4px 0 0 0',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>
                  {sortedProjects.length} of {totalProjects} projects shown
                </span>
                {forceRefresh > 0 && (
                  <span style={{ 
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}>
                    ✓ Refreshed {forceRefresh} time{forceRefresh !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
            <div className="expert-scores-actions">
              <select 
                value={expertAnalysisFilter}
                onChange={(e) => setExpertAnalysisFilter(e.target.value)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#2d3748',
                  color: 'white',
                  border: '1px solid #4a5568',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: '180px'
                }}
              >
                <option value="all">📊 All Ratings ({totalProjects})</option>
                <option value="strong">✅ Strong ({strongCount})</option>
                <option value="moderate">⚠️ Moderate ({moderateCount})</option>
                <option value="weak">❌ Weak ({weakCount})</option>
              </select>
            </div>
          </div>
          
          {isLoading && localExpertProjects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#a0aec0' }}>
              <div style={{
                width: '50px',
                height: '50px',
                border: '3px solid rgba(255,255,255,0.1)',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                margin: '0 auto 20px',
                animation: 'spin 1s linear infinite'
              }} />
              <h4 style={{ color: '#e2e8f0', marginBottom: '8px' }}>Loading Expert Analysis</h4>
              <p>Fetching the latest project assessments...</p>
            </div>
          ) : sortedProjects.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 40px', 
              color: '#a0aec0',
              background: '#2d3748',
              border: '1px solid #4a5568',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: '0.5' }}>🔍</div>
              <h4 style={{ color: '#e2e8f0', marginBottom: '8px' }}>No Projects Found</h4>
              <p style={{ color: '#a0aec0', marginBottom: '20px' }}>
                {expertAnalysisFilter !== "all" 
                  ? `No projects with "${expertAnalysisFilter}" rating. Try selecting "All Ratings".`
                  : "No expert analysis data available. Projects may need to be analyzed first."}
              </p>
              <button 
                onClick={handleManualRefresh}
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
                Try Refreshing Data
              </button>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', 
              gap: '20px',
              padding: '4px'
            }}>
              {sortedProjects.map(project => {
                const analysis = project.expertAnalysis;
                if (!analysis) return null;
                
                const ratingColor = analysis.ratingClass === 'strong' ? '#10b981' : 
                                  analysis.ratingClass === 'moderate' ? '#f59e0b' : '#ef4444';
                const ratingText = analysis.ratingClass === 'strong' ? 'Strong' : 
                                 analysis.ratingClass === 'moderate' ? 'Moderate' : 'Weak';
                
                return (
                  <div 
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    style={{
                      background: '#2d3748',
                      border: `1px solid ${ratingColor}30`,
                      borderRadius: '10px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
                      e.currentTarget.style.borderColor = `${ratingColor}60`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = `${ratingColor}30`;
                    }}
                  >
                    {/* Rating badge */}
                    <div style={{ 
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      backgroundColor: ratingColor,
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      zIndex: 1
                    }}>
                      {ratingText}
                    </div>
                    
                    <div style={{ marginBottom: '16px', position: 'relative', zIndex: 0 }}>
                      <h4 style={{ 
                        margin: '0 0 8px 0', 
                        color: '#ffffff', 
                        fontSize: '18px', 
                        fontWeight: '600',
                        paddingRight: '80px'
                      }}>
                        {analysis.projectName}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ 
                          color: '#a0aec0', 
                          fontSize: '12px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}>
                          #{analysis.projectId}
                        </span>
                        <span style={{
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: '#93c5fd',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          marginLeft: 'auto'
                        }}>
                          Overall: {analysis.overallScore}/6.0
                        </span>
                      </div>
                    </div>
                    
                    {/* Score bars */}
                    <div style={{ 
                      background: 'rgba(0, 0, 0, 0.2)', 
                      borderRadius: '8px', 
                      padding: '16px',
                      marginBottom: '20px'
                    }}>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#a0aec0', fontSize: '12px' }}>Thermal Score:</span>
                          <span style={{ color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>
                            {analysis.thermalScore || '0.00'}/3.0
                          </span>
                        </div>
                        <div style={{
                          height: '6px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${(parseFloat(analysis.thermalScore || 0) / 3) * 100}%`,
                            background: `linear-gradient(90deg, ${ratingColor}80, ${ratingColor})`,
                            borderRadius: '3px'
                          }} />
                        </div>
                      </div>
                      
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#a0aec0', fontSize: '12px' }}>Redevelopment Score:</span>
                          <span style={{ color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>
                            {analysis.redevelopmentScore || '0.00'}/3.0
                          </span>
                        </div>
                        <div style={{
                          height: '6px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${(parseFloat(analysis.redevelopmentScore || 0) / 3) * 100}%`,
                            background: `linear-gradient(90deg, ${ratingColor}80, ${ratingColor})`,
                            borderRadius: '3px'
                          }} />
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProjectSelect(project);
                      }}
                      style={{
                        width: '100%',
                        background: `linear-gradient(135deg, ${ratingColor}80, ${ratingColor})`,
                        border: '1px solid transparent',
                        color: 'white',
                        padding: '12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `linear-gradient(135deg, ${ratingColor}, ${ratingColor})`;
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `linear-gradient(135deg, ${ratingColor}80, ${ratingColor})`;
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      🔍 View Detailed Analysis
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div style={{ 
          padding: '20px', 
          borderTop: '1px solid #4a5568', 
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '0 0 12px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ color: '#a0aec0', fontSize: '12px' }}>
            {lastUpdateTime && `Last updated: ${lastUpdateTime}`}
          </div>
          <button 
            onClick={() => setShowExpertScores(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#e2e8f0',
              padding: '10px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
        
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          .expert-scores-panel {
            max-width: 1400px;
            width: 95%;
            max-height: 90vh;
            overflow-y: auto;
            background: #1a1a1a;
            color: #e0e0e0;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
          }
          
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(4px);
          }
          
          /* Scrollbar styling */
          .expert-scores-panel::-webkit-scrollbar {
            width: 12px;
          }
          
          .expert-scores-panel::-webkit-scrollbar-track {
            background: #1a202c;
            border-radius: 6px;
          }
          
          .expert-scores-panel::-webkit-scrollbar-thumb {
            background: #4a5568;
            border-radius: 6px;
          }
          
          .expert-scores-panel::-webkit-scrollbar-thumb:hover {
            background: #63b3ed;
          }
          
          @media (max-width: 1024px) {
            .expert-scores-panel {
              grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)) !important;
            }
          }
          
          @media (max-width: 768px) {
            .expert-scores-panel {
              grid-template-columns: 1fr !important;
              width: 98% !important;
            }
            
            .header-right {
              flex-direction: column !important;
              gap: 8px !important;
              align-items: flex-end !important;
            }
            
            .stats-bar {
              flex-direction: column !important;
              gap: 16px !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default ExpertScoresPanel;
