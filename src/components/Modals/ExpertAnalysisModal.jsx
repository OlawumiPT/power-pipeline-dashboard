import React, { useState, useEffect } from 'react';
import './ExpertAnalysisModal.css';

const ExpertAnalysisModal = ({
  selectedExpertProject,
  setSelectedExpertProject,
  setSelectedProject,
  setShowProjectDetail,
  fetchExpertAnalysis,
  saveExpertAnalysis,
  fetchTransmissionInterconnection,
  saveTransmissionInterconnection
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState(null);
  const [transmissionData, setTransmissionData] = useState([]);
  const [newTransmissionRow, setNewTransmissionRow] = useState({
    poiVoltage: '',
    excessInjectionCapacity: '',
    excessWithdrawalCapacity: '',
    constraints: ''
  });
  const [loading, setLoading] = useState(false);

  // Initialize data when project changes
  useEffect(() => {
    if (selectedExpertProject) {
      setEditedAnalysis(selectedExpertProject.expertAnalysis || {});
      loadTransmissionData();
    }
  }, [selectedExpertProject]);

  // Load transmission data
  const loadTransmissionData = async () => {
    if (!selectedExpertProject) return;
    
    try {
      const projectName = selectedExpertProject.detailData?.["Project Name"] || 
                         selectedExpertProject.detailData?.project_name ||
                         selectedExpertProject.asset;
      
      if (projectName && fetchTransmissionInterconnection) {
        const data = await fetchTransmissionInterconnection(projectName);
        setTransmissionData(data || []);
      }
    } catch (error) {
      console.error('Error loading transmission data:', error);
    }
  };

  // Save expert analysis
  const handleSaveExpertAnalysis = async () => {
    try {
      setLoading(true);
      
      // Get project ID from multiple possible sources
      const projectId = selectedExpertProject?.detailData?.id || 
                       selectedExpertProject?.id || 
                       selectedExpertProject?.detailData?.project_id;
      
      if (!projectId) {
        throw new Error('Project ID not found');
      }
      
      // Prepare data for backend - match exactly what backend expects
      const saveData = {
        projectId: projectId,
        thermalOperatingScore: parseFloat(editedAnalysis.thermal || 0),
        redevelopmentScore: parseFloat(editedAnalysis.redev || 0),
        marketScore: parseFloat(editedAnalysis.marketScore || 0),
        environmentalScore: parseFloat(editedAnalysis.environmentalScore || 0),
        thermalOptimizationPotential: editedAnalysis.thermalOptimizationPotential || '',
        environmentalConsiderations: editedAnalysis.environmentalConsiderations || '',
        marketPosition: editedAnalysis.marketPosition || '',
        landAvailability: editedAnalysis.landAvailability || '',
        utilities: editedAnalysis.utilities || '',
        interconnectionScore: editedAnalysis.interconnectionScore || '',
        infrastructureScore: parseFloat(editedAnalysis.infrastructureScore || 0),
        comments: editedAnalysis.comments || '',
        lastUpdated: new Date().toISOString()
      };
      
      console.log('Saving expert analysis:', saveData);
      
      // Call API to save
      const result = await saveExpertAnalysis(saveData);
      
      // Refresh data from server
      const refreshedData = await fetchExpertAnalysis(projectId);
      
      // Update the selected project with fresh data
      setSelectedExpertProject(prev => ({
        ...prev,
        expertAnalysis: refreshedData
      }));
      
      // Update local edited analysis
      setEditedAnalysis(refreshedData);
      
      // Exit edit mode
      setIsEditMode(false);
      
      // Show success
      alert('✅ Expert analysis saved successfully!');
      
    } catch (error) {
      console.error('Error saving expert analysis:', error);
      alert(`❌ Failed to save: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Save transmission data
  const handleSaveTransmissionData = async () => {
    try {
      const projectId = selectedExpertProject?.detailData?.id || 
                       selectedExpertProject?.id;
      
      if (!projectId) {
        throw new Error('Project ID not found');
      }
      
      await saveTransmissionInterconnection(projectId, transmissionData);
      
      alert('✅ Transmission data saved successfully!');
    } catch (error) {
      console.error('Error saving transmission data:', error);
      alert(`❌ Failed to save transmission data: ${error.message}`);
    }
  };

  // Add new transmission row
  const handleAddTransmissionRow = () => {
    if (newTransmissionRow.poiVoltage.trim() === '') {
      alert('Please enter POI Voltage');
      return;
    }
    
    const newRow = {
      ...newTransmissionRow,
      poiVoltage: newTransmissionRow.poiVoltage.trim(),
      excessInjectionCapacity: parseFloat(newTransmissionRow.excessInjectionCapacity) || 0,
      excessWithdrawalCapacity: parseFloat(newTransmissionRow.excessWithdrawalCapacity) || 0,
      constraints: newTransmissionRow.constraints.trim() || '-'
    };
    
    setTransmissionData(prev => [...prev, newRow]);
    setNewTransmissionRow({
      poiVoltage: '',
      excessInjectionCapacity: '',
      excessWithdrawalCapacity: '',
      constraints: ''
    });
  };

  // Remove transmission row
  const handleRemoveTransmissionRow = (index) => {
    setTransmissionData(prev => prev.filter((_, i) => i !== index));
  };

  // Close modal
  const handleClose = () => {
    setSelectedExpertProject(null);
    setIsEditMode(false);
  };

  if (!selectedExpertProject) return null;

  const projectName = selectedExpertProject.detailData?.["Project Name"] || 
                     selectedExpertProject.detailData?.project_name ||
                     selectedExpertProject.asset || 
                     "Unknown Project";

  return (
    <div className="expert-analysis-modal-overlay">
      <div className="expert-analysis-modal">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="header-content">
            <h2>{projectName} - Expert Analysis</h2>
            <p className="subtitle">AI-powered assessment of all pipeline projects</p>
          </div>
          
          <div className="header-actions">
            {!isEditMode ? (
              <button 
                className="edit-button"
                onClick={() => setIsEditMode(true)}
              >
                ✏️ Edit Mode
              </button>
            ) : (
              <button 
                className="cancel-edit-button"
                onClick={() => setIsEditMode(false)}
              >
                Cancel Edit
              </button>
            )}
            <button 
              className="close-button"
              onClick={handleClose}
            >
              ×
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="modal-content">
          <div className="info-section">
            <h3>Expert Analysis Cards</h3>
            <p className="info-text">Click info buttons for scoring criteria details</p>
          </div>

          {/* Edit Mode Form */}
          {isEditMode ? (
            <div className="edit-form-container">
              <div className="edit-form-header">
                <h3>✏️ Edit Expert Analysis</h3>
                <div className="form-actions">
                  <button 
                    className="save-button"
                    onClick={handleSaveExpertAnalysis}
                    disabled={loading}
                  >
                    {loading ? '💾 Saving...' : '💾 Save Changes'}
                  </button>
                  <button 
                    className="cancel-button"
                    onClick={() => setIsEditMode(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Two Column Form Layout */}
              <div className="form-columns">
                {/* Thermal Operating Assessment */}
                <div className="form-column thermal-column">
                  <div className="column-header">
                    <h4>🔥 Thermal Operating Assessment</h4>
                    <p>EVALUATION OF EXISTING PLANT OPERATIONS AND MARKET POSITION</p>
                    <div className="weight-badge">WEIGHT: 50%</div>
                  </div>

                  <div className="form-group">
                    <label>Thermal Optimization Potential</label>
                    <select
                      value={editedAnalysis?.thermalOptimizationPotential || ''}
                      onChange={(e) => setEditedAnalysis(prev => ({
                        ...prev,
                        thermalOptimizationPotential: e.target.value
                      }))}
                      className="form-select"
                    >
                      <option value="">Select Score</option>
                      <option value="1">1 - No identifiable value add</option>
                      <option value="2">2 - Minor optimization potential</option>
                      <option value="3">3 - Significant optimization potential</option>
                      <option value="4">4 - Major optimization opportunity</option>
                      <option value="5">5 - Exceptional optimization potential</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Environmental Considerations</label>
                    <select
                      value={editedAnalysis?.environmentalConsiderations || ''}
                      onChange={(e) => setEditedAnalysis(prev => ({
                        ...prev,
                        environmentalConsiderations: e.target.value
                      }))}
                      className="form-select"
                    >
                      <option value="">Select Score</option>
                      <option value="1">1 - Major issues, costly mitigation</option>
                      <option value="2">2 - Known, mitigable, no cost advantage</option>
                      <option value="3">3 - Minor issues, easily mitigated</option>
                      <option value="4">4 - Minimal environmental concerns</option>
                      <option value="5">5 - No environmental issues</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Thermal Operating Score (0-10)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editedAnalysis?.thermal || ''}
                      onChange={(e) => setEditedAnalysis(prev => ({
                        ...prev,
                        thermal: e.target.value
                      }))}
                      className="form-input"
                      placeholder="Enter score 0-10"
                    />
                  </div>
                </div>

                {/* Redevelopment Assessment */}
                <div className="form-column redev-column">
                  <div className="column-header">
                    <h4>🏗️ Redevelopment Assessment</h4>
                    <p>EVALUATION OF FUTURE DEVELOPMENT POTENTIAL AND INFRASTRUCTURE</p>
                    <div className="weight-badge">WEIGHT: 50%</div>
                  </div>

                  <div className="form-group">
                    <label>Market Position</label>
                    <select
                      value={editedAnalysis?.marketPosition || ''}
                      onChange={(e) => setEditedAnalysis(prev => ({
                        ...prev,
                        marketPosition: e.target.value
                      }))}
                      className="form-select"
                    >
                      <option value="">Select Score</option>
                      <option value="1">1 - Poor market access</option>
                      <option value="2">2 - Secondary market</option>
                      <option value="3">3 - Good market position</option>
                      <option value="4">4 - Prime market location</option>
                      <option value="5">5 - Exceptional market access</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Land Availability</label>
                    <select
                      value={editedAnalysis?.landAvailability || ''}
                      onChange={(e) => setEditedAnalysis(prev => ({
                        ...prev,
                        landAvailability: e.target.value
                      }))}
                      className="form-select"
                    >
                      <option value="">Select Score</option>
                      <option value="1">1 - No available land</option>
                      <option value="2">2 - Some onsite + nearby parcel</option>
                      <option value="3">3 - Adequate land available</option>
                      <option value="4">4 - Plenty of available land</option>
                      <option value="5">5 - Extensive land available</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Utilities Access</label>
                    <select
                      value={editedAnalysis?.utilities || ''}
                      onChange={(e) => setEditedAnalysis(prev => ({
                        ...prev,
                        utilities: e.target.value
                      }))}
                      className="form-select"
                    >
                      <option value="">Select Score</option>
                      <option value="1">1 - No utilities access</option>
                      <option value="2">2 - Utilities nearby, low cost</option>
                      <option value="3">3 - Good utilities access</option>
                      <option value="4">4 - Excellent utilities access</option>
                      <option value="5">5 - Premium utilities access</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Interconnection (IX) Score (0-10)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editedAnalysis?.interconnectionScore || ''}
                      onChange={(e) => setEditedAnalysis(prev => ({
                        ...prev,
                        interconnectionScore: e.target.value
                      }))}
                      className="form-input"
                      placeholder="Enter score 0-10"
                    />
                  </div>

                  <div className="form-group">
                    <label>Redevelopment Score (0-10)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editedAnalysis?.redev || ''}
                      onChange={(e) => setEditedAnalysis(prev => ({
                        ...prev,
                        redev: e.target.value
                      }))}
                      className="form-input"
                      placeholder="Enter score 0-10"
                    />
                  </div>
                </div>
              </div>

              {/* Transmission Interconnection Section */}
              <div className="transmission-section">
                <div className="section-header">
                  <h4>⚡ Transmission Interconnection Details</h4>
                  <button 
                    className="save-transmission-button"
                    onClick={handleSaveTransmissionData}
                  >
                    💾 Save Transmission Data
                  </button>
                </div>

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
                      {transmissionData.map((row, index) => (
                        <tr key={index}>
                          <td>{row.poiVoltage}</td>
                          <td>{row.excessInjectionCapacity}</td>
                          <td>{row.excessWithdrawalCapacity}</td>
                          <td>{row.constraints}</td>
                          <td>
                            <button
                              onClick={() => handleRemoveTransmissionRow(index)}
                              className="remove-row-button"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      {/* Add New Row Form */}
                      <tr className="add-row-form">
                        <td>
                          <input
                            type="text"
                            placeholder="e.g., 69 kV"
                            value={newTransmissionRow.poiVoltage}
                            onChange={(e) => setNewTransmissionRow(prev => ({
                              ...prev,
                              poiVoltage: e.target.value
                            }))}
                            className="table-input"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            placeholder="MW"
                            value={newTransmissionRow.excessInjectionCapacity}
                            onChange={(e) => setNewTransmissionRow(prev => ({
                              ...prev,
                              excessInjectionCapacity: e.target.value
                            }))}
                            className="table-input"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            placeholder="MW"
                            value={newTransmissionRow.excessWithdrawalCapacity}
                            onChange={(e) => setNewTransmissionRow(prev => ({
                              ...prev,
                              excessWithdrawalCapacity: e.target.value
                            }))}
                            className="table-input"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Constraints"
                            value={newTransmissionRow.constraints}
                            onChange={(e) => setNewTransmissionRow(prev => ({
                              ...prev,
                              constraints: e.target.value
                            }))}
                            className="table-input"
                          />
                        </td>
                        <td>
                          <button
                            onClick={handleAddTransmissionRow}
                            className="add-row-button"
                          >
                            Add
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Comments Section */}
              <div className="comments-section">
                <label>Additional Comments</label>
                <textarea
                  value={editedAnalysis?.comments || ''}
                  onChange={(e) => setEditedAnalysis(prev => ({
                    ...prev,
                    comments: e.target.value
                  }))}
                  className="comments-textarea"
                  placeholder="Add any additional notes or comments..."
                  rows="4"
                />
              </div>
            </div>
          ) : (
            /* View Mode */
            <div className="view-mode-container">
              {/* Your existing view mode content here */}
              {/* This remains the same as your current view mode */}
              <div className="assessment-sections">
                {/* Thermal Operating Assessment View */}
                <div className="assessment-section thermal-section">
                  <h4>🔥 THERMAL OPERATING ASSESSMENT</h4>
                  <p>EVALUATION OF EXISTING PLANT OPERATIONS AND MARKET POSITION</p>
                  <div className="weight-label">WEIGHT: 50%</div>
                  
                  <div className="score-item">
                    <span className="score-label">Thermal Optimization Potential</span>
                    <span className="score-value">
                      {editedAnalysis?.thermalOptimizationPotential || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="score-item">
                    <span className="score-label">Environmental Considerations</span>
                    <span className="score-value">
                      {editedAnalysis?.environmentalConsiderations || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="score-item">
                    <span className="score-label">Thermal Operating Score</span>
                    <span className="score-value">
                      {editedAnalysis?.thermal || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Redevelopment Assessment View */}
                <div className="assessment-section redev-section">
                  <h4>🏗️ REDEVELOPMENT ASSESSMENT</h4>
                  <p>EVALUATION OF FUTURE DEVELOPMENT POTENTIAL AND INFRASTRUCTURE</p>
                  <div className="weight-label">WEIGHT: 50%</div>
                  
                  <div className="score-item">
                    <span className="score-label">Market Position</span>
                    <span className="score-value">
                      {editedAnalysis?.marketPosition || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="score-item">
                    <span className="score-label">Land Availability</span>
                    <span className="score-value">
                      {editedAnalysis?.landAvailability || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="score-item">
                    <span className="score-label">Utilities Access</span>
                    <span className="score-value">
                      {editedAnalysis?.utilities || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="score-item">
                    <span className="score-label">Interconnection (IX) Score</span>
                    <span className="score-value">
                      {editedAnalysis?.interconnectionScore || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="score-item">
                    <span className="score-label">Redevelopment Score</span>
                    <span className="score-value">
                      {editedAnalysis?.redev || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transmission Data View */}
              <div className="transmission-view-section">
                <h4>⚡ Transmission Interconnection Details</h4>
                <div className="transmission-table-view">
                  <table>
                    <thead>
                      <tr>
                        <th>POI Voltage</th>
                        <th>Excess Injection Capacity (MW)</th>
                        <th>Excess Withdrawal Capacity (MW)</th>
                        <th>Constraints</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transmissionData.length > 0 ? (
                        transmissionData.map((row, index) => (
                          <tr key={index}>
                            <td>{row.poiVoltage}</td>
                            <td>{row.excessInjectionCapacity}</td>
                            <td>{row.excessWithdrawalCapacity}</td>
                            <td>{row.constraints}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="no-data">No transmission data available</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button 
            className="back-button"
            onClick={() => {
              setSelectedProject(selectedExpertProject);
              setSelectedExpertProject(null);
              setShowProjectDetail(true);
            }}
          >
            ← Back to Project Details
          </button>
          <button className="report-button">
            📄 Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpertAnalysisModal;
