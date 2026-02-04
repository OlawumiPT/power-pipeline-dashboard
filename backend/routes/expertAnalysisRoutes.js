const express = require('express');
const router = express.Router();
const {
  getExpertAnalysis,
  saveExpertAnalysis,
  getTransmissionInterconnection,
  saveTransmissionInterconnection,
  getAllExpertAnalyses 
} = require('../controllers/expertAnalysisController');

// Check if auth middleware exists
let protect;
try {
  const authMiddleware = require('../middleware/authMiddleware');
  protect = authMiddleware.protect || authMiddleware;
} catch (error) {
  console.log('⚠️ No auth middleware found, using dummy middleware');
  protect = (req, res, next) => {
    console.log('🔓 Bypassing auth for expert analysis routes');
    next();
  };
}

// Helper function for rating calculation
const calculateRating = (score) => {
  if (score === null || score === undefined) return 'N/A';
  const numericScore = parseFloat(score) || 0;
  const percent = (numericScore / 6) * 100;
  if (percent >= 85) return 'STRONG';
  if (percent >= 70) return 'GOOD';
  if (percent >= 50) return 'FAIR';
  return 'POOR';
};

// Test route to see raw database data
router.get('/test-expert-analysis', async (req, res) => {
  try {
    const schema = process.env.DB_SCHEMA || 'pipeline_dashboard';
    const pool = require('../utils/db').getPool();
    
    console.log('🔍 DEBUG: Testing expert analysis data for Roseton/Cloud');
    
    const query = `
      SELECT 
        id,
        project_codename,
        project_name,
        overall_project_score,
        thermal_operating_score,
        redevelopment_score,
        thermal_optimization,
        environmental_score,
        markets_score,
        ix,
        land_availability,
        utilities,
        infra,
        created_at,
        updated_at
      FROM ${schema}.expert_analysis 
      WHERE project_codename = 'Cloud' OR project_name LIKE '%Roseton%'
      LIMIT 1
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: 'No expert analysis found for Roseton/Cloud',
        rawData: null
      });
    }
    
    const expertAnalysis = result.rows[0];
    
    console.log('✅ DEBUG: Raw database data:', {
      project_codename: expertAnalysis.project_codename,
      project_name: expertAnalysis.project_name,
      overall_project_score: expertAnalysis.overall_project_score,
      thermal_operating_score: expertAnalysis.thermal_operating_score,
      redevelopment_score: expertAnalysis.redevelopment_score,
      thermal_optimization: expertAnalysis.thermal_optimization,
      environmental_score: expertAnalysis.environmental_score,
      markets_score: expertAnalysis.markets_score,
      ix: expertAnalysis.ix,
      land_availability: expertAnalysis.land_availability,
      utilities: expertAnalysis.utilities,
      infra: expertAnalysis.infra
    });
    
    // Format it exactly like your current API does
    const formattedResponse = {
      id: expertAnalysis.id,
      projectId: expertAnalysis.project_codename,
      projectName: expertAnalysis.project_name,
      overallScore: parseFloat(expertAnalysis.overall_project_score) || 0,
      overallRating: calculateRating(expertAnalysis.overall_project_score),
      ratingClass: calculateRating(expertAnalysis.overall_project_score)?.toLowerCase() || 'N/A',
      thermalScore: parseFloat(expertAnalysis.thermal_operating_score) || 0,
      redevelopmentScore: parseFloat(expertAnalysis.redevelopment_score) || 0,
      infrastructureScore: parseFloat(expertAnalysis.infra) || 0,
      thermalBreakdown: {
        thermal_optimization: { 
          score: parseFloat(expertAnalysis.thermal_optimization) || 0 
        },
        environmental: { 
          score: parseFloat(expertAnalysis.environmental_score) || 0 
        }
      },
      redevelopmentBreakdown: {
        redev_market: { 
          score: parseFloat(expertAnalysis.markets_score) || 0 
        },
        interconnection: { 
          score: parseFloat(expertAnalysis.ix) || 0 
        },
        land_availability: { 
          score: parseFloat(expertAnalysis.land_availability) || 0 
        },
        utilities: { 
          score: parseFloat(expertAnalysis.utilities) || 0 
        }
      },
      createdAt: expertAnalysis.created_at,
      updatedAt: expertAnalysis.updated_at
    };
    
    res.json({
      success: true,
      message: 'Test response for debugging',
      debugInfo: {
        databaseQuery: query,
        rowCount: result.rows.length,
        timestamp: new Date().toISOString()
      },
      rawDatabaseData: expertAnalysis,
      formattedForFrontend: formattedResponse,
      testUrls: [
        'Actual API endpoint for Roseton: https://pt-power-pipeline-api.azurewebsites.net/api/expert-analysis?projectId=Cloud',
        'Actual API endpoint by ID: https://pt-power-pipeline-api.azurewebsites.net/api/expert-analysis?projectId=1',
        'All expert analyses: https://pt-power-pipeline-api.azurewebsites.net/api/expert-analyses'
      ]
    });
    
  } catch (error) {
    console.error('❌ DEBUG Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    });
  }
});

// Test route to check database schema
router.get('/test-db-schema', async (req, res) => {
  try {
    const schema = process.env.DB_SCHEMA || 'pipeline_dashboard';
    const pool = require('../utils/db').getPool();
    
    const query = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = $1 
        AND table_name = 'expert_analysis'
      ORDER BY ordinal_position
    `;
    
    const result = await pool.query(query, [schema]);
    
    res.json({
      success: true,
      table: 'expert_analysis',
      schema: schema,
      columns: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Expert Analysis Routes
router.get('/expert-analysis', protect, getExpertAnalysis);
router.post('/expert-analysis', protect, saveExpertAnalysis);

// Transmission Interconnection Routes
router.get('/transmission-interconnection', protect, getTransmissionInterconnection);
router.post('/transmission-interconnection', protect, saveTransmissionInterconnection);

// Route to get ALL expert analyses
router.get('/expert-analyses', protect, getAllExpertAnalyses);

module.exports = router;
