const expertAnalysis = require('../models/expertAnalysis');

// @desc    Get expert analysis by project ID
// @route   GET /api/expert-analysis
// @access  Private
const getExpertAnalysis = async (req, res) => {
  try {
    const { projectId } = req.query;
    
    console.log('🔍 API Request: GET /api/expert-analysis', { projectId });
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }
    
    const analysisData = await expertAnalysis.getExpertAnalysisByProjectId(projectId);
    
    if (!analysisData) {
      return res.status(200).json({
        success: true,
        message: 'No expert analysis found for this project',
        data: null
      });
    }
    
    // Format the response to match frontend expectations
    const formattedResponse = {
      id: analysisData.id,
      projectId: analysisData.project_codename, // Changed from project_id
      projectName: analysisData.project_name,
      overallScore: parseFloat(analysisData.overall_project_score) || 0, // Changed from overall_score
      overallRating: expertAnalysis.calculateRating(analysisData.overall_project_score) || 'N/A', // Calculate dynamically
      thermalScore: parseFloat(analysisData.thermal_operating_score) || 0, // Changed from thermal_score
      thermalBreakdown: analysisData.thermal_breakdown || {
        thermal_optimization: { 
          score: parseFloat(analysisData.thermal_optimization) || 1 
        },
        environmental: { 
          score: parseFloat(analysisData.environmental_score) || 2 
        }
      },
      redevelopmentScore: parseFloat(analysisData.redevelopment_score) || 0,
      redevelopmentBreakdown: analysisData.redevelopment_breakdown || {
        redev_market: { 
          score: parseFloat(analysisData.markets_score) || 2 
        },
        land_availability: { score: 0 }, // Not in your table
        utilities: { score: 0 }, // Not in your table
        interconnection: { 
          score: parseFloat(analysisData.ix) || 2 
        }
      },
      infrastructureScore: parseFloat(analysisData.infra) || 0, // Changed from infrastructure_score
      editedAt: analysisData.edited_at,
      createdAt: analysisData.created_at,
      updatedAt: analysisData.updated_at,
      // Include project details for reference
      projectDetails: {
        actualProjectName: analysisData.actual_project_name,
        projectCodename: analysisData.project_codename,
        projectOverallScore: analysisData.project_overall_score,
        projectThermalScore: analysisData.project_thermal_score,
        projectRedevScore: analysisData.project_redev_score,
        iso: analysisData.iso,
        plantOwner: analysisData.plant_owner,
        location: analysisData.location,
        legacyNameplateCapacityMW: analysisData.legacy_nameplate_capacity_mw,
        tech: analysisData.tech
      }
    };
    
    res.status(200).json({
      success: true,
      data: formattedResponse
    });
  } catch (error) {
    console.error('❌ Error in getExpertAnalysis controller:', error);
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
    
    console.log('💾 API Request: POST /api/expert-analysis', { 
      projectId, 
      projectName: projectName?.substring(0, 50) + '...',
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
      projectId: projectId.toString(),
      projectName,
      overallScore: parseFloat(overallScore) || 0,
      thermalScore: parseFloat(thermalScore) || 0,
      thermalBreakdown,
      redevelopmentScore: parseFloat(redevelopmentScore) || 0,
      redevelopmentBreakdown,
      infrastructureScore: parseFloat(infrastructureScore) || 0
    };
    
    const savedAnalysis = await expertAnalysis.saveExpertAnalysis(analysisData);
    
    // Format response to match frontend expectations
    const formattedResponse = {
      id: savedAnalysis.id,
      projectId: savedAnalysis.project_codename,
      projectName: savedAnalysis.project_name,
      overallScore: parseFloat(savedAnalysis.overall_project_score) || 0,
      overallRating: expertAnalysis.calculateRating(savedAnalysis.overall_project_score),
      thermalScore: parseFloat(savedAnalysis.thermal_operating_score) || 0,
      thermalBreakdown: savedAnalysis.thermal_breakdown || {
        thermal_optimization: { score: parseFloat(savedAnalysis.thermal_optimization) || 0 },
        environmental: { score: parseFloat(savedAnalysis.environmental_score) || 0 }
      },
      redevelopmentScore: parseFloat(savedAnalysis.redevelopment_score) || 0,
      redevelopmentBreakdown: savedAnalysis.redevelopment_breakdown || {
        redev_market: { score: parseFloat(savedAnalysis.markets_score) || 0 },
        land_availability: { score: 0 },
        utilities: { score: 0 },
        interconnection: { score: parseFloat(savedAnalysis.ix) || 0 }
      },
      infrastructureScore: parseFloat(savedAnalysis.infra) || 0,
      editedAt: savedAnalysis.edited_at,
      createdAt: savedAnalysis.created_at,
      updatedAt: savedAnalysis.updated_at
    };
    
    res.status(200).json({
      success: true,
      message: 'Expert analysis saved successfully',
      data: formattedResponse
    });
  } catch (error) {
    console.error('❌ Error in saveExpertAnalysis controller:', error);
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
    
    console.log('🔍 API Request: GET /api/transmission-interconnection', { project });
    
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
      notes: item.notes,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      projectDetails: {
        actualProjectName: item.actual_project_name,
        projectCodename: item.project_codename,
        iso: item.iso,
        plantOwner: item.plant_owner
      }
    }));
    
    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('❌ Error in getTransmissionInterconnection controller:', error);
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
    
    console.log('💾 API Request: POST /api/transmission-interconnection', { 
      projectId,
      dataCount: transmissionData?.length || 0
    });
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }
    
    if (!transmissionData || !Array.isArray(transmissionData)) {
      return res.status(400).json({
        success: false,
        message: 'Transmission data must be an array'
      });
    }
    
    const savedData = await expertAnalysis.saveTransmissionInterconnection(
      projectId, 
      transmissionData
    );
    
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
      data: formattedData,
      count: formattedData.length
    });
  } catch (error) {
    console.error('❌ Error in saveTransmissionInterconnection controller:', error);
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
