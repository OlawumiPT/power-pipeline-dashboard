import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import './Dashboard.css';
import Header from './components/Header';
import KPISection from './components/Sections/KPISection';
import MiddleGridSection from './components/Sections/MiddleGridSection';
import BottomGridSection from './components/Sections/BottomGridSection';
import AddSiteModal from './components/Modals/AddSiteModal';
import EditSiteModal from './components/Modals/EditSiteModal'; 
import ProjectDetailModal from './components/Modals/ProjectDetailModal';
import ScoringPanel from './components/Modals/ScoringPanel';
import ExpertScoresPanel from './components/Modals/ExpertScoresPanel';
import ExpertAnalysisModal from './components/Modals/ExpertAnalysisModal';
import ExportModal from './components/Modals/ExportModal'; 
import UploadModal from './components/Modals/UploadModal';
// 1. Import the ActivityLogProvider and ActivityLogPanel
import { ActivityLogProvider } from './contexts/ActivityLogContext';
import ActivityLogPanel from './components/ActivityLog/ActivityLogPanel';
import { calculateAllData, filterData, findColumnName } from './utils/calculations';
import { calculateProjectScores, generateExpertAnalysis } from './utils/scoring';
import { US_CITIES } from './constants/cities';
import { scoringWeights, sortableColumns } from './constants/scoringWeights';
import { ISO_COLORS, TECH_COLORS } from './constants/colors';

