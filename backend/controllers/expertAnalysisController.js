const expertAnalysis = require('../models/expertAnalysis');

// @desc    Get expert analysis by project ID
// @route   GET /api/expert-analysis
// @access  Private
const getExpertAnalysis = async (req, res) => {
  try {
    const { projectId } = req.query;
    
    console.log('🔍 GET /api/expert-analysis for projectId:', projectId);
    
    if (!projectId) {
      console.log('❌ Project ID is required');
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }
    
    const analysisData = await expertAnalysis.getExpertAnalysisByProjectId(projectId);
    
    if (!analysisData) {
      console.log(`📭 No expert analysis found for projectId ${projectId}`);
      return res.status(200).json({
        success: true,
        message: 'No expert analysis found',
        data: null
      });
    }
    
    console.log('✅ Found analysis data for project:', {
      projectCodename: analysisData.project_codename,
      projectName: analysisData.project_name,
      overallScore: analysisData.overall_project_score,
      thermalScore: analysisData.thermal_operating_score,
      redevelopmentScore: analysisData.redevelopment_score
    });
    
    // Format response with ALL breakdown fields
    const formattedResponse = {
      id: analysisData.id,
      projectId: analysisData.project_codename,
      projectName: analysisData.project_name,
      overallScore: parseFloat(analysisData.overall_project_score) || 0,
      overallRating: expertAnalysis.calculateRating(analysisData.overall_project_score) || 'N/A',
      ratingClass: expertAnalysis.calculateRating(analysisData.overall_project_score)?.toLowerCase() || 'N/A',
      thermalScore: parseFloat(analysisData.thermal_operating_score) || 0,
      redevelopmentScore: parseFloat(analysisData.redevelopment_score) || 0,
      infrastructureScore: parseFloat(analysisData.infra) || 0,
      thermalBreakdown: analysisData.thermal_breakdown || {
        thermal_optimization: { score: parseFloat(analysisData.thermal_optimization) || 1 },
        environmental: { score: parseFloat(analysisData.environmental_score) || 2 }
      },
      redevelopmentBreakdown: analysisData.redevelopment_breakdown || {
        redev_market: { score: parseFloat(analysisData.markets_score) || 2 },
        interconnection: { score: parseFloat(analysisData.ix) || 2 },
        land_availability: { score: 2 },
        utilities: { score: 2 }
      },
      createdAt: analysisData.created_at,
      updatedAt: analysisData.updated_at
    };
    
    console.log('📤 Sending formatted response for project:', formattedResponse.projectName);
    
    res.status(200).json({
      success: true,
      data: formattedResponse
    });
  } catch (error) {
    console.error('❌ Error in getExpertAnalysis:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Save or update expert analysis
// @route   POST /api/expert-analysis
// @access  Private
const saveExpertAnalysis = async (req, res) => {
  try {
    const {
      projectId,
      projectName,
      overallScore,
      thermalScore,
      thermalBreakdown,
      redevelopmentScore,
      redevelopmentBreakdown,
      infrastructureScore
    } = req.body;
    
    console.log('💾 POST /api/expert-analysis', { 
      projectId, 
      projectName,
      overallScore,
      thermalScore,
      redevelopmentScore
    });
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }
    
    const analysisData = {
      projectId: projectId,
      projectName: projectName || `Project ${projectId}`,
      overallScore: parseFloat(overallScore) || 0,
      thermalScore: parseFloat(thermalScore) || 0,
      thermalBreakdown: thermalBreakdown || {
        thermal_optimization: { score: 1 },
        environmental: { score: 2 }
      },
      redevelopmentScore: parseFloat(redevelopmentScore) || 0,
      redevelopmentBreakdown: redevelopmentBreakdown || {
        redev_market: { score: 2 },
        land_availability: { score: 2 },
        utilities: { score: 2 },
        interconnection: { score: 2 }
      },
      infrastructureScore: parseFloat(infrastructureScore) || 0
    };
    
    console.log('📤 Saving analysis data:', analysisData);
    
    const savedAnalysis = await expertAnalysis.saveExpertAnalysis(analysisData);
    
    // Format response - ONLY using columns that exist
    const formattedResponse = {
      id: savedAnalysis.id,
      projectId: savedAnalysis.project_codename,
      projectName: savedAnalysis.project_name,
      overallScore: parseFloat(savedAnalysis.overall_project_score) || 0,
      overallRating: expertAnalysis.calculateRating(savedAnalysis.overall_project_score) || 'N/A',
      ratingClass: expertAnalysis.calculateRating(savedAnalysis.overall_project_score)?.toLowerCase() || 'N/A',
      thermalScore: parseFloat(savedAnalysis.thermal_operating_score) || 0,
      redevelopmentScore: parseFloat(savedAnalysis.redevelopment_score) || 0,
      infrastructureScore: parseFloat(savedAnalysis.infra) || 0,
      thermalBreakdown: savedAnalysis.thermal_breakdown || {
        thermal_optimization: { score: parseFloat(savedAnalysis.thermal_optimization) || 1 },
        environmental: { score: parseFloat(savedAnalysis.environmental_score) || 2 }
      },
      redevelopmentBreakdown: savedAnalysis.redevelopment_breakdown || {
        redev_market: { score: parseFloat(savedAnalysis.markets_score) || 2 },
        interconnection: { score: parseFloat(savedAnalysis.ix) || 2 },
        land_availability: { score: 2 },
        utilities: { score: 2 }
      },
      createdAt: savedAnalysis.created_at,
      updatedAt: savedAnalysis.updated_at
    };
    
    console.log('✅ Save successful, returning:', {
      projectId: formattedResponse.projectId,
      projectName: formattedResponse.projectName,
      overallScore: formattedResponse.overallScore
    });
    
    res.status(200).json({
      success: true,
      message: 'Expert analysis saved successfully',
      data: formattedResponse
    });
  } catch (error) {
    console.error('❌ Error in saveExpertAnalysis:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get transmission interconnection data
// @route   GET /api/transmission-interconnection
// @access  Private
const getTransmissionInterconnection = async (req, res) => {
  try {
    const { project } = req.query;
    
    console.log('🔍 GET /api/transmission-interconnection', { project });
    
    if (!project) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required'
      });
    }
    
    const transmissionData = await expertAnalysis.getTransmissionInterconnectionByProject(project);
    
    // Format response
    const formattedData = transmissionData.map(item => ({
      id: item.id,
      site: item.site,
      poiVoltage: item.poi_voltage,
      excessInjectionCapacity: parseFloat(item.excess_injection_capacity) || 0,
      excessWithdrawalCapacity: parseFloat(item.excess_withdrawal_capacity) || 0,
      constraints: item.constraints,
      excessIXCapacity: item.excess_ix_capacity,
      projectId: item.project_id,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
    
    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('❌ Error in getTransmissionInterconnection:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Save transmission interconnection data
// @route   POST /api/transmission-interconnection
// @access  Private
const saveTransmissionInterconnection = async (req, res) => {
  try {
    const { projectId, transmissionData } = req.body;
    
    console.log('💾 POST /api/transmission-interconnection', { 
      projectId,
      dataCount: transmissionData?.length || 0
    });
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }
    
    const savedData = await expertAnalysis.saveTransmissionInterconnection(projectId, transmissionData);
    
    // Format response
    const formattedData = savedData.map(item => ({
      id: item.id,
      site: item.site,
      poiVoltage: item.poi_voltage,
      excessInjectionCapacity: parseFloat(item.excess_injection_capacity) || 0,
      excessWithdrawalCapacity: parseFloat(item.excess_withdrawal_capacity) || 0,
      constraints: item.constraints,
      excessIXCapacity: item.excess_ix_capacity,
      projectId: item.project_id,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
    
    res.status(200).json({
      success: true,
      message: 'Transmission data saved successfully',
      data: formattedData
    });
  } catch (error) {
    console.error('❌ Error in saveTransmissionInterconnection:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getExpertAnalysis,
  saveExpertAnalysis,
  getTransmissionInterconnection,
  saveTransmissionInterconnection
};
