import React, { useState, useEffect, useRef } from 'react';

const ExpertScoresPanel = ({ 
  showExpertScores, 
  setShowExpertScores, 
  getAllExpertAnalyses: getAnalyses,
  expertAnalysisFilter,
  setExpertAnalysisFilter,
  setSelectedExpertProject
}) => {
  
  if (!showExpertScores) return null;

  const [localExpertProjects, setLocalExpertProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Listen for save events
  useEffect(() => {
    const handleSaveEvent = (event) => {
      console.log('💾 ExpertScoresPanel: Save event received');
      
      if (isMounted.current) {
        setIsLoading(true);
        setTimeout(() => {
          loadFreshData();
        }, 800);
      }
    };
    
    const handleForceRefresh = () => {
      console.log('🔄 ExpertScoresPanel: Force refresh event received');
      if (isMounted.current) {
        setForceRefresh(prev => prev + 1);
      }
    };
    
    window.addEventListener('expertAnalysisSaved', handleSaveEvent);
    window.addEventListener('expertAnalysisUpdated', handleSaveEvent);
    window.addEventListener('forceRefreshDashboard', handleForceRefresh);
    window.addEventListener('forceRefreshExpertScores', handleForceRefresh);
    
    return () => {
      window.removeEventListener('expertAnalysisSaved', handleSaveEvent);
      window.removeEventListener('expertAnalysisUpdated', handleSaveEvent);
      window.removeEventListener('forceRefreshDashboard', handleForceRefresh);
      window.removeEventListener('forceRefreshExpertScores', handleForceRefresh);
    };
  }, []);

  // Load fresh data function - UPDATED TO EXTRACT DATA PROPERLY
  const loadFreshData = async () => {
    try {
      console.log('🔄 ExpertScoresPanel: Loading fresh data');
      
      // Clear old data first
      if (isMounted.current) {
        setLocalExpertProjects([]);
      }
      
      // Get fresh data
      const result = await getAnalyses();
      
      console.log('📦 ExpertScoresPanel: Raw API response:', {
        success: result?.success,
        hasData: !!result?.data,
        dataType: Array.isArray(result?.data) ? 'array' : typeof result?.data,
        dataLength: Array.isArray(result?.data) ? result.data.length : 'not array'
      });
      
      // Extract data from response
      let projects = [];
      if (result && result.success && result.data && Array.isArray(result.data)) {
        projects = result.data;
        console.log(`✅ ExpertScoresPanel: Extracted ${projects.length} projects from API response.data`);
      } else if (Array.isArray(result)) {
        // If API returns array directly
        projects = result;
        console.log(`✅ ExpertScoresPanel: Received ${projects.length} projects directly as array`);
      }
      
      if (isMounted.current && projects.length > 0) {
        console.log('✅ ExpertScoresPanel: Loaded fresh projects:', projects.length);
        setLocalExpertProjects(projects);
        setLastUpdateTime(new Date().toLocaleTimeString());
      } else {
        console.warn('⚠️ ExpertScoresPanel: No projects returned or invalid format');
      }
    } catch (error) {
      console.error('❌ ExpertScoresPanel: Error loading projects:', error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (isLoading) return;
    
    console.log('🔄 ExpertScoresPanel: Manual refresh triggered');
    setIsLoading(true);
    setForceRefresh(prev => prev + 1);
    
    window.dispatchEvent(new Event('expertAnalysisUpdated'));
  };

  const handleProjectSelect = (project) => {
    console.log('👉 ExpertScoresPanel: Selecting project:', project.id, project.expertAnalysis?.projectName);
    
    const enhancedProject = {
      ...project,
      onSaveSuccess: () => {
        console.log('✅ ExpertScoresPanel: Modal saved, triggering refresh');
        setForceRefresh(prev => prev + 1);
        window.dispatchEvent(new Event('expertAnalysisSaved'));
      }
    };
    
    setSelectedExpertProject(enhancedProject);
  };

  // Load data when panel opens
  useEffect(() => {
    if (showExpertScores && isMounted.current) {
      console.log('🔄 ExpertScoresPanel: Panel opened, loading data');
      setIsLoading(true);
      
      const timer = setTimeout(() => {
        loadFreshData();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [showExpertScores, forceRefresh]);

  // Filter projects
  const filteredProjects = localExpertProjects.filter(project => {
    const analysis = project.expertAnalysis;
    if (!analysis) return false;
    
    if (expertAnalysisFilter === "all") return true;
    if (expertAnalysisFilter === "strong") return analysis.ratingClass === "strong";
    if (expertAnalysisFilter === "moderate") return analysis.ratingClass === "moderate";
    if (expertAnalysisFilter === "weak") return analysis.ratingClass === "weak";
    
    return true;
  });
  
  // Sort by score
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const scoreA = parseFloat(a.expertAnalysis?.overallScore) || 0;
    const scoreB = parseFloat(b.expertAnalysis?.overallScore) || 0;
    return scoreB - scoreA;
  });

  // Get stats
  const totalProjects = localExpertProjects.length;
  const strongCount = localExpertProjects.filter(p => p.expertAnalysis?.ratingClass === 'strong').length;
  const moderateCount = localExpertProjects.filter(p => p.expertAnalysis?.ratingClass === 'moderate').length;
  const weakCount = localExpertProjects.filter(p => p.expertAnalysis?.ratingClass === 'weak').length;

  // Rest of the component remains the same...
  // (The JSX rendering code stays the same as your original)
  
  return (
    <div className="modal-overlay dark-overlay" onClick={() => setShowExpertScores(false)}>
      <div className="modal-content expert-scores-panel dark-theme" onClick={(e) => e.stopPropagation()}>
        {/* Header and body JSX remains the same */}
        {/* ... */}
      </div>
    </div>
  );
};

export default ExpertScoresPanel;