function App() {
  // Data states
  const [kpiRow1, setKpiRow1] = useState([]);
  const [kpiRow2, setKpiRow2] = useState([]);
  const [isoData, setIsoData] = useState([]);
  const [techData, setTechData] = useState([]);
  const [redevelopmentTypes, setRedevelopmentTypes] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [pipelineRows, setPipelineRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectDetail, setShowProjectDetail] = useState(false);

  // Edit/Delete states
  const [editingProject, setEditingProject] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Expert analysis states
  const [showExpertScores, setShowExpertScores] = useState(false);
  const [selectedExpertProject, setSelectedExpertProject] = useState(null);
  const [expertAnalysisFilter, setExpertAnalysisFilter] = useState("all");
  
  // Filter states
  const [selectedIso, setSelectedIso] = useState("All");
  const [selectedProcess, setSelectedProcess] = useState("All");
  const [selectedOwner, setSelectedOwner] = useState("All");
  const [selectedTransmissionVoltage, setSelectedTransmissionVoltage] = useState("All");
  const [selectedHasExcessCapacity, setSelectedHasExcessCapacity] = useState("All");
  const [selectedProjectType, setSelectedProjectType] = useState("All"); // ADDED: Project Type state
  const [allOwners, setAllOwners] = useState([]);
  const [allVoltages, setAllVoltages] = useState(["All"]);
  const [allData, setAllData] = useState([]);
  const [projectTransmissionData, setProjectTransmissionData] = useState({});
  
  // Modal states
  const [showScoringPanel, setShowScoringPanel] = useState(false);
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false); // ADDED: Export modal state
  const [showUploadModal, setShowUploadModal] = useState(false); // ADDED: Upload modal state
  
  // 2. Add a state for showing activity log panel
  const [showActivityLog, setShowActivityLog] = useState(false);
  
  const [currentUser, setCurrentUser] = useState("expert");

  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    column: null,
    direction: 'none',
  });

  // Add Site Modal State
  const [newSiteData, setNewSiteData] = useState({
    "Project Name": "",
    "Project Codename": "",
    "Plant Owner": "",
    "Location": "",
    "Legacy Nameplate Capacity (MW)": "",
    "Tech": "",
    "Heat Rate (Btu/kWh)": "",
    "2024 Capacity Factor": "",
    "Legacy COD": "",
    "Fuel": "",
    "Site Acreage": "",
    "ISO": "",
    "Zone/Submarket": "",
    "Markets": "",
    "Process (P) or Bilateral (B)": "",
    "Gas Reference": "",
    "Redevelopment Base Case": "",
    "Redev COD": "",
    "Thermal Optimization": "",
    "Co-Locate/Repower": "",
    "Contact": "",
    "Overall Project Score": "",
    "Thermal Operating Score": "",
    "Redevelopment Score": "",
    "Redevelopment (Load) Score": "",
    "I&C Score": "",
    "Environmental Score": "",
    "Market Score": "",
    "Transmission Data": ""
  });

  // Dropdown options
  const technologyOptions = ["ST", "GT", "CCGT", "Hydro", "Wind", "Solar", "BESS", "Other"];
  const isoOptions = ["PJM", "NYISO", "ISONE", "MISO", "ERCOT", "CAISO", "SPP", "Other"];
  const processOptions = ["P", "B"];
  const excessCapacityOptions = ["All", "Yes", "No"];

  // Transmission data mapping
  const TRANSMISSION_DATA_MAP = {
    "Shoemaker": "69 kV|143.9|144.2|-|true;138 kV|549.5|95.5|-|true",
    "Hillburn": "69 kV|137.0|362.3|-|true;138 kV|337.7|138.5|-|true", 
    "Massena": "115 kV|553.4|145.0|1|true",
    "Ogdensburg": "115 kV|46.4|33.2|1|true",
    "Allegany": "115 kV|21.5|136.0|13|true",
    "Batavia": "115 kV|8.8|176.1|8|true",
    "Sterling": "115 kV|385.6|45.2|7|true",
    "Carthage": "115 kV|538.5|193.8|31|true",
  };

  // Create currentFilters object for export modal
  const currentFilters = {
    selectedIso,
    selectedProcess,
    selectedOwner,
    selectedTransmissionVoltage,
    selectedHasExcessCapacity,
    selectedProjectType
  };

  // ===== EDIT/DELETE HANDLERS =====
  
  const handleEditProject = (project) => {
    console.log('🎯 handleEditProject called with:', project);
    
    // Find the full project data from allData
    const fullProjectData = allData.find(row => 
      row['Project Name'] === project.asset || 
      row['Project Codename'] === project.asset ||
      (row.detailData && (row.detailData['Project Name'] === project.asset))
    ) || project.detailData || project;
    
    setEditingProject(fullProjectData);
    setShowEditModal(true);
  };

  const handleDeleteProject = (projectId) => {
    console.log('🗑️ handleDeleteProject called with ID:', projectId);
    
    // Find project to delete
    const projectToDelete = pipelineRows.find(row => row.id === projectId);
    
    if (!projectToDelete) {
      alert('Project not found!');
      return;
    }
    
    const projectName = projectToDelete.asset || projectToDelete['Project Name'] || `Project ${projectId}`;
    
    if (window.confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      // Remove from allData
      const updatedAllData = allData.filter(row => {
        const rowName = row['Project Name'] || row['Project Codename'];
        return rowName !== projectName;
      });
      
      // Remove from pipelineRows
      const updatedPipelineRows = pipelineRows.filter(row => row.id !== projectId);
      
      // Update states
      setAllData(updatedAllData);
      setPipelineRows(updatedPipelineRows);
      
      // Recalculate data
      const headers = Object.keys(updatedAllData[0] || {});
      calculateAllData(updatedAllData, headers, {
        setKpiRow1, setKpiRow2, setIsoData, setTechData, 
        setRedevelopmentTypes, setCounterparties, setPipelineRows
      });
      
      alert(`Project "${projectName}" deleted successfully!`);
    }
  };

  const handleUpdateProject = (updatedData) => {
    console.log('🔄 handleUpdateProject called with:', updatedData);
    
    const projectName = updatedData['Project Name'] || updatedData['Project Codename'];
    
    if (!projectName) {
      alert('Project name is required!');
      return;
    }
    
    // Update in allData
    const updatedAllData = allData.map(row => {
      const rowName = row['Project Name'] || row['Project Codename'];
      if (rowName === projectName) {
        return { ...row, ...updatedData };
      }
      return row;
    });
    
    // Update in pipelineRows
    const updatedPipelineRows = pipelineRows.map(row => {
      if (row.asset === projectName) {
        return {
          ...row,
          asset: updatedData['Project Name'] || row.asset,
          location: updatedData['Location'] || row.location,
          owner: updatedData['Plant Owner'] || row.owner,
          overall: parseFloat(updatedData['Overall Project Score'] || row.overall || 0),
          thermal: parseFloat(updatedData['Thermal Operating Score'] || row.thermal || 0),
          redev: parseFloat(updatedData['Redevelopment Score'] || row.redev || 0),
          mw: parseFloat(updatedData['Legacy Nameplate Capacity (MW)'] || row.mw || 0),
          tech: updatedData['Tech'] || row.tech,
          hr: parseFloat(updatedData['Heat Rate (Btu/kWh)'] || row.hr || 0),
          cf: parseFloat(updatedData['2024 Capacity Factor'] || row.cf || 0),
          cod: updatedData['Legacy COD'] || row.cod,
          // Add redevelopment fields
          redevBaseCase: updatedData['Redevelopment Base Case'] || row.redevBaseCase,
          redevCapacity: updatedData['Redev Capacity (MW)'] || row.redevCapacity,
          redevTier: updatedData['Redev Tier'] || row.redevTier,
          redevTech: updatedData['Redev Tech'] || row.redevTech,
          redevFuel: updatedData['Redev Fuel'] || row.redevFuel,
          redevHeatrate: updatedData['Redev Heatrate (Btu/kWh)'] || row.redevHeatrate,
          redevCOD: updatedData['Redev COD'] || row.redevCOD,
          redevLandControl: updatedData['Redev Land Control'] || row.redevLandControl,
          redevStageGate: updatedData['Redev Stage Gate'] || row.redevStageGate,
          redevLead: updatedData['Redev Lead'] || row.redevLead,
          redevSupport: updatedData['Redev Support'] || row.redevSupport,
          detailData: { ...row.detailData, ...updatedData }
        };
      }
      return row;
    });
    
    // Update states
    setAllData(updatedAllData);
    setPipelineRows(updatedPipelineRows);
    setShowEditModal(false);
    setEditingProject(null);
    
    // Recalculate data
    const headers = Object.keys(updatedAllData[0] || {});
    calculateAllData(updatedAllData, headers, {
      setKpiRow1, setKpiRow2, setIsoData, setTechData, 
      setRedevelopmentTypes, setCounterparties, setPipelineRows: () => {} // We already updated pipelineRows
    });
    
    alert(`Project "${projectName}" updated successfully!`);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingProject(null);
  };

  // ===== END EDIT/DELETE HANDLERS =====

  // Sorting functions
  const handleSort = (columnKey) => {
    setSortConfig(prevConfig => {
      if (prevConfig.column === columnKey) {
        switch (prevConfig.direction) {
          case 'asc':
            return { column: columnKey, direction: 'desc' };
          case 'desc':
            return { column: columnKey, direction: 'none' };
          default:
            return { column: columnKey, direction: 'asc' };
        }
      } else {
        return { column: columnKey, direction: 'asc' };
      }
    });
  };

  const getSortedPipelineRows = () => {
    const rows = [...pipelineRows];
    
    if (!sortConfig.column || sortConfig.direction === 'none') {
      return rows;
    }
    
    const column = sortableColumns.find(col => col.key === sortConfig.column);
    if (!column) return rows;
    
    return rows.sort((a, b) => {
      let aValue = a[sortConfig.column];
      let bValue = b[sortConfig.column];
      
      if (aValue == null) aValue = column.type === 'string' ? '' : 0;
      if (bValue == null) bValue = column.type === 'string' ? '' : 0;
      
      if (sortConfig.column === 'cf') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }
      
      if (column.type === 'string') {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
        
        if (sortConfig.direction === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      }
      
      if (column.type === 'number') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
        
        if (sortConfig.direction === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }
      
      return 0;
    });
  };

  const resetSort = () => {
    setSortConfig({ column: null, direction: 'none' });
  };

  const getSortDirectionClass = (columnKey) => {
    if (sortConfig.column === columnKey) {
      return `sort-${sortConfig.direction}`;
    }
    return 'sort-none';
  };

  // Filter functions
  const handleIsoFilter = (iso) => {
    setSelectedIso(iso);
  };

  const handleProcessFilter = (process) => {
    setSelectedProcess(process);
  };

  const handleOwnerFilter = (owner) => {
    setSelectedOwner(owner);
  };

  const handleTransmissionVoltageFilter = (voltage) => {
    setSelectedTransmissionVoltage(voltage);
  };

  const handleHasExcessCapacityFilter = (hasExcess) => {
    setSelectedHasExcessCapacity(hasExcess);
  };

  // ADDED: Project Type filter handler
  const handleProjectTypeFilter = (type) => {
    setSelectedProjectType(type);
  };

  const resetFilters = () => {
    setSelectedIso("All");
    setSelectedProcess("All");
    setSelectedOwner("All");
    setSelectedTransmissionVoltage("All");
    setSelectedHasExcessCapacity("All");
    setSelectedProjectType("All"); // ADDED: Reset project type
  };

  // Parse transmission data
  const parseTransmissionData = (transmissionStr) => {
    if (!transmissionStr || transmissionStr.toString().trim() === "") {
      return [];
    }
    
    const str = transmissionStr.toString().trim();
    
    try {
      return str.split(';').map(point => {
        const parts = point.split('|');
        if (parts.length >= 5) {
          return {
            voltage: parts[0].trim(),
            injectionCapacity: parseFloat(parts[1]) || 0,
            withdrawalCapacity: parseFloat(parts[2]) || 0,
            constraints: parts[3].trim(),
            hasExcessCapacity: parts[4].toLowerCase() === 'true' || parts[4] === '1'
          };
        }
        return null;
      }).filter(point => point !== null);
    } catch (error) {
      console.error('Error parsing transmission data:', error, 'String:', str);
      return [];
    }
  };

  // Event handlers
  // NOTE: pipelineRows are a simplified view of the Excel rows. Some fields (like Redevelopment fields)
  // may not be present on the pipeline row object. So when opening the ProjectDetailModal, we always
  // re-hydrate from the original Excel row in `allData`.

  const normalizeKey = (v) => (v ?? '').toString().trim().toLowerCase();

  const findExcelRowForProject = (projectName) => {
    const key = normalizeKey(projectName);
    if (!key) return null;

    return (
      allData.find(r => normalizeKey(r["Project Name"]) === key) ||
      allData.find(r => normalizeKey(r["Project Codename"]) === key) ||
      null
    );
  };

 const handleProjectClick = (project) => {
  const projectName = project.asset || 
                     project.detailData?.["Project Name"] ||
                     project.detailData?.["Project Codename"] ||
                     "";
  
  let transmissionData = [];
  
  if (projectName && TRANSMISSION_DATA_MAP[projectName]) {
    transmissionData = parseTransmissionData(TRANSMISSION_DATA_MAP[projectName]);
  } else if (project.transmissionData && project.transmissionData.length > 0) {
    transmissionData = project.transmissionData;
  } else if (projectName && projectTransmissionData[projectName]) {
    transmissionData = projectTransmissionData[projectName];
  } else if (project.detailData?.["Transmission Data"]) {
    transmissionData = parseTransmissionData(project.detailData["Transmission Data"]);
  }
  
  // Hydrate full detailData from the Excel row first (most reliable source)
  const excelRow = findExcelRowForProject(projectName);

  // Create project with ALL data including redevelopment fields
  const projectWithTransmission = {
    ...project,
    transmissionData: transmissionData,

    // Make sure the modal receives the full Excel row (plus any already-attached detailData)
    // In handleProjectClick function in App.jsx - update the detailData section
detailData: {
  ...(excelRow || {}),
  ...(project.detailData || {}),
  // Include Excel column names for redevelopment (force-fill from excelRow when present)
  "Redev Tier": (excelRow?.["Redev Tier"] && excelRow["Redev Tier"].toString().trim() !== "" 
                 ? excelRow["Redev Tier"] 
                 : project.redevTier ?? project.detailData?.["Redev Tier"] ?? ""),
  "Redev Capacity (MW)": (excelRow?.["Redev Capacity (MW)"] && excelRow["Redev Capacity (MW)"].toString().trim() !== "" 
                          ? excelRow["Redev Capacity (MW)"] 
                          : project.redevCapacity ?? project.detailData?.["Redev Capacity (MW)"] ?? ""),
  "Redev Tech": (excelRow?.["Redev Tech"] && excelRow["Redev Tech"].toString().trim() !== "" 
                 ? excelRow["Redev Tech"] 
                 : project.redevTech ?? project.detailData?.["Redev Tech"] ?? ""),
  "Redev Fuel": (excelRow?.["Redev Fuel"] && excelRow["Redev Fuel"].toString().trim() !== "" 
                 ? excelRow["Redev Fuel"] 
                 : project.redevFuel ?? project.detailData?.["Redev Fuel"] ?? ""),
  "Redev Heatrate (Btu/kWh)": (excelRow?.["Redev Heatrate (Btu/kWh)"] && excelRow["Redev Heatrate (Btu/kWh)"].toString().trim() !== "" 
                               ? excelRow["Redev Heatrate (Btu/kWh)"] 
                               : project.redevHeatrate ?? project.detailData?.["Redev Heatrate (Btu/kWh)"] ?? ""),
  "Redev COD": (excelRow?.["Redev COD"] && excelRow["Redev COD"].toString().trim() !== "" 
                ? excelRow["Redev COD"] 
                : project.redevCOD ?? project.detailData?.["Redev COD"] ?? ""),
  "Redev Land Control": (excelRow?.["Redev Land Control"] && excelRow["Redev Land Control"].toString().trim() !== "" 
                         ? excelRow["Redev Land Control"] 
                         : project.redevLandControl ?? project.detailData?.["Redev Land Control"] ?? ""),
  "Redev Stage Gate": (excelRow?.["Redev Stage Gate"] && excelRow["Redev Stage Gate"].toString().trim() !== "" 
                       ? excelRow["Redev Stage Gate"] 
                       : project.redevStageGate ?? project.detailData?.["Redev Stage Gate"] ?? ""),
  "Redev Lead": (excelRow?.["Redev Lead"] && excelRow["Redev Lead"].toString().trim() !== "" 
                 ? excelRow["Redev Lead"] 
                 : project.redevLead ?? project.detailData?.["Redev Lead"] ?? ""),
  "Redev Support": (excelRow?.["Redev Support"] && excelRow["Redev Support"].toString().trim() !== "" 
                    ? excelRow["Redev Support"] 
                    : project.redevSupport ?? project.detailData?.["Redev Support"] ?? ""),
}
  };
  
  console.log('🔍 DEBUG: Project data being sent to modal:', projectWithTransmission);
  console.log('🔍 DEBUG: Excel row found:', excelRow);
  
  setSelectedProject(projectWithTransmission);
  setShowProjectDetail(true);
};

  const closeProjectDetail = () => {
    setShowProjectDetail(false);
    setSelectedProject(null);
  };

  const openAddSiteModal = () => {
    setShowAddSiteModal(true);
  };

  const closeAddSiteModal = () => {
    setShowAddSiteModal(false);
    setNewSiteData({
      "Project Name": "",
      "Project Codename": "",
      "Plant Owner": "",
      "Location": "",
      "Legacy Nameplate Capacity (MW)": "",
      "Tech": "",
      "Heat Rate (Btu/kWh)": "",
      "2024 Capacity Factor": "",
      "Legacy COD": "",
      "Fuel": "",
      "Site Acreage": "",
      "ISO": "",
      "Zone/Submarket": "",
      "Markets": "",
      "Process (P) or Bilateral (B)": "",
      "Gas Reference": "",
      "Redevelopment Base Case": "",
      "Redev COD": "",
      "Thermal Optimization": "",
      "Co-Locate/Repower": "",
      "Contact": "",
      "Overall Project Score": "",
      "Thermal Operating Score": "",
      "Redevelopment Score": "",
      "Redevelopment (Load) Score": "",
      "I&C Score": "",
      "Environmental Score": "",
      "Market Score": "",
      "Transmission Data": ""
    });
  };

  const handleInputChange = (field, value) => {
    setNewSiteData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddSiteSubmit = (e) => {
    e.preventDefault();
    
    const newSite = {
      ...newSiteData,
      "Overall Project Score": newSiteData["Overall Project Score"] || "0.0",
      "Thermal Operating Score": newSiteData["Thermal Operating Score"] || "0.0",
      "Redevelopment Score": newSiteData["Redevelopment Score"] || "0.0",
      "2024 Capacity Factor": newSiteData["2024 Capacity Factor"] || "0.0",
      "Legacy Nameplate Capacity (MW)": newSiteData["Legacy Nameplate Capacity (MW)"] || "0",
      "Heat Rate (Btu/kWh)": newSiteData["Heat Rate (Btu/kWh)"] || "0",
      "Transmission Data": newSiteData["Transmission Data"] || ""
    };

    const updatedData = [...allData, newSite];
    setAllData(updatedData);
    
    const headers = Object.keys(updatedData[0] || {});
    calculateAllData(updatedData, headers);
    
    closeAddSiteModal();
    alert("Site added successfully!");
  };

  // Handler for scores submission (if using scoring modal)
  const handleScoresSubmitted = (scoringResult) => {
    console.log('Scores submitted:', scoringResult);
    setShowScoringModal(false);
    setSelectedExpertProject(scoringResult.project);
  };

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('🚀 App mounted - checking edit/delete handlers:', {
      handleEditProject: typeof handleEditProject,
      handleDeleteProject: typeof handleDeleteProject
    });
  }, []);

  // Data loading
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch("/pt_cleanedrecords.xlsx");
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { 
          type: "array",
          cellFormula: false,
          raw: true
        });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
          raw: true
        });
        
        const headers = rawData[0] || [];
        const cleanHeaders = headers.map((header, index) => {
          if (!header || header.toString().trim() === "") {
            return `Column_${index + 1}`;
          }
          return header.toString().trim();
        });
        
        const dataRows = rawData.slice(1);
        const processedData = [];
        const transmissionMap = {};
        const voltageSet = new Set(["All"]);
        
        dataRows.forEach((row, rowIndex) => {
          const obj = {};
          let hasData = false;
          
          cleanHeaders.forEach((header, colIndex) => {
           // const value = row[colIndex] || "";
           const value = row[colIndex] === undefined || row[colIndex] === null ? "" : row[colIndex];
            obj[header] = value;
            
            if (value && value.toString().trim() !== "") {
              hasData = true;
            }
          });
          
          if (hasData) {
            processedData.push(obj);
            
            const projectName = obj["Project Name"] || obj["Project Codename"];
            const excelTransmissionData = obj["Transmission Data"];
            
            if (projectName) {
              let transmissionData = [];
              
              if (excelTransmissionData && excelTransmissionData.toString().trim() !== "") {
                transmissionData = parseTransmissionData(excelTransmissionData);
              } else if (TRANSMISSION_DATA_MAP[projectName]) {
                transmissionData = parseTransmissionData(TRANSMISSION_DATA_MAP[projectName]);
              }
              
              if (transmissionData.length > 0) {
                transmissionMap[projectName] = transmissionData;
                transmissionData.forEach(point => {
                  if (point.voltage) {
                    voltageSet.add(point.voltage);
                  }
                });
              }
            }
          }
        });
        
        setAllData(processedData);
        setProjectTransmissionData(transmissionMap);
        setAllVoltages(Array.from(voltageSet).sort());
        
        calculateAllData(processedData, cleanHeaders, {
          setKpiRow1, setKpiRow2, setIsoData, setTechData, 
          setRedevelopmentTypes, setCounterparties, setPipelineRows
        });
        
        setLoading(false);
        
      } catch (error) {
        console.error("Error reading Excel file:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter function - UPDATED to include project type filtering
  const filterDataWithTransmission = (data, selectedIso, selectedProcess, selectedOwner, 
                                      selectedVoltage, selectedHasExcess, selectedProjectType, findColumnName) => {
    if (!data || data.length === 0) return [];
    
    let filtered = [...data];
    
    if (selectedIso !== "All") {
      filtered = filtered.filter(row => {
        const isoCol = findColumnName(row, ["ISO", "iso"]);
        const iso = isoCol ? row[isoCol] : "";
        return iso && iso.toString().trim().toUpperCase() === selectedIso.toUpperCase();
      });
    }
    
    if (selectedProcess !== "All") {
      filtered = filtered.filter(row => {
        const processCol = findColumnName(row, ["Process (P) or Bilateral (B)", "Process", "process", "P or B"]);
        const process = processCol ? row[processCol] : "";
        const processLetter = selectedProcess === "Process" ? "P" : "B";
        return process && process.toString().trim().toUpperCase() === processLetter;
      });
    }
    
    if (selectedOwner !== "All") {
      filtered = filtered.filter(row => {
        const ownerCol = findColumnName(row, ["Plant Owner", "Owner", "owner"]);
        const owner = ownerCol ? row[ownerCol] : "";
        return owner && owner.toString().trim() === selectedOwner;
      });
    }
    
    if (selectedVoltage !== "All") {
      filtered = filtered.filter(row => {
        const projectName = row["Project Name"] || row["Project Codename"];
        
        let transmissionData = [];
        if (projectName && projectTransmissionData[projectName]) {
          transmissionData = projectTransmissionData[projectName];
        } else if (row["Transmission Data"]) {
          transmissionData = parseTransmissionData(row["Transmission Data"]);
        }
        
        return transmissionData.some(point => 
          point.voltage === selectedVoltage
        );
      });
    }
    
    if (selectedHasExcess !== "All") {
      filtered = filtered.filter(row => {
        const projectName = row["Project Name"] || row["Project Codename"];
        
        let transmissionData = [];
        if (projectName && projectTransmissionData[projectName]) {
          transmissionData = projectTransmissionData[projectName];
        } else if (row["Transmission Data"]) {
          transmissionData = parseTransmissionData(row["Transmission Data"]);
        }
        
        if (selectedHasExcess === "Yes") {
          return transmissionData.length > 0 && 
                 transmissionData.some(point => point.hasExcessCapacity);
        } else {
          return transmissionData.length === 0 || 
                 transmissionData.every(point => !point.hasExcessCapacity);
        }
      });
    }
    
    // ADDED: Project Type filtering
    if (selectedProjectType !== "All") {
      filtered = filtered.filter(row => {
        const projectType = row["Project Type"];
        if (!projectType || projectType.toString().trim() === "") {
          return false; // Skip projects without project type classification
        }
        
        // Split by commas and trim each value
        const types = projectType.toString().split(',').map(t => t.trim());
        
        // Check if the selected type is in the list
        return types.includes(selectedProjectType);
      });
    }
    
    return filtered;
  };

  useEffect(() => {
    if (allData.length > 0) {
      const filteredData = filterDataWithTransmission(
        allData, selectedIso, selectedProcess, selectedOwner,
        selectedTransmissionVoltage, selectedHasExcessCapacity, 
        selectedProjectType, findColumnName // ADDED: selectedProjectType
      );
      const headers = Object.keys(allData[0] || {});
      calculateAllData(filteredData, headers, {
        setKpiRow1, setKpiRow2, setIsoData, setTechData, 
        setRedevelopmentTypes, setCounterparties, setPipelineRows
      });
    }
  }, [selectedIso, selectedProcess, selectedOwner, selectedTransmissionVoltage, 
      selectedHasExcessCapacity, selectedProjectType, allData, projectTransmissionData]); // ADDED: selectedProjectType

  useEffect(() => {
    if (allData.length > 0) {
      const ownersSet = new Set();
      allData.forEach(row => {
        const ownerCol = findColumnName(row, ["Plant Owner", "Owner", "owner"]);
        const owner = ownerCol ? row[ownerCol] : "";
        if (owner && owner.toString().trim() !== "") {
          ownersSet.add(owner.toString().trim());
        }
      });
      const uniqueOwners = ["All", ...Array.from(ownersSet).sort()];
      setAllOwners(uniqueOwners);
    }
  }, [allData]);

// Update the getAllExpertAnalyses function to include ALL redevelopment fields
const getAllExpertAnalyses = () => {
  const dataToUse = allData;
  
  if (!dataToUse || dataToUse.length === 0) {
    return [];
  }
  
  const analyses = dataToUse.map((excelRow, index) => {
    const projectData = {
      ...excelRow,
      "Plant COD": excelRow["Plant  COD"] || excelRow["Plant COD"] || "",
      "Legacy COD": excelRow["Legacy COD"] || "",
      "2024 Capacity Factor": excelRow["2024 Capacity Factor"] || "0",
      "ISO": excelRow["ISO"] || "",
      "Transactability": excelRow["Transactability"] || "", // Column AI
      "Transactability Scores": excelRow["Transactability Scores"] || "", // Column AH
      "Thermal Optimization": excelRow["Thermal Optimization"] || "",
      "Environmental Score": excelRow["Envionmental Score"] || excelRow["Environmental Score"] || "2",
      "Market Score": excelRow["Market Score"] || "",
      "Co-Locate/Repower": excelRow["Co-Locate/Repower"] || "",
      detailData: excelRow,
      id: index + 1,
      asset: excelRow["Project Name"] || excelRow["Project Codename"] || `Project ${index + 1}`,
      location: excelRow["Location"] || 'Unknown',
      overall: parseFloat(excelRow["Overall Project Score"] || "0"),
      thermal: parseFloat(excelRow["Thermal Operating Score"] || "0"),
      redev: parseFloat(excelRow["Redevelopment Score"] || "0"),
      // CRITICAL: Add Transactability fields
      transactabilityScore: excelRow["Transactability Scores"] || "",
      transactability: excelRow["Transactability"] || "",
      mkt: excelRow["ISO"] || "",
      zone: excelRow["Zone/Submarket"] || "",
      mw: parseFloat(excelRow["Legacy Nameplate Capacity (MW)"] || "0"),
      tech: excelRow["Tech"] || "",
      hr: parseFloat(excelRow["Heat Rate (Btu/kWh)"] || "0"),
      cf: parseFloat(excelRow["2024 Capacity Factor"] || "0"),
      cod: excelRow["Legacy COD"] || "",
      // ADDED: Redevelopment fields for pipeline table
      redevBaseCase: excelRow["Redevelopment Base Case"] || "",
      redevCapacity: excelRow["Redev Capacity (MW)"] || "",
      redevTier: excelRow["Redev Tier"] || "",
      redevTech: excelRow["Redev Tech"] || "",
      redevFuel: excelRow["Redev Fuel"] || "",
      redevHeatrate: excelRow["Redev Heatrate (Btu/kWh)"] || "",
      redevCOD: excelRow["Redev COD"] || "",
      redevLandControl: excelRow["Redev Land Control"] || "",
      redevStageGate: excelRow["Redev Stage Gate"] || "",
      redevLead: excelRow["Redev Lead"] || "",
      redevSupport: excelRow["Redev Support"] || "",
      projectType: excelRow["Project Type"] || ""
    };
    
    const analysis = generateExpertAnalysis(projectData);
    
    return {
      ...projectData,
      expertAnalysis: analysis
    };
  }).filter(project => project.expertAnalysis);
  
  return analyses;
};

  // Loading state
  if (loading) {
    return (
      // 3. Wrap your app with ActivityLogProvider
      <ActivityLogProvider>
        <div className="dashboard-root">
          <Header 
            selectedIso={selectedIso}
            selectedProcess={selectedProcess}
            selectedOwner={selectedOwner}
            selectedTransmissionVoltage={selectedTransmissionVoltage}
            selectedHasExcessCapacity={selectedHasExcessCapacity}
            selectedProjectType={selectedProjectType} // ADDED
            allOwners={allOwners}
            allVoltages={allVoltages}
            excessCapacityOptions={excessCapacityOptions}
            handleIsoFilter={handleIsoFilter}
            handleProcessFilter={handleProcessFilter}
            handleOwnerFilter={handleOwnerFilter}
            handleTransmissionVoltageFilter={handleTransmissionVoltageFilter}
            handleHasExcessCapacityFilter={handleHasExcessCapacityFilter}
            handleProjectTypeFilter={handleProjectTypeFilter} // ADDED
            resetFilters={resetFilters}
            setShowScoringPanel={setShowScoringPanel}
            openAddSiteModal={openAddSiteModal}
            setShowExpertScores={setShowExpertScores}
            // ADDED: Export/Upload/Activity Log handlers
            setShowExportModal={setShowExportModal}
            setShowUploadModal={setShowUploadModal}
            setShowActivityLog={setShowActivityLog}
          />
          <div className="loading-overlay">
            <p>Loading data from Excel...</p>
          </div>
        </div>
      </ActivityLogProvider>
    );
  }

  return (
    // 3. Wrap your app with ActivityLogProvider
    <ActivityLogProvider>
      <div className="dashboard-root">
        <Header 
          selectedIso={selectedIso}
          selectedProcess={selectedProcess}
          selectedOwner={selectedOwner}
          selectedTransmissionVoltage={selectedTransmissionVoltage}
          selectedHasExcessCapacity={selectedHasExcessCapacity}
          selectedProjectType={selectedProjectType} // ADDED
          allOwners={allOwners}
          allVoltages={allVoltages}
          excessCapacityOptions={excessCapacityOptions}
          handleIsoFilter={handleIsoFilter}
          handleProcessFilter={handleProcessFilter}
          handleOwnerFilter={handleOwnerFilter}
          handleTransmissionVoltageFilter={handleTransmissionVoltageFilter}
          handleHasExcessCapacityFilter={handleHasExcessCapacityFilter}
          handleProjectTypeFilter={handleProjectTypeFilter} // ADDED
          resetFilters={resetFilters}
          setShowScoringPanel={setShowScoringPanel}
          openAddSiteModal={openAddSiteModal}
          setShowExpertScores={setShowExpertScores}
          // ADDED: Export/Upload/Activity Log handlers
          setShowExportModal={setShowExportModal}
          setShowUploadModal={setShowUploadModal}
          setShowActivityLog={setShowActivityLog}
        />

        {/* Add Activity Log Panel */}
        {showActivityLog && (
          <div className="activity-log-overlay">
            <ActivityLogPanel />
            <button 
              className="close-activity-log"
              onClick={() => setShowActivityLog(false)}
            >
              ×
            </button>
          </div>
        )}

        {/* UPDATED: Add Project Type to filter status */}
        {(selectedIso !== "All" || selectedProcess !== "All" || selectedOwner !== "All" || 
          selectedTransmissionVoltage !== "All" || selectedHasExcessCapacity !== "All" ||
          selectedProjectType !== "All") && (
          <div className="filter-status">
            <div className="filter-tags">
              {selectedIso !== "All" && (
                <span className="filter-tag">
                  ISO: {selectedIso}
                  <button onClick={() => handleIsoFilter("All")}>×</button>
                </span>
              )}
              {selectedProcess !== "All" && (
                <span className="filter-tag">
                  Process: {selectedProcess}
                  <button onClick={() => handleProcessFilter("All")}>×</button>
                </span>
              )}
              {selectedOwner !== "All" && (
                <span className="filter-tag">
                  Owner: {selectedOwner}
                  <button onClick={() => handleOwnerFilter("All")}>×</button>
                </span>
              )}
              {selectedTransmissionVoltage !== "All" && (
                <span className="filter-tag">
                  Voltage: {selectedTransmissionVoltage}
                  <button onClick={() => handleTransmissionVoltageFilter("All")}>×</button>
                </span>
              )}
              {selectedHasExcessCapacity !== "All" && (
                <span className="filter-tag">
                  Excess Capacity: {selectedHasExcessCapacity}
                  <button onClick={() => handleHasExcessCapacityFilter("All")}>×</button>
                </span>
              )}
              {/* ADDED: Project Type filter tag */}
              {selectedProjectType !== "All" && (
                <span className="filter-tag">
                  Project Type: {selectedProjectType}
                  <button onClick={() => handleProjectTypeFilter("All")}>×</button>
                </span>
              )}
            </div>
            <div className="filtered-count">
              Showing {pipelineRows.length} project{pipelineRows.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        <KPISection kpiRow1={kpiRow1} kpiRow2={kpiRow2} />
        
        <MiddleGridSection 
          isoData={isoData}
          techData={techData}
          redevelopmentTypes={redevelopmentTypes}
          ISO_COLORS={ISO_COLORS}
          TECH_COLORS={TECH_COLORS}
        />
        
        <BottomGridSection 
          counterparties={counterparties}
          pipelineRows={pipelineRows}
          sortConfig={sortConfig}
          handleSort={handleSort}
          getSortDirectionClass={getSortDirectionClass}
          resetSort={resetSort}
          getSortedPipelineRows={getSortedPipelineRows}
          handleProjectClick={handleProjectClick}
          kpiRow1={kpiRow1}
          // Pass edit/delete handlers
          handleEditProject={handleEditProject}
          handleDeleteProject={handleDeleteProject}
        />

        {/* Modals */}
        {showAddSiteModal && (
          <AddSiteModal
            showAddSiteModal={showAddSiteModal}
            closeAddSiteModal={closeAddSiteModal}
            handleAddSiteSubmit={handleAddSiteSubmit}
            newSiteData={newSiteData}
            handleInputChange={handleInputChange}
            allData={allData}
            technologyOptions={technologyOptions}
            isoOptions={isoOptions}
            processOptions={processOptions}
            US_CITIES={US_CITIES}
            allVoltages={allVoltages.filter(v => v !== "All")}
          />
        )}
        
        {/* Edit Modal */}
        {showEditModal && editingProject && (
          <EditSiteModal
            showEditModal={showEditModal}
            closeEditModal={closeEditModal}
            handleUpdateProject={handleUpdateProject}
            projectData={editingProject}
            allData={allData}
            technologyOptions={technologyOptions}
            isoOptions={isoOptions}
            processOptions={processOptions}
            US_CITIES={US_CITIES}
          />
        )}
        
        {showProjectDetail && (
          <ProjectDetailModal
            selectedProject={selectedProject}
            closeProjectDetail={closeProjectDetail}
          />
        )}
        
        {showScoringPanel && (
          <ScoringPanel
            showScoringPanel={showScoringPanel}
            setShowScoringPanel={setShowScoringPanel}
            scoringWeights={scoringWeights}
          />
        )}
        
        {showExpertScores && (
          <ExpertScoresPanel
            showExpertScores={showExpertScores}
            setShowExpertScores={setShowExpertScores}
            getAllExpertAnalyses={getAllExpertAnalyses}
            expertAnalysisFilter={expertAnalysisFilter}
            setExpertAnalysisFilter={setExpertAnalysisFilter}
            setSelectedExpertProject={setSelectedExpertProject}
            setShowScoringModal={setShowScoringModal}
          />
        )}
        
        {/* ADDED: Export Modal */}
        {showExportModal && (
          <ExportModal
            showExportModal={showExportModal}
            setShowExportModal={setShowExportModal}
            allData={allData}
            pipelineRows={pipelineRows}
            currentFilters={currentFilters}
          />
        )}

            {/* ADDED: Upload Modal */}
          {showUploadModal && (
            <UploadModal
              showUploadModal={showUploadModal}
              setShowUploadModal={setShowUploadModal}
              allData={allData}
              setAllData={setAllData}
              calculateAllData={calculateAllData}
              setKpiRow1={setKpiRow1}
              setKpiRow2={setKpiRow2}
              setIsoData={setIsoData}
              setTechData={setTechData}
              setRedevelopmentTypes={setRedevelopmentTypes}
              setCounterparties={setCounterparties}
              setPipelineRows={setPipelineRows}
            />
          )}
        
        {/* If you want scoring modal, uncomment this */}
        {/* {showScoringModal && selectedExpertProject && (
          <ExpertScoringModal
            project={selectedExpertProject}
            onClose={() => setShowScoringModal(false)}
            onScoresSubmitted={handleScoresSubmitted}
          />
        )} */}
        
        {selectedExpertProject && (
          <ExpertAnalysisModal
            selectedExpertProject={selectedExpertProject}
            setSelectedExpertProject={setSelectedExpertProject}
            setSelectedProject={setSelectedProject}
            setShowProjectDetail={setShowProjectDetail}
            currentUser={currentUser}
          />
        )}
      </div>
    </ActivityLogProvider>
  );
}

export default App;