import React, { useState, useEffect, useRef } from 'react';

const AddSiteModal = ({
  showAddSiteModal,
  closeAddSiteModal,
  handleAddSiteSubmit,
  newSiteData,
  handleInputChange,
  allData,
  technologyOptions,
  isoOptions,
  processOptions,
  US_CITIES
}) => {
  // Location autocomplete state
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  
  // Refs
  const locationInputRef = useRef(null);
  
  // Redevelopment bases state
  const [selectedRedevelopmentBases, setSelectedRedevelopmentBases] = useState([]);
  const [newRedevelopmentBase, setNewRedevelopmentBase] = useState("");
  
  // Owner input state
  const [showNewOwnerInput, setShowNewOwnerInput] = useState(false);
  const [newPlantOwner, setNewPlantOwner] = useState("");
  
  // Co-locate/Repower state
  const [showNewCoLocateRepowerInput, setShowNewCoLocateRepowerInput] = useState(false);
  const [newCoLocateRepower, setNewCoLocateRepower] = useState("");
  
  // Project Type state
  const [selectedProjectTypes, setSelectedProjectTypes] = useState([]);
  
  // Transactability options based on screenshot
  const transactabilityOptions = [
    { value: "1.0", label: "1 -Bilateral w/ developed relationship" },
    { value: "2.0", label: "2 -Bilateral w/new relationship or Process w/less than 10 bidders" },
    { value: "3.0", label: "3 -Highly Competitive Process - More than 10 Bidders" }
  ];
  
  // Project type options
  const projectTypeOptions = [
    { value: "Redev", label: "Redev" },
    { value: "M&A", label: "M&A" },
    { value: "Owned", label: "Owned" }
  ];

  // Extract redevelopment dropdown options from Excel data
  const extractUniqueValues = (data, columnName) => {
    const values = new Set();
    data.forEach(row => {
      const value = row[columnName];
      if (value && value.toString().trim() !== "") {
        values.add(value.toString().trim());
      }
    });
    return Array.from(values).sort();
  };

  // Extract Redev Tech options (Technology values from Tech column)
  const extractRedevTechOptions = () => {
    return technologyOptions; // Use the same as Tech
  };

  // Extract Redev Fuel options (Fuel values from Fuel column)
  const extractRedevFuelOptions = () => {
    const values = new Set();
    allData.forEach(row => {
      const value = row["Fuel"];
      if (value && value.toString().trim() !== "") {
        values.add(value.toString().trim());
      }
    });
    return Array.from(values).sort();
  };

  // Extract Redev Land Control options from Excel
  const extractRedevLandControlOptions = () => {
    const values = new Set(["Y", "N"]);
    allData.forEach(row => {
      const value = row["Redev Land Control"];
      if (value && value.toString().trim() !== "") {
        values.add(value.toString().trim());
      }
    });
    return Array.from(values).sort();
  };

  // Extract Redev Stage Gate options from Excel
  const extractRedevStageGateOptions = () => {
    const values = new Set(["0", "1", "2", "3", "P"]);
    allData.forEach(row => {
      const value = row["Redev Stage Gate"];
      if (value && value.toString().trim() !== "") {
        values.add(value.toString().trim());
      }
    });
    return Array.from(values).sort();
  };

  // Extract Redev Lead options from Excel
  const extractRedevLeadOptions = () => {
    const values = new Set();
    allData.forEach(row => {
      const value = row["Redev Lead"];
      if (value && value.toString().trim() !== "") {
        values.add(value.toString().trim());
      }
    });
    return Array.from(values).sort();
  };

  // Extract Redev Support options from Excel
  const extractRedevSupportOptions = () => {
    const values = new Set();
    allData.forEach(row => {
      const value = row["Redev Support"];
      if (value && value.toString().trim() !== "") {
        values.add(value.toString().trim());
      }
    });
    return Array.from(values).sort();
  };

  // Extract Redev Tier options from Excel
  const extractRedevTierOptions = () => {
    const values = new Set(["0", "1", "2", "3"]);
    allData.forEach(row => {
      const value = row["Redev Tier"];
      if (value && value.toString().trim() !== "") {
        values.add(value.toString().trim());
      }
    });
    return Array.from(values).sort();
  };

  // Get all the dropdown options
  const redevTierOptions = extractRedevTierOptions();
  const redevTechOptions = extractRedevTechOptions();
  const redevFuelOptions = extractRedevFuelOptions();
  const redevLandControlOptions = extractRedevLandControlOptions();
  const redevStageGateOptions = extractRedevStageGateOptions();
  const redevLeadOptions = extractRedevLeadOptions();
  const redevSupportOptions = extractRedevSupportOptions();
  
  const existingPlantOwners = extractUniqueValues(allData, "Plant Owner");
  const existingFuelTypes = extractUniqueValues(allData, "Fuel");
  const redevelopmentBaseOptions = extractUniqueValues(allData, "Redevelopment Base Case");
  const coLocateRepowerOptions = extractUniqueValues(allData, "Co-Locate/Repower");

  // Initialize location input when modal opens
  useEffect(() => {
    if (showAddSiteModal) {
      const initialLocation = newSiteData["Location"] || "";
      setLocationInput(initialLocation);
      
      // Initialize project types from newSiteData
      const projectTypeValue = newSiteData["Project Type"] || "";
      if (projectTypeValue) {
        // Parse comma-separated values from Excel
        const types = projectTypeValue.split(',').map(t => t.trim()).filter(t => t);
        setSelectedProjectTypes(types);
      } else {
        setSelectedProjectTypes([]);
      }
      
      // Focus the location input after a small delay
      setTimeout(() => {
        if (locationInputRef.current) {
          locationInputRef.current.focus();
        }
      }, 100);
    }
  }, [showAddSiteModal, newSiteData]);

  // Location handlers
  const handleLocationInputChange = (value) => {
    setLocationInput(value);
    handleInputChange("Location", value);
    
    if (value.length >= 2) {
      const filtered = US_CITIES.filter(city =>
        city.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredLocations(filtered.slice(0, 10));
      setShowLocationSuggestions(true);
    } else {
      setFilteredLocations([]);
      setShowLocationSuggestions(false);
    }
  };

  const selectCity = (city) => {
    setLocationInput(city);
    handleInputChange("Location", city);
    setShowLocationSuggestions(false);
  };

  // Legacy COD handler
  const handleLegacyCODChange = (value) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4);
    handleInputChange("Legacy COD", digitsOnly);
  };

  // Redevelopment bases handlers
  const handleRedevelopmentBaseChange = (base) => {
    if (selectedRedevelopmentBases.includes(base)) {
      const updated = selectedRedevelopmentBases.filter(b => b !== base);
      setSelectedRedevelopmentBases(updated);
      handleInputChange("Redevelopment Base Case", updated.join("\n"));
    } else {
      const updated = [...selectedRedevelopmentBases, base];
      setSelectedRedevelopmentBases(updated);
      handleInputChange("Redevelopment Base Case", updated.join("\n"));
    }
  };

  const addNewRedevelopmentBase = () => {
    if (newRedevelopmentBase.trim() && !selectedRedevelopmentBases.includes(newRedevelopmentBase.trim())) {
      const updated = [...selectedRedevelopmentBases, newRedevelopmentBase.trim()];
      setSelectedRedevelopmentBases(updated);
      handleInputChange("Redevelopment Base Case", updated.join("\n"));
      setNewRedevelopmentBase("");
    }
  };

  // Owner handlers
  const handlePlantOwnerChange = (value) => {
    if (value === "add_new") {
      setShowNewOwnerInput(true);
    } else {
      setShowNewOwnerInput(false);
      handleInputChange("Plant Owner", value);
    }
  };

  const addNewPlantOwner = () => {
    if (newPlantOwner.trim()) {
      handleInputChange("Plant Owner", newPlantOwner.trim());
      setShowNewOwnerInput(false);
      setNewPlantOwner("");
    }
  };

  // Co-locate/repower handlers
  const handleCoLocateRepowerChange = (value) => {
    if (value === "add_new") {
      setShowNewCoLocateRepowerInput(true);
    } else {
      setShowNewCoLocateRepowerInput(false);
      handleInputChange("Co-Locate/Repower", value);
    }
  };

  // Transactability handler - updated to handle select
  const handleTransactabilityChange = (value) => {
    handleInputChange("Transactability", value);
  };

  // Project Type handler
  const handleProjectTypeChange = (typeValue) => {
    let updatedTypes;
    if (selectedProjectTypes.includes(typeValue)) {
      updatedTypes = selectedProjectTypes.filter(t => t !== typeValue);
    } else {
      updatedTypes = [...selectedProjectTypes, typeValue];
    }
    
    setSelectedProjectTypes(updatedTypes);
    
    // Store as comma-separated string like in Excel
    handleInputChange("Project Type", updatedTypes.join(", "));
  };

  // Form validation
  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    // Check if at least one project type is selected
    if (selectedProjectTypes.length === 0) {
      alert("Please select at least one Project Type");
      return;
    }
    
    // Submit the form
    handleAddSiteSubmit(e);
  };

  if (!showAddSiteModal) return null;

  return (
    <div className="modal-overlay" onClick={closeAddSiteModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "1100px" }}>
        <div className="modal-header">
          <h2 className="modal-title">Add New Project</h2>
          <button className="modal-close" onClick={closeAddSiteModal}>×</button>
        </div>
        
        <form onSubmit={handleFormSubmit}>
          <div className="modal-body">
            <div className="form-section">
              <h3 className="form-section-title">Basic Information</h3>
              
              {/* Project Type - Single line above Project Name and Codename */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label required">Project Type</label>
                <div className="checkbox-group" style={{ width: '100%' }}>
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px',
                    flexWrap: 'wrap',
                    marginTop: '4px'
                  }}>
                    {projectTypeOptions.map(option => (
                      <label 
                        key={option.value}
                        className="checkbox-label"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          padding: '10px 16px',
                          borderRadius: '6px',
                          backgroundColor: selectedProjectTypes.includes(option.value) ? '#334155' : '#1e293b',
                          border: '1px solid',
                          borderColor: selectedProjectTypes.includes(option.value) ? '#3b82f6' : '#374151',
                          transition: 'all 0.2s',
                          userSelect: 'none',
                          minWidth: '80px',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d3748'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedProjectTypes.includes(option.value) ? '#334155' : '#1e293b'}
                      >
                        <input
                          type="checkbox"
                          className="checkbox-input"
                          checked={selectedProjectTypes.includes(option.value)}
                          onChange={() => handleProjectTypeChange(option.value)}
                          style={{
                            marginRight: '8px',
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{ 
                          color: '#e5e7eb',
                          fontSize: '14px',
                          fontWeight: selectedProjectTypes.includes(option.value) ? '500' : '400'
                        }}>
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <small className="form-hint" style={{ 
                    display: 'block', 
                    marginTop: '8px', 
                    color: selectedProjectTypes.length === 0 ? '#ef4444' : '#94a3b8' 
                  }}>
                    {selectedProjectTypes.length === 0 
                      ? "Please select at least one project type (required)"
                      : "Select all applicable project types"}
                  </small>
                </div>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label required">Project Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSiteData["Project Name"]}
                    onChange={(e) => handleInputChange("Project Name", e.target.value)}
                    placeholder="Enter project name"
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Project Codename</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSiteData["Project Codename"]}
                    onChange={(e) => handleInputChange("Project Codename", e.target.value)}
                    placeholder="Enter codename"
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label required">Plant Owner</label>
                  <div className="select-with-add" style={{ width: '100%' }}>
                    <select
                      className="form-select"
                      value={newSiteData["Plant Owner"]}
                      onChange={(e) => handlePlantOwnerChange(e.target.value)}
                      required
                      disabled={showNewOwnerInput}
                      style={{ width: '100%' }}
                    >
                      <option value="">Select Plant Owner</option>
                      {existingPlantOwners.map(owner => (
                        <option key={owner} value={owner}>{owner}</option>
                      ))}
                      <option value="add_new">+ Add New Owner</option>
                    </select>
                    
                    {showNewOwnerInput && (
                      <div className="add-new-input" style={{ width: '100%', marginTop: '8px' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={newPlantOwner}
                          onChange={(e) => setNewPlantOwner(e.target.value)}
                          placeholder="Enter new plant owner"
                          autoFocus
                          style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button 
                            type="button" 
                            className="btn-add-small"
                            onClick={addNewPlantOwner}
                          >
                            Add
                          </button>
                          <button 
                            type="button" 
                            className="btn-cancel-small"
                            onClick={() => setShowNewOwnerInput(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label required">Location</label>
                  <div className="autocomplete-wrapper" style={{ position: 'relative', width: '100%' }}>
                    <input
                      ref={locationInputRef}
                      type="text"
                      className="form-input"
                      value={locationInput}
                      onChange={(e) => handleLocationInputChange(e.target.value)}
                      onFocus={() => {
                        if (locationInput.length >= 2) {
                          const filtered = US_CITIES.filter(city =>
                            city.toLowerCase().includes(locationInput.toLowerCase())
                          );
                          setFilteredLocations(filtered.slice(0, 10));
                          setShowLocationSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowLocationSuggestions(false), 200);
                      }}
                      placeholder="Start typing city, state (e.g., Clarksville, TN)"
                      required
                      style={{ width: '100%' }}
                    />
                    {showLocationSuggestions && filteredLocations.length > 0 && (
                      <div 
                        className="autocomplete-dropdown" 
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          zIndex: 1000,
                          maxHeight: '200px',
                          overflowY: 'auto',
                          marginTop: '2px',
                          width: '100%',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                        }}
                      >
                        {filteredLocations.map((city, index) => (
                          <div
                            key={`${city}-${index}`}
                            className="autocomplete-item"
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #334155',
                              fontSize: '14px',
                              color: '#e5e7eb',
                              backgroundColor: '#1e293b',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectCity(city);
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                          >
                            {city}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <small className="form-hint">Start typing to see city suggestions (min 2 characters)</small>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Site Acreage</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newSiteData["Site Acreage"]}
                    onChange={(e) => handleInputChange("Site Acreage", e.target.value)}
                    placeholder="Enter acreage"
                    min="0"
                    step="0.1"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Technical Details</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label required">Capacity (MW)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newSiteData["Legacy Nameplate Capacity (MW)"]}
                    onChange={(e) => handleInputChange("Legacy Nameplate Capacity (MW)", e.target.value)}
                    placeholder="Enter capacity in MW"
                    required
                    step="0.1"
                    min="0"
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label required">Technology</label>
                  <select
                    className="form-select"
                    value={newSiteData["Tech"]}
                    onChange={(e) => handleInputChange("Tech", e.target.value)}
                    required
                    style={{ width: '100%' }}
                  >
                    <option value="">Select Technology</option>
                    {technologyOptions.map(tech => (
                      <option key={tech} value={tech}>{tech}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Heat Rate (Btu/kWh)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newSiteData["Heat Rate (Btu/kWh)"]}
                    onChange={(e) => handleInputChange("Heat Rate (Btu/kWh)", e.target.value)}
                    placeholder="Enter heat rate"
                    step="100"
                    min="0"
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Capacity Factor (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newSiteData["2024 Capacity Factor"]}
                    onChange={(e) => handleInputChange("2024 Capacity Factor", e.target.value)}
                    placeholder="Enter capacity factor"
                    step="0.1"
                    min="0"
                    max="100"
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Legacy COD</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSiteData["Legacy COD"]}
                    onChange={(e) => handleLegacyCODChange(e.target.value)}
                    placeholder="YYYY"
                    maxLength="4"
                    pattern="\d{4}"
                    title="Please enter a 4-digit year"
                    style={{ width: '100%' }}
                  />
                  <small className="form-hint">4-digit year (e.g., 1994, 2004)</small>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Fuel</label>
                  <select
                    className="form-select"
                    value={newSiteData["Fuel"]}
                    onChange={(e) => handleInputChange("Fuel", e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select Fuel Type</option>
                    {existingFuelTypes.map(fuel => (
                      <option key={fuel} value={fuel}>{fuel}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Market Details</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label required">ISO/RTO</label>
                  <select
                    className="form-select"
                    value={newSiteData["ISO"]}
                    onChange={(e) => handleInputChange("ISO", e.target.value)}
                    required
                    style={{ width: '100%' }}
                  >
                    <option value="">Select ISO/RTO</option>
                    {isoOptions.map(iso => (
                      <option key={iso} value={iso}>{iso}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Zone/Submarket</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSiteData["Zone/Submarket"]}
                    onChange={(e) => handleInputChange("Zone/Submarket", e.target.value)}
                    placeholder="Enter zone/submarket"
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Markets</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSiteData["Markets"]}
                    onChange={(e) => handleInputChange("Markets", e.target.value)}
                    placeholder="Enter markets"
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label required">Process Type</label>
                  <select
                    className="form-select"
                    value={newSiteData["Process (P) or Bilateral (B)"]}
                    onChange={(e) => handleInputChange("Process (P) or Bilateral (B)", e.target.value)}
                    required
                    style={{ width: '100%' }}
                  >
                    <option value="">Select Process Type</option>
                    {processOptions.map(proc => (
                      <option key={proc} value={proc}>{proc === "P" ? "Process" : "Bilateral"}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Gas Reference</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSiteData["Gas Reference"]}
                    onChange={(e) => handleInputChange("Gas Reference", e.target.value)}
                    placeholder="Enter gas reference"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Transactability</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Transactability</label>
                  <select
                    className="form-select"
                    value={newSiteData["Transactability"] || ""}
                    onChange={(e) => handleTransactabilityChange(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select Transactability Level</option>
                    {transactabilityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Redevelopment</h3>
              <div className="form-grid">
                {/* Redev Tier */}
                <div className="form-group">
                  <label className="form-label">Redev Tier</label>
                  <select
                    className="form-select"
                    value={newSiteData["Redev Tier"] || ""}
                    onChange={(e) => handleInputChange("Redev Tier", e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select Redev Tier</option>
                    {redevTierOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {/* Redevelopment Base Case */}
                <div className="form-group">
                  <label className="form-label">Redevelopment Base Case</label>
                  <div className="multi-select-container" style={{ width: '100%' }}>
                    <div className="selected-bases">
                      {selectedRedevelopmentBases.map(base => (
                        <span key={base} className="selected-base-tag" style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          backgroundColor: '#334155',
                          color: '#e5e7eb',
                          padding: '4px 8px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          margin: '2px',
                          gap: '4px'
                        }}>
                          {base}
                          <button 
                            type="button"
                            className="remove-base"
                            onClick={() => handleRedevelopmentBaseChange(base)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              fontSize: '14px',
                              padding: '0',
                              width: '16px',
                              height: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    
                    <div className="bases-dropdown" style={{ marginTop: '8px', width: '100%' }}>
                      <select
                        className="form-select"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleRedevelopmentBaseChange(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        style={{ marginBottom: '8px', width: '100%' }}
                      >
                        <option value="">Select redevelopment base case</option>
                        {redevelopmentBaseOptions.map(base => (
                          <option key={base} value={base} disabled={selectedRedevelopmentBases.includes(base)}>
                            {base}
                          </option>
                        ))}
                      </select>
                      
                      <div className="add-custom-base" style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={newRedevelopmentBase}
                          onChange={(e) => setNewRedevelopmentBase(e.target.value)}
                          placeholder="Add custom base case"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNewRedevelopmentBase())}
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>
                    
                    <small className="form-hint" style={{ display: 'block', marginTop: '8px', color: '#94a3b8', fontSize: '12px' }}>
                      Select multiple base cases (e.g., Solar and Gas/Thermal)
                    </small>
                  </div>
                </div>

                {/* Redev Capacity (MW) */}
                <div className="form-group">
                  <label className="form-label">Redev Capacity (MW)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newSiteData["Redev Capacity (MW)"] || ""}
                    onChange={(e) => handleInputChange("Redev Capacity (MW)", e.target.value)}
                    placeholder="Enter redev capacity"
                    step="0.1"
                    min="0"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Redev Tech */}
                <div className="form-group">
                  <label className="form-label">Redev Tech</label>
                  <select
                    className="form-select"
                    value={newSiteData["Redev Tech"] || ""}
                    onChange={(e) => handleInputChange("Redev Tech", e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select Redev Technology</option>
                    {redevTechOptions.map(tech => (
                      <option key={tech} value={tech}>{tech}</option>
                    ))}
                  </select>
                </div>

                {/* Redev Fuel */}
                <div className="form-group">
                  <label className="form-label">Redev Fuel</label>
                  <select
                    className="form-select"
                    value={newSiteData["Redev Fuel"] || ""}
                    onChange={(e) => handleInputChange("Redev Fuel", e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select Redev Fuel</option>
                    {redevFuelOptions.map(fuel => (
                      <option key={fuel} value={fuel}>{fuel}</option>
                    ))}
                  </select>
                </div>

                {/* Redev Heatrate (Btu/kWh) */}
                <div className="form-group">
                  <label className="form-label">Redev Heatrate (Btu/kWh)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newSiteData["Redev Heatrate (Btu/kWh)"] || ""}
                    onChange={(e) => handleInputChange("Redev Heatrate (Btu/kWh)", e.target.value)}
                    placeholder="Enter redev heatrate"
                    step="100"
                    min="0"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Redev COD */}
                <div className="form-group">
                  <label className="form-label">Redev COD</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSiteData["Redev COD"] || ""}
                    onChange={(e) => handleInputChange("Redev COD", e.target.value)}
                    placeholder="YYYY or description"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Redev Land Control */}
                <div className="form-group">
                  <label className="form-label">Redev Land Control</label>
                  <select
                    className="form-select"
                    value={newSiteData["Redev Land Control"] || ""}
                    onChange={(e) => handleInputChange("Redev Land Control", e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select Land Control</option>
                    {redevLandControlOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {/* Redev Stage Gate */}
                <div className="form-group">
                  <label className="form-label">Redev Stage Gate</label>
                  <select
                    className="form-select"
                    value={newSiteData["Redev Stage Gate"] || ""}
                    onChange={(e) => handleInputChange("Redev Stage Gate", e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select Stage Gate</option>
                    {redevStageGateOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {/* Redev Lead */}
                <div className="form-group">
                  <label className="form-label">Redev Lead</label>
                  <select
                    className="form-select"
                    value={newSiteData["Redev Lead"] || ""}
                    onChange={(e) => handleInputChange("Redev Lead", e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select Redev Lead</option>
                    {redevLeadOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {/* Redev Support */}
                <div className="form-group">
                  <label className="form-label">Redev Support</label>
                  <select
                    className="form-select"
                    value={newSiteData["Redev Support"] || ""}
                    onChange={(e) => handleInputChange("Redev Support", e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select Redev Support</option>
                    {redevSupportOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {/* Co-Locate/Repower */}
                <div className="form-group">
                  <label className="form-label">Co-Locate/Repower</label>
                  <div className="select-with-add" style={{ width: '100%' }}>
                    {!showNewCoLocateRepowerInput ? (
                      <>
                        <select
                          className="form-select"
                          value={newSiteData["Co-Locate/Repower"]}
                          onChange={(e) => handleCoLocateRepowerChange(e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="">Select Option</option>
                          {coLocateRepowerOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <div className="add-new-input" style={{ width: '100%' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={newCoLocateRepower}
                          onChange={(e) => setNewCoLocateRepower(e.target.value)}
                          placeholder="Enter new Co-Locate/Repower option"
                          autoFocus
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            type="button" 
                            className="btn-add-small"
                            onClick={() => {
                              if (newCoLocateRepower.trim()) {
                                handleInputChange("Co-Locate/Repower", newCoLocateRepower.trim());
                                setShowNewCoLocateRepowerInput(false);
                                setNewCoLocateRepower("");
                              }
                            }}
                          >
                            Add
                          </button>
                          <button 
                            type="button" 
                            className="btn-cancel-small"
                            onClick={() => {
                              setShowNewCoLocateRepowerInput(false);
                              setNewCoLocateRepower("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Additional Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Contact</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSiteData["Contact"]}
                    onChange={(e) => handleInputChange("Contact", e.target.value)}
                    placeholder="Enter contact person"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={closeAddSiteModal}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSiteModal;