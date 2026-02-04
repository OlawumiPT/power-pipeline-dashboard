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
    
    // Format response with DEFAULT values if null
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
      // CRITICAL: Use breakdown data from model
      thermalBreakdown: analysisData.thermal_breakdown || {
        thermal_optimization: { score: 0 },
        environmental: { score: 0 }
      },
      redevelopmentBreakdown: analysisData.redevelopment_breakdown || {
        redev_market: { score: 0 },
        interconnection: { score: 0 },
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
      overallScore: overallScore !== undefined ? parseFloat(overallScore) : 0,
      thermalScore: thermalScore !== undefined ? parseFloat(thermalScore) : 0,
      thermalBreakdown: thermalBreakdown || null,
      redevelopmentScore: redevelopmentScore !== undefined ? parseFloat(redevelopmentScore) : 0,
      redevelopmentBreakdown: redevelopmentBreakdown || null,
      infrastructureScore: infrastructureScore !== undefined ? parseFloat(infrastructureScore) : 0
    };
    
    console.log('📤 Saving analysis data:', analysisData);
    
    const savedAnalysis = await expertAnalysis.saveExpertAnalysis(analysisData);
    
    // Format response with COMPLETE breakdown data
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
      // CRITICAL: Include breakdown data from the saved analysis
      thermalBreakdown: savedAnalysis.thermal_breakdown || {
        thermal_optimization: { score: 0 },
        environmental: { score: 0 }
      },
      redevelopmentBreakdown: savedAnalysis.redevelopment_breakdown || {
        redev_market: { score: 0 },
        interconnection: { score: 0 },
        land_availability: { score: 0 },
        utilities: { score: 0 }
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
      const overallScore = parseFloat(row.overall_project_score) || 0;
      
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
          thermalScore: parseFloat(row.thermal_operating_score) || 0,
          redevelopmentScore: parseFloat(row.redevelopment_score) || 0,
          infrastructureScore: parseFloat(row.infra) || 0,
          // CRITICAL: Include breakdown data
          thermalBreakdown: row.thermal_breakdown || {
            thermal_optimization: { score: 0 },
            environmental: { score: 0 }
          },
          redevelopmentBreakdown: row.redevelopment_breakdown || {
            redev_market: { score: 0 },
            interconnection: { score: 0 },
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

// @desc    Delete transmission interconnection record
// @route   DELETE /api/transmission-interconnection/:id
// @access  Private
const deleteTransmissionInterconnection = async (req, res) => {
  try {
    const { id } = req.params;
    const schema = process.env.DB_SCHEMA || 'pipeline_dashboard';
    const pool = require('../utils/db').getPool();
    
    console.log(`🗑️ Deleting transmission interconnection record ID: ${id}`);
    
    // Check if record exists
    const checkQuery = `
      SELECT id, project_id, poi_voltage 
      FROM ${schema}.transmission_interconnection 
      WHERE id = $1
    `;
    const checkResult = await pool.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Transmission interconnection record with ID ${id} not found`
      });
    }
    
    const record = checkResult.rows[0];
    
    // Delete the record
    const deleteQuery = `
      DELETE FROM ${schema}.transmission_interconnection 
      WHERE id = $1 
      RETURNING id, project_id, poi_voltage
    `;
    const deleteResult = await pool.query(deleteQuery, [id]);
    
    const deletedRecord = deleteResult.rows[0];
    
    console.log(`✅ Successfully deleted transmission record:`, {
      id: deletedRecord.id,
      projectId: deletedRecord.project_id,
      poiVoltage: deletedRecord.poi_voltage
    });
    
    res.status(200).json({
      success: true,
      message: 'Transmission interconnection record deleted successfully',
      data: {
        deletedId: deletedRecord.id,
        projectId: deletedRecord.project_id,
        poiVoltage: deletedRecord.poi_voltage,
        deletedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error deleting transmission interconnection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transmission interconnection record',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  getExpertAnalysis,
  saveExpertAnalysis,
  getTransmissionInterconnection,
  saveTransmissionInterconnection,
  getAllExpertAnalyses,
  deleteTransmissionInterconnection
};
