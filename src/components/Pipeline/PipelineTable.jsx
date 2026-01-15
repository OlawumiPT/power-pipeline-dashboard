import React, { useState, useEffect } from 'react';
import { sortableColumns } from '../../constants/scoringWeights';

const PipelineTable = ({ 
  pipelineRows, 
  sortConfig, 
  handleSort, 
  getSortDirectionClass, 
  resetSort,
  getSortedPipelineRows,
  handleProjectClick,
  handleEditProject,
  handleDeleteProject,
  activeTechFilter,
  clearTechFilter,
  clearCounterpartyFilter,
  clearIsoFilter,
  clearRedevFilter,
  activeCounterpartyFilter,
  activeIsoFilter,
  activeRedevFilter,
  selectedProjectType // ADDED: This prop tells us which project type filter is active
}) => {

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
  const [filteredRows, setFilteredRows] = useState(pipelineRows);
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  
  // Searchable fields
  const searchableFields = [
    { value: 'all', label: 'All Fields' },
    { value: 'asset', label: 'Project Name' },
    { value: 'location', label: 'Location' },
    { value: 'owner', label: 'Owner' },
    { value: 'status', label: 'Status' },
    { value: 'mkt', label: 'Market (ISO)' },
    { value: 'zone', label: 'Zone' },
    { value: 'tech', label: 'Technology' },
    { value: 'cod', label: 'COD' },
    { value: 'fuel', label: 'Fuel' },
    { value: 'contact', label: 'Contact' },
    { value: 'redevBaseCase', label: 'Redevelopment Base Case' },
    { value: 'redevCapacity', label: 'Redevelopment Capacity' },
    { value: 'redevTier', label: 'Redevelopment Tier' },
    { value: 'redevTech', label: 'Redevelopment Tech' },
    { value: 'redevFuel', label: 'Redevelopment Fuel' },
    { value: 'redevLead', label: 'Redevelopment Lead' },
    { value: 'redevStageGate', label: 'Redevelopment Stage Gate' },
    { value: 'projectType', label: 'Project Type' },
  ];

  // Load saved search preferences
  useEffect(() => {
    const savedSearchTerm = sessionStorage.getItem('pipelineSearchTerm');
    const savedSearchField = sessionStorage.getItem('pipelineSearchField');
    const savedAdvancedSearch = sessionStorage.getItem('pipelineAdvancedSearch');
    
    if (savedSearchTerm) setSearchTerm(savedSearchTerm);
    if (savedSearchField) setSearchField(savedSearchField);
    if (savedAdvancedSearch) setIsAdvancedSearch(savedAdvancedSearch === 'true');
  }, []);

  // Save search preferences
  useEffect(() => {
    sessionStorage.setItem('pipelineSearchTerm', searchTerm);
    sessionStorage.setItem('pipelineSearchField', searchField);
    sessionStorage.setItem('pipelineAdvancedSearch', isAdvancedSearch.toString());
  }, [searchTerm, searchField, isAdvancedSearch]);

  // Filter rows based on search and filters
  useEffect(() => {
    let filtered = pipelineRows;
    
    // Apply tech filter
    if (activeTechFilter) {
      filtered = filtered.filter(row => {
        const matchesTech = row.tech?.toLowerCase().includes(activeTechFilter.toLowerCase());
        const matchesRedevTech = row.redevTech?.toLowerCase().includes(activeTechFilter.toLowerCase());
        
        if (activeTechFilter === 'Gas/Thermal') {
          return row.tech?.toLowerCase().includes('gas') || 
                 row.tech?.toLowerCase().includes('thermal') ||
                 row.fuel?.toLowerCase().includes('gas') ||
                 row.redevFuel?.toLowerCase().includes('gas');
        }
        
        return matchesTech || matchesRedevTech;
      });
    }
    
    // Apply counterparty filter
    if (activeCounterpartyFilter) {
      filtered = filtered.filter(row => {
        return row.owner?.toLowerCase() === activeCounterpartyFilter.toLowerCase();
      });
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchTerms = searchTerm.toLowerCase().split(/\s+/).filter(term => term.length > 0);
      
      filtered = filtered.filter(row => {
        if (!isAdvancedSearch) {
          const searchableValues = [
            row.asset || '',
            row.location || '',
            row.owner || '',
            row.status || '',
            row.mkt || '',
            row.zone || '',
            row.tech || '',
            row.cod || '',
            row.fuel || '',
            row.contact || '',
            row.redevBaseCase || '',
            row.redevCapacity?.toString() || '',
            row.redevTier?.toString() || '',
            row.redevTech || '',
            row.redevFuel || '',
            row.redevLead || '',
            row.redevStageGate || '',
            row.projectType || '',
            row.overall?.toString() || '',
            row.thermal?.toString() || '',
            row.redev?.toString() || '',
            row.transactabilityScore?.toString() || '',
            row.mw?.toString() || '',
            row.hr?.toString() || '',
            row.cf?.toString() || '',
          ];
          
          const rowText = searchableValues.join(' ').toLowerCase();
          return searchTerms.every(term => rowText.includes(term));
        }
        
        if (searchField === 'all') {
          const searchableValues = [
            row.asset || '',
            row.location || '',
            row.owner || '',
            row.status || '',
            row.mkt || '',
            row.zone || '',
            row.tech || '',
            row.cod || '',
            row.fuel || '',
            row.contact || '',
            row.redevBaseCase || '',
            row.redevCapacity?.toString() || '',
            row.redevTier?.toString() || '',
            row.redevTech || '',
            row.redevFuel || '',
            row.redevLead || '',
            row.redevStageGate || '',
            row.projectType || '',
            row.overall?.toString() || '',
            row.thermal?.toString() || '',
            row.redev?.toString() || '',
            row.transactabilityScore?.toString() || '',
          ];
          
          const rowText = searchableValues.join(' ').toLowerCase();
          return searchTerms.every(term => rowText.includes(term));
        } else {
          const fieldValue = row[searchField] || '';
          const fieldText = fieldValue.toString().toLowerCase();
          return searchTerms.every(term => fieldText.includes(term));
        }
      });
    }
    
    setFilteredRows(filtered);
  }, [searchTerm, searchField, isAdvancedSearch, pipelineRows, activeTechFilter, activeCounterpartyFilter]);

  // Get sorted rows (for manual sorting via column headers)
  const getSortedFilteredRows = () => {
    if (!sortConfig.column || sortConfig.direction === 'none') {
      return filteredRows;
    }
    
    const rowsToSort = [...filteredRows];
    
    return rowsToSort.sort((a, b) => {
      const aVal = a[sortConfig.column];
      const bVal = b[sortConfig.column];
      
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      
      // Special handling for Redev Tier when manually sorting
      if (sortConfig.column === 'redevTier') {
        const tierOrder = {
          '0': 0, 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
          '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
          'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5
        };
        
        const getTierValue = (tier) => {
          if (tier === undefined || tier === null || tier === '') return 999;
          const tierStr = String(tier).trim();
          return tierOrder[tierStr] !== undefined ? tierOrder[tierStr] : 999;
        };
        
        const aTierValue = getTierValue(aVal);
        const bTierValue = getTierValue(bVal);
        
        return sortConfig.direction === 'asc' ? aTierValue - bTierValue : bTierValue - aTierValue;
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setShowFieldDropdown(false);
    
    if (clearTechFilter && typeof clearTechFilter === 'function') clearTechFilter();
    if (clearCounterpartyFilter && typeof clearCounterpartyFilter === 'function') clearCounterpartyFilter();
    if (clearIsoFilter && typeof clearIsoFilter === 'function') clearIsoFilter();
    if (clearRedevFilter && typeof clearRedevFilter === 'function') clearRedevFilter();
  };

  // Toggle advanced search
  const toggleAdvancedSearch = () => {
    setIsAdvancedSearch(!isAdvancedSearch);
    if (!isAdvancedSearch && searchField === 'all') {
      setSearchField('asset');
    }
  };

  // Get current search field label
  const getCurrentFieldLabel = () => {
    const field = searchableFields.find(f => f.value === searchField);
    return field ? field.label : 'All Fields';
  };

  // Format redev capacity
  const formatRedevCapacity = (value) => {
    if (value === undefined || value === null || value === '') return '';
    if (typeof value === 'number') return value.toLocaleString();
    return value;
  };

  // Format redev tier
  const formatRedevTier = (value) => {
    if (value === undefined || value === null || value === '') return '';
    if (typeof value === 'number') return value.toLocaleString();
    return value;
  };

  // Format project type
  const formatProjectType = (value) => {
    if (!value) return '';
    if (typeof value === 'string' && value.includes(',')) {
      return value.split(',').map(type => type.trim()).filter(type => type);
    }
    return [value];
  };

  // Format redev fuel
  const formatRedevFuel = (value) => {
    if (!value) return '';
    if (typeof value === 'string' && value.includes(',')) {
      return value.split(',').map(fuel => fuel.trim()).filter(fuel => fuel);
    }
    return [value];
  };

  // Determine status from COD
  const getStatus = (cod) => {
    if (!cod) return 'Unknown';
    const currentYear = new Date().getFullYear();
    const codYear = parseInt(cod);
    
    if (isNaN(codYear)) {
      if (cod.toLowerCase().includes('future') || cod.toLowerCase().includes('planned')) {
        return 'Future';
      }
      return 'Operating';
    }
    
    if (codYear < currentYear) return 'Operating';
    if (codYear > currentYear) return 'Future';
    return 'Operating';
  };

  // Handle delete click
  const handleDeleteClick = (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    if (handleDeleteProject && typeof handleDeleteProject === 'function') {
      handleDeleteProject(projectId);
    }
  };

  // FIXED: Handle Edit Click with proper data mapping
  const handleEditClick = (e, row) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('=== EDIT CLICK: Preparing data for edit modal ===');
    console.log('Row data:', row);
    
    // Map ALL fields from pipeline table to edit modal format
    const editData = {
      id: row.id,
      project_id: row.id, // Add project_id as backup
      
      // Basic Information
      "Project Name": row.asset || "",
      "Project Codename": row.codename || "",
      "Plant Owner": row.owner || "",
      "Location": row.location || "",
      "Site Acreage": row.acreage || "",
      "Status": row.status || getStatus(row.cod) || "",
      
      // Technical Details
      "Legacy Nameplate Capacity (MW)": row.mw || "",
      "Tech": row.tech || "",
      "Heat Rate (Btu/kWh)": row.hr || "",
      "2024 Capacity Factor": row.cf || "",
      "Legacy COD": row.cod || "",
      "Fuel": row.fuel || "",
      
      // Market Details
      "ISO": row.mkt || "",
      "Zone/Submarket": row.zone || "",
      "Markets": row.markets || "",
      "Process (P) or Bilateral (B)": row.process || "",
      "Gas Reference": row.gasReference || "",
      "Transactability": row.transactabilityScore || "",
      
      // Redevelopment Details
      "Redev Tier": row.redevTier || "",
      "Redevelopment Base Case": row.redevBaseCase || "",
      "Redev Capacity (MW)": row.redevCapacity || "",
      "Redev Tech": row.redevTech || "",
      "Redev Fuel": row.redevFuel || "",
      "Redev Heatrate (Btu/kWh)": row.redevHeatrate || "",
      "Redev COD": row.redevCOD || "",
      "Redev Land Control": row.redevLandControl || "",
      "Redev Stage Gate": row.redevStageGate || "",
      "Redev Lead": row.redevLead || "",
      "Redev Support": row.redevSupport || "",
      "Co-Locate/Repower": row.colocateRepower || "",
      
      // Additional Information
      "Contact": row.contact || "",
      "Project Type": row.projectType || "",
      
      // Include database field names for backend
      project_name: row.asset || "",
      project_codename: row.codename || "",
      plant_owner: row.owner || "",
      location: row.location || "",
      site_acreage: row.acreage || "",
      status: row.status || getStatus(row.cod) || "",
      legacy_capacity_mw: row.mw || "",
      technology: row.tech || "",
      heat_rate_btu_kwh: row.hr || "",
      capacity_factor_percent: row.cf || "",
      legacy_cod: row.cod || "",
      fuel_type: row.fuel || "",
      iso_rto: row.mkt || "",
      zone_submarket: row.zone || "",
      markets: row.markets || "",
      process_type: row.process || "",
      gas_reference: row.gasReference || "",
      transactability_score: row.transactabilityScore || "",
      redev_tier: row.redevTier || "",
      redev_base_case: row.redevBaseCase || "",
      redev_capacity_mw: row.redevCapacity || "",
      redev_tech: row.redevTech || "",
      redev_fuel: row.redevFuel || "",
      redev_heatrate_btu_kwh: row.redevHeatrate || "",
      redev_cod: row.redevCOD || "",
      redev_land_control: row.redevLandControl || "",
      redev_stage_gate: row.redevStageGate || "",
      redev_lead: row.redevLead || "",
      redev_support: row.redevSupport || "",
      co_locate_repower: row.colocateRepower || "",
      contact_name: row.contact || "",
      project_type: row.projectType || "",
      
      // Include the detailData if it exists
      detailData: row.detailData || {}
    };
    
    console.log('Mapped edit data:', editData);
    console.log('Project ID being sent:', editData.id);
    console.log('Project Type being sent:', editData["Project Type"]);
    console.log('Redev Fuel being sent:', editData["Redev Fuel"]);
    console.log('Redev Base Case being sent:', editData["Redevelopment Base Case"]);
    
    if (handleEditProject && typeof handleEditProject === 'function') {
      handleEditProject(editData);
    } else {
      console.error('handleEditProject is not a function');
      alert('Edit functionality is not available.');
    }
  };

  // FIXED: Generate sequential display numbers for filtered rows
  const getDisplayNumbers = () => {
    const sortedFilteredRows = getSortedFilteredRows();
    const displayNumbers = {};
    
    sortedFilteredRows.forEach((row, index) => {
      displayNumbers[row.id] = index + 1;
    });
    
    return displayNumbers;
  };

  const displayNumbers = getDisplayNumbers();

  return (
    <div className="card-body pipeline-body">
      {/* Search Bar */}
      <div className="pipeline-search-container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '8px 0',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          <strong>Pipeline Details</strong> 
          {searchTerm && (
            <span style={{ marginLeft: '12px', fontSize: '12px', color: '#3b82f6' }}>
              Filtered: {filteredRows.length} of {pipelineRows.length} projects
            </span>
          )}
          {activeTechFilter && (
            <span style={{ marginLeft: '12px', fontSize: '12px', color: '#10b981', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
              🔍 Filtered by Tech: {activeTechFilter}
            </span>
          )}
          {activeCounterpartyFilter && (
            <span style={{ marginLeft: '12px', fontSize: '12px', color: '#8b5cf6', backgroundColor: '#f3e8ff', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
              🔍 Filtered by Counterparty: {activeCounterpartyFilter}
            </span>
          )}
          {/* NEW: Display automatic sorting info */}
          {selectedProjectType === 'Redev' && (
            <span style={{ marginLeft: '12px', fontSize: '12px', color: '#10b981', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
              ⬆ Sorted by: Redev Tier (ascending)
            </span>
          )}
          {selectedProjectType === 'M&A' && (
            <span style={{ marginLeft: '12px', fontSize: '12px', color: '#f59e0b', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
              ⬇ Sorted by: Overall Score (descending)
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder={isAdvancedSearch ? `Search in ${getCurrentFieldLabel().toLowerCase()}...` : "Search all fields..."}
              style={{
                padding: '6px 12px 6px 32px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                width: '200px',
                transition: 'all 0.2s'
              }}
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            
            {(searchTerm || activeTechFilter || activeCounterpartyFilter) && (
              <button onClick={clearAllFilters} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: 0, width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Clear all filters">
                ×
              </button>
            )}
          </div>
          
          {/* Advanced Search Toggle */}
          <button onClick={toggleAdvancedSearch} style={{ padding: '6px 10px', borderRadius: '4px', border: `1px solid ${isAdvancedSearch ? '#3b82f6' : '#d1d5db'}`, background: isAdvancedSearch ? '#eff6ff' : 'white', color: isAdvancedSearch ? '#1d4ed8' : '#6b7280', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }} title={isAdvancedSearch ? "Switch to simple search" : "Switch to advanced search"}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isAdvancedSearch ? (<> <circle cx="11" cy="11" r="8" /> <path d="m21 21-4.35-4.35" /> <path d="M8 11h8" /> </>) : (<> <circle cx="11" cy="11" r="8" /> <path d="m21 21-4.35-4.35" /> <path d="M15 11h-4" /> <path d="M11 15v-8" /> </>)}
            </svg>
            {isAdvancedSearch ? 'Advanced' : 'Search'}
          </button>
          
          {/* Field Selector */}
          {isAdvancedSearch && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowFieldDropdown(!showFieldDropdown)} style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', minWidth: '120px', justifyContent: 'space-between' }} title="Select field to search">
                <span>{getCurrentFieldLabel()}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              
              {showFieldDropdown && (
                <>
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => setShowFieldDropdown(false)} />
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'white', border: '1px solid #d1d5db', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', zIndex: 1000, minWidth: '160px', maxHeight: '300px', overflowY: 'auto' }}>
                    {searchableFields.map(field => (
                      <button key={field.value} onClick={() => { setSearchField(field.value); setShowFieldDropdown(false); }} style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: searchField === field.value ? '#eff6ff' : 'white', color: searchField === field.value ? '#1d4ed8' : '#374151', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.1s' }} onMouseEnter={(e) => e.target.style.background = '#f9fafb'} onMouseLeave={(e) => e.target.style.background = searchField === field.value ? '#eff6ff' : 'white'}>
                        {searchField === field.value && (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>)}
                        <span>{field.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Search Tips */}
      {(searchTerm || activeTechFilter || activeCounterpartyFilter) && (
        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px', padding: '4px 8px', background: '#f9fafb', borderRadius: '4px', borderLeft: '3px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Active Filters:</strong> 
            <span style={{ marginLeft: '8px' }}>
              {activeTechFilter && (<span style={{ marginRight: '8px', backgroundColor: '#dcfce7', color: '#065f46', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>Tech: {activeTechFilter}</span>)}
              {activeCounterpartyFilter && (<span style={{ marginRight: '8px', backgroundColor: '#f3e8ff', color: '#7c3aed', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>Counterparty: {activeCounterpartyFilter}</span>)}
              {searchTerm && (<span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>Search: "{searchTerm}"</span>)}
            </span>
          </div>
          {(searchTerm || activeTechFilter || activeCounterpartyFilter) && (
            <button onClick={clearAllFilters} style={{ padding: '2px 8px', background: 'none', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Clear All Filters</button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="table-wrapper">
        <table className="pipeline-table">
          <thead>
            <tr>
              <th className={`sortable-header ${getSortDirectionClass('id')}`} onClick={() => handleSort('id')}>#</th>
              <th className={`sortable-header ${getSortDirectionClass('asset')}`} onClick={() => handleSort('asset')}>Project Name</th>
              <th className={`sortable-header ${getSortDirectionClass('owner')}`} onClick={() => handleSort('owner')}>Owner</th>
              <th className={`sortable-header ${getSortDirectionClass('status')}`} onClick={() => handleSort('status')}>Status</th>
              <th className={`sortable-header ${getSortDirectionClass('projectType')}`} onClick={() => handleSort('projectType')}>Project Type</th>
              <th className={`sortable-header ${getSortDirectionClass('overall')}`} onClick={() => handleSort('overall')}>Overall</th>
              <th className={`sortable-header ${getSortDirectionClass('thermal')}`} onClick={() => handleSort('thermal')}>Thermal</th>
              <th className={`sortable-header ${getSortDirectionClass('redev')}`} onClick={() => handleSort('redev')}>Redev</th>
              <th className={`sortable-header ${getSortDirectionClass('redevTier')}`} onClick={() => handleSort('redevTier')}>Redev Tier</th>
              <th className={`sortable-header ${getSortDirectionClass('redevBaseCase')}`} onClick={() => handleSort('redevBaseCase')}>Redev Case</th>
              <th className={`sortable-header ${getSortDirectionClass('redevCapacity')}`} onClick={() => handleSort('redevCapacity')}>Redev MW</th>
              <th className={`sortable-header ${getSortDirectionClass('redevTech')}`} onClick={() => handleSort('redevTech')}>Redev Tech</th>
              <th className={`sortable-header ${getSortDirectionClass('redevFuel')}`} onClick={() => handleSort('redevFuel')}>Redev Fuel</th>
              <th className={`sortable-header ${getSortDirectionClass('redevStageGate')}`} onClick={() => handleSort('redevStageGate')}>Stage Gate</th>
              <th className={`sortable-header ${getSortDirectionClass('transactabilityScore')}`} onClick={() => handleSort('transactabilityScore')}>Transact Score</th>
              <th className={`sortable-header ${getSortDirectionClass('mkt')}`} onClick={() => handleSort('mkt')}>Mkt</th>
              <th className={`sortable-header ${getSortDirectionClass('zone')}`} onClick={() => handleSort('zone')}>Zone</th>
              <th className={`sortable-header ${getSortDirectionClass('mw')}`} onClick={() => handleSort('mw')}>MW</th>
              <th className={`sortable-header ${getSortDirectionClass('tech')}`} onClick={() => handleSort('tech')}>Tech</th>
              <th className={`sortable-header ${getSortDirectionClass('hr')}`} onClick={() => handleSort('hr')}>HR</th>
              <th className={`sortable-header ${getSortDirectionClass('cf')}`} onClick={() => handleSort('cf')}>CF</th>
              <th className={`sortable-header ${getSortDirectionClass('cod')}`} onClick={() => handleSort('cod')}>COD</th>
              <th className="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {getSortedFilteredRows().length > 0 ? (
              getSortedFilteredRows().map((row) => {
                const status = row.status || getStatus(row.cod);
                const displayNumber = displayNumbers[row.id] || row.id;
                
                return (
                  <tr key={row.id} className={`pipeline-row ${sortConfig.column && row[sortConfig.column] !== undefined ? 'active-sort' : ''}`} onClick={() => handleProjectClick(row)}>
                    <td className="col-rank">{displayNumber}</td>
                    <td className="col-asset">
                      <div className="asset-name">{row.asset}</div>
                      <div className="asset-location">{row.location}</div>
                    </td>
                    <td>{row.owner}</td>
                    <td>
                      <span className={`status-badge ${status === 'Operating' ? 'status-operating' : status === 'Retired' ? 'status-retired' : status === 'Future' ? 'status-future' : 'status-unknown'}`}>
                        {status === 'Operating' ? 'Operating' : status === 'Retired' ? 'Retired' : status === 'Future' ? 'Future' : 'Unknown'}
                      </span>
                    </td>
                    <td>
                      {row.projectType ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '150px' }}>
                          {formatProjectType(row.projectType).map((type, index) => (
                            <span key={index} className="tag tag-blue" style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', backgroundColor: type === 'Redev' ? '#10b981' : type === 'M&A' ? '#f59e0b' : type === 'Owned' ? '#8b5cf6' : '#6b7280', color: 'white', display: 'inline-block' }} title={type}>
                              {type}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    <td><span className="badge badge-green">{row.overall?.toFixed(2) || '0.00'}</span></td>
                    <td><span className="badge badge-red">{row.thermal?.toFixed(2) || '0.00'}</span></td>
                    <td><span className="badge badge-teal">{row.redev?.toFixed(2) || '0.00'}</span></td>
                    <td>
                      {row.redevTier ? (
                        <span className="badge badge-purple">{formatRedevTier(row.redevTier)}</span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    <td>
                      {row.redevBaseCase ? (
                        <span className="tag tag-blue" style={{ maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }} title={row.redevBaseCase}>
                          {row.redevBaseCase}
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    <td>
                      {row.redevCapacity ? (
                        <span className="badge badge-orange">{formatRedevCapacity(row.redevCapacity)}</span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    <td>
                      {row.redevTech ? (
                        <span className="tag tag-yellow">{row.redevTech}</span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    <td>
                      {row.redevFuel ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '150px' }}>
                          {formatRedevFuel(row.redevFuel).map((fuel, index) => (
                            <span key={index} className="tag tag-red" style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', backgroundColor: fuel === 'Gas' ? '#10b981' : fuel === 'Diesel' ? '#f59e0b' : fuel === 'N/A' ? '#6b7280' : fuel === 'Coal' ? '#374151' : fuel === 'Oil' ? '#8b5cf6' : '#3b82f6', color: 'white', display: 'inline-block' }} title={fuel}>
                              {fuel}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    <td>
                      {row.redevStageGate ? (
                        <span className="badge badge-blue">{row.redevStageGate}</span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-purple">
                        {row.transactabilityScore !== undefined && row.transactabilityScore !== "" && row.transactabilityScore !== "#N/A" && row.transactabilityScore !== "N/A"
                          ? (typeof row.transactabilityScore === 'number' ? row.transactabilityScore.toFixed(2) : row.transactabilityScore)
                          : "N/A"}
                      </span>
                    </td>
                    <td><span className="tag tag-dark">{row.mkt}</span></td>
                    <td>{row.zone}</td>
                    <td>{row.mw?.toLocaleString() || ''}</td>
                    <td><span className="tag tag-yellow">{row.tech}</span></td>
                    <td>{row.hr?.toLocaleString() || ''}</td>
                    <td>{row.cf || ''}</td>
                    <td>{row.cod}</td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        <button className="btn-icon btn-edit" onClick={(e) => handleEditClick(e, row)} onMouseDown={(e) => e.stopPropagation()} title="Edit project">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="btn-icon btn-delete" onClick={(e) => handleDeleteClick(e, row.id)} onMouseDown={(e) => e.stopPropagation()} title="Delete project">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="23" style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280', fontSize: '14px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                      <path d="M8 11h6" />
                    </svg>
                  </div>
                  <strong>No projects found</strong>
                  <div style={{ marginTop: '8px', fontSize: '12px' }}>
                    {activeTechFilter ? `No projects matching "${activeTechFilter}" technology` : 
                     activeCounterpartyFilter ? `No projects matching counterparty "${activeCounterpartyFilter}"` :
                     'Try adjusting your search terms or switching search mode'}
                  </div>
                  <button onClick={clearAllFilters} style={{ marginTop: '16px', padding: '6px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    Clear All Filters
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div style={{ fontSize: '10px', color: '#6b7280', textAlign: 'right', paddingTop: '8px', paddingRight: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ marginRight: '12px' }}><span style={{ color: '#3b82f6', fontWeight: 'bold' }}>↑↓</span> Click headers to sort</span>
          <span><span style={{ color: '#ef4444', fontWeight: 'bold' }}>×</span> Reset to clear sort</span>
          <span style={{ marginLeft: '12px' }}><span style={{ color: '#10b981', fontWeight: 'bold' }}>⚡</span> Click chart items to filter</span>
          {/* NEW: Automatic sorting indicator */}
          {selectedProjectType === 'Redev' && (
            <span style={{ marginLeft: '12px' }}><span style={{ color: '#10b981', fontWeight: 'bold' }}>⬆</span> Auto-sorted: Redev Tier (ascending)</span>
          )}
          {selectedProjectType === 'M&A' && (
            <span style={{ marginLeft: '12px' }}><span style={{ color: '#f59e0b', fontWeight: 'bold' }}>⬇</span> Auto-sorted: Overall Score (descending)</span>
          )}
        </div>
        <div>
          Showing {getSortedFilteredRows().length} of {pipelineRows.length} projects
          {(searchTerm || activeTechFilter || activeCounterpartyFilter) && filteredRows.length < pipelineRows.length && (
            <span style={{ marginLeft: '8px', color: '#3b82f6' }}>(Filtered from {pipelineRows.length})</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PipelineTable;