import React from 'react';

const hasEdits = (projectId) => {
  try {
    const allEdits = JSON.parse(localStorage.getItem('projectEdits') || '{}');
    return !!allEdits[projectId];
  } catch {
    return false;
  }
};

// Helper to get capacity info in a clean format
const getCapacityInfo = (project) => {
  const legacyMW = project["Legacy Nameplate Capacity (MW)"] || project.mw || "N/A";
  const redevMW = project["Redevelopment Base Case"] || "";
  const tech = project["Tech"] || project.tech || "";
  
  let capacityText = `${legacyMW} MW`;
  if (tech) capacityText += ` ${tech}`;
  if (redevMW) capacityText += ` → ${redevMW}`;
  
  return capacityText;
};

// Helper to get market info
const getMarketInfo = (project) => {
  const iso = project["ISO"] || project.mkt || "";
  const zone = project["Zone/Submarket"] || project.zone || "";
  
  if (!iso) return "";
  return zone ? `${iso} ${zone}` : iso;
};

// Helper to get rating text (Strong/Moderate/Weak)
const getRatingText = (ratingClass) => {
  switch(ratingClass) {
    case 'strong': return 'Strong';
    case 'moderate': return 'Moderate';
    case 'weak': return 'Weak';
    default: return 'Not Rated';
  }
};

// Helper to get rating color
const getRatingColor = (rating) => {
  switch(rating?.toLowerCase()) {
    case 'strong': return '#10b981';
    case 'moderate': return '#f59e0b';
    case 'weak': return '#ef4444';
    default: return '#6b7280';
  }
};

const ExpertScoresPanel = ({ 
  showExpertScores, 
  setShowExpertScores, 
  getAllExpertAnalyses: getAnalyses,
  expertAnalysisFilter,
  setExpertAnalysisFilter,
  setSelectedExpertProject 
}) => {
  
  if (!showExpertScores) return null;

  const expertProjects = getAnalyses();
  
  const filteredProjects = expertProjects.filter(project => {
    const analysis = project.expertAnalysis;
    if (expertAnalysisFilter === "all") return true;
    if (expertAnalysisFilter === "strong") return analysis.ratingClass === "strong";
    if (expertAnalysisFilter === "moderate") return analysis.ratingClass === "moderate";
    if (expertAnalysisFilter === "weak") return analysis.ratingClass === "weak";
    return true;
  });
  
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    return b.expertAnalysis.overallScore - a.expertAnalysis.overallScore;
  });

  return (
    <div className="modal-overlay dark-overlay" onClick={() => setShowExpertScores(false)}>
      <div className="modal-content expert-scores-panel dark-theme" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header dark-header">
          <div className="header-left">
            <h2 className="modal-title dark-title">Expert Analysis</h2>
            <p className="expert-scores-subtitle dark-subtitle">
              AI-powered assessment of all pipeline projects
            </p>
          </div>
          <button className="modal-close dark-close" onClick={() => setShowExpertScores(false)}>×</button>
        </div>
        
        {/* Body */}
        <div className="modal-body expert-analysis-container dark-body">
          {/* Filter Header */}
          <div className="expert-scores-header dark-scores-header">
            <div className="header-info">
              <h3 className="expert-scores-title dark-section-title">Project Assessments</h3>
              <p className="expert-scores-subtitle dark-count">
                {sortedProjects.length} of {expertProjects.length} projects
              </p>
            </div>
            <div className="expert-scores-actions">
              <select 
                className="expert-scores-filter dark-filter"
                value={expertAnalysisFilter}
                onChange={(e) => setExpertAnalysisFilter(e.target.value)}
              >
                <option value="all">All Ratings</option>
                <option value="strong">Strong (≥4.5)</option>
                <option value="moderate">Moderate (3.0-4.5)</option>
                <option value="weak">Weak (&lt;3.0)</option>
              </select>
            </div>
          </div>
          
          {/* Projects Grid */}
          {sortedProjects.length === 0 ? (
            <div className="expert-no-projects dark-no-projects">
              <h3 className="dark-title">No Projects Found</h3>
              <p className="dark-subtitle">Adjust your filters to see expert analyses.</p>
            </div>
          ) : (
            <div className="expert-projects-grid dark-projects-grid">
              {sortedProjects.map(project => {
                const analysis = project.expertAnalysis;
                const capacityText = getCapacityInfo(project);
                const marketText = getMarketInfo(project);
                const location = project["Location"] || project.location || "";
                const owner = project["Plant Owner"] || "";
                const ratingText = getRatingText(analysis.ratingClass);
                const ratingColor = getRatingColor(analysis.ratingClass);
                
                return (
                  <div 
                    key={project.id} 
                    className="expert-project-card dark-project-card"
                    onClick={() => setSelectedExpertProject(project)}
                  >
                    {/* Card Header */}
                    <div className="project-card-header dark-card-header">
                      <div className="project-title-section">
                        <div className="project-title-row">
                          <h4 className="project-title dark-project-title">
                            {analysis.projectName}
                          </h4>
                          <span 
                            className="rating-badge dark-rating-badge"
                            style={{ backgroundColor: ratingColor }}
                          >
                            {ratingText}
                          </span>
                        </div>
                        <div className="project-subtitle-row">
                          <span className="project-id dark-project-id">#{analysis.projectId}</span>
                          {hasEdits(project.id) && (
                            <span className="edit-badge dark-edit-badge" title="Has unsaved edits">
                              ✏️ Edited
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Project Info */}
                    <div className="project-info-grid dark-info-grid">
                      {/* Location */}
                      <div className="info-item dark-info-item">
                        <div className="info-label dark-info-label">📍 Location</div>
                        <div className="info-value dark-info-value">{location}</div>
                      </div>
                      
                      {/* Owner */}
                      {owner && (
                        <div className="info-item dark-info-item">
                          <div className="info-label dark-info-label">👤 Plant Owner</div>
                          <div className="info-value dark-info-value">{owner}</div>
                        </div>
                      )}
                      
                      {/* Capacity */}
                      {capacityText && (
                        <div className="info-item dark-info-item">
                          <div className="info-label dark-info-label">⚡ Capacity</div>
                          <div className="info-value dark-info-value">{capacityText}</div>
                        </div>
                      )}
                      
                      {/* Market */}
                      {marketText && (
                        <div className="info-item dark-info-item">
                          <div className="info-label dark-info-label">🌐 Market</div>
                          <div className="info-value dark-info-value">{marketText}</div>
                        </div>
                      )}
                       </div>
                       
                      {/* Overall Score */}
                     {/* <div className="info-item dark-info-item">
                        <div className="info-label dark-info-label">📊 Overall Score</div>
                        <div className="info-value dark-info-value score-highlight">
                          {analysis.overallScore}/6.0
                        </div>
                      </div>*}
                    
                    {/* Action Button */}
                    <div className="project-action dark-project-action">
                      <button 
                        className="view-scores-btn dark-view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedExpertProject(project);
                        }}
                      >
                        View Scores & Analysis
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="modal-footer dark-footer">
          <button 
            className="back-btn dark-back-btn"
            onClick={() => setShowExpertScores(false)}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpertScoresPanel;