import React, { useState, useEffect, useRef } from 'react';

const ExpertAnalysisModal = ({ 
  selectedExpertProject, 
  setSelectedExpertProject,
  currentUser = "PowerTrans Team",
  authToken = null,
  fetchExpertAnalysis,
  saveExpertAnalysis,
  fetchTransmissionInterconnection,
  saveTransmissionInterconnection
}) => {
  // Remove the strict early return - only return null if no project at all
  if (!selectedExpertProject) return null;
  
  // Create a stable reference to the selected project
  const projectRef = useRef(selectedExpertProject);
  
  // Generate default analysis if none exists
  const generateDefaultAnalysis = (project) => {
    console.log('Generating default analysis for project:', project);
    
    // Try to get scores from multiple possible sources
    const getNumericValue = (value, defaultValue = 0) => {
      if (value === undefined || value === null) return defaultValue;
      const num = parseFloat(value);
      return isNaN(num) ? defaultValue : num;
    };
    
    const overallScore = getNumericValue(
      project.expertAnalysis?.overallScore || 
      project.detailData?.["Overall Project Score"] || 
      project.detailData?.overall_project_score || 
      project.overall,
      0
    ).toFixed(1);
    
    const thermalScore = getNumericValue(
      project.expertAnalysis?.thermalScore ||
      project.detailData?.["Thermal Operating Score"] ||
      project.detailData?.thermal_operating_score ||
      project.thermal,
      0
    ).toFixed(1);
    
    const redevelopmentScore = getNumericValue(
      project.expertAnalysis?.redevelopmentScore ||
      project.detailData?.["Redevelopment Score"] ||
      project.detailData?.redevelopment_score ||
      project.redev,
      0
    ).toFixed(1);
    
    const projectName = project.expertAnalysis?.projectName ||
                       project.detailData?.["Project Name"] ||
                       project.detailData?.project_name ||
                       project.asset ||
                       `Project ${project.id || ""}`;
    
    const projectId = project.id || project.detailData?.id || "N/A";
    
    const defaultAnalysis = {
      overallScore: overallScore,
      overallRating: parseFloat(overallScore) >= 4.5 ? "Strong" : 
                    parseFloat(overallScore) >= 3.0 ? "Moderate" : "Weak",
      ratingClass: parseFloat(overallScore) >= 4.5 ? "strong" : 
                  parseFloat(overallScore) >= 3.0 ? "moderate" : "weak",
      thermalScore: thermalScore,
      redevelopmentScore: redevelopmentScore,
      projectName: projectName,
      projectId: projectId,
      thermalBreakdown: project.expertAnalysis?.thermalBreakdown || {
        thermal_optimization: { score: 1 },
        environmental: { score: 2 }
      },
      redevelopmentBreakdown: project.expertAnalysis?.redevelopmentBreakdown || {
        redev_market: { score: 2 },
        land_availability: { score: 2 },
        utilities: { score: 2 },
        interconnection: { score: 2 }
      },
      infrastructureScore: getNumericValue(project.expertAnalysis?.infrastructureScore, 2.0).toFixed(2),
      confidence: project.expertAnalysis?.confidence || 75
    };
    
    console.log('Generated default analysis:', defaultAnalysis);
    return defaultAnalysis;
  };

  // Use token from props or try to get from localStorage as fallback
  const [token] = useState(authToken || localStorage.getItem('token') || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [editedTransmissionData, setEditedTransmissionData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(() => {
    const initialAnalysis = selectedExpertProject.expertAnalysis || generateDefaultAnalysis(selectedExpertProject);
    console.log('Initial analysisData:', initialAnalysis);
    return initialAnalysis;
  });
  
  // NEW: Track data version to force refreshes
  const [dataVersion, setDataVersion] = useState(0);
  
  // API Base URL - Fixed to match your backend
  const API_BASE_URL = 'https://pt-power-pipeline-api.azurewebsites.net';
  
  // Function to get token from various sources
  const getAuthToken = () => {
    return authToken || localStorage.getItem('token') || '';
  };

  // NEW: Function to refresh ALL data
  const refreshAllData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Refreshing all data for project...');
      
      const projectId = selectedExpertProject.id;
      
      if (!projectId) {
        console.log('No project ID available for refresh');
        return;
      }
      
      // Refresh expert analysis
      if (fetchExpertAnalysis) {
        const freshAnalysis = await fetchExpertAnalysis(projectId);
        console.log('Fresh analysis data:', freshAnalysis);
        
        if (freshAnalysis) {
          // Merge with current data to preserve any unsaved changes
          const mergedAnalysis = {
            ...analysisData,
            ...freshAnalysis,
            thermalBreakdown: freshAnalysis.thermalBreakdown || analysisData.thermalBreakdown,
            redevelopmentBreakdown: freshAnalysis.redevelopmentBreakdown || analysisData.redevelopmentBreakdown
          };
          
          setAnalysisData(mergedAnalysis);
          if (!isEditing) {
            setEditedAnalysis(mergedAnalysis);
          }
        }
      }
      
      // Refresh transmission data
      if (fetchTransmissionInterconnection) {
        const projectName = selectedExpertProject?.expertAnalysis?.projectName || 
                           selectedExpertProject.detailData?.["Project Name"] ||
                           selectedExpertProject.detailData?.project_name ||
                           selectedExpertProject.asset ||
                           "";
        
        const freshTransmission = await fetchTransmissionInterconnection(projectName);
        console.log('Fresh transmission data:', freshTransmission);
        
        if (freshTransmission && Array.isArray(freshTransmission)) {
          setEditedTransmissionData(freshTransmission);
        }
      }
      
      // Increment data version to force UI updates
      setDataVersion(prev => prev + 1);
      
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch expert analysis from API
  const fetchExpertAnalysisData = async () => {
    try {
      setIsLoading(true);
      const projectId = selectedExpertProject.id;
      
      if (!projectId) {
        console.log('No project ID available');
        return null;
      }
      
      // Use provided function
      if (fetchExpertAnalysis && typeof fetchExpertAnalysis === 'function') {
        try {
          const data = await fetchExpertAnalysis(projectId);
          if (data) {
            console.log('Expert analysis fetched:', data);
            return data;
          }
        } catch (error) {
          console.warn('Fetch expert analysis failed:', error);
        }
      }
      
      // Direct fetch as fallback
      const authToken = getAuthToken();
      if (authToken) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/expert-analysis?projectId=${projectId}`, 
            {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'application/json'
              }
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            console.log('Direct fetch expert analysis:', data);
            return data;
          }
        } catch (error) {
          console.error('Direct fetch error:', error);
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('Error fetching expert analysis:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch transmission data from API
  const fetchTransmissionData = async () => {
    try {
      const projectName = selectedExpertProject?.expertAnalysis?.projectName || 
                       selectedExpertProject.detailData?.["Project Name"] ||
                       selectedExpertProject.detailData?.project_name ||
                       selectedExpertProject.asset ||
                       "";
      
      if (!projectName) {
        console.log('No project name available for transmission data');
        return [];
      }
      
      // Use provided function
      if (fetchTransmissionInterconnection && typeof fetchTransmissionInterconnection === 'function') {
        try {
          const data = await fetchTransmissionInterconnection(projectName);
          
          if (data && Array.isArray(data)) {
            console.log('Transmission data received:', data);
            return data;
          }
        } catch (error) {
          console.warn('Transmission fetch failed:', error);
        }
      }
      
      return [];
      
    } catch (error) {
      console.error('Error fetching transmission data:', error);
      return [];
    }
  };
  
  // Initialize all data
  useEffect(() => {
    const initializeData = async () => {
      console.log('Initializing expert analysis modal data...');
      
      // Try to get data by project name first
      let dbAnalysis = await fetchExpertAnalysisData();
      let dbTransmission = await fetchTransmissionData();
      
      console.log('Database analysis:', dbAnalysis);
      console.log('Database transmission:', dbTransmission);
      
      let initialAnalysis = analysisData;
      
      if (dbAnalysis) {
        initialAnalysis = {
          ...initialAnalysis,
          ...dbAnalysis,
          thermalBreakdown: dbAnalysis.thermalBreakdown || initialAnalysis.thermalBreakdown,
          redevelopmentBreakdown: dbAnalysis.redevelopmentBreakdown || initialAnalysis.redevelopmentBreakdown
        };
      }
      
      setEditedAnalysis(initialAnalysis);
      setAnalysisData(initialAnalysis);
      setEditedTransmissionData(dbTransmission || []);
    };
    
    if (selectedExpertProject) {
      initializeData();
    }
  }, [selectedExpertProject]);

  // Recalculate scores function
  const recalculateScores = (analysisData) => {
    console.log('Recalculating scores for:', analysisData);
    
    const thermalBreakdown = analysisData.thermalBreakdown || {};
    const redevBreakdown = analysisData.redevelopmentBreakdown || {};
    
    // Helper function to safely get numeric scores
    const getSafeScore = (breakdown, key, defaultValue = 0) => {
      const value = breakdown[key]?.score;
      if (value === undefined || value === null) return defaultValue;
      const num = parseInt(value);
      return isNaN(num) ? defaultValue : num;
    };
    
    // Calculate thermal score (5% + 15% = 20%)
    let thermalScore = 0;
    thermalScore += getSafeScore(thermalBreakdown, 'thermal_optimization', 1) * 0.05;
    thermalScore += getSafeScore(thermalBreakdown, 'environmental', 2) * 0.15;
    
    // Calculate redevelopment score (40% + 30% + 30% = 100%)
    let redevelopmentScore = 0;
    redevelopmentScore += getSafeScore(redevBreakdown, 'redev_market', 2) * 0.40;
    
    // Infrastructure score (average of land and utilities) - part of the 30%
    const landScore = getSafeScore(redevBreakdown, 'land_availability', 2);
    const utilitiesScore = getSafeScore(redevBreakdown, 'utilities', 2);
    const infrastructureScore = (landScore + utilitiesScore) / 2;
    redevelopmentScore += infrastructureScore * 0.30;
    
    // Interconnection - 30%
    redevelopmentScore += getSafeScore(redevBreakdown, 'interconnection', 2) * 0.30;
    
    const overallScore = (thermalScore + redevelopmentScore) * 2;
    
    const result = {
      ...analysisData,
      thermalScore: thermalScore.toFixed(2),
      redevelopmentScore: redevelopmentScore.toFixed(2),
      overallScore: overallScore.toFixed(2),
      infrastructureScore: infrastructureScore.toFixed(2),
      overallRating: overallScore >= 4.5 ? 'Strong' : overallScore >= 3.0 ? 'Moderate' : 'Weak',
      confidence: overallScore >= 4.5 ? 85 : overallScore >= 3.0 ? 75 : 60
    };
    
    console.log('Recalculated scores:', result);
    return result;
  };

  // ENHANCED: Handle save with better persistence
  const handleSave = async () => {
    console.log('💾 Save button clicked');
    setSaveStatus('saving');
    
    try {
      // Use editedAnalysis if available, otherwise use analysisData
      const currentAnalysisToSave = editedAnalysis || analysisData;
      
      if (!currentAnalysisToSave) {
        throw new Error('No analysis data to save');
      }
      
      // Recalculate scores before saving
      const updatedAnalysis = recalculateScores(currentAnalysisToSave);
      console.log('Updated analysis to save:', updatedAnalysis);
      
      // Get project ID - try multiple sources
      const projectId = selectedExpertProject.id || 
                       selectedExpertProject.detailData?.id || 
                       selectedExpertProject.expertAnalysis?.projectId;
      
      if (!projectId) {
        throw new Error('Project ID not found');
      }
      
      // Prepare data for saving
      const saveData = {
        projectId: projectId,
        projectName: updatedAnalysis.projectName,
        overallScore: parseFloat(updatedAnalysis.overallScore) || 0,
        overallRating: updatedAnalysis.overallRating || 'Moderate',
        confidence: updatedAnalysis.confidence || 75,
        thermalOperatingScore: parseFloat(updatedAnalysis.thermalScore) || 0,
        thermalBreakdown: updatedAnalysis.thermalBreakdown || {
          thermal_optimization: { score: 1 },
          environmental: { score: 2 }
        },
        redevelopmentScore: parseFloat(updatedAnalysis.redevelopmentScore) || 0,
        redevelopmentBreakdown: updatedAnalysis.redevelopmentBreakdown || {
          redev_market: { score: 2 },
          land_availability: { score: 2 },
          utilities: { score: 2 },
          interconnection: { score: 2 }
        },
        infrastructureScore: parseFloat(updatedAnalysis.infrastructureScore) || 2.0,
        editedBy: currentUser,
        lastUpdated: new Date().toISOString()
      };
      
      console.log('Saving data:', saveData);
      
      // Save to database using provided function
      let saveSuccessful = false;
      
      if (saveExpertAnalysis && typeof saveExpertAnalysis === 'function') {
        try {
          console.log('📤 Calling saveExpertAnalysis function...');
          const savedResult = await saveExpertAnalysis(saveData);
          saveSuccessful = true;
          console.log('✅ Save successful:', savedResult);
          
          // NEW: Immediately refresh data from server
          setTimeout(() => {
            refreshAllData();
          }, 500);
          
        } catch (error) {
          console.error('❌ Save via provided function failed:', error);
          throw error;
        }
      } else {
        throw new Error('No save function provided');
      }
      
      // Save transmission data if needed
      if (editedTransmissionData.length > 0) {
        if (saveTransmissionInterconnection && typeof saveTransmissionInterconnection === 'function') {
          try {
            await saveTransmissionInterconnection(projectId, editedTransmissionData);
            console.log('✅ Transmission data saved');
          } catch (error) {
            console.error('Failed to save transmission data:', error);
            // Don't fail the entire save if transmission data fails
          }
        }
      }
      
      if (saveSuccessful) {
        // Update local state with saved data
        setAnalysisData(updatedAnalysis);
        setEditedAnalysis(updatedAnalysis);
        setIsEditing(false);
        setSaveStatus('success');
        
        // Show success message with timeout
        setTimeout(() => {
          setSaveStatus(null);
        }, 2000);
        
        // Force data refresh after save
        setTimeout(() => {
          refreshAllData();
        }, 1000);
      } else {
        setSaveStatus('error');
      }
      
    } catch (error) {
      console.error('❌ Save error:', error);
      setSaveStatus('error');
      
      // Show user-friendly error message
      const errorMessage = error.message.includes('404') 
        ? 'Save failed: API endpoint not found. Please check backend deployment.'
        : error.message.includes('401') || error.message.includes('403')
        ? 'Save failed: Authentication error. Please login again.'
        : `Save failed: ${error.message}`;
      
      alert(`❌ ${errorMessage}`);
    }
  };

  // NEW: Handle modal close - force refresh parent data
  const handleClose = () => {
    console.log('🔒 Closing modal, triggering data refresh');
    
    // Force parent to refresh data
    if (window.refreshDashboardData) {
      window.refreshDashboardData();
    }
    
    // Close modal
    setSelectedExpertProject(null);
  };

  // NEW: Manual refresh button
  const handleManualRefresh = async () => {
    if (isEditing) {
      if (!window.confirm('Refreshing will discard unsaved changes. Continue?')) {
        return;
      }
    }
    
    await refreshAllData();
    alert('✅ Data refreshed from server!');
  };

  // Get score color class
  const getScoreColorClass = (score) => {
    const numScore = parseFloat(score) || 0;
    if (numScore >= 2.5) return 'score-excellent';
    if (numScore >= 1.5) return 'score-good';
    if (numScore >= 0.5) return 'score-fair';
    return 'score-poor';
  };

  // Get score text
  const getScoreText = (score) => {
    const numScore = parseFloat(score) || 0;
    if (numScore >= 2.5) return 'EXCELLENT';
    if (numScore >= 1.5) return 'GOOD';
    if (numScore >= 0.5) return 'FAIR';
    return 'POOR';
  };

  // Get rating color
  const getRatingColor = (rating) => {
    switch(rating?.toLowerCase()) {
      case 'strong': return '#10b981';
      case 'moderate': return '#f59e0b';
      case 'weak': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Handle score change
  const handleScoreChange = (category, component, value) => {
    console.log('Score changed:', { category, component, value });
    
    const currentAnalysis = editedAnalysis || analysisData;
    
    const updated = { ...currentAnalysis };
    
    if (category === 'thermal') {
      updated.thermalBreakdown = {
        ...updated.thermalBreakdown,
        [component]: {
          ...updated.thermalBreakdown[component],
          score: parseInt(value) || 0
        }
      };
    } else if (category === 'redevelopment') {
      updated.redevelopmentBreakdown = {
        ...updated.redevelopmentBreakdown,
        [component]: {
          ...updated.redevelopmentBreakdown[component],
          score: parseInt(value) || 0
        }
      };
    }
    
    // Recalculate scores
    const recalculated = recalculateScores(updated);
    setEditedAnalysis(recalculated);
  };

  // Handle transmission data field change
  const handleTransmissionFieldChange = (index, field, value) => {
    if (!isEditing) return;
    
    setEditedTransmissionData(prev => {
      const newData = [...prev];
      newData[index] = {
        ...newData[index],
        [field]: field === 'excessInjectionCapacity' || field === 'excessWithdrawalCapacity' 
          ? parseFloat(value) || 0 
          : value
      };
      return newData;
    });
  };

  // Add new POI voltage entry
  const addNewTransmissionEntry = (e) => {
    if (!isEditing) return;
    e.preventDefault();
    
    const projectName = selectedExpertProject?.expertAnalysis?.projectName || 
                       selectedExpertProject.detailData?.["Project Name"] ||
                       selectedExpertProject.detailData?.project_name ||
                       selectedExpertProject.asset ||
                       "";
    
    setEditedTransmissionData(prev => [
      ...prev,
      {
        site: projectName,
        excessIXCapacity: true,
        constraints: "-",
        poiVoltage: "",
        excessInjectionCapacity: 0,
        excessWithdrawalCapacity: 0
      }
    ]);
  };

  // Remove POI voltage entry
  const removeTransmissionEntry = (index) => {
    if (!isEditing) return;
    
    setEditedTransmissionData(prev => {
      const newData = [...prev];
      newData.splice(index, 1);
      return newData;
    });
  };

  // Use editedAnalysis if available, otherwise use analysisData
  const currentAnalysis = editedAnalysis || analysisData;
  
  if (isLoading) {
    return (
      <div className="modal-overlay" onClick={() => !isEditing && setSelectedExpertProject(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading-spinner">Loading expert analysis...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={() => !isEditing && handleClose()}>
      <div className="modal-content expert-analysis-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="header-top">
            <div className="header-left">
              <h2>{currentAnalysis?.projectName || 'Project'} - Expert Analysis</h2>
              <p className="subtitle">AI-powered assessment of all pipeline projects</p>
            </div>
            <div className="header-right">
              <button 
                className="refresh-btn"
                onClick={handleManualRefresh}
                title="Refresh data from server"
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
              <button className="close-btn" onClick={handleClose}>×</button>
            </div>
          </div>
          
          <div className="edit-toggle">
            {!isEditing ? (
              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                <span className="edit-icon">✏️</span> Enable Editing
              </button>
            ) : (
              <div className="edit-mode-indicator">
                <span className="edit-badge">EDIT MODE</span>
                <button className="cancel-btn" onClick={() => {
                  setIsEditing(false);
                  setEditedAnalysis(null); // Reset edits
                }}>
                  Cancel Edit
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Save Status */}
        {saveStatus && (
          <div className={`save-status ${saveStatus}`}>
            {saveStatus === 'saving' && '💾 Saving changes...'}
            {saveStatus === 'success' && '✅ Changes saved successfully! Data will refresh automatically.'}
            {saveStatus === 'error' && '❌ Failed to save changes'}
          </div>
        )}
        
        {/* Data Version Indicator (for debugging) */}
        <div style={{ 
          textAlign: 'center', 
          fontSize: '10px', 
          color: '#718096',
          padding: '4px',
          borderBottom: '1px solid #4a5568'
        }}>
          Data Version: {dataVersion} | Last Save: {new Date().toLocaleTimeString()}
        </div>
        
        {/* Overall Score Summary */}
        <div className="overall-score-section">
          <h3>Overall Score Summary</h3>
          <div className="score-grid">
            <div className="score-card">
              <div className="score-label">OVERALL SCORE</div>
              <div className={`score-value ${getScoreColorClass((currentAnalysis?.overallScore || 0) / 2)}`}>
                {(parseFloat(currentAnalysis?.overallScore) || 0).toFixed(1)}/6.0
              </div>
              <div className="score-percent">
                {Math.round(((parseFloat(currentAnalysis?.overallScore) || 0) / 6) * 100)}%
              </div>
              <div className="score-rating" style={{ color: getRatingColor(currentAnalysis?.overallRating) }}>
                {currentAnalysis?.overallRating || 'N/A'}
              </div>
            </div>
            
            <div className="score-card">
              <div className="score-label">THERMAL OPERATING SCORE</div>
              <div className={`score-value ${getScoreColorClass(currentAnalysis?.thermalScore || 0)}`}>
                {(parseFloat(currentAnalysis?.thermalScore) || 0).toFixed(2)}/3.0
              </div>
              <div className="score-percent">
                {Math.round(((parseFloat(currentAnalysis?.thermalScore) || 0) / 3) * 100)}%
              </div>
              <div className="score-rating">{getScoreText(parseFloat(currentAnalysis?.thermalScore) || 0)}</div>
            </div>
            
            <div className="score-card">
              <div className="score-label">REDEVELOPMENT</div>
              <div className={`score-value ${getScoreColorClass(currentAnalysis?.redevelopmentScore || 0)}`}>
                {(parseFloat(currentAnalysis?.redevelopmentScore) || 0).toFixed(2)}/3.0
              </div>
              <div className="score-percent">
                {Math.round(((parseFloat(currentAnalysis?.redevelopmentScore) || 0) / 3) * 100)}%
              </div>
              <div className="score-rating">{getScoreText(parseFloat(currentAnalysis?.redevelopmentScore) || 0)}</div>
            </div>
          </div>
        </div>
        
        {/* Expert Analysis Cards */}
        <div className="expert-cards-section">
          <h3>Expert Analysis Cards</h3>
          <p className="section-subtitle">Click info buttons for scoring criteria details</p>
          
          <div className="cards-container">
            {/* Left Card - Thermal Operating Assessment */}
            <div className="analysis-card">
              <div className="card-header">
                <h4>Thermal Operating Assessment</h4>
                <p className="card-subtitle">Evaluation of existing plant operations and market position</p>
                <span className="card-weight">Weight: 50%</span>
              </div>
              
              <div className="card-body">
                {/* M&A Thermal Optimization */}
                <div className="score-field-group">
                  <div className="field-header">
                    <span className="field-icon">M&A</span>
                    <h5>Thermal Optimization Potential</h5>
                  </div>
                  <div className="field-controls">
                    {isEditing ? (
                      <select 
                        className="score-select"
                        value={currentAnalysis?.thermalBreakdown?.thermal_optimization?.score || 1}
                        onChange={(e) => handleScoreChange('thermal', 'thermal_optimization', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '14px',
                          backgroundColor: '#2d3748',
                          color: 'white',
                          border: '1px solid #4a5568',
                          borderRadius: '6px'
                        }}
                      >
                        <option value="1">1 - No identifiable value add</option>
                        <option value="2">2 - Readily apparent value add</option>
                      </select>
                    ) : (
                      <div className="score-display" style={{
                        padding: '12px',
                        backgroundColor: '#2d3748',
                        borderRadius: '6px',
                        border: '1px solid #4a5568'
                      }}>
                        Score: {currentAnalysis?.thermalBreakdown?.thermal_optimization?.score || 1}
                      </div>
                    )}
                    <div className="field-details" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span className="weight" style={{ color: '#a0aec0' }}>Weight: 5%</span>
                      <span className="contribution" style={{ color: '#a0aec0' }}>
                        Contribution: {(((currentAnalysis?.thermalBreakdown?.thermal_optimization?.score || 1) * 0.05).toFixed(2))}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Environmental Considerations */}
                <div className="score-field-group">
                  <div className="field-header">
                    <span className="field-icon">Env</span>
                    <h5>Environmental Considerations</h5>
                  </div>
                  <div className="field-controls">
                    {isEditing ? (
                      <select 
                        className="score-select"
                        value={currentAnalysis?.thermalBreakdown?.environmental?.score || 2}
                        onChange={(e) => handleScoreChange('thermal', 'environmental', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '14px',
                          backgroundColor: '#2d3748',
                          color: 'white',
                          border: '1px solid #4a5568',
                          borderRadius: '6px'
                        }}
                      >
                        <option value="0">0 - Known and not mitigable</option>
                        <option value="1">1 - Not known</option>
                        <option value="2">2 - Known, mitigable, no cost advantage</option>
                        <option value="3">3 - Known, mitigable, PT has cost advantage</option>
                      </select>
                    ) : (
                      <div className="score-display" style={{
                        padding: '12px',
                        backgroundColor: '#2d3748',
                        borderRadius: '6px',
                        border: '1px solid #4a5568'
                      }}>
                        Score: {currentAnalysis?.thermalBreakdown?.environmental?.score || 2}
                      </div>
                    )}
                    <div className="field-details" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span className="weight" style={{ color: '#a0aec0' }}>Weight: 15%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Card - Redevelopment Assessment */}
            <div className="analysis-card">
              <div className="card-header">
                <h4>Redevelopment Assessment</h4>
                <p className="card-subtitle">Evaluation of future development potential and infrastructure</p>
                <span className="card-weight">Weight: 50%</span>
              </div>
              
              <div className="card-body">
                {/* Market Position */}
                <div className="score-field-group">
                  <div className="field-header">
                    <span className="field-icon">Mkt</span>
                    <h5>Market Position</h5>
                  </div>
                  <div className="field-controls">
                    {isEditing ? (
                      <select 
                        className="score-select"
                        value={currentAnalysis?.redevelopmentBreakdown?.redev_market?.score || 2}
                        onChange={(e) => handleScoreChange('redevelopment', 'redev_market', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '14px',
                          backgroundColor: '#2d3748',
                          color: 'white',
                          border: '1px solid #4a5568',
                          borderRadius: '6px'
                        }}
                      >
                        <option value="0">0 - Challenging</option>
                        <option value="1">1 - Uncertain</option>
                        <option value="2">2 - Secondary</option>
                        <option value="3">3 - Primary</option>
                      </select>
                    ) : (
                      <div className="score-display" style={{
                        padding: '12px',
                        backgroundColor: '#2d3748',
                        borderRadius: '6px',
                        border: '1px solid #4a5568'
                      }}>
                        Score: {currentAnalysis?.redevelopmentBreakdown?.redev_market?.score || 2}
                      </div>
                    )}
                    <div className="field-details" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span className="weight" style={{ color: '#a0aec0' }}>Weight: 40%</span>
                      <span className="contribution" style={{ color: '#a0aec0' }}>
                        Contribution: {(((currentAnalysis?.redevelopmentBreakdown?.redev_market?.score || 2) * 0.40).toFixed(2))}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Infrastructure */}
                <div className="infrastructure-section">
                  <h5>Infrastructure</h5>
                  <div className="infra-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '12px 0' }}>
                    <div className="infra-field">
                      <label style={{ display: 'block', marginBottom: '8px', color: '#a0aec0' }}>Land Availability</label>
                      {isEditing ? (
                        <select 
                          className="score-select"
                          value={currentAnalysis?.redevelopmentBreakdown?.land_availability?.score || 2}
                          onChange={(e) => handleScoreChange('redevelopment', 'land_availability', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '14px',
                            backgroundColor: '#2d3748',
                            color: 'white',
                            border: '1px solid #4a5568',
                            borderRadius: '6px'
                          }}
                        >
                          <option value="0">0 - No land available</option>
                          <option value="1">1 - No onsite, available nearby</option>
                          <option value="2">2 - Some onsite + nearby parcel</option>
                          <option value="3">3 - Sufficient land onsite</option>
                        </select>
                      ) : (
                        <div className="score-display" style={{
                          padding: '12px',
                          backgroundColor: '#2d3748',
                          borderRadius: '6px',
                          border: '1px solid #4a5568'
                        }}>
                          Score: {currentAnalysis?.redevelopmentBreakdown?.land_availability?.score || 2}
                        </div>
                      )}
                    </div>
                    <div className="infra-field">
                      <label style={{ display: 'block', marginBottom: '8px', color: '#a0aec0' }}>Utilities</label>
                      {isEditing ? (
                        <select 
                          className="score-select"
                          value={currentAnalysis?.redevelopmentBreakdown?.utilities?.score || 2}
                          onChange={(e) => handleScoreChange('redevelopment', 'utilities', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '14px',
                            backgroundColor: '#2d3748',
                            color: 'white',
                            border: '1px solid #4a5568',
                            borderRadius: '6px'
                          }}
                        >
                          <option value="-1">-1 - N/A - BESS and Solar</option>
                          <option value="0">0 - No clear path</option>
                          <option value="1">1 - Utilities available but expensive</option>
                          <option value="2">2 - Utilities nearby, low cost</option>
                          <option value="3">3 - Sufficient utilities onsite</option>
                        </select>
                      ) : (
                        <div className="score-display" style={{
                          padding: '12px',
                          backgroundColor: '#2d3748',
                          borderRadius: '6px',
                          border: '1px solid #4a5568'
                        }}>
                          Score: {currentAnalysis?.redevelopmentBreakdown?.utilities?.score || 2}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="infra-total" style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #4a5568' }}>
                    <span style={{ fontWeight: '500' }}>Infrastructure Score:</span>
                    <span className={`infra-value ${getScoreColorClass(currentAnalysis?.infrastructureScore || 0)}`} style={{ fontWeight: '600' }}>
                      {(parseFloat(currentAnalysis?.infrastructureScore) || 0).toFixed(2)}/3.0
                    </span>
                  </div>
                </div>
                
                {/* Interconnection */}
                <div className="score-field-group">
                  <div className="field-header">
                    <span className="field-icon">IX</span>
                    <h5>Interconnection (IX)</h5>
                  </div>
                  <div className="field-controls">
                    {isEditing ? (
                      <select 
                        className="score-select"
                        value={currentAnalysis?.redevelopmentBreakdown?.interconnection?.score || 2}
                        onChange={(e) => handleScoreChange('redevelopment', 'interconnection', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '14px',
                          backgroundColor: '#2d3748',
                          color: 'white',
                          border: '1px solid #4a5568',
                          borderRadius: '6px'
                        }}
                      >
                        <option value="0">0 - Major upgrades needed</option>
                        <option value="1">1 - Minimal upgrades needed</option>
                        <option value="2">2 - No upgrades needed (Unsecured)</option>
                        <option value="3">3 - Secured IX Rights</option>
                      </select>
                    ) : (
                      <div className="score-display" style={{
                        padding: '12px',
                        backgroundColor: '#2d3748',
                        borderRadius: '6px',
                        border: '1px solid #4a5568'
                      }}>
                        Score: {currentAnalysis?.redevelopmentBreakdown?.interconnection?.score || 2}
                      </div>
                    )}
                    <div className="field-details" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span className="weight" style={{ color: '#a0aec0' }}>Weight: 30%</span>
                    </div>
                  </div>
                </div>
                
                {/* Transmission Data Section */}
                <div className="transmission-section">
                  <div className="transmission-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h5>Transmission Interconnection Details</h5>
                    {editedTransmissionData.length > 0 && (
                      <span className="capacity-badge" style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        color: '#86efac',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span className="badge-dot" style={{ color: '#22c55e', fontSize: '16px' }}>●</span> Excess IX Capacity Available
                      </span>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="transmission-edit">
                      <div className="transmission-table-container" style={{ overflowX: 'auto', marginBottom: '16px' }}>
                        <table className="transmission-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                          <thead>
                            <tr>
                              <th style={{ width: '25%', background: '#1a202c', color: '#a0aec0', padding: '12px', textAlign: 'left' }}>POI Voltage</th>
                              <th style={{ width: '25%', background: '#1a202c', color: '#a0aec0', padding: '12px', textAlign: 'left' }}>Excess Injection Capacity (MW)</th>
                              <th style={{ width: '25%', background: '#1a202c', color: '#a0aec0', padding: '12px', textAlign: 'left' }}>Excess Withdrawal Capacity (MW)</th>
                              <th style={{ width: '15%', background: '#1a202c', color: '#a0aec0', padding: '12px', textAlign: 'left' }}>Constraints</th>
                              <th style={{ width: '10%', background: '#1a202c', color: '#a0aec0', padding: '12px', textAlign: 'left' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {editedTransmissionData.length > 0 ? (
                              editedTransmissionData.map((item, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #4a5568' }}>
                                  <td style={{ padding: '12px' }}>
                                    <input
                                      type="text"
                                      className="transmission-input"
                                      value={item.poiVoltage || ''}
                                      onChange={(e) => handleTransmissionFieldChange(index, 'poiVoltage', e.target.value)}
                                      placeholder="e.g., 69 kV"
                                      style={{ 
                                        width: '100%', 
                                        padding: '10px 12px', 
                                        fontSize: '14px',
                                        backgroundColor: '#2d3748',
                                        color: 'white',
                                        border: '1px solid #4a5568',
                                        borderRadius: '6px'
                                      }}
                                    />
                                  </td>
                                  <td style={{ padding: '12px' }}>
                                    <input
                                      type="number"
                                      className="transmission-input"
                                      value={item.excessInjectionCapacity || 0}
                                      onChange={(e) => handleTransmissionFieldChange(index, 'excessInjectionCapacity', e.target.value)}
                                      placeholder="0.0"
                                      step="0.1"
                                      min="0"
                                      style={{ 
                                        width: '100%', 
                                        padding: '10px 12px', 
                                        fontSize: '14px',
                                        backgroundColor: '#2d3748',
                                        color: 'white',
                                        border: '1px solid #4a5568',
                                        borderRadius: '6px'
                                      }}
                                    />
                                  </td>
                                  <td style={{ padding: '12px' }}>
                                    <input
                                      type="number"
                                      className="transmission-input"
                                      value={item.excessWithdrawalCapacity || 0}
                                      onChange={(e) => handleTransmissionFieldChange(index, 'excessWithdrawalCapacity', e.target.value)}
                                      placeholder="0.0"
                                      step="0.1"
                                      min="0"
                                      style={{ 
                                        width: '100%', 
                                        padding: '10px 12px', 
                                        fontSize: '14px',
                                        backgroundColor: '#2d3748',
                                        color: 'white',
                                        border: '1px solid #4a5568',
                                        borderRadius: '6px'
                                      }}
                                    />
                                  </td>
                                  <td style={{ padding: '12px' }}>
                                    <input
                                      type="text"
                                      className="transmission-input"
                                      value={item.constraints || '-'}
                                      onChange={(e) => handleTransmissionFieldChange(index, 'constraints', e.target.value)}
                                      placeholder="e.g., None, 1, 2"
                                      style={{ 
                                        width: '100%', 
                                        padding: '10px 12px', 
                                        fontSize: '14px',
                                        backgroundColor: '#2d3748',
                                        color: 'white',
                                        border: '1px solid #4a5568',
                                        borderRadius: '6px'
                                      }}
                                    />
                                  </td>
                                  <td style={{ padding: '12px' }}>
                                    <button 
                                      className="remove-btn"
                                      onClick={() => removeTransmissionEntry(index)}
                                      title="Remove this entry"
                                      style={{ 
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#fca5a5',
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                      }}
                                    >
                                      🗑️ Remove
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: '#a0aec0', fontStyle: 'italic', padding: '20px' }}>
                                  No transmission data available. Click "Add POI Voltage" to add new entries.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="transmission-actions" style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                        <button 
                          className="add-btn"
                          onClick={addNewTransmissionEntry}
                          style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            color: '#86efac',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            fontSize: '14px'
                          }}
                        >
                          + Add POI Voltage
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="transmission-view">
                      {editedTransmissionData.length > 0 ? (
                        <div className="transmission-table-container" style={{ overflowX: 'auto' }}>
                          <table className="transmission-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                              <tr>
                                <th style={{ width: '30%', background: '#1a202c', color: '#a0aec0', padding: '12px', textAlign: 'left' }}>POI Voltage</th>
                                <th style={{ width: '30%', background: '#1a202c', color: '#a0aec0', padding: '12px', textAlign: 'left' }}>Excess Injection Capacity</th>
                                <th style={{ width: '30%', background: '#1a202c', color: '#a0aec0', padding: '12px', textAlign: 'left' }}>Excess Withdrawal Capacity</th>
                                <th style={{ width: '20%', background: '#1a202c', color: '#a0aec0', padding: '12px', textAlign: 'left' }}>Constraints</th>
                              </tr>
                            </thead>
                            <tbody>
                              {editedTransmissionData.map((item, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #4a5568' }}>
                                  <td style={{ padding: '12px', color: '#e2e8f0' }}>{item.poiVoltage || ''}</td>
                                  <td style={{ padding: '12px', color: '#e2e8f0' }}>{parseFloat(item.excessInjectionCapacity || 0).toFixed(1)} MW</td>
                                  <td style={{ padding: '12px', color: '#e2e8f0' }}>{parseFloat(item.excessWithdrawalCapacity || 0).toFixed(1)} MW</td>
                                  <td style={{ padding: '12px', color: '#e2e8f0' }}>{item.constraints === "-" ? "None" : item.constraints || 'None'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#a0aec0' }}>
                          <div style={{ fontSize: '32px', marginBottom: '8px', opacity: '0.5' }}>📊</div>
                          <div>No transmission interconnection data available.</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="action-buttons" style={{ padding: '20px', borderTop: '1px solid #4a5568', background: 'rgba(0, 0, 0, 0.2)' }}>
          {isEditing ? (
            <div className="edit-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                className="action-btn secondary"
                onClick={() => {
                  setIsEditing(false);
                  setEditedAnalysis(null); // Reset edits
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#e2e8f0',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button 
                className="action-btn primary"
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                style={{
                  background: saveStatus === 'saving' ? 'rgba(107, 114, 128, 0.5)' : 'rgba(59, 130, 246, 0.9)',
                  border: saveStatus === 'saving' ? '1px solid rgba(107, 114, 128, 0.5)' : '1px solid rgba(59, 130, 246, 0.9)',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  minWidth: '120px'
                }}
              >
                {saveStatus === 'saving' ? '💾 Saving...' : '💾 Save Changes'}
              </button>
            </div>
          ) : (
            <div className="view-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                className="action-btn secondary"
                onClick={handleClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#e2e8f0',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px'
                }}
              >
                Back to Scores
              </button>
              <button 
                className="action-btn primary"
                onClick={() => {
                  alert('Report generation feature would be implemented here.');
                }}
                style={{
                  background: 'rgba(59, 130, 246, 0.9)',
                  border: '1px solid rgba(59, 130, 246, 0.9)',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px'
                }}
              >
                📄 Generate Report
              </button>
            </div>
          )}
        </div>
        
        {/* CSS Styles */}
        <style>{`
          .expert-analysis-modal {
            max-width: 1200px;
            width: 95%;
            max-height: 90vh;
            overflow-y: auto;
            background: #1a1a1a;
            color: #e0e0e0;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          }
          
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
          }
          
          .modal-header {
            padding: 20px;
            background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
            border-bottom: 1px solid #4a5568;
            border-radius: 12px 12px 0 0;
          }
          
          .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }
          
          .header-left h2 {
            margin: 0;
            color: #ffffff;
            font-size: 24px;
            font-weight: 600;
          }
          
          .header-left .subtitle {
            color: #a0aec0;
            margin: 4px 0 0 0;
            font-size: 14px;
          }
          
          .header-right {
            display: flex;
            align-items: center;
          }
          
          .edit-toggle {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .edit-btn {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            color: #93c5fd;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .edit-btn:hover {
            background: rgba(59, 130, 246, 0.2);
          }
          
          .edit-badge {
            background: rgba(245, 158, 11, 0.15);
            border: 1px solid rgba(245, 158, 11, 0.3);
            color: #fbbf24;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }
          
          .cancel-btn {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #fca5a5;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
          }
          
          .close-btn {
            background: none;
            border: none;
            color: #a0aec0;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .save-status {
            padding: 12px 20px;
            margin: 0 20px;
            border-radius: 6px;
            font-weight: 500;
            text-align: center;
            animation: fadeIn 0.3s ease;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .save-status.saving {
            background: rgba(59, 130, 246, 0.1);
            color: #93c5fd;
            border: 1px solid rgba(59, 130, 246, 0.3);
          }
          
          .save-status.success {
            background: rgba(34, 197, 94, 0.1);
            color: #86efac;
            border: 1px solid rgba(34, 197, 94, 0.3);
            animation: successPulse 2s ease;
          }
          
          @keyframes successPulse {
            0%, 100% { background: rgba(34, 197, 94, 0.1); }
            50% { background: rgba(34, 197, 94, 0.2); }
          }
          
          .save-status.error {
            background: rgba(239, 68, 68, 0.1);
            color: #fca5a5;
            border: 1px solid rgba(239, 68, 68, 0.3);
          }
          
          .overall-score-section {
            padding: 20px;
            border-bottom: 1px solid #4a5568;
          }
          
          h3 {
            color: #ffffff;
            margin: 0 0 16px 0;
            font-size: 18px;
          }
          
          .score-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
          
          @media (max-width: 768px) {
            .score-grid {
              grid-template-columns: 1fr;
            }
          }
          
          .score-card {
            background: #2d3748;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #4a5568;
            text-align: center;
            transition: all 0.3s ease;
          }
          
          .score-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            border-color: #63b3ed;
          }
          
          .score-label {
            color: #a0aec0;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .score-value {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          
          .score-excellent { color: #10b981; }
          .score-good { color: #f59e0b; }
          .score-fair { color: #fbbf24; }
          .score-poor { color: #ef4444; }
          
          .score-percent {
            color: #a0aec0;
            font-size: 14px;
            margin-bottom: 8px;
          }
          
          .score-rating {
            font-weight: 600;
            font-size: 14px;
            padding: 4px 8px;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.05);
            display: inline-block;
          }
          
          .expert-cards-section {
            padding: 20px;
          }
          
          .section-subtitle {
            color: #a0aec0;
            margin: 0 0 20px 0;
            font-size: 14px;
          }
          
          .cards-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
          
          @media (max-width: 1024px) {
            .cards-container {
              grid-template-columns: 1fr;
            }
          }
          
          .analysis-card {
            background: #2d3748;
            border: 1px solid #4a5568;
            border-radius: 8px;
            overflow: hidden;
            transition: all 0.3s ease;
          }
          
          .analysis-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
          
          .card-header {
            padding: 20px;
            background: rgba(0, 0, 0, 0.2);
            border-bottom: 1px solid #4a5568;
          }
          
          h4 {
            margin: 0 0 4px 0;
            color: #ffffff;
            font-size: 18px;
            font-weight: 600;
          }
          
          .card-subtitle {
            color: #a0aec0;
            font-size: 13px;
            margin: 0 0 8px 0;
            line-height: 1.4;
          }
          
          .card-weight {
            display: inline-block;
            background: rgba(59, 130, 246, 0.1);
            color: #93c5fd;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }
          
          .card-body {
            padding: 20px;
          }
          
          .score-field-group {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #4a5568;
          }
          
          .score-field-group:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          
          .field-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
          }
          
          .field-icon {
            background: #4a5568;
            color: #e2e8f0;
            width: 24px;
            height: 24px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
          }
          
          h5 {
            margin: 0;
            color: #e2e8f0;
            font-size: 14px;
            font-weight: 600;
          }
          
          .field-controls {
            margin-top: 12px;
          }
          
          /* Scrollbar Styling */
          .expert-analysis-modal::-webkit-scrollbar {
            width: 8px;
          }
          
          .expert-analysis-modal::-webkit-scrollbar-track {
            background: #1a202c;
            border-radius: 4px;
          }
          
          .expert-analysis-modal::-webkit-scrollbar-thumb {
            background: #4a5568;
            border-radius: 4px;
          }
          
          .expert-analysis-modal::-webkit-scrollbar-thumb:hover {
            background: #63b3ed;
          }
        `}</style>
      </div>
    </div>
  );
};

export default ExpertAnalysisModal;
