import React from 'react';
import logo from '../assets/powerTransitionLogo.png';
import { useAuth } from '../contexts/AuthContext';

const Header = ({ 
  selectedIso, 
  selectedProcess, 
  selectedOwner, 
  selectedTransmissionVoltage,
  selectedHasExcessCapacity,
  selectedProjectType,
  allOwners,
  allVoltages,
  excessCapacityOptions,
  handleIsoFilter,
  handleProcessFilter,
  handleOwnerFilter,
  handleTransmissionVoltageFilter,
  handleHasExcessCapacityFilter,
  handleProjectTypeFilter,
  resetFilters,
  setShowScoringPanel,
  openAddSiteModal,
  setShowExpertScores,
  setShowExportModal,
  setShowUploadModal,
  setShowActivityLog
  
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="header" style={{ 
      position: "relative", 
      minHeight: "140px",
      padding: "0 20px",
      backgroundColor: "#1a1a2e", // Dark blue-gray background
      background: "linear-gradient(135deg, #16213e 0%, #1a1a2e 100%)", // Gradient
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      marginBottom: "15px",
      borderBottom: "1px solid rgba(255,255,255,0.1)"
    }}>
      {/* MAIN HEADER ROW */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        height: "70px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      }}>
        {/* Left: Logo and Title - Dark Theme */}
        <div className="header-left" style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "12px",
          minWidth: "220px",
          flexShrink: 0
        }}>
          <img
            src={logo}
            alt="Power Transitions Logo"
            style={{ 
              height: "36px", 
              objectFit: "contain",
              filter: "brightness(1.2)" // Make logo brighter on dark background
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h1 className="title" style={{ 
              fontSize: "18px", // Slightly larger
              margin: 0, 
              fontWeight: 700,
              color: "#ffffff", // White text
              letterSpacing: "0.5px"
            }}>
              Pipeline Dashboard
            </h1>
            <p className="subtitle" style={{ 
              fontSize: "11px",
              margin: 0, 
              color: "#94a3b8", // Light gray for subtitle
              marginTop: "2px"
            }}>
              Active Projects and Opportunities
            </p>
          </div>
        </div>

        {/* CENTER: Filter Groups - Dark Theme */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "15px",
          flex: 1,
          justifyContent: "center",
          padding: "0 20px"
        }}>
          {/* PROJECT TYPE FILTER - Dark */}
          <div className="filter-group-compact" style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 12px",
            borderRadius: "20px",
            border: "1px solid rgba(59, 130, 246, 0.5)",
            backgroundColor: "rgba(59, 130, 246, 0.15)",
            position: "relative",
            height: "36px",
            backdropFilter: "blur(10px)"
          }}>
            <span className="filter-label" style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#93c5fd", // Light blue
              whiteSpace: "nowrap"
            }}>
              Project Type:
            </span>
            <div className="pill-group" style={{ display: "flex", gap: "4px" }}>
              {["All", "Redev", "M&A", "Owned"].map(type => (
                <button 
                  key={type}
                  className={`pill ${selectedProjectType === type ? "pill-active" : ""}`}
                  onClick={() => handleProjectTypeFilter(type)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "12px",
                    border: `1px solid ${selectedProjectType === type ? "#3b82f6" : "rgba(59, 130, 246, 0.4)"}`,
                    backgroundColor: selectedProjectType === type ? "#3b82f6" : "rgba(59, 130, 246, 0.1)",
                    color: selectedProjectType === type ? "white" : "#93c5fd",
                    fontSize: "10px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    minWidth: "45px"
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* PROCESS FILTER - Dark */}
          <div className="filter-group-compact" style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 12px",
            borderRadius: "20px",
            border: "1px solid rgba(139, 92, 246, 0.5)",
            backgroundColor: "rgba(139, 92, 246, 0.15)",
            position: "relative",
            height: "36px",
            backdropFilter: "blur(10px)"
          }}>
            <span className="filter-label" style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#c4b5fd", // Light purple
              whiteSpace: "nowrap"
            }}>
              Process:
            </span>
            <div className="pill-group" style={{ display: "flex", gap: "4px" }}>
              {["All", "Process", "Bilateral"].map(process => (
                <button 
                  key={process}
                  className={`pill ${selectedProcess === process ? "pill-active" : ""}`}
                  onClick={() => handleProcessFilter(process)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "12px",
                    border: `1px solid ${selectedProcess === process ? "#8b5cf6" : "rgba(139, 92, 246, 0.4)"}`,
                    backgroundColor: selectedProcess === process ? "#8b5cf6" : "rgba(139, 92, 246, 0.1)",
                    color: selectedProcess === process ? "white" : "#c4b5fd",
                    fontSize: "10px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    minWidth: "60px"
                  }}
                >
                  {process}
                </button>
              ))}
            </div>
          </div>

          {/* Owner Select - Dark */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <select 
              className="owners-select"
              value={selectedOwner}
              onChange={(e) => handleOwnerFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid rgba(203, 213, 225, 0.3)",
                backgroundColor: "rgba(15, 23, 42, 0.7)",
                fontSize: "11px",
                color: "#f1f5f9",
                minWidth: "130px",
                height: "34px",
                backdropFilter: "blur(10px)"
              }}
            >
              {allOwners.map(owner => (
                <option key={owner} value={owner} style={{ backgroundColor: "#1a1a2e" }}>
                  {owner}
                </option>
              ))}
            </select>
            
            <button 
              className="reset-btn"
              onClick={resetFilters}
              style={{
                background: "rgba(148, 163, 184, 0.15)",
                color: "#cbd5e1",
                padding: "6px 12px",
                border: "1px solid rgba(203, 213, 225, 0.3)",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease",
                height: "34px",
                whiteSpace: "nowrap",
                backdropFilter: "blur(10px)"
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* RIGHT: User Info and Action Buttons - Dark Theme */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "15px",
          minWidth: "fit-content",
          marginLeft: "auto"
        }}>
          {/* Action Buttons - Dark */}
          <div style={{ 
            display: "flex", 
            gap: "6px",
            flexShrink: 0
          }}>
            <button 
              className="upload-btn"
              onClick={() => setShowUploadModal(true)}
              style={{
                background: "rgba(139, 92, 246, 0.2)",
                border: "1px solid rgba(139, 92, 246, 0.5)",
                borderRadius: "6px",
                color: "#c4b5fd",
                fontSize: "11px",
                fontWeight: "600",
                padding: "6px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.2s ease",
                minWidth: "70px",
                justifyContent: "center",
                backdropFilter: "blur(10px)"
              }}
              title="Upload Excel file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "12px", height: "12px" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Upload
            </button>
            
            <button 
              className="export-btn"
              onClick={() => setShowExportModal(true)}
              style={{
                background: "rgba(16, 185, 129, 0.2)",
                border: "1px solid rgba(16, 185, 129, 0.5)",
                borderRadius: "6px",
                color: "#86efac",
                fontSize: "11px",
                fontWeight: "600",
                padding: "6px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.2s ease",
                minWidth: "70px",
                justifyContent: "center",
                backdropFilter: "blur(10px)"
              }}
              title="Export data to Excel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "12px", height: "12px" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
            
            <button 
              className="activity-log-btn"
              onClick={() => setShowActivityLog(true)}
              style={{
                background: "rgba(236, 72, 153, 0.2)",
                border: "1px solid rgba(236, 72, 153, 0.5)",
                borderRadius: "6px",
                color: "#f9a8d4",
                fontSize: "11px",
                fontWeight: "600",
                padding: "6px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.2s ease",
                minWidth: "90px",
                justifyContent: "center",
                backdropFilter: "blur(10px)"
              }}
              title="View Activity Log"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "12px", height: "12px" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Activity Log
            </button>
          </div>

          {/* User Info - Dark */}
          <div className="user-info-compact" style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(59, 130, 246, 0.15)",
            padding: "4px 8px 4px 12px",
            borderRadius: "20px",
            border: "1px solid rgba(59, 130, 246, 0.4)",
            minWidth: "fit-content",
            backdropFilter: "blur(10px)"
          }}>
            <div className="user-avatar" style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6, #10b981)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "12px",
              flexShrink: 0
            }}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="user-details" style={{ 
              display: "flex", 
              flexDirection: "column",
              minWidth: "fit-content"
            }}>
              <span className="user-name" style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#ffffff",
                whiteSpace: "nowrap"
              }}>
                {user?.full_name || user?.username || 'User'}
              </span>
              <span className="user-role" style={{
                fontSize: "10px",
                color: "#94a3b8",
                textTransform: "capitalize",
                whiteSpace: "nowrap"
              }}>
                {user?.role || 'Operator'}
              </span>
            </div>
            <button 
              onClick={logout}
              className="logout-button-compact"
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.5)",
                color: "#fca5a5",
                padding: "4px 8px",
                borderRadius: "12px",
                fontSize: "10px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.2s",
                marginLeft: "6px",
                flexShrink: 0,
                whiteSpace: "nowrap",
                backdropFilter: "blur(10px)"
              }}
              title="Logout"
            >
              <span style={{ fontSize: "10px" }}>🚪</span>
              Logout
            </button>
          </div>

          {/* Main Action Buttons - Dark */}
          <div style={{ display: "flex", gap: "6px" }}>
            <button 
              className="expert-analysis-btn"
              onClick={() => setShowExpertScores(true)}
              style={{
                background: "rgba(14, 165, 233, 0.2)",
                border: "1px solid rgba(14, 165, 233, 0.5)",
                borderRadius: "6px",
                color: "#7dd3fc",
                fontSize: "11px",
                fontWeight: "600",
                padding: "6px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.2s ease",
                minWidth: "85px",
                justifyContent: "center",
                backdropFilter: "blur(10px)"
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "12px", height: "12px" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Expert Analysis
            </button>
            
            {/* ADD PROJECT BUTTON - Stands out in dark theme */}
            <button 
              className="add-project-btn"
              onClick={openAddSiteModal}
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                border: "none",
                borderRadius: "6px",
                color: "white",
                fontSize: "11px",
                fontWeight: "600",
                padding: "6px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.2s ease",
                minWidth: "100px",
                justifyContent: "center",
                boxShadow: "0 4px 15px rgba(245, 158, 11, 0.4)"
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "12px", height: "12px" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Project
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;