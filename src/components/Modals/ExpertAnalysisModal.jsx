import React, { useState, useEffect } from 'react';

const ExpertAnalysisModal = ({ 
  selectedExpertProject, 
  setSelectedExpertProject,
  setSelectedProject,
  setShowProjectDetail,
  currentUser = "PowerTrans Team"
}) => {
  if (!selectedExpertProject || !selectedExpertProject.expertAnalysis) return null;
  
  const originalAnalysis = selectedExpertProject.expertAnalysis;
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [editedTransmissionData, setEditedTransmissionData] = useState([]);
  
  const transmissionInterconnectionData = [
    {
      site: "Shoemaker",
      excessIXCapacity: true,
      constraints: "-",
      poiVoltage: "69 kV",
      excessInjectionCapacity: 143.9,
      excessWithdrawalCapacity: 144.2
    },
    {
      site: "Shoemaker",
      excessIXCapacity: true,
      constraints: "-",
      poiVoltage: "138 kV",
      excessInjectionCapacity: 549.5,
      excessWithdrawalCapacity: 95.5
    },
    {
      site: "Hillburn",
      excessIXCapacity: true,
      constraints: "-",
      poiVoltage: "69 kV",
      excessInjectionCapacity: 137.0,
      excessWithdrawalCapacity: 362.3
    },
    {
      site: "Hillburn",
      excessIXCapacity: true,
      constraints: "-",
      poiVoltage: "138 kV",
      excessInjectionCapacity: 337.7,
      excessWithdrawalCapacity: 138.5
    },
    {
      site: "Massena",
      excessIXCapacity: true,
      constraints: "1",
      poiVoltage: "115 kV",
      excessInjectionCapacity: 553.4,
      excessWithdrawalCapacity: 145.0
    },
    {
      site: "Ogdensburg",
      excessIXCapacity: true,
      constraints: "1",
      poiVoltage: "115 kV",
      excessInjectionCapacity: 46.4,
      excessWithdrawalCapacity: 33.2
    },
    {
      site: "Allegany",
      excessIXCapacity: true,
      constraints: "13",
      poiVoltage: "115 kV",
      excessInjectionCapacity: 21.5,
      excessWithdrawalCapacity: 136.0
    },
    {
      site: "Batavia",
      excessIXCapacity: true,
      constraints: "8",
      poiVoltage: "115 kV",
      excessInjectionCapacity: 8.8,
      excessWithdrawalCapacity: 176.1
    },
    {
      site: "Sterling",
      excessIXCapacity: true,
      constraints: "7",
      poiVoltage: "115 kV",
      excessInjectionCapacity: 385.6,
      excessWithdrawalCapacity: 45.2
    },
    {
      site: "Carthage",
      excessIXCapacity: true,
      constraints: "31",
      poiVoltage: "115 kV",
      excessInjectionCapacity: 538.5,
      excessWithdrawalCapacity: 193.8
    }
  ];
  
  // Get transmission data for current project
  const getTransmissionDataForProject = () => {
    const projectName = selectedExpertProject?.expertAnalysis?.projectName || "";
    if (!projectName) return [];
    
    // Try to match project name with site names in the data
    const matchingData = transmissionInterconnectionData.filter(item => 
      projectName.toLowerCase().includes(item.site.toLowerCase()) || 
      item.site.toLowerCase().includes(projectName.toLowerCase())
    );
    
    return matchingData;
  };

  // Initialize transmission data
  useEffect(() => {
    if (selectedExpertProject) {
      // Get saved transmission data from localStorage
      const savedEdits = getSavedEdits(selectedExpertProject.id);
      
      if (savedEdits && savedEdits.transmissionData) {
        // Use saved transmission data
        setEditedTransmissionData(savedEdits.transmissionData);
      } else {
        // Get default transmission data for project
        const defaultData = getTransmissionDataForProject();
        setEditedTransmissionData(defaultData);
      }
    }
  }, [selectedExpertProject]);

  // Initialize edited analysis when project changes
  useEffect(() => {
    if (selectedExpertProject) {
      const savedEdits = getSavedEdits(selectedExpertProject.id);
      if (savedEdits) {
        setEditedAnalysis(savedEdits);
      } else {
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
    }
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

  // Save edits to localStorage
  const saveEditsToStorage = (edits, saveType = 'save') => {
    try {
      const allEdits = JSON.parse(localStorage.getItem('projectEdits') || '{}');
      const projectId = selectedExpertProject.id;
      
      const editRecord = {
        ...edits,
        transmissionData: editedTransmissionData, // Save transmission data
        editedAt: new Date().toISOString(),
        editedBy: currentUser,
        saveType: saveType,
        originalScores: {
          overall: originalAnalysis.overallScore,
          thermal: originalAnalysis.thermalScore,
          redevelopment: originalAnalysis.redevelopmentScore
        }
      };
      
      allEdits[projectId] = editRecord;
      localStorage.setItem('projectEdits', JSON.stringify(allEdits));
      
      if (saveType === 'save-excel') {
        const pendingSync = JSON.parse(localStorage.getItem('pendingExcelUpdates') || '[]');
        if (!pendingSync.includes(projectId)) {
          pendingSync.push(projectId);
          localStorage.setItem('pendingExcelUpdates', JSON.stringify(pendingSync));
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error saving edits:', error);
      return false;
    }
  };

  // Remove edits (cancel)
  const removeEdits = () => {
    try {
      const allEdits = JSON.parse(localStorage.getItem('projectEdits') || '{}');
      const projectId = selectedExpertProject.id;
      delete allEdits[projectId];
      localStorage.setItem('projectEdits', JSON.stringify(allEdits));
      return true;
    } catch (error) {
      console.error('Error removing edits:', error);
      return false;
    }
  };

  const analysis = isEditing ? editedAnalysis : (getSavedEdits(selectedExpertProject.id) || originalAnalysis);

  // Handle score change for card components
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

  // ===== TRANSMISSION DATA FUNCTIONS =====
  
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

  // Recalculate all scores based on breakdown
  const recalculateScores = (analysisData) => {
    const thermalBreakdown = analysisData.thermalBreakdown || {};
    let thermalScore = 0;
    
    Object.keys(thermalBreakdown).forEach(component => {
      const score = thermalBreakdown[component]?.score || 0;
      const weight = criteriaData[component]?.weight || 0;
      thermalScore += score * weight;
    });
    
    const landScore = analysisData.redevelopmentBreakdown?.land_availability?.score || 0;
    const utilitiesScore = analysisData.redevelopmentBreakdown?.utilities?.score || 0;
    const infrastructureScore = (landScore + utilitiesScore) / 2;
    
    const redevBreakdown = analysisData.redevelopmentBreakdown || {};
    let redevelopmentScore = 0;
    
    const marketScore = redevBreakdown.redev_market?.score || 0;
    redevelopmentScore += marketScore * criteriaData.redev_market.weight;
    
    redevelopmentScore += infrastructureScore * 0.30;
    
    const ixScore = redevBreakdown.interconnection?.score || 0;
    redevelopmentScore += ixScore * criteriaData.interconnection.weight;
    
    const overallScore = (thermalScore + redevelopmentScore) * 2;
    
    return {
      ...analysisData,
      thermalScore: thermalScore.toFixed(2),
      redevelopmentScore: redevelopmentScore.toFixed(2),
      overallScore: overallScore.toFixed(2),
      infrastructureScore: infrastructureScore.toFixed(2)
    };
  };

  // Handle save
  const handleSave = async (saveType) => {
    setSaveStatus('saving');
    
    try {
      if (saveType === 'cancel') {
        removeEdits();
        setEditedAnalysis({...originalAnalysis});
        setIsEditing(false);
        setSaveStatus(null);
        
        // Reset transmission data to original
        const defaultData = getTransmissionDataForProject();
        setEditedTransmissionData(defaultData);
        
        return;
      }
      
      const overall = parseFloat(editedAnalysis.overallScore) || 0;
      const updatedAnalysis = {
        ...editedAnalysis,
        overallRating: overall >= 4.5 ? 'Strong' : overall >= 3.0 ? 'Moderate' : 'Weak',
        ratingClass: overall >= 4.5 ? 'strong' : overall >= 3.0 ? 'moderate' : 'weak',
        confidence: overall >= 4.5 ? 85 : overall >= 3.0 ? 75 : 60
      };
      
      const success = saveEditsToStorage(updatedAnalysis, saveType);
      
      if (success) {
        setEditedAnalysis(updatedAnalysis);
        setIsEditing(false);
        setSaveStatus('success');
        
        setTimeout(() => {
          setSaveStatus(null);
          if (saveType === 'save-excel') {
            alert(`Changes saved and queued for Excel update.`);
          } else {
            alert('Changes saved to application.');
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

  // Get score color class
  const getScoreColorClass = (score) => {
    if (score >= 2.5) return 'score-excellent';
    if (score >= 1.5) return 'score-good';
    if (score >= 0.5) return 'score-fair';
    return 'score-poor';
  };

  // Get score text
  const getScoreText = (score) => {
    if (score >= 2.5) return 'EXCELLENT';
    if (score >= 1.5) return 'GOOD';
    if (score >= 0.5) return 'FAIR';
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

  // ===== EXCEL CRITERIA DATA =====
  const criteriaData = {
    unit_cod: {
      label: "Plant COD",
      weight: 0.20,
      weightText: "20%",
      options: [
        { value: 3, label: "<2000", description: "Vintage plant (<2000) - higher retirement potential" },
        { value: 2, label: "2000-2005", description: "Moderate age plant" },
        { value: 1, label: ">2005", description: "Newer plant" }
      ]
    },
    markets: {
      label: "Markets",
      weight: 0.30,
      weightText: "30%",
      options: [
        { value: 3, label: "PJM, NYISO, ISO-NE", description: "Premium market with strong pricing" },
        { value: 2, label: "MISO North, SERC", description: "Secondary markets" },
        { value: 1, label: "SPP, MISO South", description: "Tertiary markets" },
        { value: 0, label: "ERCOT, WECC, CAISO", description: "Challenging markets" }
      ]
    },
    transactability: {
      label: "Transactability",
      weight: 0.30,
      weightText: "30%",
      options: [
        { value: 3, label: "Bilateral w/ developed relationship", description: "Easy transaction process" },
        { value: 2, label: "Bilateral w/new relationship or Process w/<10 bidders", description: "Unknown transactability" },
        { value: 1, label: "Highly Competitive Process - >10 Bidders", description: "Complex competitive process" }
      ]
    },
    thermal_optimization: {
      label: "M&A / Thermal Optimization",
      subtitle: "Thermal Optimization Potential",
      weight: 0.05,
      weightText: "5%",
      options: [
        { value: 2, label: "Readily apparent value add", description: "Wet compression, staffing, thermal blankets, dual-fuel, spare parts program, etc." },
        { value: 1, label: "No readily identifiable value add", description: "No identifiable value add" }
      ]
    },
    environmental: {
      label: "Environmental",
      weight: 0.15,
      weightText: "15%",
      options: [
        { value: 3, label: "Known, mitigable, PT has cost advantage", description: "Environmental liabilities are known, mitigable, and PT has a relative cost advantage" },
        { value: 2, label: "Known, mitigable, no cost advantage", description: "Environmental liabilities are known, mitigable, but PT has no relative cost advantage" },
        { value: 1, label: "Not known", description: "Environmental liabilities are not known" },
        { value: 0, label: "Known and not mitigable", description: "Environmental Liabilities are known and not mitigable" }
      ]
    },
    
    // Redevelopment Components
    redev_market: {
      label: "Market",
      weight: 0.40,
      weightText: "40%",
      options: [
        { value: 3, label: "Primary", description: "Strong market position" },
        { value: 2, label: "Secondary", description: "Good market position" },
        { value: 1, label: "Uncertain", description: "Market position unclear" },
        { value: 0, label: "Challenging", description: "Difficult market position" }
      ]
    },
    land_availability: {
      label: "Land Availability",
      weight: 0.15,
      weightText: "Part of Infrastructure (30%)",
      options: [
        { value: 3, label: "Sufficient land onsite", description: "Sufficient land onsite for all development activities" },
        { value: 2, label: "Some onsite + nearby parcel", description: "Some developable land onsite with readily available/transactable parcel nearby" },
        { value: 1, label: "No onsite, available nearby", description: "No land onsite for development, but land available nearby" },
        { value: 0, label: "No land available", description: "No land onsite of offsite nearby" }
      ]
    },
    utilities: {
      label: "Utilities",
      weight: 0.15,
      weightText: "Part of Infrastructure (30%)",
      options: [
        { value: 3, label: "Sufficient utilities onsite", description: "Sufficient Utilities Existing Onsite Now" },
        { value: 2, label: "Utilities nearby, low cost", description: "Sufficient Gas/Utilities in the area and low cost to connect" },
        { value: 1, label: "Utilities available but expensive", description: "Sufficient Gas, high cost; viability uncertain" },
        { value: 0, label: "No clear path", description: "No clear path to utility connection" },
        { value: -1, label: "N/A - BESS and Solar", description: "Not applicable for renewable projects" }
      ]
    },
    interconnection: {
      label: "Interconnection (IX)",
      weight: 0.30,
      weightText: "30%",
      options: [
        { value: 3, label: "Secured IX Rights", description: "Interconnection rights secured" },
        { value: 2, label: "No upgrades needed (Unsecured)", description: "No network/POI upgrades at desired MW (Unsecured)" },
        { value: 1, label: "Minimal upgrades needed", description: "Minimal network and POI upgrades required (Unsecured)" },
        { value: 0, label: "Major upgrades needed", description: "Major network or POI upgrades required (Unsecured)" }
      ]
    }
  };

  // ===== CARD COMPONENTS =====
  
  const ScoringCard = ({ title, subtitle, children, category, weight, overallScore }) => (
    <div className="scoring-card dark-card">
      <div className="scoring-card-header">
        <div className="scoring-card-title-section">
          <h4 className="scoring-card-title">{title}</h4>
          {subtitle && <div className="scoring-card-subtitle">{subtitle}</div>}
        </div>
        <div className="scoring-card-header-right">
          <span className="scoring-card-weight dark-weight">{weight}</span>
          {overallScore !== undefined && (
            <div className={`scoring-card-overall dark-overall ${getScoreColorClass(overallScore)}`}>
              {overallScore.toFixed(2)}/3.0
            </div>
          )}
        </div>
      </div>
      <div className="scoring-card-body">
        {children}
      </div>
    </div>
  );

  const ScoreField = ({ label, category, component, currentScore, showContribution = true }) => {
    const criteria = criteriaData[component];
    const weight = criteria?.weight || 0;
    const contribution = (currentScore * weight).toFixed(2);
    
    return (
      <div className="score-field dark-field">
        <div className="score-field-header">
          <label className="score-field-label dark-label">{label}</label>
          <button 
            className="info-button dark-info-btn"
            onClick={() => {
              const criteriaText = criteria?.options?.map(opt => `Score ${opt.value}: ${opt.description}`).join('\n\n');
              alert(`Criteria for ${label}:\n\n${criteriaText}\n\nWeight: ${criteria?.weightText || '0%'}`);
            }}
            title="View criteria details"
          >
            ℹ️
          </button>
        </div>
        
        <div className="score-field-content dark-field-content">
          {isEditing ? (
            <select
              className="score-dropdown dark-dropdown"
              value={currentScore}
              onChange={(e) => handleScoreChange(category, component, e.target.value)}
              disabled={!isEditing}
            >
              <option value="">Select score...</option>
              {criteria?.options?.map(option => (
                <option key={option.value} value={option.value}>
                  Score {option.value}: {option.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="score-display dark-score-display">
              Score: {currentScore}
            </div>
          )}
          
          <div className="score-field-details dark-details">
            <span className="score-weight dark-detail">Weight: {criteria?.weightText || '0%'}</span>
            {showContribution && (
              <span className="score-contribution dark-detail">Contribution: {contribution}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ===== UPDATED TRANSMISSION DATA COMPONENT =====
  const TransmissionDataDisplay = () => {
    const hasTransmissionData = editedTransmissionData.length > 0;
    const projectName = selectedExpertProject?.expertAnalysis?.projectName || "";
    
    return (
      <div className="transmission-data-section dark-transmission-section">
        <div className="transmission-header dark-transmission-header">
          <div className="transmission-title-row">
            <div className="transmission-icon">⚡</div>
            <h5 className="transmission-title dark-transmission-title">Transmission Interconnection Details</h5>
          </div>
          <div className="excess-capacity-indicator dark-excess-indicator">
            {hasTransmissionData && (
              <span className="excess-capacity-badge dark-excess-badge">
                ● Excess IX Capacity Available
              </span>
            )}
          </div>
        </div>
        
        {isEditing ? (
          // EDIT MODE - Editable table
          <>
            <div className="transmission-table-container dark-table-container">
              <table className="transmission-table dark-transmission-table">
                <thead>
                  <tr>
                    <th className="voltage-header dark-table-header">POI Voltage</th>
                    <th className="capacity-header dark-table-header">Excess Injection Capacity (MW)</th>
                    <th className="capacity-header dark-table-header">Excess Withdrawal Capacity (MW)</th>
                    <th className="constraints-header dark-table-header">Constraints</th>
                    <th className="actions-header dark-table-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editedTransmissionData.length > 0 ? (
                    editedTransmissionData.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'even-row dark-even-row' : 'odd-row dark-odd-row'}>
                        <td className="voltage-cell dark-table-cell">
                          <input
                            type="text"
                            className="transmission-input dark-transmission-input"
                            value={item.poiVoltage}
                            onChange={(e) => handleTransmissionFieldChange(index, 'poiVoltage', e.target.value)}
                            placeholder="e.g., 69 kV"
                          />
                        </td>
                        <td className="capacity-cell dark-table-cell">
                          <input
                            type="number"
                            className="transmission-input dark-transmission-input"
                            value={item.excessInjectionCapacity}
                            onChange={(e) => handleTransmissionFieldChange(index, 'excessInjectionCapacity', e.target.value)}
                            placeholder="0.0"
                            step="0.1"
                            min="0"
                          />
                        </td>
                        <td className="capacity-cell dark-table-cell">
                          <input
                            type="number"
                            className="transmission-input dark-transmission-input"
                            value={item.excessWithdrawalCapacity}
                            onChange={(e) => handleTransmissionFieldChange(index, 'excessWithdrawalCapacity', e.target.value)}
                            placeholder="0.0"
                            step="0.1"
                            min="0"
                          />
                        </td>
                        <td className="constraints-cell dark-table-cell">
                          <input
                            type="text"
                            className="transmission-input dark-transmission-input"
                            value={item.constraints}
                            onChange={(e) => handleTransmissionFieldChange(index, 'constraints', e.target.value)}
                            placeholder="e.g., None, 1, 2, etc."
                          />
                        </td>
                        <td className="actions-cell dark-table-cell">
                          <button
                            className="remove-entry-btn dark-remove-btn"
                            onClick={() => removeTransmissionEntry(index)}
                            title="Remove this entry"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="no-data-cell dark-no-data-cell">
                        No transmission data available. Click "Add POI Voltage" to add new entries.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="transmission-actions dark-transmission-actions">
              <button
                className="add-entry-btn dark-add-btn"
                onClick={addNewTransmissionEntry}
              >
                + Add POI Voltage
              </button>
            </div>
          </>
        ) : (
          // READ-ONLY MODE - Display only
          <>
            {hasTransmissionData ? (
              <>
                <div className="transmission-table-container dark-table-container">
                  <table className="transmission-table dark-transmission-table">
                    <thead>
                      <tr>
                        <th className="voltage-header dark-table-header">POI Voltage</th>
                        <th className="capacity-header dark-table-header">Excess Injection Capacity</th>
                        <th className="capacity-header dark-table-header">Excess Withdrawal Capacity</th>
                        <th className="constraints-header dark-table-header">Constraints</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editedTransmissionData.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'even-row dark-even-row' : 'odd-row dark-odd-row'}>
                          <td className="voltage-cell dark-table-cell">{item.poiVoltage}</td>
                          <td className="capacity-cell dark-table-cell">{item.excessInjectionCapacity.toFixed(1)} MW</td>
                          <td className="capacity-cell dark-table-cell">{item.excessWithdrawalCapacity.toFixed(1)} MW</td>
                          <td className="constraints-cell dark-table-cell">
                            {item.constraints === "-" ? "None" : item.constraints}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="no-transmission-data dark-no-data">
                <div className="no-data-icon">📊</div>
                <div className="no-data-text">
                  No transmission interconnection data available for {projectName}.
                </div>
                <div className="no-data-hint">
                  Enable editing to add transmission data.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Calculate current scores
  const thermalBreakdown = analysis.thermalBreakdown || {};
  const redevBreakdown = analysis.redevelopmentBreakdown || {};
  
  const thermalScore = parseFloat(analysis.thermalScore) || 0;
  const redevScore = parseFloat(analysis.redevelopmentScore) || 0;
  const overallScore = parseFloat(analysis.overallScore) || 0;
  
  const thermalPercent = (thermalScore / 3) * 100;
  const redevPercent = (redevScore / 3) * 100;
  const overallPercent = (overallScore / 6) * 100;
  
  // Check if this project has edits
  const hasEdits = !!getSavedEdits(selectedExpertProject.id);
  const savedEditData = getSavedEdits(selectedExpertProject.id);

   // ... keep all the existing code before the return statement ...

  return (
    <div className="modal-overlay dark-overlay" onClick={() => !isEditing && setSelectedExpertProject(null)}>
      <div className="modal-content expert-analysis-modal dark-theme" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER SECTION - REDUCED SIZE */}
        <div className="modal-header expert-header dark-header" style={{
          padding: "16px 20px 12px 20px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "12px 12px 0 0",
          position: "relative"
        }}>
          <div className="header-main" style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            width: "100%",
            marginBottom: "8px"
          }}>
            <div className="project-title-section" style={{ flex: 1 }}>
              <h2 className="modal-title" style={{
                fontSize: "18px",
                fontWeight: "700",
                margin: "0 0 2px 0",
                color: "#ffffff",
                letterSpacing: "0.3px"
              }}>
                {analysis.projectName} - Expert Details
              </h2>
              <p className="expert-scores-subtitle" style={{
                fontSize: "12px",
                margin: "0",
                color: "#94a3b8",
                fontWeight: "400"
              }}>
                AI-powered assessment of all pipeline projects
              </p>
            </div>    
            </div>
          
          {/* Edit Toggle Button - More Compact */}
          <div className="edit-toggle-section dark-edit-section" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            width: "100%"
          }}>
            {!isEditing ? (
              <button 
                className="enable-edit-btn dark-edit-btn"
                onClick={() => setIsEditing(true)}
                style={{
                  background: "rgba(59, 130, 246, 0.15)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  color: "#93c5fd",
                  padding: "4px 12px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "right",
                  gap: "4px"
                }}
                onMouseOver={(e) => {
                  e.target.style.background = "rgba(59, 130, 246, 0.25)";
                  e.target.style.borderColor = "rgba(59, 130, 246, 0.5)";
                }}
                onMouseOut={(e) => {
                  e.target.style.background = "rgba(59, 130, 246, 0.15)";
                  e.target.style.borderColor = "rgba(59, 130, 246, 0.3)";
                }}
              >
                ✏️ Enable Editing
              </button>
            ) : (
              <div className="edit-mode-indicator dark-edit-indicator" style={{
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span className="edit-mode-badge dark-edit-badge" style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#fbbf24",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: "600",
                  letterSpacing: "0.5px"
                }}>
                  EDIT MODE
                </span>
                <button 
                  className="cancel-edit-btn dark-cancel-btn"
                  onClick={() => handleSave('cancel')}
                  disabled={saveStatus === 'saving'}
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#fca5a5",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    opacity: saveStatus === 'saving' ? "0.5" : "1"
                  }}
                  onMouseOver={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.background = "rgba(239, 68, 68, 0.25)";
                      e.target.style.borderColor = "rgba(239, 68, 68, 0.5)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!e.target.disabled) {
                      e.target.style.background = "rgba(239, 68, 68, 0.15)";
                      e.target.style.borderColor = "rgba(239, 68, 68, 0.3)";
                    }
                  }}
                >
                  Cancel Edit
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* REST OF YOUR MODAL BODY - keep as is */}
        <div className="modal-body expert-body dark-body">
          {/* Save Status Indicator */}
          {saveStatus && (
            <div className={`save-status dark-save-status ${saveStatus}`}>
              {saveStatus === 'saving' && 'Saving changes...'}
              {saveStatus === 'success' && '✓ Changes saved successfully!'}
              {saveStatus === 'error' && '✗ Error saving changes'}
            </div>
          )}
          
          {/* Edit History Banner */}
          {hasEdits && savedEditData && !isEditing && (
            <div className="edit-history-banner dark-history-banner">
              <div className="edit-history-content dark-history-content">
                <span className="edit-history-icon dark-history-icon">✏️</span>
                <div className="edit-history-details dark-history-details">
                  <strong>Edited by {savedEditData.editedBy}</strong> on {new Date(savedEditData.editedAt).toLocaleDateString()}
                  {savedEditData.saveType === 'save-excel' && (
                    <span className="excel-sync-pending dark-sync-pending"> (Queued for Excel update)</span>
                  )}
                </div>
                <div className="score-changes dark-score-changes">
                  {savedEditData.originalScores && (
                    <>
                      Overall: {savedEditData.originalScores.overall} → {analysis.overallScore}
                      {' | '}
                      Thermal: {savedEditData.originalScores.thermal} → {analysis.thermalScore}
                      {' | '}
                      Redevelopment: {savedEditData.originalScores.redevelopment} → {analysis.redevelopmentScore}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* OVERALL SCORE SUMMARY */}
          <div className="overall-score-section dark-score-section">
            <h2 className="section-title dark-section-title">Overall Score Summary</h2>
            <div className="score-summary-grid dark-summary-grid">
              <div className="score-summary-card dark-summary-card">
                <div className="score-summary-label dark-summary-label">Overall Score</div>
                <div className={`kpi-value ${getScoreColorClass(overallScore / 2)}`}>
                  {overallScore}/6.0
                </div>
                <div className="score-summary-percent dark-summary-percent">{Math.round(overallPercent)}%</div>
                <div className="score-summary-rating dark-summary-rating" style={{ color: getRatingColor(analysis.overallRating) }}>
                  {analysis.overallRating}
                </div>
              </div>
              
              <div className="score-summary-card dark-summary-card">
                <div className="score-summary-label dark-summary-label">Thermal Operating Score</div>
                <div className={`kpi-value ${getScoreColorClass(thermalScore)}`}>
                  {thermalScore.toFixed(2)}/3.0
                </div>
                <div className="score-summary-percent dark-summary-percent">{Math.round(thermalPercent)}%</div>
                <div className="score-summary-rating dark-summary-rating" style={{ color: getScoreColorClass(thermalScore) === 'score-excellent' ? '#10b981' : 
                  getScoreColorClass(thermalScore) === 'score-good' ? '#f59e0b' : '#ef4444' }}>
                  {getScoreText(thermalScore)}
                </div>
              </div>
              
              <div className="score-summary-card dark-summary-card">
                <div className="score-summary-label dark-summary-label">Redevelopment</div>
                <div className={`kpi-value ${getScoreColorClass(redevScore)}`}>
                  {redevScore.toFixed(2)}/3.0
                </div>
                <div className="score-summary-percent dark-summary-percent">{Math.round(redevPercent)}%</div>
                <div className="score-summary-rating dark-summary-rating" style={{ color: getScoreColorClass(redevScore) === 'score-excellent' ? '#10b981' : 
                  getScoreColorClass(redevScore) === 'score-good' ? '#f59e0b' : '#ef4444' }}>
                  {getScoreText(redevScore)}
                </div>
              </div>
            </div>
          </div>
          
          {/* EXPERT ANALYSIS CARDS */}
          <div className="expert-cards-section dark-cards-section">
            <div className="section-header dark-section-header">
              <h2 className="section-title dark-section-title">Expert Analysis Cards</h2>
              <p className="section-subtitle dark-section-subtitle">
                Click info buttons (ℹ️) for scoring criteria details
              </p>
            </div>
            
            <div className="cards-grid dark-cards-grid">
              {/* THERMAL OPERATING ASSESSMENT CARD */}
              <ScoringCard 
                title="Thermal Operating Assessment" 
                subtitle="Evaluation of existing plant operations and market position"
                category="thermal"
                weight="50%"
              >
                {/* M&A Card */}
                <div className="sub-card dark-sub-card">
                  <div className="sub-card-header dark-sub-header">
                    <div className="sub-card-icon dark-sub-icon">M&A</div>
                    <h5 className="sub-card-title dark-sub-title">Thermal Optimization Potential</h5>
                  </div>
                  <ScoreField
                    label=""
                    category="thermal"
                    component="thermal_optimization"
                    currentScore={thermalBreakdown.thermal_optimization?.score || 1}
                  />
                </div>
                
                {/* Environmental Card */}
                <div className="sub-card dark-sub-card">
                  <div className="sub-card-header dark-sub-header">
                    <div className="sub-card-icon dark-sub-icon">Env</div>
                    <h5 className="sub-card-title dark-sub-title">Environmental Considerations</h5>
                  </div>
                  <ScoreField
                    label=""
                    category="thermal"
                    component="environmental"
                    currentScore={thermalBreakdown.environmental?.score || 2}
                  />
                </div>
              </ScoringCard>
              
              {/* REDEVELOPMENT ASSESSMENT CARD */}
              <ScoringCard 
                title="Redevelopment Assessment" 
                subtitle="Evaluation of future development potential and infrastructure"
                category="redevelopment"
                weight="50%"
              >
                {/* Market Card */}
                <div className="sub-card dark-sub-card">
                  <div className="sub-card-header dark-sub-header">
                    <div className="sub-card-icon dark-sub-icon">Mkt</div>
                    <h5 className="sub-card-title dark-sub-title">Market Position</h5>
                  </div>
                  <ScoreField
                    label=""
                    category="redevelopment"
                    component="redev_market"
                    currentScore={redevBreakdown.redev_market?.score || 2}
                  />
                </div>
                
                {/* Infrastructure Card */}
                <div className="sub-card dark-sub-card">
                  <div className="sub-card-header dark-sub-header">
                    <h5 className="sub-card-title dark-sub-title">Infrastructure</h5>
                  </div>
                  <div className="infrastructure-grid dark-infra-grid">
                    <div className="infra-sub-card dark-infra-sub">
                      <ScoreField
                        label="Land Availability"
                        category="redevelopment"
                        component="land_availability"
                        currentScore={redevBreakdown.land_availability?.score || 2}
                        showContribution={false}
                      />
                    </div>
                    <div className="infra-sub-card dark-infra-sub">
                      <ScoreField
                        label="Utilities"
                        category="redevelopment"
                        component="utilities"
                        currentScore={redevBreakdown.utilities?.score || 2}
                        showContribution={false}
                      />
                    </div>
                  </div>
                  <div className="infrastructure-total dark-infra-total">
                    <span className="infra-total-label dark-infra-label">Infrastructure Score:</span>
                    <span className={`infra-total-value dark-infra-value ${getScoreColorClass((redevBreakdown.land_availability?.score + redevBreakdown.utilities?.score) / 2)}`}>
                      {((redevBreakdown.land_availability?.score || 0) + (redevBreakdown.utilities?.score || 0) / 2).toFixed(2)}/3.0
                    </span>
                  </div>
                </div>
                
                {/* Interconnection Card - ALWAYS SHOWS NOW */}
                <div className="sub-card dark-sub-card">
                  <div className="sub-card-header dark-sub-header">
                    <div className="sub-card-icon dark-sub-icon">IX</div>
                    <h5 className="sub-card-title dark-sub-title">Interconnection (IX)</h5>
                  </div>
                  <ScoreField
                    label=""
                    category="redevelopment"
                    component="interconnection"
                    currentScore={redevBreakdown.interconnection?.score || 2}
                  />
                  
                  {/* TRANSMISSION INTERCONNECTION DATA - ALWAYS SHOWS */}
                  <TransmissionDataDisplay />
                </div>
              </ScoringCard>
            </div>
          </div>
                   
          {/* ACTION BUTTONS */}
          <div className="action-buttons dark-action-buttons">
            {isEditing ? (
              <div className="edit-actions dark-edit-actions">
                <button 
                  className="action-btn dark-action-btn secondary"
                  onClick={() => handleSave('cancel')}
                  disabled={saveStatus === 'saving'}
                >
                  Cancel
                </button>
                <button 
                  className="action-btn dark-action-btn primary"
                  onClick={() => handleSave('save')}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ): null}
          </div>
        </div>
        
        {/* FOOTER */}
        <div className="modal-footer dark-footer">
          <div className="footer-actions dark-footer-actions">
            <button 
              className="footer-btn dark-footer-btn"
              onClick={() => setSelectedExpertProject(null)}
            >
              BACK TO SCORES
            </button>
            <button 
              className="footer-btn dark-footer-btn primary"
              onClick={() => {
                alert(`Expert analysis report generated for ${analysis.projectName}. This would download a detailed PDF report.`);
              }}
            >
              GENERATE REPORT
            </button>
          </div>
        </div>
      </div>

      {/* CSS Styles for Transmission Data */}
      <style>{`
        .transmission-data-section {
          margin-top: 20px;
          padding: 15px;
          background: rgba(30, 41, 59, 0.7);
          border-radius: 8px;
          border: 1px solid rgba(71, 85, 105, 0.5);
        }
        
        .dark-transmission-section {
          background: rgba(30, 41, 59, 0.7);
          border-color: rgba(71, 85, 105, 0.5);
        }
        
        .transmission-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(71, 85, 105, 0.3);
        }
        
        .dark-transmission-header {
          border-bottom-color: rgba(71, 85, 105, 0.3);
        }
        
        .transmission-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .transmission-icon {
          font-size: 18px;
          color: #60a5fa;
        }
        
        .transmission-title {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #e2e8f0;
        }
        
        .dark-transmission-title {
          color: #e2e8f0;
        }
        
        .excess-capacity-indicator {
          display: flex;
          align-items: center;
        }
        
        .excess-capacity-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 12px;
          font-size: 12px;
          color: #22c55e;
          font-weight: 500;
        }
        
        .dark-excess-badge {
          background: rgba(34, 197, 94, 0.2);
          border-color: rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }
        
        .excess-capacity-badge:before {
          content: "●";
          margin-right: 6px;
          font-size: 14px;
        }
        
        .transmission-table-container {
          overflow-x: auto;
          margin-bottom: 15px;
        }
        
        .transmission-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        
        .dark-transmission-table {
          color: #cbd5e1;
        }
        
        .transmission-table th {
          text-align: left;
          padding: 8px 10px;
          background: rgba(51, 65, 85, 0.5);
          font-weight: 600;
          color: #94a3b8;
          border-bottom: 2px solid rgba(71, 85, 105, 0.5);
        }
        
        .dark-table-header {
          background: rgba(51, 65, 85, 0.5);
          color: #94a3b8;
          border-bottom-color: rgba(71, 85, 105, 0.5);
        }
        
        .transmission-table td {
          padding: 8px 10px;
          border-bottom: 1px solid rgba(71, 85, 105, 0.3);
        }
        
        .dark-table-cell {
          border-bottom-color: rgba(71, 85, 105, 0.3);
        }
        
        .voltage-header, .voltage-cell {
          width: 20%;
        }
        
        .capacity-header, .capacity-cell {
          width: 25%;
        }
        
        .constraints-header, .constraints-cell {
          width: 20%;
        }
        
        .actions-header, .actions-cell {
          width: 15%;
          text-align: center;
        }
        
        .even-row {
          background: rgba(30, 41, 59, 0.3);
        }
        
        .dark-even-row {
          background: rgba(30, 41, 59, 0.3);
        }
        
        .odd-row {
          background: rgba(15, 23, 42, 0.3);
        }
        
        .dark-odd-row {
          background: rgba(15, 23, 42, 0.3);
        }
        
        .voltage-cell {
          font-weight: 500;
        }
        
        .capacity-cell {
          font-family: 'Courier New', monospace;
        }
        
        .constraints-cell {
          color: #fca5a5;
        }
        
        /* Input fields for edit mode */
        .transmission-input {
          width: 100%;
          padding: 4px 8px;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(71, 85, 105, 0.5);
          border-radius: 4px;
          color: #e2e8f0;
          font-size: 12px;
        }
        
        .dark-transmission-input {
          background: rgba(15, 23, 42, 0.7);
          border-color: rgba(71, 85, 105, 0.5);
          color: #e2e8f0;
        }
        
        .transmission-input:focus {
          outline: none;
          border-color: #60a5fa;
          box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.3);
        }
        
        .transmission-input::placeholder {
          color: #64748b;
        }
        
        /* Remove button */
        .remove-entry-btn {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }
        
        .dark-remove-btn {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }
        
        .remove-entry-btn:hover {
          background: rgba(239, 68, 68, 0.3);
        }
        
        /* Add button */
        .transmission-actions {
          display: flex;
          justify-content: center;
          margin-top: 10px;
        }
        
        .add-entry-btn {
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        }
        
        .dark-add-btn {
          background: rgba(34, 197, 94, 0.2);
          border-color: rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }
        
        .add-entry-btn:hover {
          background: rgba(34, 197, 94, 0.3);
        }
        
        /* No data states */
        .no-data-cell {
          text-align: center;
          padding: 20px !important;
          color: #94a3b8;
          font-style: italic;
        }
        
        .dark-no-data-cell {
          color: #94a3b8;
        }
        
        .no-transmission-data {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px 20px;
          text-align: center;
        }
        
        .dark-no-data {
          color: #94a3b8;
        }
        
        .no-data-icon {
          font-size: 32px;
          margin-bottom: 10px;
          opacity: 0.5;
        }
        
        .no-data-text {
          font-size: 14px;
          margin-bottom: 5px;
          color: #cbd5e1;
        }
        
        .no-data-hint {
          font-size: 12px;
          color: #94a3b8;
          font-style: italic;
        }
        
        /* Summary section (optional) */
        .transmission-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          padding-top: 15px;
          border-top: 1px solid rgba(71, 85, 105, 0.3);
        }
        
        .dark-transmission-summary {
          border-top-color: rgba(71, 85, 105, 0.3);
        }
        
        .summary-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 8px;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 6px;
        }
        
        .dark-summary-item {
          background: rgba(30, 41, 59, 0.5);
        }
        
        .summary-label {
          font-size: 11px;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        
        .dark-summary-label {
          color: #94a3b8;
        }
        
        .summary-value {
          font-size: 13px;
          font-weight: 600;
          color: #e2e8f0;
        }
        
        .dark-summary-value {
          color: #e2e8f0;
        }
      `}</style>
    </div>
  );
};

export default ExpertAnalysisModal;