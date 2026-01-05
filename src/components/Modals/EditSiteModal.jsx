import React, { useState, useEffect } from 'react';

const EditSiteModal = ({
  showEditModal,
  closeEditModal,
  handleUpdateProject,
  projectData,
  allData,
  technologyOptions,
  isoOptions,
  processOptions,
  US_CITIES
}) => {
  const [formData, setFormData] = useState({});
  const [locationInput, setLocationInput] = useState("");
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  // Project Type state (NEW - matching AddSiteModal)
  const [selectedProjectTypes, setSelectedProjectTypes] = useState([]);
  
  // Redevelopment bases state for Edit modal
  const [selectedRedevelopmentBases, setSelectedRedevelopmentBases] = useState([]);
  const [newRedevelopmentBase, setNewRedevelopmentBase] = useState("");
  
  // Co-locate/Repower state (NEW - matching AddSiteModal)
  const [showNewCoLocateRepowerInput, setShowNewCoLocateRepowerInput] = useState(false);
  const [newCoLocateRepower, setNewCoLocateRepower] = useState("");
  
  // Project type options (NEW - matching AddSiteModal)
  const projectTypeOptions = [
    { value: "All", label: "All" },
    { value: "Redev", label: "Redev" },
    { value: "M&A", label: "M&A" },
    { value: "Owned", label: "Owned" }
  ];
  
  // Define transactability score options with descriptive labels
  const transactabilityScoreOptions = [
    { value: 1, label: "1 - Bilateral w/ developed relationship" },
    { value: 2, label: "2 - Bilateral w/new relationship or Process w/less than 10 bidders" },
    { value: 3, label: "3 - Highly Competitive Process - More than 10 Bidders" }
  ];
  
  // Helper function to extract unique values for dropdowns
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

  // Extract redevelopment dropdown options from Excel data
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

  const extractRedevTechOptions = () => {
    return technologyOptions; // Use the same as Tech
  };

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

  // Extract Plant Owner options (NEW - matching AddSiteModal)
  const extractPlantOwnerOptions = () => {
    const values = new Set();
    allData.forEach(row => {
      const value = row["Plant Owner"];
      if (value && value.toString().trim() !== "") {
        values.add(value.toString().trim());
      }
    });
    return Array.from(values).sort();
  };

  // Extract Co-Locate/Repower options (NEW - matching AddSiteModal)
  const extractCoLocateRepowerOptions = () => {
    const values = new Set();
    allData.forEach(row => {
      const value = row["Co-Locate/Repower"];
      if (value && value.toString().trim() !== "") {
        values.add(value.toString().trim());
      }
    });
    return Array.from(values).sort();
  };

  // Get all dropdown options
  const redevTierOptions = extractRedevTierOptions();
  const redevTechOptions = extractRedevTechOptions();
  const redevFuelOptions = extractRedevFuelOptions();
  const redevLandControlOptions = extractRedevLandControlOptions();
  const redevStageGateOptions = extractRedevStageGateOptions();
  const redevLeadOptions = extractRedevLeadOptions();
  const redevSupportOptions = extractRedevSupportOptions();
  const plantOwnerOptions = extractPlantOwnerOptions(); // NEW
  const coLocateRepowerOptions = extractCoLocateRepowerOptions(); // NEW
  
  const existingFuelTypes = extractUniqueValues(allData, "Fuel");
  
  // Extract transactability options from Excel data
  const extractTransactabilityOptions = () => {
    const options = new Set();
    allData.forEach(row => {
      const transactabilityStr = row["Transactability"];
      if (transactabilityStr && transactabilityStr.toString().trim() !== "") {
        options.add(transactabilityStr.toString().trim());
      }
    });
    return Array.from(options).sort();
  };

  const rawTransactabilityOptions = extractTransactabilityOptions();
  
  // Format transactability options for dropdown
  const transactabilityOptions = rawTransactabilityOptions.map(option => {
    return { value: option, label: option };
  });

  // Extract redevelopment base case options
  const extractRedevelopmentBaseOptions = () => {
    const options = new Set();
    allData.forEach(row => {
      const baseCaseStr = row["Redevelopment Base Case"];
      if (baseCaseStr && baseCaseStr.toString().trim() !== "") {
        // Split by newlines and slashes to get individual options
        const bases = baseCaseStr.toString().split(/[\n\/]/).map(b => b.trim()).filter(b => b);
        bases.forEach(base => options.add(base));
      }
    });
    return Array.from(options).sort();
  };

  const redevelopmentBaseOptions = extractRedevelopmentBaseOptions();
  
  // Helper function to clean numeric values from Excel
  const cleanNumericValue = (value) => {
    if (!value && value !== 0) return "";
    
    const stringValue = value.toString();
    
    // Handle #N/A values
    if (stringValue.includes('#N/A') || stringValue.includes('N/A')) return "";
    
    // Remove commas, spaces, and any non-numeric characters except decimal point
    const cleaned = stringValue
      .replace(/[,\s]/g, '') // Remove commas and spaces
      .replace(/[^\d.-]/g, ''); // Remove any non-numeric except . and -
    
    // If it's empty after cleaning, return empty string
    if (cleaned === '' || cleaned === '-') return "";
    
    // Convert to number and check if it's valid
    const numericValue = parseFloat(cleaned);
    return isNaN(numericValue) ? "" : numericValue;
  };
  
  // Helper function to clean capacity factor percentage
  const cleanCapacityFactor = (value) => {
    if (!value && value !== 0) return "";
    
    const stringValue = value.toString();
    
    // Handle #N/A values
    if (stringValue.includes('#N/A') || stringValue.includes('N/A')) return "";
    
    // Remove percentage signs and clean
    const cleaned = stringValue
      .replace(/%/g, '') // Remove percentage signs
      .replace(/[,\s]/g, '') // Remove commas and spaces
      .replace(/[^\d.-]/g, ''); // Remove any non-numeric except . and -
    
    if (cleaned === '' || cleaned === '-') return "";
    
    const numericValue = parseFloat(cleaned);
    return isNaN(numericValue) ? "" : numericValue;
  };
  
  // CRITICAL FIX: Enhanced function to handle Transactability Score with #N/A values
  const cleanTransactabilityScore = (value) => {
    if (!value && value !== 0) return "";
    
    const stringValue = value.toString().trim();
    
    // Handle #N/A values
    if (stringValue === '#N/A' || stringValue === 'N/A' || stringValue === '#VALUE!') {
      return "";
    }
    
    // Try to convert to number
    const numericValue = parseFloat(stringValue);
    
    // Only return if it's one of our valid options (1, 2, or 3)
    if ([1, 2, 3].includes(numericValue)) {
      return numericValue;
    }
    
    return "";
  };
  
  // Initialize form data when modal opens - FIXED PROJECT TYPE INITIALIZATION
  useEffect(() => {
    if (showEditModal && projectData) {
      console.log("=== EDIT MODAL: Project Data received ===");
      console.log("Full projectData:", projectData);
      console.log("Available keys:", Object.keys(projectData));
      
      // Extract capacity value and clean it
      const rawCapacity = projectData["Legacy Nameplate Capacity (MW)"] || projectData.mw || projectData.capacity || "";
      const cleanedCapacity = cleanNumericValue(rawCapacity);
      
      // Extract capacity factor and clean it
      const rawCapacityFactor = projectData["2024 Capacity Factor"] || projectData.cf || "";
      const cleanedCapacityFactor = cleanCapacityFactor(rawCapacityFactor);
      
      // Extract heat rate and clean it
      const rawHeatRate = projectData["Heat Rate (Btu/kWh)"] || projectData.hr || "";
      const cleanedHeatRate = cleanNumericValue(rawHeatRate);
      
      // Extract redevelopment capacity and clean it
      const rawRedevCapacity = projectData["Redev Capacity (MW)"] || "";
      const cleanedRedevCapacity = cleanNumericValue(rawRedevCapacity);
      
      // Extract redevelopment heatrate and clean it
      const rawRedevHeatrate = projectData["Redev Heatrate (Btu/kWh)"] || "";
      const cleanedRedevHeatrate = cleanNumericValue(rawRedevHeatrate);
      
      // CRITICAL FIX: Extract Transactability Score from Column AH
      const rawTransactabilityScore = projectData["Transactability Scores"] || 
                                projectData["Transactability Score"] || 
                                projectData.transactabilityScore || 
                                projectData["Transactibility"] || ""; // Handle misspelling
      const cleanedTransactabilityScore = cleanTransactabilityScore(rawTransactabilityScore);
      
      // Parse redevelopment base case (can be multiple values separated by newline or slash)
      let redevBaseCaseArray = [];
      const rawRedevBaseCase = projectData["Redevelopment Base Case"] || "";
      if (rawRedevBaseCase && rawRedevBaseCase.toString().trim() !== "") {
        redevBaseCaseArray = rawRedevBaseCase.toString().split(/[\n\/]/).map(b => b.trim()).filter(b => b);
      }
      
      // ========== CRITICAL FIX: Parse Project Type from existing data ==========
      let projectTypeArray = [];
      const rawProjectType = projectData["Project Type"] || projectData.projectType || "";
      console.log("Raw Project Type from data:", rawProjectType);
      
      if (rawProjectType && rawProjectType.toString().trim() !== "") {
        // Parse comma-separated values from Excel like "Redev, M&A, Owned"
        projectTypeArray = rawProjectType.toString()
          .split(',')
          .map(t => t.trim())
          .filter(t => t && t !== "All"); // Filter out empty and "All" if present
        
        console.log("Parsed Project Types:", projectTypeArray);
      }
      // ========== END CRITICAL FIX ==========
      
      // Create a comprehensive form data object that maps from all possible sources
      const formattedData = {
        // Try to get from Excel column names first
        "Legacy Nameplate Capacity (MW)": cleanedCapacity,
        "Project Name": projectData["Project Name"] || projectData.asset || "",
        "Project Codename": projectData["Project Codename"] || projectData.codename || "",
        "Plant Owner": projectData["Plant Owner"] || projectData.owner || "",
        "Location": projectData["Location"] || projectData.location || "",
        "Site Acreage": projectData["Site Acreage"] || projectData.acreage || "",
        "Tech": projectData["Tech"] || projectData.tech || "",
        "Heat Rate (Btu/kWh)": cleanedHeatRate,
        "2024 Capacity Factor": cleanedCapacityFactor,
        "Legacy COD": projectData["Legacy COD"] || projectData.cod || "",
        "Fuel": projectData["Fuel"] || projectData.fuel || "",
        "ISO": projectData["ISO"] || projectData.mkt || "",
        "Zone/Submarket": projectData["Zone/Submarket"] || projectData.zone || "",
        "Markets": projectData["Markets"] || projectData.markets || "",
        "Process (P) or Bilateral (B)": projectData["Process (P) or Bilateral (B)"] || projectData.process || "",
        "Gas Reference": projectData["Gas Reference"] || projectData.gasReference || "",
        // CRITICAL: Use "Transactability Scores" (Column AH)
        "Transactability Scores": cleanedTransactabilityScore,
        // "Transactability" is the text description (Column AI)
        "Transactability": projectData["Transactability"] || projectData.transactability || "",
        "Co-Locate/Repower": projectData["Co-Locate/Repower"] || projectData.colocateRepower || "",
        "Contact": projectData["Contact"] || projectData.contact || "",
        "Project Type": rawProjectType || "", // CRITICAL: Include in form data
        
        // NEW: Redevelopment fields
        "Redev Tier": projectData["Redev Tier"] || "",
        "Redevelopment Base Case": rawRedevBaseCase || "",
        "Redev Capacity (MW)": cleanedRedevCapacity,
        "Redev Tech": projectData["Redev Tech"] || "",
        "Redev Fuel": projectData["Redev Fuel"] || "",
        "Redev Heatrate (Btu/kWh)": cleanedRedevHeatrate,
        "Redev COD": projectData["Redev COD"] || "",
        "Redev Land Control": projectData["Redev Land Control"] || "",
        "Redev Stage Gate": projectData["Redev Stage Gate"] || "",
        "Redev Lead": projectData["Redev Lead"] || "",
        "Redev Support": projectData["Redev Support"] || "",
      };
      
      // ========== CRITICAL: Set selected project types ==========
      setSelectedProjectTypes(projectTypeArray);
      
      // Set selected redevelopment bases
      setSelectedRedevelopmentBases(redevBaseCaseArray);
      
      // Log the values specifically for debugging
      console.log("Raw Transactability Score:", rawTransactabilityScore);
      console.log("Cleaned Transactability Score:", cleanedTransactabilityScore);
      console.log("Redevelopment Base Cases:", redevBaseCaseArray);
      console.log("Project Types:", projectTypeArray);
      console.log("Formatted data:", formattedData);
      
      setFormData(formattedData);
      setLocationInput(formattedData["Location"] || "");
    }
  }, [showEditModal, projectData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (field === "Location") {
      setLocationInput(value);
    }
  };

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

  // Transactability handler (text description from Column AI)
  const handleTransactabilityChange = (value) => {
    handleInputChange("Transactability", value);
  };

  // Transactability Score handler (numeric from Column AH) - updated for dropdown
  const handleTransactabilityScoreChange = (value) => {
    const numericValue = parseInt(value, 10);
    handleInputChange("Transactability Scores", isNaN(numericValue) ? "" : numericValue);
  };

  // Project Type handler (NEW - matching AddSiteModal)
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

  // Redevelopment Base Case handler for Edit modal
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

  // Co-locate/repower handlers (NEW - matching AddSiteModal)
  const handleCoLocateRepowerChange = (value) => {
    if (value === "add_new") {
      setShowNewCoLocateRepowerInput(true);
    } else {
      setShowNewCoLocateRepowerInput(false);
      handleInputChange("Co-Locate/Repower", value);
    }
  };

  // Form validation
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Check if at least one project type is selected (NEW - matching AddSiteModal)
    if (selectedProjectTypes.length === 0) {
      alert("Please select at least one Project Type");
      return;
    }
    
    console.log("Submitting form data:", formData);
    console.log("Transactability Score being submitted:", formData["Transactability Scores"]);
    console.log("Project Type being submitted:", formData["Project Type"]);
    handleUpdateProject(formData);
  };

  if (!showEditModal) return null;

  return (
    <div className="modal-overlay" onClick={closeEditModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "1100px" }}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Project: {formData["Project Name"] || "Unknown Project"}</h2>
          <button className="modal-close" onClick={closeEditModal}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-section">
              <h3 className="form-section-title">Basic Information</h3>
              
              {/* Project Type - NEW: Added to match AddSiteModal */}
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
                    value={formData["Project Name"] || ""}
                    onChange={(e) => handleInputChange("Project Name", e.target.value)}
                    placeholder="Enter project name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Project Codename</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData["Project Codename"] || ""}
                    onChange={(e) => handleInputChange("Project Codename", e.target.value)}
                    placeholder="Enter codename"
                  />
                </div>
                
                {/* Plant Owner - UPDATED: Changed to dropdown to match AddSiteModal */}
                <div className="form-group">
                  <label className="form-label required">Plant Owner</label>
                  <select
                    className="form-select"
                    value={formData["Plant Owner"] || ""}
                    onChange={(e) => handleInputChange("Plant Owner", e.target.value)}
                    required
                  >
                    <option value="">Select Plant Owner</option>
                    {plantOwnerOptions.map(owner => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label required">Location</label>
                  <div className="autocomplete-wrapper">
                    <input
                      type="text"
                      className="form-input"
                      value={locationInput}
                      onChange={(e) => handleLocationInputChange(e.target.value)}
                      placeholder="City, State"
                      required
                    />
                    {showLocationSuggestions && filteredLocations.length > 0 && (
                      <div className="autocomplete-dropdown">
                        {filteredLocations.map((city, index) => (
                          <div
                            key={`${city}-${index}`}
                            className="autocomplete-item"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectCity(city);
                            }}
                          >
                            {city}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Site Acreage</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData["Site Acreage"] || ""}
                    onChange={(e) => handleInputChange("Site Acreage", e.target.value)}
                    placeholder="Enter acreage"
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
                    value={formData["Legacy Nameplate Capacity (MW)"] || ""}
                    onChange={(e) => handleInputChange("Legacy Nameplate Capacity (MW)", e.target.value)}
                    placeholder="Enter capacity in MW"
                    required
                    step="0.1"
                    min="0"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label required">Technology</label>
                  <select
                    className="form-select"
                    value={formData["Tech"] || ""}
                    onChange={(e) => handleInputChange("Tech", e.target.value)}
                    required
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
                    value={formData["Heat Rate (Btu/kWh)"] || ""}
                    onChange={(e) => handleInputChange("Heat Rate (Btu/kWh)", e.target.value)}
                    placeholder="Enter heat rate"
                    step="100"
                    min="0"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Capacity Factor (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData["2024 Capacity Factor"] || ""}
                    onChange={(e) => handleInputChange("2024 Capacity Factor", e.target.value)}
                    placeholder="Enter capacity factor"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Legacy COD</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData["Legacy COD"] || ""}
                    onChange={(e) => handleLegacyCODChange(e.target.value)}
                    placeholder="YYYY"
                    maxLength="4"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Fuel</label>
                  <select
                    className="form-select"
                    value={formData["Fuel"] || ""}
                    onChange={(e) => handleInputChange("Fuel", e.target.value)}
                  >
                    <option value="">Select Fuel Type</option>
                    {existingFuelTypes.map(fuel => (
                      <option key={fuel} value={fuel}>{fuel}</option>
                    ))}
                  </select>
                </div>
                
                {/* UPDATED: Transactability Score field as dropdown with labels */}
                <div className="form-group">
                  <label className="form-label">Transactability Score</label>
                  <select
                    className="form-select"
                    value={formData["Transactability Scores"] || ""}
                    onChange={(e) => handleTransactabilityScoreChange(e.target.value)}
                  >
                    <option value="">Select Transactability Score</option>
                    {transactabilityScoreOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
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
                    value={formData["ISO"] || ""}
                    onChange={(e) => handleInputChange("ISO", e.target.value)}
                    required
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
                    value={formData["Zone/Submarket"] || ""}
                    onChange={(e) => handleInputChange("Zone/Submarket", e.target.value)}
                    placeholder="Enter zone/submarket"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Markets</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData["Markets"] || ""}
                    onChange={(e) => handleInputChange("Markets", e.target.value)}
                    placeholder="Enter markets"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label required">Process Type</label>
                  <select
                    className="form-select"
                    value={formData["Process (P) or Bilateral (B)"] || ""}
                    onChange={(e) => handleInputChange("Process (P) or Bilateral (B)", e.target.value)}
                    required
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
                    value={formData["Gas Reference"] || ""}
                    onChange={(e) => handleInputChange("Gas Reference", e.target.value)}
                    placeholder="Enter gas reference"
                  />
                </div>
              </div>
            </div>

            {/* Transactability Section - Text description from Column AI */}
            <div className="form-section">
              <h3 className="form-section-title">Transactability Description</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Transactability Description</label>
                  <select
                    className="form-select"
                    value={formData["Transactability"] || ""}
                    onChange={(e) => handleTransactabilityChange(e.target.value)}
                  >
                    <option value="">Select Transactability Description</option>
                    {transactabilityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <small className="form-hint">
                    Text description from Excel column "Transactability" (Column AI)
                  </small>
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
                    value={formData["Redev Tier"] || ""}
                    onChange={(e) => handleInputChange("Redev Tier", e.target.value)}
                  >
                    <option value="">Select Redev Tier</option>
                    {redevTierOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {/* Redevelopment Base Case - Added to Edit modal */}
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
                        <button 
                          type="button" 
                          className="btn-add-small"
                          onClick={addNewRedevelopmentBase}
                        >
                          Add
                        </button>
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
                    value={formData["Redev Capacity (MW)"] || ""}
                    onChange={(e) => handleInputChange("Redev Capacity (MW)", e.target.value)}
                    placeholder="Enter redev capacity"
                    step="0.1"
                    min="0"
                  />
                </div>

                {/* Redev Tech */}
                <div className="form-group">
                  <label className="form-label">Redev Tech</label>
                  <select
                    className="form-select"
                    value={formData["Redev Tech"] || ""}
                    onChange={(e) => handleInputChange("Redev Tech", e.target.value)}
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
                    value={formData["Redev Fuel"] || ""}
                    onChange={(e) => handleInputChange("Redev Fuel", e.target.value)}
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
                    value={formData["Redev Heatrate (Btu/kWh)"] || ""}
                    onChange={(e) => handleInputChange("Redev Heatrate (Btu/kWh)", e.target.value)}
                    placeholder="Enter redev heatrate"
                    step="100"
                    min="0"
                  />
                </div>

                {/* Redev COD */}
                <div className="form-group">
                  <label className="form-label">Redev COD</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData["Redev COD"] || ""}
                    onChange={(e) => handleInputChange("Redev COD", e.target.value)}
                    placeholder="YYYY or description"
                  />
                </div>

                {/* Redev Land Control */}
                <div className="form-group">
                  <label className="form-label">Redev Land Control</label>
                  <select
                    className="form-select"
                    value={formData["Redev Land Control"] || ""}
                    onChange={(e) => handleInputChange("Redev Land Control", e.target.value)}
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
                    value={formData["Redev Stage Gate"] || ""}
                    onChange={(e) => handleInputChange("Redev Stage Gate", e.target.value)}
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
                    value={formData["Redev Lead"] || ""}
                    onChange={(e) => handleInputChange("Redev Lead", e.target.value)}
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
                    value={formData["Redev Support"] || ""}
                    onChange={(e) => handleInputChange("Redev Support", e.target.value)}
                  >
                    <option value="">Select Redev Support</option>
                    {redevSupportOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                {/* Co-Locate/Repower - UPDATED: Changed to dropdown to match AddSiteModal */}
                <div className="form-group">
                  <label className="form-label">Co-Locate/Repower</label>
                  <div className="select-with-add" style={{ width: '100%' }}>
                    {!showNewCoLocateRepowerInput ? (
                      <>
                        <select
                          className="form-select"
                          value={formData["Co-Locate/Repower"] || ""}
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
                    value={formData["Contact"] || ""}
                    onChange={(e) => handleInputChange("Contact", e.target.value)}
                    placeholder="Enter contact person"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={closeEditModal}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
            >
              Update Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSiteModal;