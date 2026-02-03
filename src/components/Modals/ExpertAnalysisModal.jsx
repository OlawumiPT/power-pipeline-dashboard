import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  const isInitialLoad = useRef(true);
  
  // Generate default analysis if none exists
  const generateDefaultAnalysis = useCallback((project) => {
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
  }, []);

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
  const modalContentRef = useRef(null);
  
  // API Base URL
  const API_BASE_URL = 'https://pt-power-pipeline-api.azurewebsites.net';
  
  // Function to get token from various sources
  const getAuthToken = useCallback(() => {
    return authToken || localStorage.getItem('token') || '';
  }, [authToken]);

  // NEW: Optimized function to refresh ALL data
  const refreshAllData = useCallback(async () => {
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
          // Batch state updates
          requestAnimationFrame(() => {
            setAnalysisData(prev => ({
              ...prev,
              ...freshAnalysis,
              thermalBreakdown: freshAnalysis.thermalBreakdown || prev.thermalBreakdown,
              redevelopmentBreakdown: freshAnalysis.redevelopmentBreakdown || prev.redevelopmentBreakdown
            }));
            
            if (!isEditing) {
              setEditedAnalysis(prev => ({
                ...prev,
                ...freshAnalysis,
                thermalBreakdown: freshAnalysis.thermalBreakdown || prev?.thermalBreakdown,
                redevelopmentBreakdown: freshAnalysis.redevelopmentBreakdown || prev?.redevelopmentBreakdown
              }));
            }
          });
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
          requestAnimationFrame(() => {
            setEditedTransmissionData(freshTransmission);
          });
        }
      }
      
      // Increment data version to force UI updates
      requestAnimationFrame(() => {
        setDataVersion(prev => prev + 1);
      });
      
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      requestAnimationFrame(() => {
        setIsLoading(false);
      });
    }
  }, [selectedExpertProject, fetchExpertAnalysis, fetchTransmissionInterconnection, isEditing]);

  // Fetch expert analysis from API - memoized
  const fetchExpertAnalysisData = useCallback(async () => {
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
      
      return null;
      
    } catch (error) {
      console.error('Error fetching expert analysis:', error);
      return null;
    } finally {
      requestAnimationFrame(() => {
        setIsLoading(false);
      });
    }
  }, [selectedExpertProject, fetchExpertAnalysis]);
  
  // Fetch transmission data from API - memoized
  const fetchTransmissionData = useCallback(async () => {
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
  }, [selectedExpertProject, fetchTransmissionInterconnection]);
  
  // Initialize all data - optimized to prevent flickering
  useEffect(() => {
    const initializeData = async () => {
      if (!selectedExpertProject) return;
      
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
      
      // Batch state updates in requestAnimationFrame
      requestAnimationFrame(() => {
        setEditedAnalysis(initialAnalysis);
        setAnalysisData(initialAnalysis);
        setEditedTransmissionData(dbTransmission || []);
      });
      
      isInitialLoad.current = false;
    };
    
    if (selectedExpertProject && isInitialLoad.current) {
      initializeData();
    }
  }, [selectedExpertProject]);

  // Recalculate scores function - memoized
  const recalculateScores = useCallback((analysisData) => {
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
  }, []);

  // ENHANCED: Handle save with NO flickering
  const handleSave = useCallback(async () => {
    console.log('💾 Save button clicked');
    
    // Prevent double saves
    if (saveStatus === 'saving') return;
    
    // Use requestAnimationFrame for smooth UI updates
    requestAnimationFrame(() => {
      setSaveStatus('saving');
    });
    
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
        infrastructureScore: parseFloat(updatedAnalysis.infrastructureScore) || 0,
        editedBy: currentUser,
        lastUpdated: new Date().toISOString()
      };
      
      console.log('Saving data:', saveData);
      
      // Save to database using provided function
      let saveSuccessful = false;
      
      if (saveExpertAnalysis && typeof saveExpertAnalysis === 'function') {
        console.log('📤 Calling saveExpertAnalysis function...');
        const savedResult = await saveExpertAnalysis(saveData);
        saveSuccessful = true;
        console.log('✅ Save successful:', savedResult);
        
        // Batch all state updates together to prevent flickering
        requestAnimationFrame(() => {
          // Update analysis data
          setAnalysisData(prev => ({
            ...prev,
            ...updatedAnalysis,
            thermalBreakdown: updatedAnalysis.thermalBreakdown || prev.thermalBreakdown,
            redevelopmentBreakdown: updatedAnalysis.redevelopmentBreakdown || prev.redevelopmentBreakdown
          }));
          
          // Update editedAnalysis
          setEditedAnalysis(prev => ({
            ...prev,
            ...updatedAnalysis,
            thermalBreakdown: updatedAnalysis.thermalBreakdown || prev?.thermalBreakdown,
            redevelopmentBreakdown: updatedAnalysis.redevelopmentBreakdown || prev?.redevelopmentBreakdown
          }));
          
          // Show success status
          setSaveStatus('success');
        });
        
        // Save transmission data if needed (non-blocking, don't wait for it)
        if (editedTransmissionData.length > 0) {
          if (saveTransmissionInterconnection && typeof saveTransmissionInterconnection === 'function') {
            saveTransmissionInterconnection(projectId, editedTransmissionData)
              .then(() => console.log('✅ Transmission data saved'))
              .catch(error => console.error('Transmission save error:', error));
          }
        }
        
        // Clear success message after 2 seconds
        setTimeout(() => {
          requestAnimationFrame(() => {
            setSaveStatus(null);
          });
        }, 2000);
        
      } else {
        throw new Error('No save function provided');
      }
      
    } catch (error) {
      console.error('❌ Save error:', error);
      
      requestAnimationFrame(() => {
        setSaveStatus('error');
      });
      
      // Show error message after a short delay
      setTimeout(() => {
        const errorMessage = error.message.includes('404') 
          ? 'Save failed: API endpoint not found. Please check backend deployment.'
          : error.message.includes('401') || error.message.includes('403')
          ? 'Save failed: Authentication error. Please login again.'
          : `Save failed: ${error.message}`;
        
        alert(`❌ ${errorMessage}`);
      }, 100);
    }
  }, [selectedExpertProject, editedAnalysis, analysisData, saveStatus, recalculateScores, saveExpertAnalysis, saveTransmissionInterconnection, editedTransmissionData, currentUser]);

  // Handle modal close
  const handleClose = useCallback(() => {
    console.log('🔒 Closing modal');
    
    // Force parent to refresh data if we were editing
    if (isEditing && window.refreshDashboardData) {
      window.refreshDashboardData();
    }
    
    // Close modal
    setSelectedExpertProject(null);
  }, [isEditing, setSelectedExpertProject]);

  // Manual refresh button
  const handleManualRefresh = useCallback(async () => {
    if (isEditing) {
      if (!window.confirm('Refreshing will discard unsaved changes. Continue?')) {
        return;
      }
      setIsEditing(false);
    }
    
    await refreshAllData();
  }, [isEditing, refreshAllData]);

  // Get score color class
  const getScoreColorClass = useCallback((score) => {
    const numScore = parseFloat(score) || 0;
    if (numScore >= 2.5) return 'score-excellent';
    if (numScore >= 1.5) return 'score-good';
    if (numScore >= 0.5) return 'score-fair';
    return 'score-poor';
  }, []);

  // Get score text
  const getScoreText = useCallback((score) => {
    const numScore = parseFloat(score) || 0;
    if (numScore >= 2.5) return 'EXCELLENT';
    if (numScore >= 1.5) return 'GOOD';
    if (numScore >= 0.5) return 'FAIR';
    return 'POOR';
  }, []);

  // Get rating color
  const getRatingColor = useCallback((rating) => {
    switch(rating?.toLowerCase()) {
      case 'strong': return '#10b981';
      case 'moderate': return '#f59e0b';
      case 'weak': return '#ef4444';
      default: return '#6b7280';
    }
  }, []);

  // Handle score change - optimized
  const handleScoreChange = useCallback((category, component, value) => {
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
    
    // Batch update in requestAnimationFrame
    requestAnimationFrame(() => {
      setEditedAnalysis(recalculated);
    });
  }, [editedAnalysis, analysisData, recalculateScores]);

  // Handle transmission data field change
  const handleTransmissionFieldChange = useCallback((index, field, value) => {
    if (!isEditing) return;
    
    requestAnimationFrame(() => {
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
    });
  }, [isEditing]);

  // Add new POI voltage entry
  const addNewTransmissionEntry = useCallback((e) => {
    if (!isEditing) return;
    e.preventDefault();
    
    const projectName = selectedExpertProject?.expertAnalysis?.projectName || 
                       selectedExpertProject.detailData?.["Project Name"] ||
                       selectedExpertProject.detailData?.project_name ||
                       selectedExpertProject.asset ||
                       "";
    
    requestAnimationFrame(() => {
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
    });
  }, [isEditing, selectedExpertProject]);

  // Remove POI voltage entry
  const removeTransmissionEntry = useCallback((index) => {
    if (!isEditing) return;
    
    requestAnimationFrame(() => {
      setEditedTransmissionData(prev => {
        const newData = [...prev];
        newData.splice(index, 1);
        return newData;
      });
    });
  }, [isEditing]);

  // Use editedAnalysis if available, otherwise use analysisData
  const currentAnalysis = editedAnalysis || analysisData;
  
  // Memoized sub-components to prevent re-renders
  const ThermalOperatingCard = React.memo(({ analysis, isEditing, onScoreChange }) => (
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
                value={analysis?.thermalBreakdown?.thermal_optimization?.score || 1}
                onChange={(e) => onScoreChange('thermal', 'thermal_optimization', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  backgroundColor: '#2d3748',
                  color: 'white',
                  border: '1px solid #4a5568',
                  borderRadius: '6px',
                  transition: 'border-color 0.2s ease'
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
                border: '1px solid #4a5568',
                transition: 'border-color 0.2s ease'
              }}>
                Score: {analysis?.thermalBreakdown?.thermal_optimization?.score || 1}
              </div>
            )}
            <div className="field-details" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span className="weight" style={{ color: '#a0aec0' }}>Weight: 5%</span>
              <span className="contribution" style={{ color: '#a0aec0' }}>
                Contribution: {(((analysis?.thermalBreakdown?.thermal_optimization?.score || 1) * 0.05).toFixed(2))}
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
                value={analysis?.thermalBreakdown?.environmental?.score || 2}
                onChange={(e) => onScoreChange('thermal', 'environmental', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  backgroundColor: '#2d3748',
                  color: 'white',
                  border: '1px solid #4a5568',
                  borderRadius: '6px',
                  transition: 'border-color 0.2s ease'
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
                border: '1px solid #4a5568',
                transition: 'border-color 0.2s ease'
              }}>
                Score: {analysis?.thermalBreakdown?.environmental?.score || 2}
              </div>
            )}
            <div className="field-details" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span className="weight" style={{ color: '#a0aec0' }}>Weight: 15%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  ));

  const RedevelopmentCard = React.memo(({ analysis, isEditing, onScoreChange, transmissionData, onTransmissionFieldChange, onAddTransmission, onRemoveTransmission, getScoreColorClass }) => (
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
                value={analysis?.redevelopmentBreakdown?.redev_market?.score || 2}
                onChange={(e) => onScoreChange('redevelopment', 'redev_market', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  backgroundColor: '#2d3748',
                  color: 'white',
                  border: '1px solid #4a5568',
                  borderRadius: '6px',
                  transition: 'border-color 0.2s ease'
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
                border: '1px solid #4a5568',
                transition: 'border-color 0.2s ease'
              }}>
                Score: {analysis?.redevelopmentBreakdown?.redev_market?.score || 2}
              </div>
            )}
            <div className="field-details" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span className="weight" style={{ color: '#a0aec0' }}>Weight: 40%</span>
              <span className="contribution" style={{ color: '#a0aec0' }}>
                Contribution: {(((analysis?.redevelopmentBreakdown?.redev_market?.score || 2) * 0.40).toFixed(2))}
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
                  value={analysis?.redevelopmentBreakdown?.land_availability?.score || 2}
                  onChange={(e) => onScoreChange('redevelopment', 'land_availability', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    backgroundColor: '#2d3748',
                    color: 'white',
                    border: '1px solid #4a5568',
                    borderRadius: '6px',
                    transition: 'border-color 0.2s ease'
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
                  border: '1px solid #4a5568',
                  transition: 'border-color 0.2s ease'
                }}>
                  Score: {analysis?.redevelopmentBreakdown?.land_availability?.score || 2}
                </div>
              )}
            </div>
            <div className="infra-field">
              <label style={{ display: 'block', marginBottom: '8px', color: '#a0aec0' }}>Utilities</label>
              {isEditing ? (
                <select 
                  className="score-select"
                  value={analysis?.redevelopmentBreakdown?.utilities?.score || 2}
                  onChange={(e) => onScoreChange('redevelopment', 'utilities', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    backgroundColor: '#2d3748',
                    color: 'white',
                    border: '1px solid #4a5568',
                    borderRadius: '6px',
                    transition: 'border-color 0.2s ease'
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
                  border: '1px solid #4a5568',
                  transition: 'border-color 0.2s ease'
                }}>
                  Score: {analysis?.redevelopmentBreakdown?.utilities?.score || 2}
                </div>
              )}
            </div>
          </div>
          <div className="infra-total" style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #4a5568' }}>
            <span style={{ fontWeight: '500' }}>Infrastructure Score:</span>
            <span className={`infra-value ${getScoreColorClass(analysis?.infrastructureScore || 0)}`} style={{ fontWeight: '600' }}>
              {(parseFloat(analysis?.infrastructureScore) || 0).toFixed(2)}/3.0
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
                value={analysis?.redevelopmentBreakdown?.interconnection?.score || 2}
                onChange={(e) => onScoreChange('redevelopment', 'interconnection', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  backgroundColor: '#2d3748',
                  color: 'white',
                  border: '1px solid #4a5568',
                  borderRadius: '6px',
                  transition: 'border-color 0.2s ease'
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
                border: '1px solid #4a5568',
                transition: 'border-color 0.2s ease'
              }}>
                Score: {analysis?.redevelopmentBreakdown?.interconnection?.score || 2}
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
            {transmissionData.length > 0 && (
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
            <TransmissionEditTable 
              data={transmissionData}
              onFieldChange={onTransmissionFieldChange}
              onAdd={onAddTransmission}
              onRemove={onRemoveTransmission}
            />
          ) : (
            <TransmissionViewTable data={transmissionData} />
          )}
        </div>
      </div>
    </div>
  ));

  const TransmissionEditTable = React.memo(({ data, onFieldChange, onAdd, onRemove }) => (
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
            {data.length > 0 ? (
              data.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #4a5568' }}>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="text"
                      className="transmission-input"
                      value={item.poiVoltage || ''}
                      onChange={(e) => onFieldChange(index, 'poiVoltage', e.target.value)}
                      placeholder="e.g., 69 kV"
                      style={{ 
                        width: '100%', 
                        padding: '10px 12px', 
                        fontSize: '14px',
                        backgroundColor: '#2d3748',
                        color: 'white',
                        border: '1px solid #4a5568',
                        borderRadius: '6px',
                        transition: 'border-color 0.2s ease'
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="number"
                      className="transmission-input"
                      value={item.excessInjectionCapacity || 0}
                      onChange={(e) => onFieldChange(index, 'excessInjectionCapacity', e.target.value)}
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
                        borderRadius: '6px',
                        transition: 'border-color 0.2s ease'
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="number"
                      className="transmission-input"
                      value={item.excessWithdrawalCapacity || 0}
                      onChange={(e) => onFieldChange(index, 'excessWithdrawalCapacity', e.target.value)}
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
                        borderRadius: '6px',
                        transition: 'border-color 0.2s ease'
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="text"
                      className="transmission-input"
                      value={item.constraints || '-'}
                      onChange={(e) => onFieldChange(index, 'constraints', e.target.value)}
                      placeholder="e.g., None, 1, 2"
                      style={{ 
                        width: '100%', 
                        padding: '10px 12px', 
                        fontSize: '14px',
                        backgroundColor: '#2d3748',
                        color: 'white',
                        border: '1px solid #4a5568',
                        borderRadius: '6px',
                        transition: 'border-color 0.2s ease'
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button 
                      className="remove-btn"
                      onClick={() => onRemove(index)}
                      title="Remove this entry"
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#fca5a5',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
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
          onClick={onAdd}
          style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#86efac',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        >
          + Add POI Voltage
        </button>
      </div>
    </div>
  ));

  const TransmissionViewTable = React.memo(({ data }) => (
    <div className="transmission-view">
      {data.length > 0 ? (
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
              {data.map((item, index) => (
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
  ));

  // Loading overlay - doesn't replace entire modal
  if (isLoading && isInitialLoad.current) {
    return (
      <div className="modal-overlay" onClick={() => !isEditing && handleClose()}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div className="loading-spinner" style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#a0aec0' }}>Loading expert analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={() => !isEditing && handleClose()}>
      <div className="modal-content expert-analysis-modal" onClick={(e) => e.stopPropagation()} ref={modalContentRef}>
        {/* Save Status Overlay - Fixed position to prevent layout shift */}
        {saveStatus && (
          <div className="save-status-overlay" style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10001,
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{
              background: '#2d3748',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #4a5568',
              textAlign: 'center',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              animation: 'scaleIn 0.3s ease'
            }}>
              {saveStatus === 'saving' && (
                <>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    border: '3px solid rgba(59, 130, 246, 0.3)',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    margin: '0 auto 16px',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <h3 style={{ color: 'white', margin: '0 0 8px' }}>Saving Changes</h3>
                  <p style={{ color: '#a0aec0' }}>Please wait while we save your changes...</p>
                </>
              )}
              {saveStatus === 'success' && (
                <>
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '16px',
                    color: '#10b981'
                  }}>✓</div>
                  <h3 style={{ color: 'white', margin: '0 0 8px' }}>Changes Saved!</h3>
                  <p style={{ color: '#a0aec0' }}>Your changes have been saved successfully.</p>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '16px',
                    color: '#ef4444'
                  }}>✗</div>
                  <h3 style={{ color: 'white', margin: '0 0 8px' }}>Save Failed</h3>
                  <p style={{ color: '#a0aec0' }}>Unable to save changes. Please try again.</p>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="modal-header" style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
          borderBottom: '1px solid #4a5568',
          borderRadius: '12px 12px 0 0',
          transition: 'all 0.2s ease'
        }}>
          <div className="header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div className="header-left">
              <h2 style={{ margin: '0', color: '#ffffff', fontSize: '24px', fontWeight: '600' }}>
                {currentAnalysis?.projectName || 'Project'} - Expert Analysis
              </h2>
              <p className="subtitle" style={{ color: '#a0aec0', margin: '4px 0 0 0', fontSize: '14px' }}>
                AI-powered assessment of all pipeline projects
              </p>
            </div>
            <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                  transition: 'all 0.2s ease'
                }}
              >
                🔄 Refresh
              </button>
              <button className="close-btn" onClick={handleClose} style={{
                background: 'none',
                border: 'none',
                color: '#a0aec0',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}>×</button>
            </div>
          </div>
          
          <div className="edit-toggle" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {!isEditing ? (
              <button className="edit-btn" onClick={() => setIsEditing(true)} style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#93c5fd',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <span className="edit-icon">✏️</span> Enable Editing
              </button>
            ) : (
              <div className="edit-mode-indicator" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="edit-badge" style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#fbbf24',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>EDIT MODE</span>
                <button className="cancel-btn" onClick={() => {
                  setIsEditing(false);
                  setEditedAnalysis(null);
                }} style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  Cancel Edit
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Data Version Indicator (for debugging) */}
        <div style={{ 
          textAlign: 'center', 
          fontSize: '10px', 
          color: '#718096',
          padding: '4px',
          borderBottom: '1px solid #4a5568',
          background: 'rgba(0,0,0,0.1)'
        }}>
          Data Version: {dataVersion} | Last Updated: {currentAnalysis?.lastUpdated ? new Date(currentAnalysis.lastUpdated).toLocaleTimeString() : 'Never'}
        </div>
        
        {/* Overall Score Summary */}
        <div className="overall-score-section" style={{ padding: '20px', borderBottom: '1px solid #4a5568' }}>
          <h3 style={{ color: '#ffffff', margin: '0 0 16px 0', fontSize: '18px' }}>Overall Score Summary</h3>
          <div className="score-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div className="score-card" style={{ 
              background: '#2d3748', 
              padding: '20px', 
              borderRadius: '8px', 
              border: '1px solid #4a5568',
              textAlign: 'center',
              transition: 'all 0.3s ease'
            }}>
              <div className="score-label" style={{ color: '#a0aec0', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                OVERALL SCORE
              </div>
              <div className={`score-value ${getScoreColorClass((currentAnalysis?.overallScore || 0) / 2)}`} style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                marginBottom: '4px',
                color: getScoreColorClass((currentAnalysis?.overallScore || 0) / 2) === 'score-excellent' ? '#10b981' :
                       getScoreColorClass((currentAnalysis?.overallScore || 0) / 2) === 'score-good' ? '#f59e0b' :
                       getScoreColorClass((currentAnalysis?.overallScore || 0) / 2) === 'score-fair' ? '#fbbf24' : '#ef4444'
              }}>
                {(parseFloat(currentAnalysis?.overallScore) || 0).toFixed(1)}/6.0
              </div>
              <div className="score-percent" style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '8px' }}>
                {Math.round(((parseFloat(currentAnalysis?.overallScore) || 0) / 6) * 100)}%
              </div>
              <div className="score-rating" style={{ 
                fontWeight: '600', 
                fontSize: '14px',
                color: getRatingColor(currentAnalysis?.overallRating)
              }}>
                {currentAnalysis?.overallRating || 'N/A'}
              </div>
            </div>
            
            <div className="score-card" style={{ 
              background: '#2d3748', 
              padding: '20px', 
              borderRadius: '8px', 
              border: '1px solid #4a5568',
              textAlign: 'center',
              transition: 'all 0.3s ease'
            }}>
              <div className="score-label" style={{ color: '#a0aec0', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                THERMAL OPERATING SCORE
              </div>
              <div className={`score-value ${getScoreColorClass(currentAnalysis?.thermalScore || 0)}`} style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                marginBottom: '4px',
                color: getScoreColorClass(currentAnalysis?.thermalScore || 0) === 'score-excellent' ? '#10b981' :
                       getScoreColorClass(currentAnalysis?.thermalScore || 0) === 'score-good' ? '#f59e0b' :
                       getScoreColorClass(currentAnalysis?.thermalScore || 0) === 'score-fair' ? '#fbbf24' : '#ef4444'
              }}>
                {(parseFloat(currentAnalysis?.thermalScore) || 0).toFixed(2)}/3.0
              </div>
              <div className="score-percent" style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '8px' }}>
                {Math.round(((parseFloat(currentAnalysis?.thermalScore) || 0) / 3) * 100)}%
              </div>
              <div className="score-rating" style={{ fontWeight: '600', fontSize: '14px' }}>
                {getScoreText(parseFloat(currentAnalysis?.thermalScore) || 0)}
              </div>
            </div>
            
            <div className="score-card" style={{ 
              background: '#2d3748', 
              padding: '20px', 
              borderRadius: '8px', 
              border: '1px solid #4a5568',
              textAlign: 'center',
              transition: 'all 0.3s ease'
            }}>
              <div className="score-label" style={{ color: '#a0aec0', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                REDEVELOPMENT
              </div>
              <div className={`score-value ${getScoreColorClass(currentAnalysis?.redevelopmentScore || 0)}`} style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                marginBottom: '4px',
                color: getScoreColorClass(currentAnalysis?.redevelopmentScore || 0) === 'score-excellent' ? '#10b981' :
                       getScoreColorClass(currentAnalysis?.redevelopmentScore || 0) === 'score-good' ? '#f59e0b' :
                       getScoreColorClass(currentAnalysis?.redevelopmentScore || 0) === 'score-fair' ? '#fbbf24' : '#ef4444'
              }}>
                {(parseFloat(currentAnalysis?.redevelopmentScore) || 0).toFixed(2)}/3.0
              </div>
              <div className="score-percent" style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '8px' }}>
                {Math.round(((parseFloat(currentAnalysis?.redevelopmentScore) || 0) / 3) * 100)}%
              </div>
              <div className="score-rating" style={{ fontWeight: '600', fontSize: '14px' }}>
                {getScoreText(parseFloat(currentAnalysis?.redevelopmentScore) || 0)}
              </div>
            </div>
          </div>
        </div>
        
        {/* Expert Analysis Cards */}
        <div className="expert-cards-section" style={{ padding: '20px' }}>
          <h3 style={{ color: '#ffffff', margin: '0 0 8px 0', fontSize: '18px' }}>Expert Analysis Cards</h3>
          <p className="section-subtitle" style={{ color: '#a0aec0', margin: '0 0 20px 0', fontSize: '14px' }}>
            Click info buttons for scoring criteria details
          </p>
          
          <div className="cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <ThermalOperatingCard 
              analysis={currentAnalysis}
              isEditing={isEditing}
              onScoreChange={handleScoreChange}
            />
            
            <RedevelopmentCard 
              analysis={currentAnalysis}
              isEditing={isEditing}
              onScoreChange={handleScoreChange}
              transmissionData={editedTransmissionData}
              onTransmissionFieldChange={handleTransmissionFieldChange}
              onAddTransmission={addNewTransmissionEntry}
              onRemoveTransmission={removeTransmissionEntry}
              getScoreColorClass={getScoreColorClass}
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="action-buttons" style={{ 
          padding: '20px', 
          borderTop: '1px solid #4a5568', 
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '0 0 12px 12px'
        }}>
          {isEditing ? (
            <div className="edit-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                className="action-btn secondary"
                onClick={() => {
                  setIsEditing(false);
                  setEditedAnalysis(null);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#e2e8f0',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
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
                  minWidth: '120px',
                  transition: 'all 0.2s ease'
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
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
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
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
              >
                📄 Generate Report
              </button>
            </div>
          )}
        </div>
        
        {/* CSS Styles with flicker prevention */}
        <style>{`
          /* Key animations */
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes scaleIn {
            from { 
              opacity: 0;
              transform: scale(0.95);
            }
            to { 
              opacity: 1;
              transform: scale(1);
            }
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          .expert-analysis-modal {
            max-width: 1200px;
            width: 95%;
            max-height: 90vh;
            overflow-y: auto;
            background: #1a1a1a;
            color: #e0e0e0;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            animation: scaleIn 0.3s ease;
            transform: translateZ(0);
            will-change: transform, opacity;
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
            animation: fadeIn 0.2s ease;
          }
          
          .modal-content {
            transform: translateZ(0);
            backface-visibility: hidden;
            perspective: 1000px;
          }
          
          /* Prevent layout shifts */
          .analysis-card {
            transform: translateZ(0);
            will-change: transform;
            contain: layout style;
          }
          
          .score-card {
            transform: translateZ(0);
            will-change: transform;
          }
          
          /* Smooth transitions */
          .score-select, .transmission-input, .score-display {
            transition: border-color 0.2s ease, background-color 0.2s ease;
            transform: translateZ(0);
          }
          
          .score-select:focus, .transmission-input:focus {
            outline: none;
            border-color: #63b3ed !important;
            box-shadow: 0 0 0 2px rgba(99, 179, 237, 0.1);
          }
          
          button {
            transition: all 0.2s ease !important;
            transform: translateZ(0);
          }
          
          button:hover:not(:disabled) {
            transform: translateY(-1px);
          }
          
          button:active:not(:disabled) {
            transform: translateY(0);
          }
          
          /* Scrollbar styling */
          .expert-analysis-modal::-webkit-scrollbar {
            width: 10px;
          }
          
          .expert-analysis-modal::-webkit-scrollbar-track {
            background: #1a202c;
            border-radius: 5px;
          }
          
          .expert-analysis-modal::-webkit-scrollbar-thumb {
            background: #4a5568;
            border-radius: 5px;
          }
          
          .expert-analysis-modal::-webkit-scrollbar-thumb:hover {
            background: #63b3ed;
          }
          
          /* Responsive design */
          @media (max-width: 1024px) {
            .cards-container {
              grid-template-columns: 1fr !important;
            }
            
            .score-grid {
              grid-template-columns: 1fr !important;
            }
            
            .expert-analysis-modal {
              width: 98% !important;
              max-height: 95vh !important;
            }
          }
          
          @media (max-width: 768px) {
            .infra-grid {
              grid-template-columns: 1fr !important;
            }
            
            .header-top {
              flex-direction: column !important;
              gap: 12px !important;
            }
            
            .header-right {
              width: 100% !important;
              justify-content: space-between !important;
            }
            
            .edit-actions, .view-actions {
              flex-direction: column !important;
              gap: 8px !important;
            }
            
            button {
              width: 100% !important;
            }
          }
          
          /* Performance optimizations */
          * {
            box-sizing: border-box;
          }
          
          .transmission-table {
            border-collapse: separate;
            border-spacing: 0;
          }
          
          /* Prevent text selection during animations */
          .save-status-overlay * {
            user-select: none;
          }
        `}</style>
      </div>
    </div>
  );
};

export default ExpertAnalysisModal;
