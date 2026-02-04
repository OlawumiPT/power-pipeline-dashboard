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
    
    // Format response - ONLY use values from database
    const formattedResponse = {
      id: analysisData.id,
      projectId: analysisData.project_codename,
      projectName: analysisData.project_name,
      overallScore: analysisData.overall_project_score !== null ? parseFloat(analysisData.overall_project_score) : 0,
      overallRating: expertAnalysis.calculateRating(analysisData.overall_project_score) || 'N/A',
      ratingClass: expertAnalysis.calculateRating(analysisData.overall_project_score)?.toLowerCase() || 'N/A',
      thermalScore: analysisData.thermal_operating_score !== null ? parseFloat(analysisData.thermal_operating_score) : 0,
      redevelopmentScore: analysisData.redevelopment_score !== null ? parseFloat(analysisData.redevelopment_score) : 0,
      infrastructureScore: analysisData.infra !== null ? parseFloat(analysisData.infra) : 0,
      // CRITICAL: Include breakdown data
      thermalBreakdown: analysisData.thermal_breakdown || {
        thermal_optimization: { 
          score: analysisData.thermal_optimization !== null ? parseFloat(analysisData.thermal_optimization) : 0 
        },
        environmental: { 
          score: analysisData.environmental_score !== null ? parseFloat(analysisData.environmental_score) : 0 
        }
      },
      redevelopmentBreakdown: analysisData.redevelopment_breakdown || {
        redev_market: { 
          score: analysisData.markets_score !== null ? parseFloat(analysisData.markets_score) : 0 
        },
        interconnection: { 
          score: analysisData.ix !== null ? parseFloat(analysisData.ix) : 0 
        },
        land_availability: { score: 0 },
        utilities: { score: 0 }
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
      projectName: projectName || null,
      overallScore: overallScore !== undefined ? parseFloat(overallScore) : null,
      thermalScore: thermalScore !== undefined ? parseFloat(thermalScore) : null,
      thermalBreakdown: thermalBreakdown || null,
      redevelopmentScore: redevelopmentScore !== undefined ? parseFloat(redevelopmentScore) : null,
      redevelopmentBreakdown: redevelopmentBreakdown || null,
      infrastructureScore: infrastructureScore !== undefined ? parseFloat(infrastructureScore) : null
    };
    
    console.log('📤 Saving analysis data:', analysisData);
    
    const savedAnalysis = await expertAnalysis.saveExpertAnalysis(analysisData);
    
    // CRITICAL FIX: Format response with COMPLETE breakdown data
    const formattedResponse = {
      id: savedAnalysis.id,
      projectId: savedAnalysis.project_codename,
      projectName: savedAnalysis.project_name,
      overallScore: savedAnalysis.overall_project_score !== null ? parseFloat(savedAnalysis.overall_project_score) : 0,
      overallRating: expertAnalysis.calculateRating(savedAnalysis.overall_project_score) || 'N/A',
      ratingClass: expertAnalysis.calculateRating(savedAnalysis.overall_project_score)?.toLowerCase() || 'N/A',
      thermalScore: savedAnalysis.thermal_operating_score !== null ? parseFloat(savedAnalysis.thermal_operating_score) : 0,
      redevelopmentScore: savedAnalysis.redevelopment_score !== null ? parseFloat(savedAnalysis.redevelopment_score) : 0,
      infrastructureScore: savedAnalysis.infra !== null ? parseFloat(savedAnalysis.infra) : 0,
      // CRITICAL: Include breakdown data from the saved analysis
      thermalBreakdown: savedAnalysis.thermal_breakdown || {
        thermal_optimization: { 
          score: savedAnalysis.thermal_optimization !== null ? parseFloat(savedAnalysis.thermal_optimization) : 0 
        },
        environmental: { 
          score: savedAnalysis.environmental_score !== null ? parseFloat(savedAnalysis.environmental_score) : 0 
        }
      },
      redevelopmentBreakdown: savedAnalysis.redevelopment_breakdown || {
        redev_market: { 
          score: savedAnalysis.markets_score !== null ? parseFloat(savedAnalysis.markets_score) : 0 
        },
        interconnection: { 
          score: savedAnalysis.ix !== null ? parseFloat(savedAnalysis.ix) : 0 
        },
        land_availability: { 
          score: redevelopmentBreakdown?.land_availability?.score || 0 
        },
        utilities: { 
          score: redevelopmentBreakdown?.utilities?.score || 0 
        }
      },
      createdAt: savedAnalysis.created_at,
      updatedAt: savedAnalysis.updated_at
    };
    
    console.log('✅ Save successful, returning COMPLETE data:', {
      projectId: formattedResponse.projectId,
      projectName: formattedResponse.projectName,
      overallScore: formattedResponse.overallScore,
      thermalBreakdown: formattedResponse.thermalBreakdown,
      redevelopmentBreakdown: formattedResponse.redevelopmentBreakdown
    });
    
    res.status(200).json({
      success: true,
      message: 'Expert analysis saved successfully',
      data: formattedResponse  // This now includes breakdown data
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
      const overallScore = row.overall_project_score !== null ? parseFloat(row.overall_project_score) : 0;
      
      return {
        id: row.id,
        project_codename: row.project_codename,
        project_name: row.project_name,
        expertAnalysis: {
          id: row.id,
          projectId: row.project_codename,
          projectName: row.project_name,
          overallScore: overallScore,
          overallRating: expertAnalysis.calculateRating(overallScore) || 'N/A',
          ratingClass: expertAnalysis.calculateRating(overallScore)?.toLowerCase() || 'N/A',
          thermalScore: row.thermal_operating_score !== null ? parseFloat(row.thermal_operating_score) : 0,
          redevelopmentScore: row.redevelopment_score !== null ? parseFloat(row.redevelopment_score) : 0,
          infrastructureScore: row.infra !== null ? parseFloat(row.infra) : 0,
          // CRITICAL: Include breakdown data
          thermalBreakdown: row.thermal_breakdown || {
            thermal_optimization: { 
              score: row.thermal_optimization !== null ? parseFloat(row.thermal_optimization) : 0 
            },
            environmental: { 
              score: row.environmental_score !== null ? parseFloat(row.environmental_score) : 0 
            }
          },
          redevelopmentBreakdown: row.redevelopment_breakdown || {
            redev_market: { 
              score: row.markets_score !== null ? parseFloat(row.markets_score) : 0 
            },
            interconnection: { 
              score: row.ix !== null ? parseFloat(row.ix) : 0 
            },
            land_availability: { score: 0 },
            utilities: { score: 0 }
          },
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
      excessInjectionCapacity: item.excess_injection_capacity !== null ? parseFloat(item.excess_injection_capacity) : null,
      excessWithdrawalCapacity: item.excess_withdrawal_capacity !== null ? parseFloat(item.excess_withdrawal_capacity) : null,
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
      excessInjectionCapacity: item.excess_injection_capacity !== null ? parseFloat(item.excess_injection_capacity) : null,
      excessWithdrawalCapacity: item.excess_withdrawal_capacity !== null ? parseFloat(item.excess_withdrawal_capacity) : null,
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
