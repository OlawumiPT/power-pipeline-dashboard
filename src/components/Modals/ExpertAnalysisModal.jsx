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

  // Recalculate scores function (similar to your original)
  const recalculateScores = (analysisData) => {
    // Your existing recalculateScores logic here
    // ... (copy from your original code)
    
    return analysisData;
  };

  // The rest of your component (UI elements) remains the same
  // ... (keep all your existing UI code)

  // Render UI based on your screenshot
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <h2>{editedAnalysis?.projectName || 'Project'} - Expert Details</h2>
          <p>AI-powered assessment of all pipeline projects</p>
          
          <div className="edit-toggle-section">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)}>✏️ Enable Editing</button>
            ) : (
              <div>
                <span>EDIT MODE</span>
                <button onClick={() => handleSave('cancel')}>Cancel Edit</button>
              </div>
            )}
          </div>
        </div>
        
        {/* Overall Score Section */}
        <div className="overall-score-section">
          <h2>OVERALL SCORE</h2>
          <div className="score-summary-grid">
            {/* Overall Score Card */}
            <div className="score-summary-card">
              <div className="score-label">OVERALL SCORE</div>
              <div className="score-value">{editedAnalysis?.overallScore || '0.0'}/6.0</div>
              <div className="score-percent">{Math.round((parseFloat(editedAnalysis?.overallScore || 0) / 6) * 100)}%</div>
              <div className="score-rating">{editedAnalysis?.overallRating || 'N/A'}</div>
            </div>
            
            {/* Thermal Score Card */}
            <div className="score-summary-card">
              <div className="score-label">THERMAL OPERATING SCORE</div>
              <div className="score-value">{editedAnalysis?.thermalScore || '0.0'}/3.0</div>
              <div className="score-percent">{Math.round((parseFloat(editedAnalysis?.thermalScore || 0) / 3) * 100)}%</div>
              <div className="score-rating">{getScoreText(parseFloat(editedAnalysis?.thermalScore || 0))}</div>
            </div>
            
            {/* Redevelopment Score Card */}
            <div className="score-summary-card">
              <div className="score-label">REDEVELOPMENT</div>
              <div className="score-value">{editedAnalysis?.redevelopmentScore || '0.0'}/3.0</div>
              <div className="score-percent">{Math.round((parseFloat(editedAnalysis?.redevelopmentScore || 0) / 3) * 100)}%</div>
              <div className="score-rating">{getScoreText(parseFloat(editedAnalysis?.redevelopmentScore || 0))}</div>
            </div>
          </div>
        </div>
        
        {/* Expert Analysis Cards */}
        <div className="expert-cards-section">
          <h2>Expert Analysis Cards</h2>
          <p>Click info buttons (📋) for scoring criteria details</p>
          
          <div className="cards-grid">
            {/* Left Card - Thermal Operating Assessment */}
            <div className="scoring-card">
              <div className="card-header">
                <h3>Thermal Operating Assessment</h3>
                <p>Evaluation of existing plant operations and market position</p>
                <span className="weight">50%</span>
              </div>
              
              <div className="card-body">
                {/* M&A Thermal Optimization */}
                <div className="field-group">
                  <div className="field-header">
                    <span className="field-icon">M&A</span>
                    <h4>Thermal Optimization Potential</h4>
                  </div>
                  <div className="field-content">
                    {isEditing ? (
                      <select 
                        value={editedAnalysis?.thermalBreakdown?.thermal_optimization?.score || 1}
                        onChange={(e) => handleScoreChange('thermal', 'thermal_optimization', e.target.value)}
                      >
                        <option value="1">1 - Low</option>
                        <option value="2">2 - Medium</option>
                      </select>
                    ) : (
                      <div className="score-display">
                        Score: {editedAnalysis?.thermalBreakdown?.thermal_optimization?.score || 1}
                      </div>
                    )}
                    <div className="field-details">
                      <span>Weight: 5%</span>
                      <span>Contribution: {((editedAnalysis?.thermalBreakdown?.thermal_optimization?.score || 1) * 0.05).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Environmental Considerations */}
                <div className="field-group">
                  <div className="field-header">
                    <span className="field-icon">Env</span>
                    <h4>Environmental Considerations</h4>
                  </div>
                  <div className="field-content">
                    {isEditing ? (
                      <select 
                        value={editedAnalysis?.thermalBreakdown?.environmental?.score || 2}
                        onChange={(e) => handleScoreChange('thermal', 'environmental', e.target.value)}
                      >
                        <option value="1">1 - Low</option>
                        <option value="2">2 - Medium</option>
                        <option value="3">3 - High</option>
                      </select>
                    ) : (
                      <div className="score-display">
                        Score: {editedAnalysis?.thermalBreakdown?.environmental?.score || 2}
                      </div>
                    )}
                    <div className="field-details">
                      <span>Weight: 15%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Card - Redevelopment Assessment */}
            <div className="scoring-card">
              <div className="card-header">
                <h3>Redevelopment Assessment</h3>
                <p>Evaluation of future development potential and infrastructure</p>
                <span className="weight">50%</span>
              </div>
              
              <div className="card-body">
                {/* Market Position */}
                <div className="field-group">
                  <div className="field-header">
                    <span className="field-icon">Mkt</span>
                    <h4>Market Position</h4>
                  </div>
                  <div className="field-content">
                    {isEditing ? (
                      <select 
                        value={editedAnalysis?.redevelopmentBreakdown?.redev_market?.score || 2}
                        onChange={(e) => handleScoreChange('redevelopment', 'redev_market', e.target.value)}
                      >
                        <option value="1">1 - Low</option>
                        <option value="2">2 - Medium</option>
                        <option value="3">3 - High</option>
                      </select>
                    ) : (
                      <div className="score-display">
                        Score: {editedAnalysis?.redevelopmentBreakdown?.redev_market?.score || 2}
                      </div>
                    )}
                    <div className="field-details">
                      <span>Weight: 40%</span>
                      <span>Contribution: {((editedAnalysis?.redevelopmentBreakdown?.redev_market?.score || 2) * 0.40).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Infrastructure */}
                <div className="field-group">
                  <div className="field-header">
                    <h4>Infrastructure</h4>
                  </div>
                  <div className="infrastructure-grid">
                    <div className="infra-field">
                      <label>Land Availability</label>
                      {isEditing ? (
                        <select 
                          value={editedAnalysis?.redevelopmentBreakdown?.land_availability?.score || 2}
                          onChange={(e) => handleScoreChange('redevelopment', 'land_availability', e.target.value)}
                        >
                          <option value="1">1 - Low</option>
                          <option value="2">2 - Medium</option>
                          <option value="3">3 - High</option>
                        </select>
                      ) : (
                        <div>Score: {editedAnalysis?.redevelopmentBreakdown?.land_availability?.score || 2}</div>
                      )}
                    </div>
                    <div className="infra-field">
                      <label>Utilities</label>
                      {isEditing ? (
                        <select 
                          value={editedAnalysis?.redevelopmentBreakdown?.utilities?.score || 2}
                          onChange={(e) => handleScoreChange('redevelopment', 'utilities', e.target.value)}
                        >
                          <option value="1">1 - Low</option>
                          <option value="2">2 - Medium</option>
                          <option value="3">3 - High</option>
                        </select>
                      ) : (
                        <div>Score: {editedAnalysis?.redevelopmentBreakdown?.utilities?.score || 2}</div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Interconnection */}
                <div className="field-group">
                  <div className="field-header">
                    <span className="field-icon">IX</span>
                    <h4>Interconnection (IX)</h4>
                  </div>
                  <div className="field-content">
                    {isEditing ? (
                      <select 
                        value={editedAnalysis?.redevelopmentBreakdown?.interconnection?.score || 2}
                        onChange={(e) => handleScoreChange('redevelopment', 'interconnection', e.target.value)}
                      >
                        <option value="1">1 - Low</option>
                        <option value="2">2 - Medium</option>
                        <option value="3">3 - High</option>
                      </select>
                    ) : (
                      <div className="score-display">
                        Score: {editedAnalysis?.redevelopmentBreakdown?.interconnection?.score || 2}
                      </div>
                    )}
                    <div className="field-details">
                      <span>Weight: 30%</span>
                    </div>
                  </div>
                  
                  {/* Transmission Data Display (your existing component) */}
                  <div className="transmission-section">
                    {/* Your existing TransmissionDataDisplay component */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="action-buttons">
          {isEditing && (
            <div className="edit-actions">
              <button onClick={() => handleSave('cancel')}>Cancel</button>
              <button onClick={() => handleSave('save-local')}>Save Locally</button>
              <button onClick={() => handleSave('save-db')}>Save to Database</button>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="modal-footer">
          <button onClick={() => setSelectedExpertProject(null)}>BACK TO SCORES</button>
          <button className="primary" onClick={() => alert('Report generation would be implemented here')}>
            GENERATE REPORT
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpertAnalysisModal;
