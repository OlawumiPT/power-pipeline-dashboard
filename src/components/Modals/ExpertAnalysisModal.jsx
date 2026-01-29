import React, { useState, useEffect } from 'react';

const ExpertAnalysisModal = ({ 
  selectedExpertProject, 
  setSelectedExpertProject,
  currentUser = "PowerTrans Team"
}) => {
  if (!selectedExpertProject || !selectedExpertProject.expertAnalysis) return null;
  
  const originalAnalysis = selectedExpertProject.expertAnalysis;
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [editedTransmissionData, setEditedTransmissionData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // API Base URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  
  // Fetch expert analysis from API
  const fetchExpertAnalysis = async () => {
    try {
      setIsLoading(true);
      const projectId = selectedExpertProject.id;
      const projectName = selectedExpertProject?.expertAnalysis?.projectName || "";
      
      // Try to fetch from database
      const response = await fetch(
        `${API_BASE_URL}/api/expert-analysis?projectId=${encodeURIComponent(projectId)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data;
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
      const projectName = selectedExpertProject?.expertAnalysis?.projectName || "";
      const response = await fetch(
        `${API_BASE_URL}/api/transmission-interconnection?project=${encodeURIComponent(projectName)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data;
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
      // Get saved data from localStorage first
      const savedEdits = getSavedEdits(selectedExpertProject.id);
      
      if (savedEdits) {
        setEditedAnalysis(savedEdits);
        setEditedTransmissionData(savedEdits.transmissionData || []);
      } else {
        // Try to fetch from database
        const dbAnalysis = await fetchExpertAnalysis();
        const dbTransmission = await fetchTransmissionData();
        
        if (dbAnalysis) {
          setEditedAnalysis({
            ...originalAnalysis,
            ...dbAnalysis,
            thermalBreakdown: dbAnalysis.thermal_breakdown || originalAnalysis.thermalBreakdown,
            redevelopmentBreakdown: dbAnalysis.redevelopment_breakdown || originalAnalysis.redevelopmentBreakdown
          });
        } else {
          // Use default if no database record
          const defaultScores = {
            ...originalAnalysis,
            thermalBreakdown: originalAnalysis.thermalBreakdown || {
              unit_cod: { score: 2, analysis: "Vintage plant (<2000) - higher retirement potential" },
              markets: { score: 2, analysis: "Premium market with strong pricing" },
              transactability: { score: 2, analysis: "Unknown transactability" },
              thermal_optimization: { score: 1, analysis: "No identifiable value add" },
              environmental: { score: 2, analysis: "Standard environmental assessment" }
            },
            redevelopmentBreakdown: originalAnalysis.redevelopmentBreakdown || {
              redev_market: { score: 2, analysis: "Market position assessment" },
              land_availability: { score: 2, analysis: "Land availability assessment" },
              utilities: { score: 2, analysis: "Utilities connectivity" },
              interconnection: { score: 2, analysis: "Interconnection status" }
            }
          };
          setEditedAnalysis(defaultScores);
        }
        
        setEditedTransmissionData(dbTransmission);
      }
    };
    
    initializeData();
  }, [selectedExpertProject]);

  // Get saved edits from localStorage
  const getSavedEdits = (projectId) => {
    try {
      const allEdits = JSON.parse(localStorage.getItem('projectEdits') || '{}');
      return allEdits[projectId] || null;
    } catch (error) {
      console.error('Error reading edits:', error);
      return null;
    }
  };

  // Save to localStorage
  const saveToLocalStorage = (analysis, transmissionData) => {
    try {
      const allEdits = JSON.parse(localStorage.getItem('projectEdits') || '{}');
      const projectId = selectedExpertProject.id;
      
      const editRecord = {
        ...analysis,
        transmissionData,
        editedAt: new Date().toISOString(),
        editedBy: currentUser,
        originalScores: {
          overall: originalAnalysis.overallScore,
          thermal: originalAnalysis.thermalScore,
          redevelopment: originalAnalysis.redevelopmentScore
        }
      };
      
      allEdits[projectId] = editRecord;
      localStorage.setItem('projectEdits', JSON.stringify(allEdits));
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  };

  // Save to database
  const saveToDatabase = async (analysis, transmissionData) => {
    try {
      const projectId = selectedExpertProject.id;
      const projectName = analysis.projectName;
      
      // Save expert analysis
      const analysisResponse = await fetch(`${API_BASE_URL}/api/expert-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectName,
          overallScore: analysis.overallScore,
          overallRating: analysis.overallRating,
          confidence: analysis.confidence,
          thermalScore: analysis.thermalScore,
          thermalBreakdown: analysis.thermalBreakdown,
          redevelopmentScore: analysis.redevelopmentScore,
          redevelopmentBreakdown: analysis.redevelopmentBreakdown,
          infrastructureScore: analysis.infrastructureScore,
          editedBy: currentUser
        })
      });
      
      if (!analysisResponse.ok) {
        throw new Error('Failed to save expert analysis');
      }
      
      // Save transmission data
      const transmissionResponse = await fetch(`${API_BASE_URL}/api/transmission-interconnection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          transmissionData
        })
      });
      
      if (!transmissionResponse.ok) {
        throw new Error('Failed to save transmission data');
      }
      
      return true;
    } catch (error) {
      console.error('Error saving to database:', error);
      return false;
    }
  };

  // Handle save
  const handleSave = async (saveType) => {
    setSaveStatus('saving');
    
    try {
      if (saveType === 'cancel') {
        setIsEditing(false);
        setSaveStatus(null);
        return;
      }
      
      // Recalculate scores before saving
      const updatedAnalysis = recalculateScores(editedAnalysis);
      
      // Save to localStorage
      const localStorageSuccess = saveToLocalStorage(updatedAnalysis, editedTransmissionData);
      
      // Save to database if requested
      let dbSuccess = true;
      if (saveType === 'save-db') {
        dbSuccess = await saveToDatabase(updatedAnalysis, editedTransmissionData);
      }
      
      if (localStorageSuccess && dbSuccess) {
        setEditedAnalysis(updatedAnalysis);
        setIsEditing(false);
        setSaveStatus('success');
        
        setTimeout(() => {
          setSaveStatus(null);
          if (saveType === 'save-db') {
            alert('Changes saved to database.');
          } else {
            alert('Changes saved locally.');
          }
        }, 500);
      } else {
        setSaveStatus('error');
        alert('Failed to save changes.');
      }
      
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      alert('Error saving changes.');
    }
  };

  // Recalculate scores function
  const recalculateScores = (analysisData) => {
    // Your existing recalculateScores logic here
    // This is a simplified version - add your full logic
    
    const thermalBreakdown = analysisData.thermalBreakdown || {};
    const redevBreakdown = analysisData.redevelopmentBreakdown || {};
    
    // Calculate thermal score
    let thermalScore = 0;
    if (thermalBreakdown.thermal_optimization) thermalScore += thermalBreakdown.thermal_optimization.score * 0.05;
    if (thermalBreakdown.environmental) thermalScore += thermalBreakdown.environmental.score * 0.15;
    
    // Calculate redevelopment score
    let redevelopmentScore = 0;
    if (redevBreakdown.redev_market) redevelopmentScore += redevBreakdown.redev_market.score * 0.40;
    
    // Infrastructure score (average of land and utilities)
    const landScore = redevBreakdown.land_availability?.score || 0;
    const utilitiesScore = redevBreakdown.utilities?.score || 0;
    const infrastructureScore = (landScore + utilitiesScore) / 2;
    redevelopmentScore += infrastructureScore * 0.30;
    
    // Interconnection
    if (redevBreakdown.interconnection) redevelopmentScore += redevBreakdown.interconnection.score * 0.30;
    
    const overallScore = (thermalScore + redevelopmentScore) * 2;
    
    return {
      ...analysisData,
      thermalScore: thermalScore.toFixed(2),
      redevelopmentScore: redevelopmentScore.toFixed(2),
      overallScore: overallScore.toFixed(2),
      infrastructureScore: infrastructureScore.toFixed(2),
      overallRating: overallScore >= 4.5 ? 'Strong' : overallScore >= 3.0 ? 'Moderate' : 'Weak',
      confidence: overallScore >= 4.5 ? 85 : overallScore >= 3.0 ? 75 : 60
    };
  };

  // ========== MISSING FUNCTION - ADD THIS ==========
  // Get score color class
  const getScoreColorClass = (score) => {
    const numScore = parseFloat(score) || 0;
    if (numScore >= 2.5) return 'score-excellent';
    if (numScore >= 1.5) return 'score-good';
    if (numScore >= 0.5) return 'score-fair';
    return 'score-poor';
  };

  // ========== MISSING FUNCTION - ADD THIS ==========
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
    if (!isEditing || !editedAnalysis) return;
    
    setEditedAnalysis(prev => {
      const updated = { ...prev };
      
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
      
      return recalculateScores(updated);
    });
  };

  // Handle transmission data field change
  const handleTransmissionFieldChange = (index, field, value) => {
    if (!isEditing) return;
    
    setEditedTransmissionData(prev => {
      const newData = [...prev];
      if (newData[index]) {
        newData[index] = {
          ...newData[index],
          [field]: field === 'excessInjectionCapacity' || field === 'excessWithdrawalCapacity' 
            ? parseFloat(value) || 0 
            : value
        };
      }
      return newData;
    });
  };

  // Add new POI voltage entry
  const addNewTransmissionEntry = () => {
    if (!isEditing) return;
    
    const projectName = selectedExpertProject?.expertAnalysis?.projectName || "";
    
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

  // Card Components
  const ScoringCard = ({ title, subtitle, children, weight }) => (
    <div className="scoring-card dark-card">
      <div className="scoring-card-header">
        <div className="scoring-card-title-section">
          <h4 className="scoring-card-title">{title}</h4>
          {subtitle && <div className="scoring-card-subtitle">{subtitle}</div>}
        </div>
        <div className="scoring-card-header-right">
          <span className="scoring-card-weight dark-weight">{weight}</span>
        </div>
      </div>
      <div className="scoring-card-body">
        {children}
      </div>
    </div>
  );

  const ScoreField = ({ label, category, component, currentScore }) => {
    const criteria = {
      thermal_optimization: { weightText: "5%" },
      environmental: { weightText: "15%" },
      redev_market: { weightText: "40%" },
      land_availability: { weightText: "15%" },
      utilities: { weightText: "15%" },
      interconnection: { weightText: "30%" }
    }[component] || { weightText: "0%" };
    
    return (
      <div className="score-field dark-field">
        <div className="score-field-header">
          <label className="score-field-label dark-label">{label}</label>
        </div>
        
        <div className="score-field-content dark-field-content">
          {isEditing ? (
            <select
              className="score-dropdown dark-dropdown"
              value={currentScore}
              onChange={(e) => handleScoreChange(category, component, e.target.value)}
            >
              <option value="1">1 - Low</option>
              <option value="2">2 - Medium</option>
              <option value="3">3 - High</option>
            </select>
          ) : (
            <div className="score-display dark-score-display">
              Score: {currentScore}
            </div>
          )}
          
          <div className="score-field-details dark-details">
            <span className="score-weight dark-detail">Weight: {criteria.weightText}</span>
          </div>
        </div>
      </div>
    );
  };

  // Transmission Data Component
  const TransmissionDataDisplay = () => {
    const hasTransmissionData = editedTransmissionData.length > 0;
    const projectName = selectedExpertProject?.expertAnalysis?.projectName || "";
    
    return (
      <div className="transmission-data-section">
        <div className="transmission-header">
          <h5 className="transmission-title">Transmission Interconnection Details</h5>
          {hasTransmissionData && (
            <span className="excess-capacity-badge">
              ● Excess IX Capacity Available
            </span>
          )}
        </div>
        
        {isLoading ? (
          <div className="loading-transmission-data">
            Loading transmission data...
          </div>
        ) : isEditing ? (
          <>
            <div className="transmission-table-container">
              <table className="transmission-table">
                <thead>
                  <tr>
                    <th>POI Voltage</th>
                    <th>Excess Injection Capacity (MW)</th>
                    <th>Excess Withdrawal Capacity (MW)</th>
                    <th>Constraints</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editedTransmissionData.length > 0 ? (
                    editedTransmissionData.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="text"
                            value={item.poiVoltage}
                            onChange={(e) => handleTransmissionFieldChange(index, 'poiVoltage', e.target.value)}
                            placeholder="e.g., 69 kV"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.excessInjectionCapacity}
                            onChange={(e) => handleTransmissionFieldChange(index, 'excessInjectionCapacity', e.target.value)}
                            placeholder="0.0"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.excessWithdrawalCapacity}
                            onChange={(e) => handleTransmissionFieldChange(index, 'excessWithdrawalCapacity', e.target.value)}
                            placeholder="0.0"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.constraints}
                            onChange={(e) => handleTransmissionFieldChange(index, 'constraints', e.target.value)}
                          />
                        </td>
                        <td>
                          <button onClick={() => removeTransmissionEntry(index)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5">
                        No transmission data available. Click "Add POI Voltage" to add new entries.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="transmission-actions">
              <button onClick={addNewTransmissionEntry}>
                + Add POI Voltage
              </button>
            </div>
          </>
        ) : (
          <>
            {hasTransmissionData ? (
              <div className="transmission-table-container">
                <table className="transmission-table">
                  <thead>
                    <tr>
                      <th>POI Voltage</th>
                      <th>Excess Injection Capacity</th>
                      <th>Excess Withdrawal Capacity</th>
                      <th>Constraints</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedTransmissionData.map((item, index) => (
                      <tr key={index}>
                        <td>{item.poiVoltage}</td>
                        <td>{item.excessInjectionCapacity.toFixed(1)} MW</td>
                        <td>{item.excessWithdrawalCapacity.toFixed(1)} MW</td>
                        <td>{item.constraints === "-" ? "None" : item.constraints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-transmission-data">
                No transmission interconnection data available for {projectName}.
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Calculate scores
  const thermalScore = parseFloat(editedAnalysis?.thermalScore) || 0;
  const redevScore = parseFloat(editedAnalysis?.redevelopmentScore) || 0;
  const overallScore = parseFloat(editedAnalysis?.overallScore) || 0;
  
  return (
    <div className="modal-overlay" onClick={() => !isEditing && setSelectedExpertProject(null)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editedAnalysis?.projectName || 'Project'} - Expert Details</h2>
          <p>AI-powered assessment of all pipeline projects</p>
          <div className="edit-toggle-section">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)}>
                ✏️ Enable Editing
              </button>
            ) : (
              <div>
                <span>EDIT MODE</span>
                <button onClick={() => handleSave('cancel')}>
                  Cancel Edit
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-body">
          {saveStatus && (
            <div className={`save-status ${saveStatus}`}>
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'success' && '✓ Saved!'}
              {saveStatus === 'error' && '✗ Error'}
            </div>
          )}
          
          <div className="overall-score-section">
            <h2>Overall Score Summary</h2>
            <div className="score-summary-grid">
              <div className="score-summary-card">
                <div>Overall Score</div>
                <div className={getScoreColorClass(overallScore / 2)}>
                  {overallScore}/6.0
                </div>
                <div>{Math.round((overallScore / 6) * 100)}%</div>
                <div style={{ color: getRatingColor(editedAnalysis?.overallRating) }}>
                  {editedAnalysis?.overallRating || 'N/A'}
                </div>
              </div>
              <div className="score-summary-card">
                <div>Thermal Operating Score</div>
                <div className={getScoreColorClass(thermalScore)}>
                  {thermalScore.toFixed(2)}/3.0
                </div>
                <div>{Math.round((thermalScore / 3) * 100)}%</div>
                <div>{getScoreText(thermalScore)}</div>
              </div>
              <div className="score-summary-card">
                <div>Redevelopment</div>
                <div className={getScoreColorClass(redevScore)}>
                  {redevScore.toFixed(2)}/3.0
                </div>
                <div>{Math.round((redevScore / 3) * 100)}%</div>
                <div>{getScoreText(redevScore)}</div>
              </div>
            </div>
          </div>
          
          <div className="expert-cards-section">
            <h2>Expert Analysis Cards</h2>
            <p>Click info buttons for scoring criteria details</p>
            
            <div className="cards-grid">
              <ScoringCard 
                title="Thermal Operating Assessment" 
                subtitle="Evaluation of existing plant operations"
                weight="50%"
              >
                <div className="sub-card">
                  <h5>Thermal Optimization Potential</h5>
                  <ScoreField
                    category="thermal"
                    component="thermal_optimization"
                    currentScore={editedAnalysis?.thermalBreakdown?.thermal_optimization?.score || 1}
                  />
                </div>
                
                <div className="sub-card">
                  <h5>Environmental Considerations</h5>
                  <ScoreField
                    category="thermal"
                    component="environmental"
                    currentScore={editedAnalysis?.thermalBreakdown?.environmental?.score || 2}
                  />
                </div>
              </ScoringCard>
              
              <ScoringCard 
                title="Redevelopment Assessment" 
                subtitle="Evaluation of future development potential"
                weight="50%"
              >
                <div className="sub-card">
                  <h5>Market Position</h5>
                  <ScoreField
                    category="redevelopment"
                    component="redev_market"
                    currentScore={editedAnalysis?.redevelopmentBreakdown?.redev_market?.score || 2}
                  />
                </div>
                
                <div className="sub-card">
                  <h5>Infrastructure</h5>
                  <ScoreField
                    label="Land Availability"
                    category="redevelopment"
                    component="land_availability"
                    currentScore={editedAnalysis?.redevelopmentBreakdown?.land_availability?.score || 2}
                  />
                  <ScoreField
                    label="Utilities"
                    category="redevelopment"
                    component="utilities"
                    currentScore={editedAnalysis?.redevelopmentBreakdown?.utilities?.score || 2}
                  />
                </div>
                
                <div className="sub-card">
                  <h5>Interconnection (IX)</h5>
                  <ScoreField
                    category="redevelopment"
                    component="interconnection"
                    currentScore={editedAnalysis?.redevelopmentBreakdown?.interconnection?.score || 2}
                  />
                  <TransmissionDataDisplay />
                </div>
              </ScoringCard>
            </div>
          </div>
          
          <div className="action-buttons">
            {isEditing && (
              <div>
                <button onClick={() => handleSave('cancel')}>
                  Cancel
                </button>
                <button onClick={() => handleSave('save-local')}>
                  Save Locally
                </button>
                <button onClick={() => handleSave('save-db')}>
                  Save to Database
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={() => setSelectedExpertProject(null)}>
            BACK TO SCORES
          </button>
          <button className="primary" onClick={() => alert('Report generation would be implemented here')}>
            GENERATE REPORT
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpertAnalysisModal;
