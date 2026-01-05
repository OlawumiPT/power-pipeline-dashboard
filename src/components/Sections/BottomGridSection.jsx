import React from 'react';
import PipelineTable from '../Pipeline/PipelineTable';

const BottomGridSection = ({ 
  counterparties, 
  pipelineRows, 
  sortConfig, 
  handleSort, 
  getSortDirectionClass, 
  resetSort,
  getSortedPipelineRows,
  handleProjectClick,
  kpiRow1,
  // Add these new props
  handleEditProject,
  handleDeleteProject 
}) => {

    // Debug: Check what props we're receiving
  console.log('🔍 BottomGridSection - Props received:', {
    hasHandleEditProject: !!handleEditProject,
    typeOfHandleEditProject: typeof handleEditProject,
    hasHandleDeleteProject: !!handleDeleteProject,
    typeOfHandleDeleteProject: typeof handleDeleteProject,
  });

  return (
    <section className="bottom-grid">
      <div className="card counterpart-card">
        <div className="card-header">
          <div className="counterparty-header">
            <span>BY COUNTERPARTY</span>
            <span className="counterparty-total">
              TOTAL: {counterparties.reduce((sum, cp) => sum + parseFloat(cp.gw || 0), 0).toFixed(1)} GW
            </span>
          </div>
        </div>
        <div className="card-body counterparty-chart-body">
          <div className="counterparty-chart-container">
            {counterparties.map((cp, index) => {
              const totalGW = counterparties.reduce((sum, cp) => sum + parseFloat(cp.gw || 0), 0);
              const barWidth = totalGW > 0 ? (parseFloat(cp.gw || 0) / totalGW * 100).toFixed(1) : 0;
              
              const barColors = [
                '#60a5fa', '#34d399', '#fbbf24', '#a78bfa',
                '#f87171', '#22d3ee', '#fb923c', '#c084fc',
                '#4ade80', '#38bdf8', '#f472b6', '#e879f9',
              ];
              
              const barColor = barColors[index % barColors.length];
              
              return (
                <div key={cp.name} className="counterparty-chart-row">
                  <div className="counterparty-name-bar">
                    <div className="counterparty-name-truncated">
                      {cp.name && cp.name.length > 25 ? cp.name.substring(0, 22) + '...' : cp.name || 'Unknown'}
                    </div>
                    <div className="counterparty-chart-bar">
                      <div 
                        className="counterparty-bar-fill"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: barColor
                        }}
                        data-tooltip={`${cp.gw || '0'} GW (${barWidth}% of total)`}
                      ></div>
                    </div>
                  </div>
                  <div className="counterparty-metrics">
                    <div className="counterparty-metric primary">
                      <span className="metric-value">{cp.gw || '0'}</span>
                      <span className="metric-label">GW</span>
                    </div>
                    <div className="counterparty-metric">
                      <span className="metric-value">
                        {cp.projectCount || (cp.projects && !isNaN(parseInt(cp.projects)) ? parseInt(cp.projects) : '0')}
                      </span>
                      <span className="metric-label">PRODS</span>
                    </div>
                    <div className="counterparty-metric">
                      <span className="metric-value">{cp.avg || '0.00'}</span>
                      <span className="metric-label">AVG</span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {counterparties.length === 0 && (
              <div className="counterparty-chart-row">
                <div className="counterparty-name-bar">
                  <div className="counterparty-name-truncated">No counterparty data available</div>
                </div>
              </div>
            )}
          </div>
          
          {counterparties.length > 0 && (
            <div className="counterparty-legend">
              <div className="legend-title">Counterparty Legend</div>
              <div className="legend-items">
                {counterparties.slice(0, 8).map((cp, index) => {
                  const barColors = [
                    '#60a5fa', '#34d399', '#fbbf24', '#a78bfa',
                    '#f87171', '#22d3ee', '#fb923c', '#c084fc'
                  ];
                  const barColor = barColors[index % barColors.length];
                  
                  return (
                    <div key={cp.name} className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: barColor }}></div>
                      <div className="legend-label">
                        {cp.name && cp.name.length > 15 ? cp.name.substring(0, 13) + '...' : cp.name || 'Unknown'}
                      </div>
                    </div>
                  );
                })}
                {counterparties.length > 8 && (
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#475569' }}></div>
                    <div className="legend-label">+{counterparties.length - 8} more</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="card pipeline-card">
        <div className="card-header pipeline-header">
          <div>
            <div className="pipeline-title">Pipeline Details</div>
            <div className="pipeline-sub">{kpiRow1[0]?.value || 0} projects · {kpiRow1[1]?.value || "0 GW"}</div>
          </div>
        </div>
        
        {(sortConfig.column && sortConfig.direction !== 'none') && (
          <div className="sort-controls" style={{ padding: '8px 18px 0' }}>
            <div className="sort-status">
              <span>Sorted by:</span>
              <strong>
                {/* Make sure sortableColumns is defined or imported */}
                {sortableColumns?.find(col => col.key === sortConfig.column)?.label || sortConfig.column}
              </strong>
              <span>({sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'})</span>
            </div>
            <button 
              className="reset-sort-btn"
              onClick={resetSort}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reset Sort
            </button>
          </div>
        )}
        
        <PipelineTable 
          pipelineRows={pipelineRows}
          sortConfig={sortConfig}
          handleSort={handleSort}
          getSortDirectionClass={getSortDirectionClass}
          resetSort={resetSort}
          getSortedPipelineRows={getSortedPipelineRows}
          handleProjectClick={handleProjectClick}
          // Pass the new handlers
          handleEditProject={handleEditProject}
          handleDeleteProject={handleDeleteProject}
        />
      </div>
    </section>
  );
};

// Add default props for safety
BottomGridSection.defaultProps = {
  handleEditProject: () => console.warn('BottomGridSection: handleEditProject not provided'),
  handleDeleteProject: () => console.warn('BottomGridSection: handleDeleteProject not provided')
};

export default BottomGridSection;