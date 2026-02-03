import React, { useState, useEffect, useRef } from 'react';
//import { expertAnalysisService } from '../services/expertAnalysisService';
import { expertAnalysisService } from '../../services/expertAnalysisService';

const ExpertAnalysisModal = ({ 
  selectedExpertProject, 
  setSelectedExpertProject,
  currentUser = "PowerTrans Team",
  authToken = null
}) => {
  if (!selectedExpertProject) return null;
  
  const projectRef = useRef(selectedExpertProject);
  
  const generateDefaultAnalysis = (project) => {
    console.log('Generating default analysis for project:', project);
    
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
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://pt-power-pipeline-api.azurewebsites.net';
  
  const getAuthToken = () => {
    return authToken || localStorage.getItem('token') || '';
  };

  const fetchExpertAnalysisData = async () => {
    try {
      setIsLoading(true);
      const projectId = selectedExpertProject.id;
      
      if (!projectId) {
        console.log('No project ID available');
        return null;
      }
      
      console.log('🔍 Fetching expert analysis for project ID:', projectId);
      
      try {
        const data = await expertAnalysisService.getExpertAnalysis(projectId);
        console.log('✅ Service returned data:', data);
        
        if (data) {
          console.log('📊 Data found via service:', data);
          return data;
        } else {
          console.log('📭 No expert analysis found via service');
          return null;
        }
      } catch (serviceError) {
        console.error('❌ Service call failed:', serviceError);
        if (serviceError.response?.status === 404) {
          console.log('📭 No expert analysis found in database');
          return null;
        }
        throw serviceError;
      }
      
    } catch (error) {
      console.error('❌ Error fetching expert analysis:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
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
      
      console.log('🔍 Fetching transmission data for project:', projectName);
      
      try {
        const data = await expertAnalysisService.getTransmissionInterconnection(projectName);
        console.log('✅ Transmission service returned:', data);
        
        if (data && Array.isArray(data)) {
          console.log(`📊 Found ${data.length} transmission records via service`);
          return data;
        } else {
          console.log('📭 No transmission data returned via service');
          return [];
        }
      } catch (serviceError) {
        console.error('❌ Transmission service call failed:', serviceError);
        if (serviceError.response?.status === 404) {
          console.log('📭 No transmission data found');
          return [];
        }
        return [];
      }
      
    } catch (error) {
      console.error('❌ Error fetching transmission data:', error);
      return [];
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      console.log('🔄 Initializing expert analysis modal data...');
      console.log('Selected project ID:', selectedExpertProject.id);
      
      const dbAnalysis = await fetchExpertAnalysisData();
      const dbTransmission = await fetchTransmissionData();
      
      console.log('📊 Database analysis:', dbAnalysis);
      console.log('📊 Database transmission:', dbTransmission);
      
      let initialAnalysis = analysisData;
      
      if (dbAnalysis) {
        console.log('✅ Using database analysis data');
        initialAnalysis = {
          ...initialAnalysis,
          ...dbAnalysis,
          thermalBreakdown: dbAnalysis.thermalBreakdown || initialAnalysis.thermalBreakdown || {
            thermal_optimization: { score: 1 },
            environmental: { score: 2 }
          },
          redevelopmentBreakdown: dbAnalysis.redevelopmentBreakdown || initialAnalysis.redevelopmentBreakdown || {
            redev_market: { score: 2 },
            land_availability: { score: 2 },
            utilities: { score: 2 },
            interconnection: { score: 2 }
          }
        };
      } else {
        console.log('📭 No database analysis found, using default');
      }
      
      setEditedAnalysis(initialAnalysis);
      setAnalysisData(initialAnalysis);
      setEditedTransmissionData(dbTransmission || []);
      console.log('✅ Initial analysis set:', initialAnalysis);
    };
    
    if (selectedExpertProject) {
      initializeData();
    }
  }, [selectedExpertProject]);

  const recalculateScores = (analysisData) => {
    console.log('Recalculating scores for:', analysisData);
    
    const thermalBreakdown = analysisData.thermalBreakdown || {};
    const redevBreakdown = analysisData.redevelopmentBreakdown || {};
    
    const getSafeScore = (breakdown, key, defaultValue = 0) => {
      const value = breakdown[key]?.score;
      if (value === undefined || value === null) return defaultValue;
      const num = parseInt(value);
      return isNaN(num) ? defaultValue : num;
    };
    
    let thermalScore = 0;
    thermalScore += getSafeScore(thermalBreakdown, 'thermal_optimization', 1) * 0.05;
    thermalScore += getSafeScore(thermalBreakdown, 'environmental', 2) * 0.15;
    
    let redevelopmentScore = 0;
    redevelopmentScore += getSafeScore(redevBreakdown, 'redev_market', 2) * 0.40;
    
    const landScore = getSafeScore(redevBreakdown, 'land_availability', 2);
    const utilitiesScore = getSafeScore(redevBreakdown, 'utilities', 2);
    const infrastructureScore = (landScore + utilitiesScore) / 2;
    redevelopmentScore += infrastructureScore * 0.30;
    
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

  const handleSave = async () => {
    console.log('💾 Save button clicked');
    setSaveStatus('saving');
    
    try {
      const currentAnalysisToSave = editedAnalysis || analysisData;
      
      if (!currentAnalysisToSave) {
        throw new Error('No analysis data to save');
      }
      
      const updatedAnalysis = recalculateScores(currentAnalysisToSave);
      console.log('📝 Updated analysis to save:', updatedAnalysis);
      
      const saveData = {
        projectId: selectedExpertProject.id,
        projectName: updatedAnalysis.projectName,
        overallScore: parseFloat(updatedAnalysis.overallScore) || 0,
        overallRating: updatedAnalysis.overallRating || 'Moderate',
        confidence: updatedAnalysis.confidence || 75,
        thermalScore: parseFloat(updatedAnalysis.thermalScore) || 0,
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
        editedBy: currentUser
      };
      
      console.log('📤 Saving data via service:', saveData);
      
      try {
        const savedData = await expertAnalysisService.saveExpertAnalysis(saveData);
        console.log('✅ Save via service successful:', savedData);
        
        setAnalysisData(updatedAnalysis);
        setEditedAnalysis(updatedAnalysis);
        setIsEditing(false);
        setSaveStatus('success');
        
        const freshData = await fetchExpertAnalysisData();
        if (freshData) {
          setAnalysisData(freshData);
          setEditedAnalysis(freshData);
        }
        
        setTimeout(() => {
          setSaveStatus(null);
          alert('✅ Changes saved successfully!');
        }, 500);
        
      } catch (serviceError) {
        console.error('❌ Save via service failed:', serviceError);
        if (serviceError.response?.status === 404) {
          throw new Error('Save failed: The expert analysis API endpoint was not found (404). Please check if the backend API is deployed correctly.');
        } else if (serviceError.response?.status === 401 || serviceError.response?.status === 403) {
          throw new Error('Save failed: Authentication error. Please check your login credentials.');
        } else {
          throw new Error(`Save failed: ${serviceError.message}`);
        }
      }
      
      if (editedTransmissionData.length > 0) {
        try {
          await expertAnalysisService.saveTransmissionInterconnection(
            selectedExpertProject.id, 
            editedTransmissionData
          );
          console.log('✅ Transmission data saved via service');
        } catch (transmissionError) {
          console.error('⚠️ Failed to save transmission data:', transmissionError);
        }
      }
      
    } catch (error) {
      console.error('❌ Save error:', error);
      setSaveStatus('error');
      alert(`❌ Error saving changes: ${error.message}`);
    }
  };

  const getScoreColorClass = (score) => {
    const numScore = parseFloat(score) || 0;
    if (numScore >= 2.5) return 'score-excellent';
    if (numScore >= 1.5) return 'score-good';
    if (numScore >= 0.5) return 'score-fair';
    return 'score-poor';
  };

  const getScoreText = (score) => {
    const numScore = parseFloat(score) || 0;
    if (numScore >= 2.5) return 'EXCELLENT';
    if (numScore >= 1.5) return 'GOOD';
    if (numScore >= 0.5) return 'FAIR';
    return 'POOR';
  };

  const getRatingColor = (rating) => {
    switch(rating?.toLowerCase()) {
      case 'strong': return '#10b981';
      case 'moderate': return '#f59e0b';
      case 'weak': return '#ef4444';
      default: return '#6b7280';
    }
  };

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
    
    const recalculated = recalculateScores(updated);
    setEditedAnalysis(recalculated);
    console.log('Updated analysis after score change:', recalculated);
  };

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

  const removeTransmissionEntry = (index) => {
    if (!isEditing) return;
    
    setEditedTransmissionData(prev => {
      const newData = [...prev];
      newData.splice(index, 1);
      return newData;
    });
  };

  const currentAnalysis = editedAnalysis || analysisData;
  
  console.log('Current analysis data for rendering:', currentAnalysis);
  
  const thermalScore = parseFloat(currentAnalysis?.thermalScore) || 0;
  const redevScore = parseFloat(currentAnalysis?.redevelopmentScore) || 0;
  const overallScore = parseFloat(currentAnalysis?.overallScore) || 0;
  
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
    <div className="modal-overlay" onClick={() => !isEditing && setSelectedExpertProject(null)}>
      <div className="modal-content expert-analysis-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-top">
            <h2>{currentAnalysis?.projectName || 'Project'} - Expert Analysis</h2>
            <button className="close-btn" onClick={() => setSelectedExpertProject(null)}>×</button>
          </div>
          <p className="subtitle">AI-powered assessment of all pipeline projects</p>
          
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
                  setEditedAnalysis(null);
                }}>
                  Cancel Edit
                </button>
              </div>
            )}
          </div>
        </div>
        
        {saveStatus && (
          <div className={`save-status ${saveStatus}`}>
            {saveStatus === 'saving' && 'Saving changes...'}
            {saveStatus === 'success' && '✓ Changes saved successfully!'}
            {saveStatus === 'error' && '✗ Failed to save changes'}
          </div>
        )}
        
        <div className="overall-score-section">
          <h3>Overall Score Summary</h3>
          <div className="score-grid">
            <div className="score-card">
              <div className="score-label">OVERALL SCORE</div>
              <div className={`score-value ${getScoreColorClass(overallScore / 2)}`}>
                {overallScore.toFixed(1)}/6.0
              </div>
              <div className="score-percent">{Math.round((overallScore / 6) * 100)}%</div>
              <div className="score-rating" style={{ color: getRatingColor(currentAnalysis?.overallRating) }}>
                {currentAnalysis?.overallRating || 'N/A'}
              </div>
            </div>
            
            <div className="score-card">
              <div className="score-label">THERMAL OPERATING SCORE</div>
              <div className={`score-value ${getScoreColorClass(thermalScore)}`}>
                {thermalScore.toFixed(2)}/3.0
              </div>
              <div className="score-percent">{Math.round((thermalScore / 3) * 100)}%</div>
              <div className="score-rating">{getScoreText(thermalScore)}</div>
            </div>
            
            <div className="score-card">
              <div className="score-label">REDEVELOPMENT</div>
              <div className={`score-value ${getScoreColorClass(redevScore)}`}>
                {redevScore.toFixed(2)}/3.0
              </div>
              <div className="score-percent">{Math.round((redevScore / 3) * 100)}%</div>
              <div className="score-rating">{getScoreText(redevScore)}</div>
            </div>
          </div>
        </div>
        
        <div className="expert-cards-section">
          <h3>Expert Analysis Cards</h3>
          <p className="section-subtitle">Click info buttons for scoring criteria details</p>
          
          <div className="cards-container">
            <div className="analysis-card">
              <div className="card-header">
                <h4>Thermal Operating Assessment</h4>
                <p className="card-subtitle">Evaluation of existing plant operations and market position</p>
                <span className="card-weight">Weight: 50%</span>
              </div>
              
              <div className="card-body">
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
                      >
                        <option value="1">1 - No identifiable value add</option>
                        <option value="2">2 - Readily apparent value add</option>
                      </select>
                    ) : (
                      <div className="score-display">
                        Score: {currentAnalysis?.thermalBreakdown?.thermal_optimization?.score || 1}
                      </div>
                    )}
                    <div className="field-details">
                      <span className="weight">Weight: 5%</span>
                      <span className="contribution">
                        Contribution: {(((currentAnalysis?.thermalBreakdown?.thermal_optimization?.score || 1) * 0.05).toFixed(2))}
                      </span>
                    </div>
                  </div>
                </div>
                
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
                      >
                        <option value="0">0 - Known and not mitigable</option>
                        <option value="1">1 - Not known</option>
                        <option value="2">2 - Known, mitigable, no cost advantage</option>
                        <option value="3">3 - Known, mitigable, PT has cost advantage</option>
                      </select>
                    ) : (
                      <div className="score-display">
                        Score: {currentAnalysis?.thermalBreakdown?.environmental?.score || 2}
                      </div>
                    )}
                    <div className="field-details">
                      <span className="weight">Weight: 15%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="analysis-card">
              <div className="card-header">
                <h4>Redevelopment Assessment</h4>
                <p className="card-subtitle">Evaluation of future development potential and infrastructure</p>
                <span className="card-weight">Weight: 50%</span>
              </div>
              
              <div className="card-body">
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
                      >
                        <option value="0">0 - Challenging</option>
                        <option value="1">1 - Uncertain</option>
                        <option value="2">2 - Secondary</option>
                        <option value="3">3 - Primary</option>
                      </select>
                    ) : (
                      <div className="score-display">
                        Score: {currentAnalysis?.redevelopmentBreakdown?.redev_market?.score || 2}
                      </div>
                    )}
                    <div className="field-details">
                      <span className="weight">Weight: 40%</span>
                      <span className="contribution">
                        Contribution: {(((currentAnalysis?.redevelopmentBreakdown?.redev_market?.score || 2) * 0.40).toFixed(2))}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="infrastructure-section">
                  <h5>Infrastructure</h5>
                  <div className="infra-grid">
                    <div className="infra-field">
                      <label>Land Availability</label>
                      {isEditing ? (
                        <select 
                          className="score-select"
                          value={currentAnalysis?.redevelopmentBreakdown?.land_availability?.score || 2}
                          onChange={(e) => handleScoreChange('redevelopment', 'land_availability', e.target.value)}
                        >
                          <option value="0">0 - No land available</option>
                          <option value="1">1 - No onsite, available nearby</option>
                          <option value="2">2 - Some onsite + nearby parcel</option>
                          <option value="3">3 - Sufficient land onsite</option>
                        </select>
                      ) : (
                        <div className="score-display">
                          Score: {currentAnalysis?.redevelopmentBreakdown?.land_availability?.score || 2}
                        </div>
                      )}
                    </div>
                    <div className="infra-field">
                      <label>Utilities</label>
                      {isEditing ? (
                        <select 
                          className="score-select"
                          value={currentAnalysis?.redevelopmentBreakdown?.utilities?.score || 2}
                          onChange={(e) => handleScoreChange('redevelopment', 'utilities', e.target.value)}
                        >
                          <option value="-1">-1 - N/A - BESS and Solar</option>
                          <option value="0">0 - No clear path</option>
                          <option value="1">1 - Utilities available but expensive</option>
                          <option value="2">2 - Utilities nearby, low cost</option>
                          <option value="3">3 - Sufficient utilities onsite</option>
                        </select>
                      ) : (
                        <div className="score-display">
                          Score: {currentAnalysis?.redevelopmentBreakdown?.utilities?.score || 2}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="infra-total">
                    <span>Infrastructure Score:</span>
                    <span className={`infra-value ${getScoreColorClass(currentAnalysis?.infrastructureScore || 0)}`}>
                      {(parseFloat(currentAnalysis?.infrastructureScore) || 0).toFixed(2)}/3.0
                    </span>
                  </div>
                </div>
                
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
                      >
                        <option value="0">0 - Major upgrades needed</option>
                        <option value="1">1 - Minimal upgrades needed</option>
                        <option value="2">2 - No upgrades needed (Unsecured)</option>
                        <option value="3">3 - Secured IX Rights</option>
                      </select>
                    ) : (
                      <div className="score-display">
                        Score: {currentAnalysis?.redevelopmentBreakdown?.interconnection?.score || 2}
                      </div>
                    )}
                    <div className="field-details">
                      <span className="weight">Weight: 30%</span>
                    </div>
                  </div>
                </div>
                
                <div className="transmission-section">
                  <div className="transmission-header">
                    <h5>Transmission Interconnection Details</h5>
                    {editedTransmissionData.length > 0 && (
                      <span className="capacity-badge">
                        <span className="badge-dot">●</span> Excess IX Capacity Available
                      </span>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="transmission-edit">
                      <div className="transmission-table-container">
                        <table className="transmission-table">
                          <thead>
                            <tr>
                              <th style={{ width: '25%' }}>POI Voltage</th>
                              <th style={{ width: '25%' }}>Excess Injection Capacity (MW)</th>
                              <th style={{ width: '25%' }}>Excess Withdrawal Capacity (MW)</th>
                              <th style={{ width: '15%' }}>Constraints</th>
                              <th style={{ width: '10%' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {editedTransmissionData.length > 0 ? (
                              editedTransmissionData.map((item, index) => (
                                <tr key={index}>
                                  <td>
                                    <input
                                      type="text"
                                      className="transmission-input"
                                      value={item.poiVoltage || ''}
                                      onChange={(e) => handleTransmissionFieldChange(index, 'poiVoltage', e.target.value)}
                                      placeholder="e.g., 69 kV"
                                      style={{ width: '100%', padding: '10px 12px', fontSize: '14px' }}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      className="transmission-input"
                                      value={item.excessInjectionCapacity || 0}
                                      onChange={(e) => handleTransmissionFieldChange(index, 'excessInjectionCapacity', e.target.value)}
                                      placeholder="0.0"
                                      step="0.1"
                                      min="0"
                                      style={{ width: '100%', padding: '10px 12px', fontSize: '14px' }}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      className="transmission-input"
                                      value={item.excessWithdrawalCapacity || 0}
                                      onChange={(e) => handleTransmissionFieldChange(index, 'excessWithdrawalCapacity', e.target.value)}
                                      placeholder="0.0"
                                      step="0.1"
                                      min="0"
                                      style={{ width: '100%', padding: '10px 12px', fontSize: '14px' }}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="transmission-input"
                                      value={item.constraints || '-'}
                                      onChange={(e) => handleTransmissionFieldChange(index, 'constraints', e.target.value)}
                                      placeholder="e.g., None, 1, 2"
                                      style={{ width: '100%', padding: '10px 12px', fontSize: '14px' }}
                                    />
                                  </td>
                                  <td>
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
                        <div className="transmission-table-container">
                          <table className="transmission-table">
                            <thead>
                              <tr>
                                <th style={{ width: '30%' }}>POI Voltage</th>
                                <th style={{ width: '30%' }}>Excess Injection Capacity</th>
                                <th style={{ width: '30%' }}>Excess Withdrawal Capacity</th>
                                <th style={{ width: '20%' }}>Constraints</th>
                              </tr>
                            </thead>
                            <tbody>
                              {editedTransmissionData.map((item, index) => (
                                <tr key={index}>
                                  <td>{item.poiVoltage || ''}</td>
                                  <td>{parseFloat(item.excessInjectionCapacity || 0).toFixed(1)} MW</td>
                                  <td>{parseFloat(item.excessWithdrawalCapacity || 0).toFixed(1)} MW</td>
                                  <td>{item.constraints === "-" ? "None" : item.constraints || 'None'}</td>
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
        
        <div className="action-buttons">
          {isEditing ? (
            <div className="edit-actions">
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
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
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
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div className="view-actions">
              <button 
                className="action-btn secondary"
                onClick={() => setSelectedExpertProject(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#e2e8f0',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Back to Scores
              </button>
              <button 
                className="action-btn primary"
                onClick={() => alert('Report generation would be implemented here')}
                style={{
                  background: 'rgba(59, 130, 246, 0.9)',
                  border: '1px solid rgba(59, 130, 246, 0.9)',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Generate Report
              </button>
            </div>
          )}
        </div>
        
        {/* CSS Styles (same as before) */}
        <style>{`
          .expert-analysis-modal { max-width: 1200px; width: 95%; max-height: 90vh; overflow-y: auto; background: #1a1a1a; color: #e0e0e0; border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
          .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; }
          .modal-header { padding: 20px; background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%); border-bottom: 1px solid #4a5568; border-radius: 12px 12px 0 0; }
          .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
          h2 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; }
          .subtitle { color: #a0aec0; margin: 0 0 16px 0; font-size: 14px; }
          .edit-toggle { display: flex; align-items: center; gap: 12px; }
          .edit-btn { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: #93c5fd; padding: 8px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
          .edit-btn:hover { background: rgba(59, 130, 246, 0.2); }
          .edit-badge { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #fbbf24; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
          .cancel-btn { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
          .close-btn { background: none; border: none; color: #a0aec0; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
          .save-status { padding: 12px 20px; margin: 0 20px; border-radius: 6px; font-weight: 500; }
          .save-status.saving { background: rgba(59, 130, 246, 0.1); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.3); }
          .save-status.success { background: rgba(34, 197, 94, 0.1); color: #86efac; border: 1px solid rgba(34, 197, 94, 0.3); }
          .save-status.error { background: rgba(239, 68, 68, 0.1); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.3); }
          .overall-score-section { padding: 20px; border-bottom: 1px solid #4a5568; }
          h3 { color: #ffffff; margin: 0 0 16px 0; font-size: 18px; }
          .score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
          @media (max-width: 768px) { .score-grid { grid-template-columns: 1fr; } }
          .score-card { background: #2d3748; padding: 16px; border-radius: 8px; border: 1px solid #4a5568; text-align: center; }
          .score-label { color: #a0aec0; font-size: 12px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
          .score-value { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
          .score-excellent { color: #10b981; } .score-good { color: #f59e0b; } .score-fair { color: #fbbf24; } .score-poor { color: #ef4444; }
          .score-percent { color: #a0aec0; font-size: 14px; margin-bottom: 8px; }
          .score-rating { font-weight: 600; font-size: 14px; }
          .expert-cards-section { padding: 20px; }
          .section-subtitle { color: #a0aec0; margin: 0 0 20px 0; font-size: 14px; }
          .cards-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
          @media (max-width: 1024px) { .cards-container { grid-template-columns: 1fr; } }
          .analysis-card { background: #2d3748; border: 1px solid #4a5568; border-radius: 8px; overflow: hidden; }
          .card-header { padding: 16px; background: rgba(0, 0, 0, 0.2); border-bottom: 1px solid #4a5568; }
          h4 { margin: 0 0 4px 0; color: #ffffff; font-size: 16px; }
          .card-subtitle { color: #a0aec0; font-size: 13px; margin: 0 0 8px 0; }
          .card-weight { display: inline-block; background: rgba(59, 130, 246, 0.1); color: #93c5fd; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
          .card-body { padding: 16px; }
          .score-field-group { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #4a5568; }
          .score-field-group:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
          .field-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
          .field-icon { background: #4a5568; color: #e2e8f0; width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
          h5 { margin: 0; color: #e2e8f0; font-size: 14px; font-weight: 600; }
          .score-select { width: 100%; padding: 10px 12px; background: #1a202c; border: 1px solid #4a5568; border-radius: 6px; color: #e2e8f0; font-size: 14px; margin-bottom: 8px; }
          .score-select:focus { outline: none; border-color: #63b3ed; box-shadow: 0 0 0 3px rgba(99, 179, 237, 0.1); }
          .score-display { background: #1a202c; border: 1px solid #4a5568; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; color: #e2e8f0; font-weight: 500; }
          .field-details { display: flex; justify-content: space-between; font-size: 12px; color: #a0aec0; }
          .infrastructure-section { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #4a5568; }
          .infra-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 12px; }
          .infra-field label { display: block; color: #a0aec0; font-size: 12px; margin-bottom: 6px; font-weight: 500; }
          .infra-total { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #4a5568; font-weight: 500; }
          .infra-value { font-weight: 600; }
          .transmission-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid #4a5568; }
          .transmission-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
          .capacity-badge { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); color: #86efac; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
          .badge-dot { color: #22c55e; font-size: 16px; }
          .transmission-table-container { overflow-x: auto; margin-bottom: 16px; }
          .transmission-table { width: 100%; border-collapse: collapse; font-size: 14px; }
          .transmission-table th { background: #1a202c; color: #a0aec0; font-weight: 600; text-align: left; padding: 12px; border-bottom: 2px solid #4a5568; }
          .transmission-table td { padding: 12px; border-bottom: 1px solid #4a5568; color: #e2e8f0; }
          .transmission-table tr:hover { background: rgba(255, 255, 255, 0.05); }
          .transmission-input { width: 100%; padding: 10px 12px; background: #1a202c; border: 1px solid #4a5568; border-radius: 6px; color: #e2e8f0; font-size: 14px; }
          .transmission-input:focus { outline: none; border-color: #63b3ed; box-shadow: 0 0 0 3px rgba(99, 179, 237, 0.1); }
          .action-buttons { padding: 20px; border-top: 1px solid #4a5568; background: rgba(0, 0, 0, 0.2); border-radius: 0 0 12px 12px; }
          .edit-actions, .view-actions { display: flex; justify-content: flex-end; gap: 12px; }
          .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          .edit-mode-indicator { display: flex; align-items: center; gap: 12px; }
          .loading-spinner { padding: 40px; text-align: center; color: #a0aec0; }
        `}</style>
      </div>
    </div>
  );
};

export default ExpertAnalysisModal;
