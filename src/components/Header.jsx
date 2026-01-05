import React from 'react';
import logo from '../assets/powerTransitionLogo.png';

const Header = ({ 
  selectedIso, 
  selectedProcess, 
  selectedOwner, 
  selectedTransmissionVoltage,
  selectedHasExcessCapacity,
  selectedProjectType, // ADD THIS - new prop
  allOwners,
  allVoltages,
  excessCapacityOptions,
  handleIsoFilter,
  handleProcessFilter,
  handleOwnerFilter,
  handleTransmissionVoltageFilter,
  handleHasExcessCapacityFilter,
  handleProjectTypeFilter, // ADD THIS - new handler
  resetFilters,
  setShowScoringPanel,
  openAddSiteModal,
  setShowExpertScores,
  // ADDED: Upload/Download props
  setShowExportModal,
  setShowUploadModal,
  // ADDED: Activity Log prop
  setShowActivityLog
  
}) => {
  return (
    <header className="header">
      <div className="header-left" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <img
          src={logo}
          alt="Power Transitions Logo"
          style={{ height: "40px", objectFit: "contain" }}
        />
        <div>
          <h1 className="title">Pipeline Dashboard</h1>
          <p className="subtitle">Active Projects and Opportunities.</p>
        </div>
      </div>

      <div className="header-right">
        {/* UPLOAD BUTTON */}
        <button 
          className="upload-btn"
          onClick={() => setShowUploadModal(true)}
          style={{
            background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
            border: "none",
            borderRadius: "999px",
            color: "white",
            fontSize: "12px",
            fontWeight: "600",
            padding: "8px 20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)",
            marginLeft: "8px"
          }}
          title="Upload Excel file"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "16px", height: "16px" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          Upload
        </button>
        
        {/* EXPORT BUTTON */}
        <button 
          className="export-btn"
          onClick={() => setShowExportModal(true)}
          style={{
            background: "linear-gradient(135deg, #10b981, #059669)",
            border: "none",
            borderRadius: "999px",
            color: "white",
            fontSize: "12px",
            fontWeight: "600",
            padding: "8px 20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
            marginLeft: "8px"
          }}
          title="Export data to Excel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "16px", height: "16px" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export
        </button>
        
        {/* ACTIVITY LOG BUTTON */}
        <button 
          className="activity-log-btn"
          onClick={() => setShowActivityLog(true)}
          style={{
            background: "linear-gradient(135deg, #ec4899, #db2777)",
            border: "none",
            borderRadius: "999px",
            color: "white",
            fontSize: "12px",
            fontWeight: "600",
            padding: "8px 20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 12px rgba(236, 72, 153, 0.3)",
            marginLeft: "8px"
          }}
          title="View Activity Log"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "16px", height: "16px" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Activity Log
        </button>
        
        <button 
          className="scoring-panel-btn"
          onClick={() => setShowExpertScores(true)}
          style={{
            background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
            border: "none",
            borderRadius: "999px",
            color: "white",
            fontSize: "12px",
            fontWeight: "600",
            padding: "8px 20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)",
            marginLeft: "8px"
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "16px", height: "16px" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Expert Analysis
        </button>
        
        <button className="add-site-btn" onClick={openAddSiteModal} style={{
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          border: "none",
          borderRadius: "999px",
          color: "white",
          fontSize: "12px",
          fontWeight: "600",
          padding: "8px 20px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          transition: "all 0.2s ease",
          boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
          marginLeft: "8px"
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "16px", height: "16px" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Project
        </button>

        {/* GROUP 1: PROJECT TYPE FILTER - BLUE CIRCLE */}
        <div className="filter-group-circle" style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "10px 16px",
          borderRadius: "50px",
          border: "2px solid #3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          marginRight: "12px",
          position: "relative"
        }}>
          <span className="group-label" style={{
            position: "absolute",
            top: "-10px",
            left: "16px",
            fontSize: "10px",
            fontWeight: "700",
            color: "#3b82f6",
            backgroundColor: "white",
            padding: "0 6px"
          }}>
            Project Type
          </span>
          <div className="pill-group" style={{ display: "flex", gap: "6px" }}>
            <button 
              className={`pill ${selectedProjectType === "All" ? "pill-active" : ""}`}
              onClick={() => handleProjectTypeFilter("All")}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid #3b82f6",
                backgroundColor: selectedProjectType === "All" ? "#3b82f6" : "transparent",
                color: selectedProjectType === "All" ? "white" : "#3b82f6",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              All
            </button>
            <button 
              className={`pill ${selectedProjectType === "Redev" ? "pill-active" : ""}`}
              onClick={() => handleProjectTypeFilter("Redev")}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid #3b82f6",
                backgroundColor: selectedProjectType === "Redev" ? "#3b82f6" : "transparent",
                color: selectedProjectType === "Redev" ? "white" : "#3b82f6",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Redev
            </button>
            <button 
              className={`pill ${selectedProjectType === "M&A" ? "pill-active" : ""}`}
              onClick={() => handleProjectTypeFilter("M&A")}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid #3b82f6",
                backgroundColor: selectedProjectType === "M&A" ? "#3b82f6" : "transparent",
                color: selectedProjectType === "M&A" ? "white" : "#3b82f6",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              M&A
            </button>
            <button 
              className={`pill ${selectedProjectType === "Owned" ? "pill-active" : ""}`}
              onClick={() => handleProjectTypeFilter("Owned")}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid #3b82f6",
                backgroundColor: selectedProjectType === "Owned" ? "#3b82f6" : "transparent",
                color: selectedProjectType === "Owned" ? "white" : "#3b82f6",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Owned
            </button>
          </div>
        </div>

        {/* GROUP 2: ISO FILTER - GREEN CIRCLE */}
        <div className="filter-group-circle" style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "10px 16px",
          borderRadius: "50px",
          border: "2px solid #10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          marginRight: "12px",
          position: "relative"
        }}>
          <span className="group-label" style={{
            position: "absolute",
            top: "-10px",
            left: "16px",
            fontSize: "10px",
            fontWeight: "700",
            color: "#10b981",
            backgroundColor: "white",
            padding: "0 6px"
          }}>
            ISO Region
          </span>
          <div className="pill-group" style={{ display: "flex", gap: "6px" }}>
            <button 
              className={`pill ${selectedIso === "All" ? "pill-active" : ""}`}
              onClick={() => handleIsoFilter("All")}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid #10b981",
                backgroundColor: selectedIso === "All" ? "#10b981" : "transparent",
                color: selectedIso === "All" ? "white" : "#10b981",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              All
            </button>
            <button 
              className={`pill ${selectedIso === "PJM" ? "pill-active" : ""}`}
              onClick={() => handleIsoFilter("PJM")}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid #10b981",
                backgroundColor: selectedIso === "PJM" ? "#10b981" : "transparent",
                color: selectedIso === "PJM" ? "white" : "#10b981",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              PJM
            </button>
            <button 
              className={`pill ${selectedIso === "NYISO" ? "pill-active" : ""}`}
              onClick={() => handleIsoFilter("NYISO")}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid #10b981",
                backgroundColor: selectedIso === "NYISO" ? "#10b981" : "transparent",
                color: selectedIso === "NYISO" ? "white" : "#10b981",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              NYISO
            </button>
            <button 
              className={`pill ${selectedIso === "ISONE" ? "pill-active" : ""}`}
              onClick={() => handleIsoFilter("ISONE")}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid #10b981",
                backgroundColor: selectedIso === "ISONE" ? "#10b981" : "transparent",
                color: selectedIso === "ISONE" ? "white" : "#10b981",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              ISONE
            </button>
            <button 
              className={`pill ${selectedIso === "MISO" ? "pill-active" : ""}`}
              onClick={() => handleIsoFilter("MISO")}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid #10b981",
                backgroundColor: selectedIso === "MISO" ? "#10b981" : "transparent",
                color: selectedIso === "MISO" ? "white" : "#10b981",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              MISO
            </button>
          </div>
        </div>

        {/* GROUP 3: PROCESS FILTER - PURPLE CIRCLE */}
        <div className="filter-group-circle" style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "10px 16px",
          borderRadius: "50px",
          border: "2px solid #8b5cf6",
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          marginRight: "12px",
          position: "relative"
        }}>
          <span className="group-label" style={{
            position: "absolute",
            top: "-10px",
            left: "16px",
            fontSize: "10px",
            fontWeight: "700",
            color: "#8b5cf6",
            backgroundColor: "white",
            padding: "0 6px"
          }}>
            Process Type
          </span>
          <div className="pill-group" style={{ display: "flex", gap: "6px" }}>
            <button 
              className={`pill ${selectedProcess === "All" ? "pill-active" : ""}`}
              onClick={() => handleProcessFilter("All")}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid #8b5cf6",
                backgroundColor: selectedProcess === "All" ? "#8b5cf6" : "transparent",
                color: selectedProcess === "All" ? "white" : "#8b5cf6",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              All
            </button>
            <button 
              className={`pill ${selectedProcess === "Process" ? "pill-active" : ""}`}
              onClick={() => handleProcessFilter("Process")}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid #8b5cf6",
                backgroundColor: selectedProcess === "Process" ? "#8b5cf6" : "transparent",
                color: selectedProcess === "Process" ? "white" : "#8b5cf6",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Process
            </button>
            <button 
              className={`pill ${selectedProcess === "Bilateral" ? "pill-active" : ""}`}
              onClick={() => handleProcessFilter("Bilateral")}
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                border: "1px solid #8b5cf6",
                backgroundColor: selectedProcess === "Bilateral" ? "#8b5cf6" : "transparent",
                color: selectedProcess === "Bilateral" ? "white" : "#8b5cf6",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Bilateral
            </button>
          </div>
        </div>

        {/* OWNER SELECT AND RESET BUTTONS */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <select 
            className="owners-select"
            value={selectedOwner}
            onChange={(e) => handleOwnerFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "white",
              fontSize: "12px",
              color: "#334155",
              minWidth: "150px"
            }}
          >
            {allOwners.map(owner => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
          
          <button 
            className="pill"
            onClick={resetFilters}
            style={{
              background: "linear-gradient(135deg, #64748b, #475569)",
              color: "#fff",
              padding: "8px 16px",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(71, 85, 105, 0.3)",
              transition: "all 0.2s ease"
            }}
          >
            Reset Filters
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;