const expertAnalysis = require('../models/expertAnalysis');


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
    
    // Format response - ONLY use values from database
    const formattedResponse = {
      id: analysisData.id,
      projectId: analysisData.project_codename,
      projectName: analysisData.project_name,
      overallScore: parseFloat(analysisData.overall_project_score) || null,
      overallRating: expertAnalysis.calculateRating(analysisData.overall_project_score) || null,
      ratingClass: expertAnalysis.calculateRating(analysisData.overall_project_score)?.toLowerCase() || null,
      thermalScore: parseFloat(analysisData.thermal_operating_score) || null,
      redevelopmentScore: parseFloat(analysisData.redevelopment_score) || null,
      infrastructureScore: parseFloat(analysisData.infra) || null,
      thermalBreakdown: analysisData.thermal_breakdown || null,
      redevelopmentBreakdown: analysisData.redevelopment_breakdown || null,
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
      projectName: projectName || null,
      overallScore: parseFloat(overallScore) || null,
      thermalScore: parseFloat(thermalScore) || null,
      thermalBreakdown: thermalBreakdown || null,
      redevelopmentScore: parseFloat(redevelopmentScore) || null,
      redevelopmentBreakdown: redevelopmentBreakdown || null,
      infrastructureScore: parseFloat(infrastructureScore) || null
    };
    
    console.log('📤 Saving analysis data:', analysisData);
    
    const savedAnalysis = await expertAnalysis.saveExpertAnalysis(analysisData);
    
    // Format response - ONLY using columns that exist
    const formattedResponse = {
      id: savedAnalysis.id,
      projectId: savedAnalysis.project_codename,
      projectName: savedAnalysis.project_name,
      overallScore: parseFloat(savedAnalysis.overall_project_score) || null,
      overallRating: expertAnalysis.calculateRating(savedAnalysis.overall_project_score) || null,
      ratingClass: expertAnalysis.calculateRating(savedAnalysis.overall_project_score)?.toLowerCase() || null,
      thermalScore: parseFloat(savedAnalysis.thermal_operating_score) || null,
      redevelopmentScore: parseFloat(savedAnalysis.redevelopment_score) || null,
      infrastructureScore: parseFloat(savedAnalysis.infra) || null,
      thermalBreakdown: savedAnalysis.thermal_breakdown || null,
      redevelopmentBreakdown: savedAnalysis.redevelopment_breakdown || null,
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

// @desc    Get ALL expert analyses
// @route   GET /api/expert-analyses
// @access  Private
const getAllExpertAnalyses = async (req, res) => {
  try {
    console.log('🔍 GET /api/expert-analyses - Fetching ALL expert analyses');
    
    // Set aggressive no-cache headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const allAnalyses = await expertAnalysis.getAllExpertAnalyses();
    
    console.log(`✅ Found ${allAnalyses.length} expert analysis records`);
    
    // Format response
    const formattedData = allAnalyses.map(row => {
      const overallScore = parseFloat(row.overall_project_score) || null;
      
      return {
        id: row.id,
        project_codename: row.project_codename,
        project_name: row.project_name,
        expertAnalysis: {
          id: row.id,
          projectId: row.project_codename,
          projectName: row.project_name,
          overallScore: overallScore,
          overallRating: expertAnalysis.calculateRating(overallScore) || null,
          ratingClass: expertAnalysis.calculateRating(overallScore)?.toLowerCase() || null,
          thermalScore: parseFloat(row.thermal_operating_score) || null,
          redevelopmentScore: parseFloat(row.redevelopment_score) || null,
          infrastructureScore: parseFloat(row.infra) || null,
          thermalBreakdown: row.thermal_breakdown || null,
          redevelopmentBreakdown: row.redevelopment_breakdown || null,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }
      };
    });
    
    res.status(200).json({
      success: true,
      message: 'Expert analyses retrieved successfully',
      count: formattedData.length,
      data: formattedData
    });
    
  } catch (error) {
    console.error('❌ Error in getAllExpertAnalyses:', error);
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
      excessInjectionCapacity: parseFloat(item.excess_injection_capacity) || null,
      excessWithdrawalCapacity: parseFloat(item.excess_withdrawal_capacity) || null,
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
      excessInjectionCapacity: parseFloat(item.excess_injection_capacity) || null,
      excessWithdrawalCapacity: parseFloat(item.excess_withdrawal_capacity) || null,
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
  saveTransmissionInterconnection,
  getAllExpertAnalyses
};
